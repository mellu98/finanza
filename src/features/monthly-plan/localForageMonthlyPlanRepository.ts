/**
 * localforage-backed `MonthlyPlanRepository`.
 *
 * Stores plans in a dedicated localforage instance (separate from
 * `daily-financial-coach/budgets` and the other feature stores). The
 * active plan id is tracked in a special `__active__` key.
 *
 * localforage stores `MonthlyPlan` objects using `JSON.stringify`
 * under the hood, which is fine because the DTO is plain data — `Big`
 * instances are reconstructed on read (see the `Big.reviver` /
 * `Big.replacer` pair in `serialise` / `deserialise`).
 */
import localforage from "localforage";
import type { MonthlyPlanRepository } from "./MonthlyPlanRepository";
import type { MonthlyPlan } from "./monthlyPlan";

const ACTIVE_KEY = "__active__";
const DB_NAME = "daily-financial-coach";
const STORE_NAME = "dfc:monthlyPlan";

/**
 * Recursively replace `Big` instances with `{ __big: "<value>" }`
 * envelopes and back, so localforage's JSON serialiser preserves
 * exact-precision money values.
 */
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

export class localForageMonthlyPlanRepository implements MonthlyPlanRepository {
  private readonly db;

  constructor() {
    this.db = localforage.createInstance({
      name: DB_NAME,
      storeName: STORE_NAME,
    });
  }

  async save(plan: MonthlyPlan): Promise<void> {
    await this.db.setItem(plan.id, serialise(plan));
    // If no active plan yet, make this one the active plan.
    const activeId = await this.db.getItem<string>(ACTIVE_KEY);
    if (!activeId) {
      await this.db.setItem(ACTIVE_KEY, plan.id);
    }
  }

  async getActive(): Promise<MonthlyPlan | undefined> {
    const activeId = await this.db.getItem<string>(ACTIVE_KEY);
    if (!activeId) return undefined;
    const raw = await this.db.getItem<unknown>(activeId);
    if (!raw) return undefined;
    return deserialise(raw) as MonthlyPlan;
  }

  async setActive(id: string): Promise<void> {
    const existing = await this.db.getItem<unknown>(id);
    if (!existing) {
      throw new Error(`Cannot set active: no plan with id "${id}"`);
    }
    await this.db.setItem(ACTIVE_KEY, id);
  }

  async getAll(): Promise<ReadonlyArray<MonthlyPlan>> {
    const keys = await this.db.keys();
    const plans: MonthlyPlan[] = [];
    for (const key of keys) {
      if (key === ACTIVE_KEY) continue;
      const raw = await this.db.getItem<unknown>(key);
      if (raw) plans.push(deserialise(raw) as MonthlyPlan);
    }
    return plans;
  }

  async get(id: string): Promise<MonthlyPlan | undefined> {
    const raw = await this.db.getItem<unknown>(id);
    if (!raw) return undefined;
    return deserialise(raw) as MonthlyPlan;
  }

  async delete(id: string): Promise<boolean> {
    const had = await this.db.getItem<unknown>(id);
    await this.db.removeItem(id);
    const activeId = await this.db.getItem<string>(ACTIVE_KEY);
    if (activeId === id) {
      await this.db.removeItem(ACTIVE_KEY);
    }
    return had !== null && had !== undefined;
  }
}
