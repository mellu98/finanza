/**
 * Savings-goal engine.
 *
 * Computes the daily saving quota per goal and the progress percentage.
 *   quota           = (target - current) / daysUntilDeadline
 *   daysUntilDeadline = (deadline - today) in whole days + 1
 *
 * When `daysUntilDeadline <= 0` the engine returns the full remaining
 * amount in a one-shot quota and flags the goal `overdue: true`.
 * Progress is rounded to 1 decimal; `target === 0` returns 0.
 *
 * Pure TS — no React, no fetch, no localforage, no `new Date()`.
 */
import Big from "big.js";
import type { SavingsGoal } from "./domain";
import {
  EngineError,
  type EngineErrorDetail,
  engineErr,
  ok,
  type Result,
} from "./engineErrors";
import { daysBetween, type IsoDate } from "./isoDate";
import type { DisplayMoney, Money } from "./money";
import { roundHalfUp } from "./money";

const ZERO = new Big(0);

export interface DailySavingRequiredResult {
  quota: Money;
  overdue: boolean;
}

/**
 * Compute the daily saving quota and overdue flag for a single goal.
 *
 * Returns `Result<DailySavingRequiredResult, EngineErrorDetail>`. On
 * negative amounts or `current > target` returns `invalid-input`.
 */
export const computeDailySavingRequired = (
  goal: SavingsGoal,
  today: IsoDate,
): Result<DailySavingRequiredResult, EngineErrorDetail> => {
  if (goal.targetAmount.lt(ZERO)) {
    return engineErr(
      EngineError.InvalidInput,
      "targetAmount must be non-negative",
      { targetAmount: goal.targetAmount.toString() },
    );
  }
  if (goal.currentAmount.lt(ZERO)) {
    return engineErr(
      EngineError.InvalidInput,
      "currentAmount must be non-negative",
      { currentAmount: goal.currentAmount.toString() },
    );
  }
  if (goal.currentAmount.gt(goal.targetAmount)) {
    return engineErr(
      EngineError.InvalidInput,
      "currentAmount must not exceed targetAmount",
      {
        currentAmount: goal.currentAmount.toString(),
        targetAmount: goal.targetAmount.toString(),
      },
    );
  }

  const remaining = goal.targetAmount.minus(goal.currentAmount);
  // `daysBetween` is a calendar-day diff. Per the spec:
  //   - deadline in the future → `daysUntilDeadline > 0`, use the formula
  //   - deadline === today → `daysUntilDeadline == 0`, overdue + one-shot
  //   - deadline in the past → `daysUntilDeadline < 0`, overdue + one-shot
  const daysUntilDeadline = daysBetween(today, goal.deadline);

  if (daysUntilDeadline <= 0) {
    // Overdue: dump the full remainder as a one-shot quota.
    return ok({ quota: remaining, overdue: true });
  }

  const daysBig = new Big(daysUntilDeadline);
  const quotaRaw = remaining.div(daysBig);
  // Round half-up to 2 dp so the per-day amount is in money precision.
  return ok({ quota: roundHalfUp(quotaRaw, 2), overdue: false });
};

/**
 * Compute the progress percentage for a single goal.
 *
 * `progressPct = (currentAmount / targetAmount) * 100`, rounded to 1 dp.
 * `targetAmount === 0` returns 0 (no division by zero). Values over 100
 * are clamped to 100.
 */
export const computeProgressPct = (goal: SavingsGoal): DisplayMoney => {
  if (goal.targetAmount.eq(ZERO)) return 0;
  const raw = goal.currentAmount.div(goal.targetAmount).times(100);
  const rounded = roundHalfUp(raw, 1).toNumber();
  // Clamp into [0, 100]. The clamp guards against `current > target`
  // that the quota function rejects.
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
};
