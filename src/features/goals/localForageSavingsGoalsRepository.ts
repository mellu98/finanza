/**
 * localforage-backed `SavingsGoalsRepository`.
 *
 * Stores the entire list of `SavingsGoal` under a single `LIST_KEY`
 * entry in a dedicated localforage instance
 * (`daily-financial-coach/dfc:goals`). Same single-blob strategy as
 * the transactions repo.
 *
 * Money is preserved via a `{ __big: "<value>" }` envelope
 * (matches the `MonthlyPlan` and `Transaction` repos).
 */
import localforage from "localforage";
import type { SavingsGoalsRepository } from "./SavingsGoalsRepository";
import type { SavingsGoal } from "./savingsGoal";

const LIST_KEY = "__list__";
const DB_NAME = "daily-financial-coach";
const STORE_NAME = "dfc:goals";

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

const deserialiseGoal = (raw: unknown): SavingsGoal =>
  deserialise(raw) as SavingsGoal;

export class localForageSavingsGoalsRepository
  implements SavingsGoalsRepository
{
  private readonly db;

  constructor() {
    this.db = localforage.createInstance({
      name: DB_NAME,
      storeName: STORE_NAME,
    });
  }

  async getAll(): Promise<ReadonlyArray<SavingsGoal>> {
    const raw = await this.db.getItem<unknown[]>(LIST_KEY);
    if (!raw) return [];
    return raw.map(deserialiseGoal);
  }

  async saveAll(goals: ReadonlyArray<SavingsGoal>): Promise<void> {
    await this.db.setItem(LIST_KEY, serialise(goals));
  }

  async add(goal: SavingsGoal): Promise<void> {
    const list = (await this.getAll()) as SavingsGoal[];
    const idx = list.findIndex((g) => g.id === goal.id);
    if (idx >= 0) {
      list[idx] = goal;
    } else {
      list.push(goal);
    }
    await this.saveAll(list);
  }

  async remove(id: string): Promise<boolean> {
    const list = (await this.getAll()) as SavingsGoal[];
    const next = list.filter((g) => g.id !== id);
    if (next.length === list.length) return false;
    await this.saveAll(next);
    return true;
  }
}
