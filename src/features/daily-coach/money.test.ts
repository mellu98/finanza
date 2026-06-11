/**
 * Test plan for `money.ts` — the `Big`-based money types and rounding
 * helpers. All money math in the engines must flow through these helpers
 * to guarantee half-up rounding (never banker's rounding) and to keep
 * the UI boundary explicit.
 */
import Big from "big.js";
import { describe, expect, it } from "vitest";
import { roundBig, roundHalfUp } from "./money";

describe("money helpers", () => {
  describe("roundHalfUp()", () => {
    it("rounds 9.995 half-up to 10.00 (2 dp)", () => {
      const r = roundHalfUp(new Big("9.995"), 2);
      expect(r.toString()).toBe("10");
    });

    it("rounds 0.005 half-up to 0.01 (2 dp)", () => {
      const r = roundHalfUp(new Big("0.005"), 2);
      expect(r.toString()).toBe("0.01");
    });

    it("rounds 0.004 down to 0.00 (2 dp)", () => {
      const r = roundHalfUp(new Big("0.004"), 2);
      expect(r.toString()).toBe("0");
    });

    it("rounds negative -9.995 half-up to -10.00 (2 dp)", () => {
      const r = roundHalfUp(new Big("-9.995"), 2);
      expect(r.toString()).toBe("-10");
    });

    it("rounds negative -0.005 half-up away from zero to -0.01 (2 dp)", () => {
      // big.js Big.round with rm=0 is "round half away from zero"
      // for both positive and negative values; this is the
      // "half-up" behavior the spec mandates.
      const r = roundHalfUp(new Big("-0.005"), 2);
      expect(r.toString()).toBe("-0.01");
    });

    it("does not mutate the input Big", () => {
      const input = new Big("9.995");
      const _r = roundHalfUp(input, 2);
      expect(input.toString()).toBe("9.995");
    });

    it("preserves 2-decimal values without drift", () => {
      const r = roundHalfUp(new Big("11.00"), 2);
      expect(r.toString()).toBe("11");
    });
  });

  describe("roundBig()", () => {
    it("returns a number (DisplayMoney) rounded half-up to 2 dp", () => {
      const n = roundBig(new Big("9.995"), 2);
      expect(typeof n).toBe("number");
      expect(n).toBeCloseTo(10, 2);
    });

    it("returns 0.01 for 0.005 (half-up)", () => {
      const n = roundBig(new Big("0.005"), 2);
      expect(n).toBeCloseTo(0.01, 2);
    });

    it("returns 0.00 for 0.004 (round down)", () => {
      const n = roundBig(new Big("0.004"), 2);
      expect(n).toBeCloseTo(0, 2);
    });

    it("returns -10.00 for -9.995 (half-up away from zero)", () => {
      const n = roundBig(new Big("-9.995"), 2);
      expect(n).toBeCloseTo(-10, 2);
    });

    it("returns the same number for an already-2-dp value", () => {
      const n = roundBig(new Big("11.00"), 2);
      expect(n).toBe(11);
    });

    it("rounds to 0 decimal places when dp=0", () => {
      const n = roundBig(new Big("9.5"), 0);
      expect(n).toBe(10);
    });
  });
});
