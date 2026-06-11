/**
 * Debts engine — priority order, installment pressure, and an
 * affordability predicate. Pure TS, no side effects.
 */
import Big from "big.js";
import type { Debt, MonthlyPlan } from "./domain";
import { daysBetween, type IsoDate } from "./isoDate";
import type { Money } from "./money";

const ZERO = new Big(0);

/**
 * Sort debts by `priority` asc, then by `nextDueDate` asc. Pure — does
 * not mutate the input array.
 */
export const sortDebts = (debts: ReadonlyArray<Debt>): ReadonlyArray<Debt> =>
  [...debts].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.nextDueDate < b.nextDueDate
      ? -1
      : a.nextDueDate > b.nextDueDate
        ? 1
        : 0;
  });

/**
 * Sum of `monthlyInstallment` for every debt whose `nextDueDate` falls
 * inside the Monthly Plan period (today inclusive, periodEnd inclusive).
 */
export const debtPaymentsRemainingInPeriod = (
  debts: ReadonlyArray<Debt>,
  periodEnd: IsoDate,
  today: IsoDate,
): Money => {
  let total = ZERO;
  for (const d of debts) {
    // `daysBetween` returns the calendar diff in days. A non-negative
    // diff means the due date is at or after `today`; a diff <= the
    // period's remaining length means it is on or before `periodEnd`.
    const daysUntilDue = daysBetween(today, d.nextDueDate);
    const daysInPeriod = daysBetween(today, periodEnd);
    if (daysUntilDue >= 0 && daysUntilDue <= daysInPeriod) {
      total = total.plus(d.monthlyInstallment);
    }
  }
  return total;
};

/**
 * `true` when the user can afford the debt's installment given their
 * current plan:
 *
 *   currentBalance >= remainingAmount + emergencyBuffer + 0.5 * monthlyInstallment
 *
 * Per the spec the threshold is STRICT (`>=` is "can afford"); the
 * boundary test in `debts-engine.test.ts` pins the strict-`>=` semantic.
 */
export const canAffordInstallment = (
  debt: Debt,
  plan: MonthlyPlan,
): boolean => {
  const threshold = debt.remainingAmount
    .plus(plan.emergencyBuffer)
    .plus(debt.monthlyInstallment.times(new Big("0.5")));
  return plan.currentBalance.gte(threshold);
};

/** `true` when the debt's `nextDueDate` is strictly before `today`. */
export const isDebtOverdue = (debt: Debt, today: IsoDate): boolean =>
  debt.nextDueDate < today;
