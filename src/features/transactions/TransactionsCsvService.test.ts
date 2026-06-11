/**
 * Tests for `TransactionsCsvService`.
 *
 * The service is the user's escape hatch for moving their data in
 * and out of the app via plain CSV. The test plan covers:
 *
 *   1. **Header** is the spec-locked 9-col string:
 *      `date,type,category,description,amount,paymentMethod,necessary,classification,notes`
 *   2. **1-bad-row-of-11 import scenario** — the headline contract:
 *      when ANY row fails validation, the import MUST return a per-row
 *      error report and NEVER partial-commit (the `ok` array is empty
 *      and `errors.length` is 1).
 *   3. **Round-trip** — `exportCSV(txs) → parseCSV(...)` returns the
 *      same transactions (lossless).
 *   4. **Per-row error report** — `importCSV(text)` returns
 *      `{ ok: Transaction[]; errors: { row: number; message: string }[] }`.
 *
 * Strict TDD: this file is written FIRST (RED). The implementation in
 * `TransactionsCsvService.ts` is written second (GREEN).
 */

import Big from "big.js";
import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "./categories";
import { CSV_HEADER, exportCSV, importCSV } from "./TransactionsCsvService";
import type { Transaction } from "./transaction";
import { Classification, TransactionType } from "./transaction";

const VALID_HEADER = CSV_HEADER;

/** Build a valid `Transaction` with sensible defaults. */
const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: overrides.id ?? "tx-1",
  date: overrides.date ?? ("2026-06-10" as never),
  type: overrides.type ?? TransactionType.Expense,
  category: overrides.category ?? "groceries",
  description: overrides.description ?? "test",
  amount: (overrides.amount ?? new Big("10")) as Transaction["amount"],
  paymentMethod: overrides.paymentMethod,
  necessary: overrides.necessary ?? false,
  classification: overrides.classification ?? Classification.Controllable,
  notes: overrides.notes,
  categoryBudget: overrides.categoryBudget,
});

