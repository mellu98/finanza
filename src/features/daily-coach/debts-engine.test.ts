/**
 * Test plan for the debts engine.
 *
 * Provides:
 *  - sortDebts: priority asc, then nextDueDate asc
 *  - debtPaymentsRemainingInPeriod: sum of `monthlyInstallment` for
 *    debts whose `nextDueDate` falls inside the Monthly Plan period
 *  - canAffordInstallment: current_balance >= remaining + buffer + 0.5 * installment
 *  - isOverdue: nextDueDate < today
 */
import Big from "big.js";
import { describe, expect, it } from "vitest";
import { makeDebt, makePlan } from "./daily-budget-engine.mother";
import {
  canAffordInstallment,
  debtPaymentsRemainingInPeriod,
  isDebtOverdue,
  sortDebts,
} from "./debts-engine";
import { parseIsoDate } from "./isoDate";

const big = (v: number | string) => new Big(v);
const today = parseIsoDate("2026-06-10");

describe("debts-engine", () => {
  describe("sortDebts()", () => {
    it("sorts by priority asc, then nextDueDate asc (C, B, A in the spec scenario)", () => {
      // A: priority 2, due in 5 days
      // B: priority 1, due in 20 days
      // C: priority 1, due in 3 days
      const a = makeDebt({
        id: "A",
        priority: 2,
        nextDueDate: parseIsoDate("2026-06-15"),
      });
      const b = makeDebt({
        id: "B",
        priority: 1,
        nextDueDate: parseIsoDate("2026-06-30"),
      });
      const c = makeDebt({
        id: "C",
        priority: 1,
        nextDueDate: parseIsoDate("2026-06-13"),
      });

      const sorted = sortDebts([a, b, c]);
      expect(sorted.map((d) => d.id)).toEqual(["C", "B", "A"]);
    });

    it("is pure: does not mutate the input", () => {
      const a = makeDebt({ id: "A", priority: 2 });
      const b = makeDebt({ id: "B", priority: 1 });
      const input = [a, b];
      const _ = sortDebts(input);
      expect(input.map((d) => d.id)).toEqual(["A", "B"]);
    });

    it("returns an empty array for empty input", () => {
      expect(sortDebts([])).toEqual([]);
    });
  });

  describe("debtPaymentsRemainingInPeriod()", () => {
    it("sums installments of debts whose nextDueDate is inside the period (spec scenario → 250)", () => {
      // A installment 200, due in 10 days
      // B installment 50, due in 20 days
      // period ends in 25 days
      const a = makeDebt({
        id: "A",
        monthlyInstallment: big(200),
        nextDueDate: parseIsoDate("2026-06-20"),
      });
      const b = makeDebt({
        id: "B",
        monthlyInstallment: big(50),
        nextDueDate: parseIsoDate("2026-06-30"),
      });
      // A third debt due OUTSIDE the period must NOT be included
      const c = makeDebt({
        id: "C",
        monthlyInstallment: big(99),
        nextDueDate: parseIsoDate("2026-08-15"),
      });

      const total = debtPaymentsRemainingInPeriod(
        [a, b, c],
        parseIsoDate("2026-07-05"),
        today,
      );
      expect(total.toNumber()).toBe(250);
    });
  });

  describe("canAffordInstallment()", () => {
    it("returns true when balance >= remaining + buffer + 0.5 * installment", () => {
      // balance=1000, installment=100, remaining=200, buffer=100
      // 1000 >= 200 + 100 + 50 = 350 ✓
      const debt = makeDebt({
        monthlyInstallment: big(100),
        remainingAmount: big(200),
      });
      const plan = makePlan({
        currentBalance: big(1000),
        emergencyBuffer: big(100),
      });
      expect(canAffordInstallment(debt, plan)).toBe(true);
    });

    it("returns false when balance is below the threshold", () => {
      // balance=200, installment=100, remaining=200, buffer=100
      // 200 < 200 + 100 + 50 = 350
      const debt = makeDebt({
        monthlyInstallment: big(100),
        remainingAmount: big(200),
      });
      const plan = makePlan({
        currentBalance: big(200),
        emergencyBuffer: big(100),
      });
      expect(canAffordInstallment(debt, plan)).toBe(false);
    });

    it("returns true when balance is exactly the threshold (>= is inclusive)", () => {
      // balance=350, threshold=350 → true (spec: `>=` is "can afford")
      const debt = makeDebt({
        monthlyInstallment: big(100),
        remainingAmount: big(200),
      });
      const plan = makePlan({
        currentBalance: big(350),
        emergencyBuffer: big(100),
      });
      expect(canAffordInstallment(debt, plan)).toBe(true);
    });

    it("returns false when balance is one cent below the threshold", () => {
      // balance=349.99, threshold=350 → false
      const debt = makeDebt({
        monthlyInstallment: big(100),
        remainingAmount: big(200),
      });
      const plan = makePlan({
        currentBalance: big("349.99"),
        emergencyBuffer: big(100),
      });
      expect(canAffordInstallment(debt, plan)).toBe(false);
    });
  });

  describe("isDebtOverdue()", () => {
    it("returns true when nextDueDate < today", () => {
      const debt = makeDebt({ nextDueDate: parseIsoDate("2026-06-01") });
      expect(isDebtOverdue(debt, today)).toBe(true);
    });

    it("returns false when nextDueDate === today", () => {
      const debt = makeDebt({ nextDueDate: today });
      expect(isDebtOverdue(debt, today)).toBe(false);
    });

    it("returns false when nextDueDate > today", () => {
      const debt = makeDebt({ nextDueDate: parseIsoDate("2026-07-01") });
      expect(isDebtOverdue(debt, today)).toBe(false);
    });
  });
});
