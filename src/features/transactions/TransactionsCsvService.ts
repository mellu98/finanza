/**
 * `TransactionsCsvService` — round-trip CSV import/export for the
 * user's `Transaction[]`.
 *
 * The service is a thin wrapper around `papaparse` (RFC 4180) with
 * spec-locked validation rules:
 *
 *   1. **Header** is fixed: 9 columns in this exact order
 *      `date,type,category,description,amount,paymentMethod,necessary,classification,notes`
 *   2. **Import never partial-commits**: if ANY row fails validation,
 *      the whole import is rejected — `ok: []`, `errors: [...]`.
 *   3. **Validation rules** per row:
 *      - `date` is a valid `IsoDate` (YYYY-MM-DD)
 *      - `type` ∈ `{"income", "expense"}`
 *      - `category` ∈ `DEFAULT_CATEGORIES[*].key`
 *      - `amount` is a positive number parseable as `big.js`
 *      - `classification` ∈ `{"essential", "controllable", "avoidable"}`
 *      - `necessary` is a boolean (`true` / `false` strings)
 *   4. **Export** properly escapes commas, quotes, and newlines per
 *      RFC 4180 (wraps the field in double-quotes and doubles any
 *      internal quote).
 *   5. **Round-trip** is lossless for an all-valid CSV (re-importing
 *      the export returns the same transactions).
 *
 * The service is pure TS — no React, no fetch, no localforage. v1
 * does not import the `id` (the import mints new ids); the user's
 * app will see the imported rows as a fresh batch.
 */
import Big from "big.js";
import Papa from "papaparse";
import { parseIsoDate } from "../daily-coach/isoDate";
import { DEFAULT_CATEGORIES } from "./categories";
import type {
  Classification,
  Transaction,
  TransactionType,
} from "./transaction";

/** The spec-locked CSV header. */
export const CSV_HEADER =
  "date,type,category,description,amount,paymentMethod,necessary,classification,notes";

/** A per-row validation error. `row` is 1-indexed (matches Excel-style UX). */
export interface CsvRowError {
  row: number;
  message: string;
}

/** The result of an import. Either an empty `errors` and full `ok`, or `ok: []` and full `errors`. */
export interface CsvImportResult {
  ok: Transaction[];
  errors: CsvRowError[];
}

const VALID_CATEGORIES = new Set(DEFAULT_CATEGORIES.map((c) => c.key));

/* --------------------------- internal helpers --------------------------- */

const isBoolean = (v: string): boolean => v === "true" || v === "false";

const parseClassification = (raw: string): Classification | null => {
  if (raw === "essential" || raw === "controllable" || raw === "avoidable") {
    return raw;
  }
  return null;
};

const parseType = (raw: string): TransactionType | null => {
  if (raw === "income" || raw === "expense") return raw;
  return null;
};

const parseAmount = (raw: string): Big | null => {
  if (raw.trim() === "") return null;
  try {
    const n = new Big(raw);
    if (n.lt(0)) return null;
    if (!Number.isFinite(n.toNumber())) return null;
    return n;
  } catch {
    return null;
  }
};

