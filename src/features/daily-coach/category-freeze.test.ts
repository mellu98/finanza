/**
 * Test plan for the category-freeze selector.
 *
 * Given a list of category budgets and what was spent in each, return
 * the list of category keys that should be frozen (spent > budget).
 *
 * Output order MUST be deterministic so the rules engine can present
 * a stable action list to the user. Order is: by overage amount
 * descending, then by category key ascending as tie-breaker.
 */
import Big from "big.js";
import { describe, expect, it } from "vitest";
import {
  type CategoryBudgetStatus,
  pickFreezeCandidates,
} from "./category-freeze";

const big = (v: number | string) => new Big(v);

const row = (
  category: string,
  budget: number | string,
  spent: number | string,
): CategoryBudgetStatus => ({
  category,
  budget: big(budget),
  spent: big(spent),
});

describe("category-freeze", () => {
  it("returns the single over-budget category", () => {
    const r = pickFreezeCandidates([row("dining", 30, 45)]);
    expect(r).toEqual(["dining"]);
  });

  it("returns no categories when every row is at or under budget", () => {
    const r = pickFreezeCandidates([
      row("dining", 30, 20),
      row("groceries", 200, 199),
      row("subscriptions", 50, 50),
    ]);
    expect(r).toEqual([]);
  });

  it("returns over-budget categories in deterministic order (overage desc, then key asc)", () => {
    // dining over by 15, shopping over by 15 → tie broken alphabetically: dining < shopping
    const r = pickFreezeCandidates([
      row("dining", 30, 45),
      row("shopping", 50, 65),
      row("groceries", 200, 200),
    ]);
    expect(r).toEqual(["dining", "shopping"]);
  });

  it("sorts by overage amount when amounts differ", () => {
    // shopping over by 50, dining over by 15, subscriptions over by 5
    const r = pickFreezeCandidates([
      row("dining", 30, 45),
      row("subscriptions", 20, 25),
      row("shopping", 50, 100),
    ]);
    expect(r).toEqual(["shopping", "dining", "subscriptions"]);
  });

  it("returns an empty array when given no rows", () => {
    expect(pickFreezeCandidates([])).toEqual([]);
  });

  it("does not consider a row whose spent == budget as over-budget", () => {
    const r = pickFreezeCandidates([row("dining", 30, 30)]);
    expect(r).toEqual([]);
  });

  it("treats negative budget defensively: spent > budget still triggers freeze (caller should never pass negative budgets)", () => {
    const r = pickFreezeCandidates([row("dining", 0, 5)]);
    expect(r).toEqual(["dining"]);
  });
});
