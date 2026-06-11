/**
 * Test plan for the daily-budget engine — the deterministic core of the
 * Daily Financial Coach product.
 *
 * The FIRST THREE `it()` blocks in this file are the 3 mandatory
 * scenarios pinned verbatim from `sdd/daily-coach/spec/daily-budget-engine`.
 * They are the contract the verify phase refuses to let drift.
 */
import Big from "big.js";
import { describe, expect, it } from "vitest";
import {
  computeDailyBudget,
  type DailyBudgetInput,
} from "./daily-budget-engine";
import {
  dayBefore,
  makePlan,
  makeTransaction,
  TODAY,
  YESTERDAY,
} from "./daily-budget-engine.mother";
import { computeOverspendRecovery } from "./overspend-recovery";

/** Big helper — turn a number-or-string into a `Big` of the right value. */
const big = (v: number | string) => new Big(v);

describe("daily-budget-engine", () => {
  // ----- 3 mandatory scenarios (pinned verbatim from the spec) -----

  it("Scenario: Happy path — green status (dailyBudget=11.00, status='green')", () => {
    // GIVEN current_balance=600, expected_income=0, mandatory=460,
    //       debt=0, savings=30, emergency=0, days_remaining=10
    const plan = makePlan({
      currentBalance: big(600),
      expectedIncomeUntilPeriodEnd: big(0),
      mandatoryExpensesRemaining: big(460),
      debtPaymentsRemaining: big(0),
      savingsGoalRemaining: big(30),
      emergencyBuffer: big(0),
      daysRemaining: 10,
    });
    const input: DailyBudgetInput = {
      plan,
      transactions: [],
      goals: [],
      debts: [],
      evaluationDate: TODAY,
    };

    // WHEN computeDailyBudget runs
    const result = computeDailyBudget(input);

    // THEN daily_budget = 11.00 and status = "green"
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dailyBudgetRounded).toBeCloseTo(11, 2);
    expect(result.value.status).toBe("green");
  });

  it("Scenario: Overspend recovery (overspend=9, newDailyBudget=10.00 ±0.01, forecast=110)", () => {
    // GIVEN daily_budget=11, spent_today=20, days_remaining=9
    const recovery = computeOverspendRecovery(big(11), big(20), 9);

    // THEN overspend = 9 and new_daily_budget = 10.00 (±0.01)
    expect(recovery.ok).toBe(true);
    if (!recovery.ok) return;
    expect(recovery.value.overspend.toNumber()).toBe(9);
    expect(recovery.value.newDailyBudget.toNumber()).toBeCloseTo(10, 2);

    // The end-of-period forecast for the spec's scenario 3 inputs is 110.
    // Pinned here so that running the recovery suite always exercises
    // the forecast formula too.
    const plan = makePlan({
      currentBalance: big(600),
      expectedIncomeUntilPeriodEnd: big(0),
      mandatoryExpensesRemaining: big(460),
      debtPaymentsRemaining: big(0),
      savingsGoalRemaining: big(30),
      emergencyBuffer: big(0),
      daysRemaining: 10,
    });
    const daily = computeDailyBudget({
      plan,
      transactions: [],
      goals: [],
      debts: [],
      evaluationDate: TODAY,
    });
    expect(daily.ok).toBe(true);
    if (!daily.ok) return;
    expect(daily.value.forecastRounded).toBe(110);
  });

  it("Scenario: End-of-period forecast = 110", () => {
    // GIVEN current_balance=600, expected_income=0, mandatory=460,
    //       debt=0, savings=30, emergency=0
    const plan = makePlan({
      currentBalance: big(600),
      expectedIncomeUntilPeriodEnd: big(0),
      mandatoryExpensesRemaining: big(460),
      debtPaymentsRemaining: big(0),
      savingsGoalRemaining: big(30),
      emergencyBuffer: big(0),
      daysRemaining: 10,
    });
    const input: DailyBudgetInput = {
      plan,
      transactions: [],
      goals: [],
      debts: [],
      evaluationDate: TODAY,
    };

    // WHEN computeDailyBudget runs
    const result = computeDailyBudget(input);

    // THEN forecast = 110
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.forecastRounded).toBe(110);
  });

  // ----- Extra scenarios (yellow, red, period-ended, purity) -----

  it("yellow at 7 €/day", () => {
    // (70 - 0 - 0 - 0 - 0 - 0) / 10 = 7 → yellow
    const plan = makePlan({
      currentBalance: big(70),
      daysRemaining: 10,
    });
    const result = computeDailyBudget({
      plan,
      transactions: [],
      goals: [],
      debts: [],
      evaluationDate: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dailyBudgetRounded).toBeCloseTo(7, 2);
    expect(result.value.status).toBe("yellow");
  });

  it("red on negative result (obligations exceed balance + income)", () => {
    // (0 - 0 - 200 - 0 - 0 - 0) / 10 = -20 → red
    const plan = makePlan({
      currentBalance: big(0),
      mandatoryExpensesRemaining: big(200),
      daysRemaining: 10,
    });
    const result = computeDailyBudget({
      plan,
      transactions: [],
      goals: [],
      debts: [],
      evaluationDate: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("red");
    expect(result.value.dailyBudgetRounded).toBeLessThan(0);
  });

  it("period-ended sentinel: daysRemaining=0 returns periodEnded=true (no division by zero)", () => {
    const plan = makePlan({ daysRemaining: 0 });
    const result = computeDailyBudget({
      plan,
      transactions: [],
      goals: [],
      debts: [],
      evaluationDate: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.periodEnded).toBe(true);
    expect(result.value.daysRemaining).toBe(0);
    // dailyBudget should be 0 (no division performed)
    expect(result.value.dailyBudgetRounded).toBe(0);
  });

  it("rounding stability: a value that would round to 10.00 keeps status='green'", () => {
    // 99.999 / 10 = 9.9999 → rounded to 2 dp = 10.00 → green
    const plan = makePlan({
      currentBalance: big(99.999),
      daysRemaining: 10,
    });
    const result = computeDailyBudget({
      plan,
      transactions: [],
      goals: [],
      debts: [],
      evaluationDate: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("green");
  });

  it("spentToday: sums transactions dated on evaluationDate only", () => {
    const plan = makePlan({
      currentBalance: big(100),
      daysRemaining: 5,
    });
    const result = computeDailyBudget({
      plan,
      transactions: [
        makeTransaction({ date: TODAY, amount: big(10) }),
        makeTransaction({ date: TODAY, amount: big(7) }),
        makeTransaction({ date: YESTERDAY, amount: big(50) }),
        makeTransaction({ date: dayBefore(YESTERDAY, 1), amount: big(99) }),
      ],
      goals: [],
      debts: [],
      evaluationDate: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 10 + 7 = 17 today
    expect(result.value.spentToday).toBeCloseTo(17, 2);
  });

  it("is pure: two calls with the same input return structurally equal outputs", () => {
    const plan = makePlan({ currentBalance: big(100), daysRemaining: 5 });
    const input: DailyBudgetInput = {
      plan,
      transactions: [],
      goals: [],
      debts: [],
      evaluationDate: TODAY,
    };
    const a = computeDailyBudget(input);
    const b = computeDailyBudget(input);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    // compare numeric results
    expect(a.value.dailyBudgetRounded).toBe(b.value.dailyBudgetRounded);
    expect(a.value.forecastRounded).toBe(b.value.forecastRounded);
    expect(a.value.status).toBe(b.value.status);
    expect(a.value.spentToday).toBe(b.value.spentToday);
  });
});
