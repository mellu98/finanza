/**
 * MonthlyPlan entity.
 *
 * The user's plan for the current period: balances, expected income,
 * remaining obligations, and the countdown to the next income date.
 * Single source of truth for "how much can I spend today?" — consumed
 * by the daily-budget engine and the monthly-plan form.
 *
 * Money fields are `big.js` `Big` instances (the `Money` type from
 * `@features/daily-coach/money`) to avoid floating-point drift.
 *
 * Relocated from `src/features/daily-coach/domain.ts` in PR3 (carry-forward
 * of PR2 deviation #6).
 */
import type { IsoDate, IsoDateTime } from "../daily-coach/isoDate";
import type { Money } from "../daily-coach/money";

export interface MonthlyPlan {
  id: string;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  currentBalance: Money;
  expectedIncomeUntilPeriodEnd: Money;
  mandatoryExpensesRemaining: Money;
  debtPaymentsRemaining: Money;
  savingsGoalRemaining: Money;
  emergencyBuffer: Money;
  daysRemaining: number;
  nextIncomeDate: IsoDate;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
