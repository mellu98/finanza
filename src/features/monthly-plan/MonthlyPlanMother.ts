/**
 * Object Mother for `MonthlyPlan` fixtures.
 *
 * Mirrors the Guitos `BudgetMother.testBudget(...)` pattern: a class
 * with static factory methods, each returning a valid `MonthlyPlan`
 * with sensible defaults. Per-field overrides keep the test data
 * minimal and readable.
 *
 * The defaults are pinned to a fixed "current" period (June 2026 in
 * the project fixture calendar) so tests are deterministic.
 *
 * Lives in `src/features/monthly-plan/MonthlyPlanMother.ts` per the
 * PR3 design — each feature owns its own mother.
 */
import Big from "big.js";
import type { IsoDate, IsoDateTime } from "../daily-coach/isoDate";
import { parseIsoDate, parseIsoDateTime } from "../daily-coach/isoDate";
import type { Money } from "../daily-coach/money";
import type { MonthlyPlan } from "./monthlyPlan";

const DEFAULT_PERIOD_START: IsoDate = parseIsoDate("2026-06-01");
const DEFAULT_PERIOD_END: IsoDate = parseIsoDate("2026-06-30");
const DEFAULT_NEXT_INCOME: IsoDate = parseIsoDate("2026-06-25");
const DEFAULT_CREATED_AT: IsoDateTime = parseIsoDateTime(
  "2026-06-01T00:00:00Z",
);
const DEFAULT_UPDATED_AT: IsoDateTime = parseIsoDateTime(
  "2026-06-01T00:00:00Z",
);

const ZERO: Money = new Big(0);

/** Partial-override shape for `MonthlyPlan` test fixtures. */
export type MonthlyPlanOverrides = Partial<MonthlyPlan>;

/**
 * Object Mother for `MonthlyPlan`. Static methods mirror the Guitos
 * `BudgetMother` pattern (e.g. `BudgetMother.testBudget()`).
 */
export class MonthlyPlanMother {
  /**
   * Build a valid `MonthlyPlan` with sensible defaults and per-field
   * overrides. Money fields default to `Big(0)`; `daysRemaining`
   * defaults to 10; the rest of the period fields are pinned to a
   * fixed calendar so fixtures are deterministic.
   */
  static testPlan(overrides: MonthlyPlanOverrides = {}): MonthlyPlan {
    return {
      id: overrides.id ?? "plan-test-1",
      periodStart: overrides.periodStart ?? DEFAULT_PERIOD_START,
      periodEnd: overrides.periodEnd ?? DEFAULT_PERIOD_END,
      currentBalance: overrides.currentBalance ?? ZERO,
      expectedIncomeUntilPeriodEnd:
        overrides.expectedIncomeUntilPeriodEnd ?? ZERO,
      mandatoryExpensesRemaining: overrides.mandatoryExpensesRemaining ?? ZERO,
      debtPaymentsRemaining: overrides.debtPaymentsRemaining ?? ZERO,
      savingsGoalRemaining: overrides.savingsGoalRemaining ?? ZERO,
      emergencyBuffer: overrides.emergencyBuffer ?? ZERO,
      daysRemaining: overrides.daysRemaining ?? 10,
      nextIncomeDate: overrides.nextIncomeDate ?? DEFAULT_NEXT_INCOME,
      createdAt: overrides.createdAt ?? DEFAULT_CREATED_AT,
      updatedAt: overrides.updatedAt ?? DEFAULT_UPDATED_AT,
    };
  }

  /**
   * The "empty" plan — all money fields zero, default period. Useful
   * for first-run state, onboarding, and the "no plan yet" UI.
   */
  static emptyPlan(): MonthlyPlan {
    return MonthlyPlanMother.testPlan({ id: "plan-empty" });
  }
}
