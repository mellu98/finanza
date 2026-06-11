/**
 * Survival-mode predicate.
 *
 * "Survival" is the strictest coach mode and is active when the daily
 * budget is strictly below the `STATUS_THRESHOLDS.yellowMin` (5 €). The
 * rules engine uses it to freeze every avoidable category and
 * recommend a 50 % reduction in controllable categories.
 *
 * Pure TS — no React, no fetch, no localforage, no `new Date()`.
 *
 * The comparison is performed with `Big.lt` against the un-rounded
 * `Money` so the boundary is exact: 4.99 is survival, 5.00 is not.
 * The half-up rounding of `dailyBudgetRounded` in the daily-budget
 * engine is a UI concern, not an input concern.
 */
import Big from "big.js";
import { STATUS_THRESHOLDS } from "./constants";
import type { Money } from "./money";

/** Pre-built `Big` constant for the survival threshold. */
const SURVIVAL_THRESHOLD = new Big(STATUS_THRESHOLDS.yellowMin);

/**
 * `true` when the daily budget is strictly below the
 * `STATUS_THRESHOLDS.yellowMin` value.
 */
export const isSurvival = (dailyBudget: Money): boolean =>
  dailyBudget.lt(SURVIVAL_THRESHOLD);
