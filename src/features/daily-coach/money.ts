/**
 * Money types and rounding helpers.
 *
 * All engines in `src/features/daily-coach/` use `Big` for arithmetic
 * and convert to a `number` (`DisplayMoney`) ONLY at the UI boundary via
 * `roundBig()`. The half-up rounding mode (away-from-zero) is mandatory:
 * it avoids the banker's-rounding edge at `9.995` flipping the daily-
 * budget status between green and yellow.
 */
import Big from "big.js";

/** A `Big` amount used inside engines. Brandless; engine-internal. */
export type Money = Big;

/** A rounded `number` for display in the UI. Never used inside engines. */
export type DisplayMoney = number;

const ZERO = new Big(0);
const HALF = new Big("0.5");
const TEN = new Big(10);

/**
 * Round a `Big` value to `dp` decimal places using half-up (away-from-zero)
 * rounding.
 *
 * big.js 7 does not provide a built-in half-away-from-zero rounding mode
 * (its `rm=0` is "toward zero" / truncation). We implement half-up by
 * adding 0.5 (or subtracting 0.5 for negative values) before truncating
 * to the target precision, which yields the classical "round half up"
 * (a.k.a. "round half away from zero") behavior.
 *
 * This returns a NEW `Big`; the input is not mutated.
 */
export const roundHalfUp = (value: Money, dp: number): Money => {
  const factor = TEN.pow(dp);
  const sign = value.gte(ZERO) ? 1 : -1;
  return value.times(factor).plus(HALF.times(sign)).round(0, 0).div(factor);
};

/**
 * Round a `Big` value to `dp` decimal places and convert to a `number`.
 * Use this only at the UI boundary (e.g. before `intlFormat`).
 */
export const roundBig = (value: Money, dp: number): DisplayMoney =>
  roundHalfUp(value, dp).toNumber();
