/**
 * Domain DTO barrel — re-exports the per-feature DTOs.
 *
 * The DTOs were colocated in this file during PR2 to keep the engine
 * kernel self-contained. PR3 relocates them to their per-feature
 * homes so each feature owns its own contracts:
 *
 *   - `MonthlyPlan`            → `@features/monthly-plan/monthlyPlan`
 *   - `Transaction` / types    → `@features/transactions/transaction`
 *   - `CategoryDef` /
 *     `DEFAULT_CATEGORIES`     → `@features/transactions/categories`
 *   - `SavingsGoal`            → `@features/goals/savingsGoal`
 *   - `Debt` / `DebtPriority`  → `@features/debts/debt`
 *   - `CoachSettings`          → `@features/coach/coachSettings`
 *
 * Existing engine code keeps importing from this barrel so the engine
 * kernel remains a single import surface. New code should import from
 * the per-feature folders directly.
 *
 * This file MUST stay additive — do not put logic here. New DTOs go in
 * their feature folder; the barrel just re-exports them.
 */

export type { CoachSettings } from "../coach/coachSettings";
export type { Debt } from "../debts/debt";
export {
  DebtPriority,
  type DebtPriority as DebtPriorityT,
} from "../debts/debt";
export type { SavingsGoal } from "../goals/savingsGoal";
export type { MonthlyPlan } from "../monthly-plan/monthlyPlan";
export type { CategoryDef } from "../transactions/categories";
export { DEFAULT_CATEGORIES } from "../transactions/categories";
export type { Transaction } from "../transactions/transaction";
export {
  type CategoryBudget,
  Classification,
  type Classification as ClassificationT,
  TransactionType,
  type TransactionType as TransactionTypeT,
} from "../transactions/transaction";
