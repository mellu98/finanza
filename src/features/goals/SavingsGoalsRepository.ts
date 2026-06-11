/**
 * Repository contract for `SavingsGoal[]` persistence.
 *
 * The savings-goal list is a flat collection — no active pointer.
 * The repository stores the entire list under a single key and
 * supports append / remove / replace operations.
 */
import type { SavingsGoal } from "./savingsGoal";

export interface SavingsGoalsRepository {
  /** All persisted goals, or `[]` when none. */
  getAll(): Promise<ReadonlyArray<SavingsGoal>>;

  /** Replace the entire list. */
  saveAll(goals: ReadonlyArray<SavingsGoal>): Promise<void>;

  /**
   * Append a goal. If a goal with the same id already exists, it is
   * updated in place (idempotent upsert).
   */
  add(goal: SavingsGoal): Promise<void>;

  /**
   * Remove the goal with the given id. Returns `true` when a goal
   * was removed, `false` when no such id existed.
   */
  remove(id: string): Promise<boolean>;
}
