/**
 * Category-freeze selector.
 *
 * Given a list of category budgets and what was spent in each, return
 * the list of category keys that should be frozen (spent > budget).
 *
 * Output order is deterministic so the rules engine can present a
 * stable action list to the user: by overage amount descending, then
 * by category key ascending as a tie-breaker.
 */
import type { Money } from "./money";

/** Per-category budget snapshot the freeze selector consumes. */
export interface CategoryBudgetStatus {
  category: string;
  budget: Money;
  spent: Money;
}

/**
 * Pick the categories that are over budget and should be frozen.
 *
 * Deterministic ordering: overage amount desc, then category key asc.
 */
export const pickFreezeCandidates = (
  rows: ReadonlyArray<CategoryBudgetStatus>,
): ReadonlyArray<string> => {
  const over = rows
    .filter((r) => r.spent.gt(r.budget))
    .map((r) => ({
      category: r.category,
      overage: r.spent.minus(r.budget),
    }));
  over.sort((a, b) => {
    const cmp = b.overage.cmp(a.overage);
    if (cmp !== 0) return cmp;
    return a.category < b.category ? -1 : a.category > b.category ? 1 : 0;
  });
  return over.map((o) => o.category);
};
