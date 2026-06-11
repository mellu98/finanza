/**
 * Overspend recovery — given a target daily budget, how much was
 * overspent today, and how much is left to spend per day for the
 * remaining days of the period.
 *
 * Spec scenario:
 *   dailyBudget = 11, spentToday = 20, daysRemaining = 9
 *     → overspend = 9
 *     → newDailyBudget = 10.00 (rounded half-up, ±0.01)
 *
 * `daysRemaining <= 0` is impossible: you cannot recover a period that
 * has already ended. The function returns a typed `period-ended` error.
 */
import Big from "big.js";
import {
  EngineError,
  type EngineErrorDetail,
  engineErr,
  ok,
  type Result,
} from "./engineErrors";
import type { Money } from "./money";
import { roundHalfUp } from "./money";

export interface OverspendRecoveryResult {
  /** Amount over today's daily budget (always ≥ 0 when ok). */
  overspend: Money;
  /** New per-day allowance for the remaining days (always ≥ 0 when ok). */
  newDailyBudget: Money;
}

const ZERO = new Big(0);

/**
 * Compute the overspend-recovery numbers.
 *
 *   overspend      = max(spentToday - dailyBudget, 0)
 *   dailyReduction = overspend / daysRemaining
 *   newDailyBudget = max(dailyBudget - dailyReduction, 0)
 *
 * Per the spec scenario (dailyBudget=11, spentToday=20, daysRemaining=9):
 *   overspend      = 9
 *   dailyReduction = 9 / 9 = 1
 *   newDailyBudget = 11 - 1 = 10.00
 *
 * - Returns `Result<OverspendRecoveryResult, EngineErrorDetail>`.
 * - Returns `period-ended` error when `daysRemaining <= 0`.
 * - Returns `invalid-input` error when `dailyBudget < 0` or `spentToday < 0`.
 */
export const computeOverspendRecovery = (
  dailyBudget: Money,
  spentToday: Money,
  daysRemaining: number,
): Result<OverspendRecoveryResult, EngineErrorDetail> => {
  if (daysRemaining <= 0) {
    return engineErr(
      EngineError.PeriodEnded,
      "cannot recover a period that has already ended",
      { daysRemaining },
    );
  }
  if (dailyBudget.lt(ZERO) || spentToday.lt(ZERO)) {
    return engineErr(
      EngineError.InvalidInput,
      "dailyBudget and spentToday must be non-negative",
      {
        dailyBudget: dailyBudget.toString(),
        spentToday: spentToday.toString(),
      },
    );
  }

  // big.js has no static Big.max; emulate with .gt(...) ? a : b.
  const overspendRaw = spentToday.minus(dailyBudget).gt(ZERO)
    ? spentToday.minus(dailyBudget)
    : ZERO;
  const daysBig = new Big(daysRemaining);
  const dailyReductionRaw = overspendRaw.div(daysBig);
  const newDailyRaw = dailyBudget.minus(dailyReductionRaw).gt(ZERO)
    ? dailyBudget.minus(dailyReductionRaw)
    : ZERO;

  return ok({
    overspend: overspendRaw,
    newDailyBudget: roundHalfUp(newDailyRaw, 2),
  });
};
