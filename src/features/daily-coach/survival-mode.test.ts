/**
 * Test plan for the survival-mode predicate.
 *
 * Survival mode is the strictest coach mode: triggered when the daily
 * budget is below the `STATUS_THRESHOLDS.yellowMin` (5 €). The rules
 * engine uses it to freeze avoidable categories and recommend a 50 %
 * reduction in controllable categories.
 */
import Big from "big.js";
import { describe, expect, it } from "vitest";
import { isSurvival } from "./survival-mode";

const big = (v: number | string) => new Big(v);

describe("survival-mode", () => {
  it("returns true for dailyBudget=4 (below the 5 € threshold)", () => {
    expect(isSurvival(big(4))).toBe(true);
  });

  it("returns false for dailyBudget=5 (the threshold itself, NOT below)", () => {
    expect(isSurvival(big(5))).toBe(false);
  });

  it("returns true for dailyBudget=0", () => {
    expect(isSurvival(big(0))).toBe(true);
  });

  it("returns true for negative dailyBudget", () => {
    expect(isSurvival(big(-1))).toBe(true);
  });

  it("returns false for dailyBudget=10 (well above the threshold)", () => {
    expect(isSurvival(big(10))).toBe(false);
  });

  it("uses Big.lt (half-up edge): 4.999 is still survival, 5.00 is not", () => {
    expect(isSurvival(big("4.999"))).toBe(true);
    expect(isSurvival(big("5.00"))).toBe(false);
  });
});