describe("TransactionsCsvService", () => {
  describe("CSV_HEADER", () => {
    it("matches the spec-locked 9-column string", () => {
      expect(VALID_HEADER).toBe(
        "date,type,category,description,amount,paymentMethod,necessary,classification,notes",
      );
    });
  });

  describe("exportCSV", () => {
    it("emits the header even for an empty list", () => {
      expect(exportCSV([])).toBe(`${VALID_HEADER}\n`);
    });

    it("serialises a single transaction with all fields", () => {
      const txs = [
        makeTx({
          id: "tx-a",
          date: "2026-06-10" as never,
          type: TransactionType.Expense,
          category: "groceries",
          description: "Weekly shop",
          amount: new Big("42.50"),
          paymentMethod: "card",
          necessary: true,
          classification: Classification.Controllable,
          notes: "Whole Foods",
        }),
      ];
      const csv = exportCSV(txs);
      expect(csv).toContain(VALID_HEADER);
      // Order of columns matches the header.
      expect(csv).toContain(
        "2026-06-10,expense,groceries,Weekly shop,42.5,card,true,controllable,Whole Foods",
      );
    });

    it("escapes commas / quotes / newlines inside free-text fields", () => {
      const txs = [
        makeTx({
          id: "tx-b",
          description: 'coffee, with "milk"',
          notes: "line1\nline2",
        }),
      ];
      const csv = exportCSV(txs);
      // Standard CSV escape: wrap in quotes and double the internal quotes.
      expect(csv).toContain('"coffee, with ""milk"""');
      // Newlines inside a quoted field are preserved.
      expect(csv).toContain('"line1\nline2"');
    });
  });

  describe("importCSV", () => {
    it("returns a per-row error report and never partial-commits when one row is invalid (1-bad-row-of-11 scenario)", () => {
      // 11 rows total. Row 7 (0-indexed: row index 6 in the data) has
      // an invalid `type`. The import must:
      //   - reject the whole import (no partial commit)
      //   - report an error pointing at the bad row number (1-indexed
      //     for humans, i.e. row 7 corresponds to the 7th data line)
      const rows: ReadonlyArray<ReadonlyArray<string>> = [
        // 0
        [
          "2026-06-10",
          "income",
          "income",
          "salary",
          "1500",
          "bank",
          "true",
          "controllable",
          "monthly",
        ],
        // 1
        [
          "2026-06-10",
          "expense",
          "groceries",
          "milk",
          "3.50",
          "cash",
          "true",
          "controllable",
          "",
        ],
        // 2
        [
          "2026-06-10",
          "expense",
          "dining",
          "lunch",
          "12.00",
          "card",
          "false",
          "avoidable",
          "",
        ],
        // 3
        [
          "2026-06-10",
          "expense",
          "utilities",
          "electricity",
          "60",
          "direct debit",
          "true",
          "essential",
          "",
        ],
        // 4
        [
          "2026-06-10",
          "expense",
          "commute",
          "gas",
          "20",
          "card",
          "true",
          "controllable",
          "",
        ],
        // 5
        [
          "2026-06-10",
          "expense",
          "subscriptions",
          "netflix",
          "9.99",
          "card",
          "false",
          "avoidable",
          "",
        ],
        // 6 — THE BAD ROW (invalid type)
        [
          "2026-06-10",
          "foo",
          "dining",
          "snack",
          "5.00",
          "cash",
          "false",
          "avoidable",
          "",
        ],
        // 7
        [
          "2026-06-10",
          "expense",
          "health",
          "pharmacy",
          "15",
          "cash",
          "true",
          "essential",
          "",
        ],
        // 8
        [
          "2026-06-10",
          "expense",
          "shopping",
          "shirt",
          "30",
          "card",
          "false",
          "avoidable",
          "",
        ],
        // 9
        [
          "2026-06-10",
          "expense",
          "home_variable",
          "cleaning",
          "10",
          "cash",
          "false",
          "controllable",
          "",
        ],
        // 10
        [
          "2026-06-10",
          "expense",
          "extra",
          "misc",
          "2",
          "cash",
          "false",
          "avoidable",
          "",
        ],
      ];
      const csv = [VALID_HEADER, ...rows.map((r) => r.join(","))].join("\n");
      const result = importCSV(csv);
      // The headline contract: no partial commit.
      expect(result.ok).toEqual([]);
      // 1 error reported for the 7th data row (1-indexed = 7).
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.row).toBe(7);
      expect(result.errors[0]?.message.toLowerCase()).toContain("type");
    });

    it("rejects rows with an invalid amount (negative or non-numeric)", () => {
      const csv = [
        VALID_HEADER,
        "2026-06-10,expense,groceries,bad,not-a-number,cash,true,controllable,",
      ].join("\n");
      const result = importCSV(csv);
      expect(result.ok).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message.toLowerCase()).toContain("amount");
    });

    it("rejects rows with an invalid classification", () => {
      const csv = [
        VALID_HEADER,
        "2026-06-10,expense,groceries,bad,5,cash,true,purple,",
      ].join("\n");
      const result = importCSV(csv);
      expect(result.ok).toEqual([]);
      expect(result.errors[0]?.message.toLowerCase()).toContain(
        "classification",
      );
    });

    it("rejects rows with a category not in DEFAULT_CATEGORIES", () => {
      const csv = [
        VALID_HEADER,
        "2026-06-10,expense,unknown-category,bad,5,cash,true,controllable,",
      ].join("\n");
      const result = importCSV(csv);
      expect(result.ok).toEqual([]);
      expect(result.errors[0]?.message.toLowerCase()).toContain("category");
    });

    it("rejects rows with an invalid IsoDate", () => {
      const csv = [
        VALID_HEADER,
        "2026/06/10,expense,groceries,bad,5,cash,true,controllable,",
      ].join("\n");
      const result = importCSV(csv);
      expect(result.ok).toEqual([]);
      expect(result.errors[0]?.message.toLowerCase()).toContain("date");
    });

    it("imports an all-valid CSV and returns the transactions in ok", () => {
      const csv = [
        VALID_HEADER,
        "2026-06-10,expense,groceries,milk,3.50,cash,true,controllable,",
        "2026-06-10,expense,dining,lunch,12.00,card,false,avoidable,with friends",
      ].join("\n");
      const result = importCSV(csv);
      expect(result.errors).toEqual([]);
      expect(result.ok).toHaveLength(2);
      expect(result.ok[0]?.category).toBe("groceries");
      expect(result.ok[0]?.amount.toString()).toBe("3.5");
      expect(result.ok[1]?.notes).toBe("with friends");
    });

    it("respects the explicit category-set (DEFAULT_CATEGORIES is non-empty)", () => {
      // Sanity guard against accidentally filtering the catalog to 0.
      expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(5);
    });
  });

  describe("round-trip", () => {
    it("exportCSV(importCSV(x).ok) === x for an all-valid CSV", () => {
      // Build a 2-row CSV, import it, export it, and re-parse — the
      // second import must equal the first.
      const csv1 = [
        VALID_HEADER,
        "2026-06-10,expense,groceries,milk,3.50,cash,true,controllable,note1",
        "2026-06-11,expense,dining,lunch,12.00,card,false,avoidable,note2",
      ].join("\n");
      const r1 = importCSV(csv1);
      expect(r1.errors).toEqual([]);
      const csv2 = exportCSV(r1.ok);
      const r2 = importCSV(csv2);
      expect(r2.errors).toEqual([]);
      // The two parsed sets must have the same length and fields.
      expect(r2.ok).toHaveLength(r1.ok.length);
      for (let i = 0; i < r1.ok.length; i++) {
        const a = r1.ok[i];
        const b = r2.ok[i];
        expect(a?.date).toBe(b?.date);
        expect(a?.type).toBe(b?.type);
        expect(a?.category).toBe(b?.category);
        expect(a?.amount.toString()).toBe(b?.amount.toString());
        expect(a?.classification).toBe(b?.classification);
      }
    });
  });
});
