/**
 * Dedicated test plan for the overspend-recovery engine.
 *
 * The daily-budget-engine test file pins the spec scenario; this file
 * covers the exhaustive edge cases (negative inputs, period-ended
 * sentinel, newDailyBudget never negative when input is sane).
 */
import Big from "big.js";
import { describe, expect, it } from "vitest";
import { computeOverspendRecovery } from "./overspend-recovery";

const big = (v: number | string) => new Big(v);

describe("overspend-recovery", () => {
  describe("happy path (spec scenario)", () => {
    it("dailyBudget=11, spentToday=20, daysRemaining=9 → overspend=9, newDailyBudget=10.00", () => {
      const r = computeOverspendRecovery(big(11), big(20), 9);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.overspend.toNumber()).toBe(9);
      expect(r.value.newDailyBudget.toNumber()).toBeCloseTo(10, 2);
    });

    it("no overspend → overspend=0 and newDailyBudget unchanged", () => {
      const r = computeOverspendRecovery(big(20), big(5), 9);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.overspend.toNumber()).toBe(0);
      expect(r.value.newDailyBudget.toNumber()).toBeCloseTo(20, 2);
    });

    it("exactly on the line: spent == daily → overspend=0, newDailyBudget=daily", () => {
      const r = computeOverspendRecovery(big(15), big(15), 9);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.overspend.toNumber()).toBe(0);
      expect(r.value.newDailyBudget.toNumber()).toBeCloseTo(15, 2);
    });
  });

  describe("typed errors", () => {
    it("daysRemaining=0 returns period-ended sentinel", () => {
      const r = computeOverspendRecovery(big(11), big(20), 0);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe("period-ended");
    });

    it("daysRemaining<0 returns period-ended sentinel", () => {
      const r = computeOverspendRecovery(big(11), big(20), -1);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe("period-ended");
    });

    it("negative dailyBudget returns invalid-input error", () => {
      const r = computeOverspendRecovery(big(-1), big(20), 9);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe("invalid-input");
    });

    it("negative spentToday returns invalid-input error", () => {
      const r = computeOverspendRecovery(big(11), big(-1), 9);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe("invalid-input");
    });
  });

  describe("flooring", () => {
    it("newDailyBudget never goes negative when input is sane (large overspend, short window)", () => {
      // daily=10, spent=200, days=1 → overspend=190, newDaily=0 (cannot go negative)
      const r = computeOverspendRecovery(big(10), big(200), 1);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.newDailyBudget.toNumber()).toBe(0);
    });
  });
});
