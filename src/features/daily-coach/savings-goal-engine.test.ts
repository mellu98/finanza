/**
 * Test plan for the savings-goal engine.
 *
 * Computes the daily saving quota per goal and the progress percentage.
 *   quota = (target - current) / daysUntilDeadline
 *   daysUntilDeadline = (deadline - today) in whole days + 1
 *
 * When `daysUntilDeadline <= 0` the engine returns the full remaining
 * amount in a one-shot quota and flags the goal `overdue: true`.
 *
 * The progress percentage is rounded to 1 decimal; `target === 0`
 * returns 0 (no division by zero).
 */
import Big from "big.js";
import { describe, expect, it } from "vitest";
import { parseIsoDate } from "./isoDate";
import {
  computeDailySavingRequired,
  computeProgressPct,
} from "./savings-goal-engine";

const big = (v: number | string) => new Big(v);

const today = parseIsoDate("2026-06-10");

const goal = (overrides: {
  id?: string;
  name?: string;
  targetAmount: number | string;
  currentAmount: number | string;
  deadline: string;
  emergencyFund?: boolean;
}) => ({
  id: overrides.id ?? "goal-1",
  name: overrides.name ?? "Test goal",
  targetAmount: big(overrides.targetAmount),
  currentAmount: big(overrides.currentAmount),
  deadline: parseIsoDate(overrides.deadline),
  emergencyFund: overrides.emergencyFund ?? false,
  createdAt: "2026-06-01T00:00:00Z" as never,
  notes: undefined as string | undefined,
});

describe("savings-goal-engine", () => {
  describe("computeDailySavingRequired()", () => {
    it("50-day scenario: target=100, current=0, deadline=today+50 → quota=2", () => {
      const r = computeDailySavingRequired(
        goal({
          targetAmount: 100,
          currentAmount: 0,
          deadline: "2026-07-30",
        }),
        today,
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.quota.toNumber()).toBe(2);
      expect(r.value.overdue).toBe(false);
    });

    it("0-day scenario: target=50, current=20, deadline=today → quota=30, overdue", () => {
      const r = computeDailySavingRequired(
        goal({
          targetAmount: 50,
          currentAmount: 20,
          deadline: "2026-06-10",
        }),
        today,
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.quota.toNumber()).toBe(30);
      expect(r.value.overdue).toBe(true);
    });

    it("negative days (deadline in the past): overdue + one-shot for the remainder", () => {
      const r = computeDailySavingRequired(
        goal({
          targetAmount: 100,
          currentAmount: 25,
          deadline: "2026-06-01",
        }),
        today,
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.overdue).toBe(true);
      expect(r.value.quota.toNumber()).toBe(75);
    });

    it("returns quota=0 when currentAmount == targetAmount (goal complete)", () => {
      const r = computeDailySavingRequired(
        goal({
          targetAmount: 100,
          currentAmount: 100,
          deadline: "2026-07-30",
        }),
        today,
      );
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.quota.toNumber()).toBe(0);
      expect(r.value.overdue).toBe(false);
    });

    it("returns invalid-input error when currentAmount > targetAmount", () => {
      const r = computeDailySavingRequired(
        goal({
          targetAmount: 100,
          currentAmount: 150,
          deadline: "2026-07-30",
        }),
        today,
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe("invalid-input");
    });

    it("returns invalid-input error when targetAmount is negative", () => {
      const r = computeDailySavingRequired(
        goal({
          targetAmount: -1,
          currentAmount: 0,
          deadline: "2026-07-30",
        }),
        today,
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe("invalid-input");
    });
  });

  describe("computeProgressPct()", () => {
    it("50% progress for current=50, target=100", () => {
      const pct = computeProgressPct(
        goal({
          targetAmount: 100,
          currentAmount: 50,
          deadline: "2026-07-30",
        }),
      );
      expect(pct).toBe(50);
    });

    it("zero target: returns 0 (no division by zero)", () => {
      const pct = computeProgressPct(
        goal({
          targetAmount: 0,
          currentAmount: 0,
          deadline: "2026-07-30",
        }),
      );
      expect(pct).toBe(0);
    });

    it("zero target but non-zero current: returns 0 (no division by zero, caps at 0)", () => {
      const pct = computeProgressPct(
        goal({
          targetAmount: 0,
          currentAmount: 5,
          deadline: "2026-07-30",
        }),
      );
      expect(pct).toBe(0);
    });

    it("clamps >100% to 100", () => {
      const pct = computeProgressPct(
        goal({
          targetAmount: 100,
          currentAmount: 150,
          deadline: "2026-07-30",
        }),
      );
      expect(pct).toBe(100);
    });

    it("rounds to 1 decimal place", () => {
      // 1/3 = 33.333...% → 33.3
      const pct = computeProgressPct(
        goal({
          targetAmount: 3,
          currentAmount: 1,
          deadline: "2026-07-30",
        }),
      );
      expect(pct).toBeCloseTo(33.3, 1);
    });
  });
});
