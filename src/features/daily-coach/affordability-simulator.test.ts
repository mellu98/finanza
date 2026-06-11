/**
 * Test plan for the affordability simulator.
 *
 * Given a candidate purchase (amount + category), the current plan,
 * today's spend, and the daily budget, return a verdict:
 *   - "yes"     → can afford and the impact is minimal
 *   - "no"      → cannot afford within today's allowance
 *   - "attention" → borderline (large purchase that erodes the daily buffer)
 *
 * Also returns:
 *   - effectOnToday       (DisplayMoney)  — impact on today's remaining budget
 *   - effectOnNextDays    (DisplayMoney)  — impact across the next 7 days
 *   - newDailyBudget      (DisplayMoney)  — recomputed daily allowance
 *   - coachSuggestion     (string)        — template-driven hint
 */
import Big from "big.js";
import { describe, expect, it } from "vitest";
import { type SimulatorInput, simulate } from "./affordability-simulator";
import { Verdict } from "./constants";
import { makePlan } from "./daily-budget-engine.mother";

const big = (v: number | string) => new Big(v);

const baseInput = (
  overrides: Partial<SimulatorInput> = {},
): SimulatorInput => ({
  amount: big(20),
  category: "groceries",
  plan: makePlan({ currentBalance: big(200), daysRemaining: 10 }),
  todaySpent: big(0),
  dailyBudget: 20,
  daysRemaining: 10,
  ...overrides,
});

describe("affordability-simulator", () => {
  it("returns verdict='yes' when the purchase fits within today's remaining budget", () => {
    const r = simulate(
      baseInput({ amount: big(5), todaySpent: big(0), dailyBudget: 20 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.verdict).toBe(Verdict.Yes);
  });

  it("returns verdict='no' when the purchase exceeds the remaining budget", () => {
    const r = simulate(
      baseInput({ amount: big(50), todaySpent: big(10), dailyBudget: 20 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.verdict).toBe(Verdict.No);
  });

  it("returns verdict='attention' when the purchase is borderline (large but possible)", () => {
    // amount=12, todaySpent=4, dailyBudget=20 → remaining today=16, purchase=12, ~75% used
    const r = simulate(
      baseInput({ amount: big(12), todaySpent: big(4), dailyBudget: 20 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.verdict).toBe(Verdict.Attention);
  });

  it("effectOnToday reflects the daily impact (full amount, since the user is buying today)", () => {
    const r = simulate(
      baseInput({ amount: big(14), todaySpent: big(0), dailyBudget: 20 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // The spec example: 7-day horizon of -14.
    expect(r.value.effectOnToday).toBeCloseTo(14, 2);
  });

  it("effectOnNextDays spreads the impact across the next 7 days (spec: -14 → -2 per day)", () => {
    const r = simulate(
      baseInput({ amount: big(14), todaySpent: big(0), dailyBudget: 20 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 14 spread across 7 days = 2 per day → effectOnNextDays = -2
    expect(r.value.effectOnNextDays).toBeCloseTo(-2, 2);
  });

  it("newDailyBudget is recomputed downward by amount / daysRemaining", () => {
    const r = simulate(
      baseInput({
        amount: big(10),
        todaySpent: big(0),
        dailyBudget: 20,
        daysRemaining: 10,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 20 - 10/10 = 19
    expect(r.value.newDailyBudget).toBeCloseTo(19, 2);
  });

  it("coachSuggestion is a non-empty string for every verdict", () => {
    for (const amount of [5, 12, 50]) {
      const r = simulate(
        baseInput({ amount: big(amount), todaySpent: big(0), dailyBudget: 20 }),
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.coachSuggestion.length).toBeGreaterThan(0);
    }
  });

  it("is pure: two calls with the same input return structurally equal outputs", () => {
    const input = baseInput();
    const a = simulate(input);
    const b = simulate(input);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.verdict).toBe(b.value.verdict);
    expect(a.value.effectOnToday).toBe(b.value.effectOnToday);
    expect(a.value.effectOnNextDays).toBe(b.value.effectOnNextDays);
    expect(a.value.newDailyBudget).toBe(b.value.newDailyBudget);
    expect(a.value.coachSuggestion).toBe(b.value.coachSuggestion);
  });

  it("returns invalid-input error when amount is negative", () => {
    const r = simulate(baseInput({ amount: big(-1) }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("invalid-input");
  });

  it("returns invalid-input error when dailyBudget is negative", () => {
    const r = simulate(baseInput({ dailyBudget: -1 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("invalid-input");
  });
});