const isValidIsoDate = (raw: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(raw);

/* ----------------------------- export ---------------------------------- */

const escapeCell = (raw: string): string => {
  if (
    raw.includes(",") ||
    raw.includes('"') ||
    raw.includes("\n") ||
    raw.includes("\r")
  ) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const rowToCells = (tx: Transaction): ReadonlyArray<string> => [
  tx.date,
  tx.type,
  tx.category,
  tx.description,
  // big.js: keep the raw representation so re-parse is lossless.
  tx.amount.toString(),
  tx.paymentMethod ?? "",
  tx.necessary ? "true" : "false",
  tx.classification,
  tx.notes ?? "",
];

const newId = (): string => crypto.randomUUID();

/**
 * Serialise the transactions to a CSV string. The first line is the
 * fixed `CSV_HEADER`. Each following line is one transaction.
 */
export const exportCSV = (transactions: ReadonlyArray<Transaction>): string => {
  const lines: string[] = [CSV_HEADER];
  for (const tx of transactions) {
    const cells = rowToCells(tx).map(escapeCell);
    lines.push(cells.join(","));
  }
  // RFC 4180 recommends a trailing CRLF; we use LF (the project's
  // biome config sets lineEnding=lf).
  return `${lines.join("\n")}\n`;
};

/* ----------------------------- import ---------------------------------- */

interface ParsedRow {
  /** 0-indexed position in the data array (header is -1). */
  index: number;
  cells: ReadonlyArray<string>;
}

const parseRawRows = (text: string): ParsedRow[] => {
  const result = Papa.parse<string[]>(text.trim(), {
    header: false,
    skipEmptyLines: true,
  });
  if (result.errors.length > 0) {
    // A malformed CSV at the parser level (e.g. unterminated quote)
    // collapses the whole import to a single error on row 0.
    return [];
  }
  return result.data.map((cells, index) => ({ index, cells }));
};

const validateRow = (
  cells: ReadonlyArray<string>,
): {
  tx?: Transaction;
  error?: string;
} => {
  if (cells.length < 9) {
    return { error: `expected 9 columns, got ${cells.length}` };
  }
  const [
    date,
    type,
    category,
    description,
    amount,
    paymentMethod,
    necessary,
    classification,
    notes,
  ] = cells as ReadonlyArray<string>;

  if (!isValidIsoDate(date)) {
    return { error: `invalid date "${date}" (expected YYYY-MM-DD)` };
  }
  const t = parseType(type);
  if (!t) {
    return { error: `invalid type "${type}" (expected "income" or "expense")` };
  }
  if (!VALID_CATEGORIES.has(category)) {
    return { error: `invalid category "${category}"` };
  }
  const amt = parseAmount(amount);
  if (!amt) {
    return {
      error: `invalid amount "${amount}" (must be a non-negative number)`,
    };
  }
  if (!isBoolean(necessary)) {
    return {
      error: `invalid necessary flag "${necessary}" (expected "true" or "false")`,
    };
  }
  const cls = parseClassification(classification);
  if (!cls) {
    return {
      error: `invalid classification "${classification}" (expected "essential", "controllable", or "avoidable")`,
    };
  }
  // All checks pass; mint a new id and build the transaction.
  // `parseIsoDate` throws on invalid input but we already validated the
  // format above; wrap in try/catch as a defence-in-depth.
  let isoDate: ReturnType<typeof parseIsoDate>;
  try {
    isoDate = parseIsoDate(date);
  } catch {
    return { error: `invalid date "${date}"` };
  }
  const tx: Transaction = {
    id: newId(),
    date: isoDate,
    type: t,
    category,
    description: description ?? "",
    amount: amt,
    paymentMethod: paymentMethod === "" ? undefined : paymentMethod,
    necessary: necessary === "true",
    classification: cls,
    notes: notes === "" ? undefined : notes,
  };
  return { tx };
};

/**
 * Parse a CSV string and return the valid transactions plus a list of
 * per-row errors. **The import NEVER partial-commits** — if any row
 * fails validation, `ok` is `[]` and every failing row is reported
 * in `errors`. This is the headline contract from the spec.
 */
export const importCSV = (text: string): CsvImportResult => {
  const rows = parseRawRows(text);
  if (rows.length === 0) {
    return { ok: [], errors: [{ row: 0, message: "empty or malformed CSV" }] };
  }
  // The first row is the header — validate it.
  const headerRow = rows[0];
  if (!headerRow) {
    return { ok: [], errors: [{ row: 0, message: "empty CSV" }] };
  }
  const expectedHeader = CSV_HEADER.split(",");
  const actualHeader = headerRow.cells;
  const headerMatches =
    expectedHeader.length === actualHeader.length &&
    expectedHeader.every((h, i) => h === actualHeader[i]);
  if (!headerMatches) {
    return {
      ok: [],
      errors: [{ row: 0, message: `invalid header; expected "${CSV_HEADER}"` }],
    };
  }
  const dataRows = rows.slice(1);

  const ok: Transaction[] = [];
  const errors: CsvRowError[] = [];
  dataRows.forEach((row, i) => {
    const result = validateRow(row.cells);
    if (result.error) {
      // 1-indexed data row number (matches the user's mental model:
      // "row 7" of 11 in the spreadsheet data, not the file-line
      // number which would include the header).
      errors.push({ row: i + 1, message: result.error });
    } else if (result.tx) {
      ok.push(result.tx);
    }
  });
  if (errors.length > 0) {
    // Never partial-commit: drop the OK transactions and surface only
    // the errors. The caller can re-export the user's data from a
    // backup if they want to retry.
    return { ok: [], errors };
  }
  return { ok, errors: [] };
};
