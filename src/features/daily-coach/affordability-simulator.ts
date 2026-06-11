/**
 * Affordability simulator — "can I afford this?" answer for a
 * candidate purchase, plus the impact on today's and the next 7 days'
 * daily budgets.
 *
 * Verdict semantics:
 *   - "yes"        → the purchase fits in today's remaining budget and
 *                    does not consume more than 50 % of it
 *   - "attention"  → the purchase fits in today's budget but consumes
 *                    more than 50 % of it (borderline)
 *   - "no"         → the purchase does NOT fit in today's remaining
 *                    budget
 *
 * Effect metrics:
 *   - effectOnToday      = -amount (the user is buying today)
 *   - effectOnNextDays   = -amount / 7  (impact spread across 7 days)
 *   - newDailyBudget     = dailyBudget - amount / daysRemaining
 *
 * Pure TS — no React, no fetch, no localforage, no `new Date()`.
 */
import Big from "big.js";
import { Verdict } from "./constants";
import type { MonthlyPlan } from "./domain";
import {
  EngineError,
  type EngineErrorDetail,
  engineErr,
  ok,
  type Result,
} from "./engineErrors";
import type { DisplayMoney, Money } from "./money";
import { roundHalfUp } from "./money";

const ZERO = new Big(0);
const SEVEN = new Big(7);
const ATTENTION_THRESHOLD = new Big("0.5"); // 50% of remaining budget

export interface SimulatorInput {
  amount: Money;
  category: string;
  description?: string;
  plan: MonthlyPlan;
  todaySpent: Money;
  dailyBudget: DisplayMoney;
  daysRemaining: number;
}

export interface SimulatorResult {
  verdict: import("./constants").Verdict;
  effectOnToday: DisplayMoney;
  effectOnNextDays: DisplayMoney;
  newDailyBudget: DisplayMoney;
  coachSuggestion: string;
}

const suggestFor = (
  verdict: import("./constants").Verdict,
  category: string,
  amount: DisplayMoney,
): string => {
  switch (verdict) {
    case Verdict.Yes:
      return `Go ahead on ${category} (${amount.toFixed(2)} €).`;
    case Verdict.Attention:
      return `${category} for ${amount.toFixed(2)} € uses most of today's buffer — consider a smaller amount or defer.`;
    case Verdict.No:
      return `Skip ${category} (${amount.toFixed(2)} €) today — it would bust the daily budget.`;
  }
};

/**
 * Simulate the impact of a candidate purchase.
 *
 * Returns `Result<SimulatorResult, EngineErrorDetail>`. On negative
 * amounts or dailyBudget returns `invalid-input`.
 */
export const simulate = (
  input: SimulatorInput,
): Result<SimulatorResult, EngineErrorDetail> => {
  const { amount, category, todaySpent, dailyBudget, daysRemaining } = input;

  if (amount.lt(ZERO)) {
    return engineErr(EngineError.InvalidInput, "amount must be non-negative", {
      amount: amount.toString(),
    });
  }
  if (new Big(dailyBudget).lt(ZERO)) {
    return engineErr(
      EngineError.InvalidInput,
      "dailyBudget must be non-negative",
      { dailyBudget },
    );
  }
  if (daysRemaining <= 0) {
    return engineErr(
      EngineError.PeriodEnded,
      "simulator requires daysRemaining > 0",
      { daysRemaining },
    );
  }

  const remainingToday = new Big(dailyBudget).minus(todaySpent);
  const amountNum = amount.toNumber();

  let verdict: import("./constants").Verdict;
  if (amount.gt(remainingToday)) {
    verdict = Verdict.No;
  } else if (amount.div(remainingToday).gt(ATTENTION_THRESHOLD)) {
    verdict = Verdict.Attention;
  } else {
    verdict = Verdict.Yes;
  }

  // effectOnToday = +amount (the cost magnitude; today's remaining
  // budget shrinks by this much). Per the task spec this field is the
  // unsigned cost; the per-day horizon field carries the sign.
  const effectOnToday = amountNum;
  // effectOnNextDays = -amount / 7  (signed daily impact across the
  // next 7 days: a purchase of 14 → -2 per day).
  const effectOnNextDays = roundHalfUp(amount.div(SEVEN).neg(), 2).toNumber();
  // newDailyBudget = dailyBudget - amount / daysRemaining
  const newDailyBudget = roundHalfUp(
    new Big(dailyBudget).minus(amount.div(new Big(daysRemaining))),
    2,
  ).toNumber();

  const result: SimulatorResult = {
    verdict,
    effectOnToday,
    effectOnNextDays,
    newDailyBudget,
    coachSuggestion: suggestFor(verdict, category, amountNum),
  };
  return ok(result);
};
