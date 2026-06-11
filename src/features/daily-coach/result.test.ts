/**
 * Test plan for the `Result<T, E>` discriminated union.
 *
 * The engines return a `Result<T, E>` for fallible operations (no throws).
 * `ok(value)` produces a success; `err(error)` produces a failure; the
 * `ok` boolean discriminates the two and the `value`/`error` fields never
 * leak into the wrong arm.
 */
import { describe, expect, expectTypeOf, it } from "vitest";
import { err, ok } from "./result";

describe("Result helpers", () => {
  describe("ok()", () => {
    it("wraps a value in a successful Result with ok=true", () => {
      const r = ok(42);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value).toBe(42);
      }
    });

    it("preserves object identity for object values", () => {
      const payload = { a: 1, b: "two" };
      const r = ok(payload);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value).toBe(payload);
      }
    });

    it("type-narrows value to T (compile-time check)", () => {
      const r = ok<{ amount: number }>({ amount: 100 });
      expectTypeOf(r).toEqualTypeOf<
        { readonly ok: true; readonly value: { amount: number } } | never
      >();
    });
  });

  describe("err()", () => {
    it("wraps an error in a failed Result with ok=false", () => {
      const r = err({ code: "x" as const, message: "boom" });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe("x");
        expect(r.error.message).toBe("boom");
      }
    });

    it("type-narrows error to E (compile-time check)", () => {
      const r = err<{ code: string }>({ code: "x" });
      expectTypeOf(r).toEqualTypeOf<
        { readonly ok: false; readonly error: { code: string } } | never
      >();
    });
  });

  describe("never-leak", () => {
    it("does not expose value on the err arm", () => {
      const r = err({ code: "nope" as const });
      // @ts-expect-error: r.value does not exist on the err arm
      const _leak = r.value;
      expect(_leak).toBeUndefined();
    });

    it("does not expose error on the ok arm", () => {
      const r = ok(7);
      // @ts-expect-error: r.error does not exist on the ok arm
      const _leak = r.error;
      expect(_leak).toBeUndefined();
    });
  });
});
