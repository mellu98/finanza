/**
 * Test plan for the expense classifier.
 *
 * Given a transaction's category key, return its classification
 * (essential / controllable / avoidable) and a `necessary` boolean.
 * The default catalog lives in `DEFAULT_CATEGORIES`; custom categories
 * (passed in by the caller from `TransactionsContext`) override it.
 * Unknown categories return a typed `unknown-category` error so the
 * UI can prompt the user to classify them.
 */
import { describe, expect, it } from "vitest";
import { type Classification, DEFAULT_CATEGORIES } from "./domain";
import {
  classify,
  DEFAULT_CATEGORY_KEYS,
  lookupCategory,
} from "./expense-classifier";

describe("expense-classifier", () => {
  describe("lookupCategory() (default catalog)", () => {
    it("classifies 'housing' as essential + necessary", () => {
      const def = lookupCategory("housing");
      expect(def).toBeDefined();
      expect(def?.classification).toBe<Classification>("essential");
      expect(def?.necessary).toBe(true);
    });

    it("classifies 'groceries' as controllable + necessary", () => {
      const def = lookupCategory("groceries");
      expect(def?.classification).toBe<Classification>("controllable");
      expect(def?.necessary).toBe(true);
    });

    it("classifies 'dining' as avoidable + not necessary", () => {
      const def = lookupCategory("dining");
      expect(def?.classification).toBe<Classification>("avoidable");
      expect(def?.necessary).toBe(false);
    });

    it("classifies 'subscriptions' as avoidable + not necessary", () => {
      const def = lookupCategory("subscriptions");
      expect(def?.classification).toBe<Classification>("avoidable");
    });

    it("returns undefined for an unknown category (caller decides)", () => {
      expect(lookupCategory("xyzzy")).toBeUndefined();
    });

    it("exposes the full DEFAULT_CATEGORY_KEYS list", () => {
      expect(DEFAULT_CATEGORY_KEYS).toContain("housing");
      expect(DEFAULT_CATEGORY_KEYS).toContain("groceries");
      expect(DEFAULT_CATEGORY_KEYS).toContain("dining");
    });
  });

  describe("classify()", () => {
    it("returns ok({ classification, necessary }) for a default category", () => {
      const r = classify("dining");
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.classification).toBe<Classification>("avoidable");
      expect(r.value.necessary).toBe(false);
    });

    it("returns err(unknown-category) for an unknown category", () => {
      const r = classify("nope");
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe("unknown-category");
      expect(r.error.context).toMatchObject({ category: "nope" });
    });

    it("honors a custom category override (caller-provided classification)", () => {
      const r = classify("my-loan", [
        {
          key: "my-loan",
          classification: "essential",
          necessary: true,
        },
      ]);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.classification).toBe<Classification>("essential");
      expect(r.value.necessary).toBe(true);
    });

    it("a custom category can mark something avoidable that the default would not", () => {
      const r = classify("luxury-watch", [
        {
          key: "luxury-watch",
          classification: "avoidable",
          necessary: false,
        },
      ]);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.classification).toBe<Classification>("avoidable");
    });

    it("is independent of the transaction type (classify is about category, not income/expense)", () => {
      // 'income' is a category, and we should be able to classify it
      // just like any other. The fact that a row is type=income is
      // orthogonal.
      const r = classify("income");
      expect(r.ok).toBe(true);
    });

    it("works for the entire DEFAULT_CATEGORIES list", () => {
      for (const def of DEFAULT_CATEGORIES) {
        const r = classify(def.key);
        expect(r.ok, `category ${def.key} should classify ok`).toBe(true);
        if (!r.ok) continue;
        expect(r.value.classification).toBe<Classification>(def.classification);
        expect(r.value.necessary).toBe(def.necessary);
      }
    });
  });
});
