/**
 * localforage-backed `TransactionRepository`.
 *
 * Stores the entire list of `Transaction` under a single
 * `LIST_KEY` entry in a dedicated localforage instance
 * (`daily-financial-coach/dfc:transactions`). The list is small
 * enough (a few hundred rows per year for a typical user) that the
 * single-blob approach is faster than per-row entries.
 *
 * Money is preserved via a `{ __big: "<value>" }` envelope (matches
 * the `MonthlyPlan` repo's serialise / deserialise pair). For
 * transactions the same envelope is used for the `amount` field.
 */
import localforage from "localforage";
import type { TransactionRepository } from "./TransactionRepository";
import type { Transaction } from "./transaction";

const LIST_KEY = "__list__";
const DB_NAME = "daily-financial-coach";
const STORE_NAME = "dfc:transactions";

const serialise = (value: unknown): unknown => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(serialise);
  // big.js 7 shadows `Big.prototype.constructor` to `Object`, so a
  // class-name check is unreliable. We duck-type by the internal
  // `s`/`e`/`c` fields (sign, exponent, coefficient) that every
  // Big instance carries.
  if (
    "s" in (value as Record<string, unknown>) &&
    "e" in (value as Record<string, unknown>) &&
    "c" in (value as Record<string, unknown>) &&
    Array.isArray((value as Record<string, unknown>).c)
  ) {
    return { __big: (value as { toString: () => string }).toString() };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = serialise(v);
  }
  return out;
};

const deserialise = (value: unknown): unknown => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(deserialise);
  if (
    "__big" in (value as Record<string, unknown>) &&
    typeof (value as Record<string, unknown>).__big === "string"
  ) {
    return (value as { __big: string }).__big;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = deserialise(v);
  }
  return out;
};

const deserialiseTransaction = (raw: unknown): Transaction =>
  deserialise(raw) as Transaction;

export class localForageTransactionRepository implements TransactionRepository {
  private readonly db;

  constructor() {
    this.db = localforage.createInstance({
      name: DB_NAME,
      storeName: STORE_NAME,
    });
  }

  async getAll(): Promise<ReadonlyArray<Transaction>> {
    const raw = await this.db.getItem<unknown[]>(LIST_KEY);
    if (!raw) return [];
    return raw.map(deserialiseTransaction);
  }

  async saveAll(transactions: ReadonlyArray<Transaction>): Promise<void> {
    await this.db.setItem(LIST_KEY, serialise(transactions));
  }

  async add(transaction: Transaction): Promise<void> {
    const list = (await this.getAll()) as Transaction[];
    const idx = list.findIndex((t) => t.id === transaction.id);
    if (idx >= 0) {
      list[idx] = transaction;
    } else {
      list.push(transaction);
    }
    await this.saveAll(list);
  }

  async remove(id: string): Promise<boolean> {
    const list = (await this.getAll()) as Transaction[];
    const next = list.filter((t) => t.id !== id);
    if (next.length === list.length) return false;
    await this.saveAll(next);
    return true;
  }
}
