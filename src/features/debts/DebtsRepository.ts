/**
 * Repository contract for `Debt[]` persistence.
 *
 * The debt list is a flat collection — no active pointer. The
 * repository stores the entire list under a single key and supports
 * append / remove / replace operations.
 */
import type { Debt } from "./debt";

export interface DebtsRepository {
  /** All persisted debts, or `[]` when none. */
  getAll(): Promise<ReadonlyArray<Debt>>;

  /** Replace the entire list. */
  saveAll(debts: ReadonlyArray<Debt>): Promise<void>;

  /**
   * Append a debt. If a debt with the same id already exists, it is
   * updated in place (idempotent upsert).
   */
  add(debt: Debt): Promise<void>;

  /**
   * Remove the debt with the given id. Returns `true` when a debt
   * was removed, `false` when no such id existed.
   */
  remove(id: string): Promise<boolean>;
}
