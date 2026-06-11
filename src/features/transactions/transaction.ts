/**
 * Transaction entity and its value objects.
 *
 * A single income or expense row. The transaction carries enough
 * metadata for the engine to classify, aggregate, and project without
 * re-querying the user.
 *
 * Money amounts are `big.js` `Big` instances (the `Money` type from
 * `@features/daily-coach/money`).
 *
 * Relocated from `src/features/daily-coach/domain.ts` in PR3 (carry-forward
 * of PR2 deviation #6).
 */
import type { IsoDate } from "../daily-coach/isoDate";
import type { Money } from "../daily-coach/money";

/* ---------- Transaction types ---------- */

export const TransactionType = {
  Income: "income",
  Expense: "expense",
} as const;
export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

/* ---------- Classification ---------- */

export const Classification = {
  Essential: "essential",
  Controllable: "controllable",
  Avoidable: "avoidable",
} as const;
export type Classification =
  (typeof Classification)[keyof typeof Classification];

/* ---------- Per-category budget (carry-forward from PR2 deviation #3) ---------- */

/**
 * Per-category budget cap. A user-set spending limit for a specific
 * category within the current period. When supplied, the coach rules
 * engine uses it directly in place of the 30%-of-period heuristic
 * (which was a stopgap while the data model lived only in the engine
 * kernel, see PR2 apply-progress deviation #3).
 *
 * PR3 introduces the data model only; PR4+ refactors the freeze
 * selector to consume it. Stored on `Transaction.categoryBudget` for
 * discoverability and on a per-feature `categoryBudgets` list in the
 * Monthly Plan in PR4+.
 */
export interface CategoryBudget {
  /** Stable category key (matches `Transaction.category` and `CategoryDef.key`). */
  category: string;
  /** Cap for the period, in the user's base currency. */
  amount: Money;
}

/* ---------- Transaction ---------- */

export interface Transaction {
  id: string;
  date: IsoDate;
  type: TransactionType;
  category: string;
  description: string;
  amount: Money;
  paymentMethod?: string;
  necessary: boolean;
  classification: Classification;
  notes?: string;
  /**
   * Optional per-category budget cap for this transaction's category.
   * When present, the coach rules engine and the per-category freeze
   * selector use it directly; when absent, they fall back to the
   * 30%-of-period heuristic (legacy behaviour, carried forward from
   * PR2 deviation #3).
   *
   * PR3 introduces the data model; PR4+ refactors the engine to consume
   * it.
   */
  categoryBudget?: Money;
}
