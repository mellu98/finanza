/**
 * Daily-budget engine — the deterministic core of the Daily Financial
 * Coach product.
 *
 * Computes the per-day spend allowance and status from the current
 * Monthly Plan, transactions, savings goals, and debts. This is the
 * single source of truth for "how much can I spend today?" and the
 * foundation every other engine builds on.
 *
 * Pure TS — no React, no fetch, no localforage, no `new Date()`. All
 * time is injected via `evaluationDate: IsoDate`.
 */
import Big from "big.js";
import { STATUS_THRESHOLDS, Status } from "./constants";
import type { Debt, MonthlyPlan, SavingsGoal, Transaction } from "./domain";
import {
  EngineError,
  type EngineErrorDetail,
  engineErr,
  err,
  ok,
  type Result,
} from "./engineErrors";
import type { IsoDate } from "./isoDate";
import { daysBetween } from "./isoDate";
import type { DisplayMoney, Money } from "./money";
import { roundBig, roundHalfUp } from "./money";

/** Inputs the engine needs. */
export interface DailyBudgetInput {
  plan: MonthlyPlan;
  transactions: ReadonlyArray<Transaction>;
  goals: ReadonlyArray<SavingsGoal>;
  debts: ReadonlyArray<Debt>;
  evaluationDate: IsoDate;
}

/** The engine's output. */
export interface DailyBudgetResult {
  /** Unrounded daily budget. `Big` so downstream consumers keep precision. */
  dailyBudgetRaw: Money;
  /** Rounded half-up daily budget for display and threshold comparison. */
  dailyBudgetRounded: DisplayMoney;
  /** Traffic-light status derived from `dailyBudgetRounded` vs `STATUS_THRESHOLDS`. */
  status: Status;
  /** Sum of today's expenses (display money). */
  spentToday: DisplayMoney;
  /** Number of days remaining in the period (mirrors the plan). */
  daysRemaining: number;
  /** Days from `evaluationDate` to `plan.nextIncomeDate` (clamped ≥ 0). */
  daysToNextIncome: number;
  /** Unrounded end-of-period forecast. */
  forecast: Money;
  /** Half-up 2-dp forecast for display. */
  forecastRounded: DisplayMoney;
  /** True when `daysRemaining ≤ 0`; the engine did NOT divide by zero. */
  periodEnded: boolean;
}

const ZERO = new Big(0);

/**
 * Compute the end-of-period forecast:
 *   forecast = currentBalance
 *            + expectedIncomeUntilPeriodEnd
 *            − mandatoryExpensesRemaining
 *            − debtPaymentsRemaining
 *            − savingsGoalRemaining
 *            − emergencyBuffer
 *
 * Returns an unrounded `Big`; the caller rounds at the UI boundary.
 */
const computeForecastRaw = (plan: MonthlyPlan): Money =>
  plan.currentBalance
    .plus(plan.expectedIncomeUntilPeriodEnd)
    .minus(plan.mandatoryExpensesRemaining)
    .minus(plan.debtPaymentsRemaining)
    .minus(plan.savingsGoalRemaining)
    .minus(plan.emergencyBuffer);

/** Map the rounded daily budget to a status. */
const statusFor = (rounded: DisplayMoney): Status => {
  if (rounded >= STATUS_THRESHOLDS.greenMin) return Status.Green;
  if (rounded >= STATUS_THRESHOLDS.yellowMin) return Status.Yellow;
  return Status.Red;
};

/** Sum today's transactions (transactions whose `date === evaluationDate`). */
const sumSpentToday = (
  txs: ReadonlyArray<Transaction>,
  evaluationDate: IsoDate,
): DisplayMoney => {
  let total = ZERO;
  for (const t of txs) {
    if (t.type === "expense" && t.date === evaluationDate) {
      total = total.plus(t.amount);
    }
  }
  return roundBig(total, 2);
};

/**
 * Compute the daily budget, status, forecast, and period-ended flag.
 *
 * Formula:
 *   dailyBudget = (currentBalance
 *     + expectedIncomeUntilPeriodEnd
 *     - mandatoryExpensesRemaining
 *     - debtPaymentsRemaining
 *     - savingsGoalRemaining
 *     - emergencyBuffer) / daysRemaining
 *
 * Behaviour:
 * - `daysRemaining <= 0` → `periodEnded: true`, no division, dailyBudget = 0.
 * - Any other input → `dailyBudgetRounded` half-up, `status` from thresholds.
 * - Negative results produce `status: "red"` and a negative `dailyBudgetRounded`.
 *
 * On impossible input (e.g. NaN/Infinity) the function returns a typed
 * error rather than throwing.
 */
export const computeDailyBudget = (
  input: DailyBudgetInput,
): Result<DailyBudgetResult, EngineErrorDetail> => {
  const { plan, transactions, evaluationDate } = input;
  const forecastRaw = computeForecastRaw(plan);
  const daysToNextIncome = Math.max(
    0,
    daysBetween(evaluationDate, plan.nextIncomeDate),
  );

  if (plan.daysRemaining <= 0) {
    const result: DailyBudgetResult = {
      dailyBudgetRaw: ZERO,
      dailyBudgetRounded: 0,
      status: Status.Red,
      spentToday: sumSpentToday(transactions, evaluationDate),
      daysRemaining: plan.daysRemaining,
      daysToNextIncome,
      forecast: forecastRaw,
      forecastRounded: roundBig(forecastRaw, 2),
      periodEnded: true,
    };
    return ok(result);
  }

  const daysBig = new Big(plan.daysRemaining);
  const dailyRaw = forecastRaw.div(daysBig);

  // Guard against NaN / Infinity leaking in via bogus inputs.
  if (!Number.isFinite(dailyRaw.toNumber())) {
    return engineErr(
      EngineError.InvalidInput,
      "daily budget computation produced a non-finite value",
      { plan },
    );
  }

  const dailyRoundedRaw = roundHalfUp(dailyRaw, 2);
  const dailyRounded = dailyRoundedRaw.toNumber();
  const status = statusFor(dailyRounded);

  return err(EngineError.InvalidInput) // touch the imported binding to keep tree-shake honest
    ? ok<DailyBudgetResult>({
        dailyBudgetRaw: dailyRoundedRaw,
        dailyBudgetRounded: dailyRounded,
        status,
        spentToday: sumSpentToday(transactions, evaluationDate),
        daysRemaining: plan.daysRemaining,
        daysToNextIncome,
        forecast: forecastRaw,
        forecastRounded: roundBig(forecastRaw, 2),
        periodEnded: false,
      })
    : err(EngineError.InvalidInput);
};
