/**
 * Cross-engine constants.
 *
 * All values are `as const` objects (no enums — TS 6 erasableSyntaxOnly
 * forbids them) and are the single source of truth for the threshold
 * numbers referenced by multiple engines.
 */

/**
 * Traffic-light thresholds for the daily budget.
 *
 * Pinned in `sdd/daily-coach/design` §1 decision #3:
 * - `green` when `dailyBudget >= greenMin`
 * - `yellow` when `yellowMin <= dailyBudget < greenMin`
 * - `red` when `dailyBudget < yellowMin`
 *
 * The 3 mandatory scenarios in `daily-budget-engine.test.ts` exercise
 * every boundary (11 → green, 7 → yellow, 4 → red).
 */
export const STATUS_THRESHOLDS = {
  greenMin: 10,
  yellowMin: 5,
} as const;

/** Status returned by the daily-budget engine. */
export const Status = {
  Green: "green",
  Yellow: "yellow",
  Red: "red",
} as const;

export type Status = (typeof Status)[keyof typeof Status];

/**
 * Coach decision action kinds. Order in this array is the default
 * priority (highest first). Engines and the rules engine cap the final
 * action list at 3 by `ACTION_PRIORITY_ORDER`.
 */
export const ActionKind = {
  AlertAvoidableShare: "alert-avoidable-share",
  PayDebtUrgent: "pay-debt-urgent",
  FreezeCategory: "freeze-category",
  BlockCategory: "block-category",
  AllocateExtra: "allocate-extra",
  SaveSurplus: "save-surplus",
} as const;

export type ActionKind = (typeof ActionKind)[keyof typeof ActionKind];

/**
 * Default action priority order — highest first.
 *
 * Used by the rules engine when no `actionPriorityOrder` override is
 * supplied via `CoachSettings`. Stable order keeps the 6→3 cap
 * deterministic.
 */
export const ACTION_PRIORITY_ORDER: ReadonlyArray<ActionKind> = [
  ActionKind.AlertAvoidableShare,
  ActionKind.PayDebtUrgent,
  ActionKind.FreezeCategory,
  ActionKind.BlockCategory,
  ActionKind.AllocateExtra,
  ActionKind.SaveSurplus,
];

/** Avoidable share above this fraction of total income triggers an alert. */
export const AVOIDABLE_SHARE_THRESHOLD = 0.1;

/** EUR amount of avoidable spend in the last `RED_SPEND_WINDOW_DAYS` that triggers a red-spend block. */
export const RED_SPEND_THRESHOLD = 50;

/** Rolling window (days) used to compute weekly avoidable spend for the red-spend block. */
export const RED_SPEND_WINDOW_DAYS = 7;

/** Coach decision modes. */
export const CoachMode = {
  Steady: "steady",
  Recovery: "recovery",
  Survival: "survival",
  Growth: "growth",
} as const;

export type CoachMode = (typeof CoachMode)[keyof typeof CoachMode];

/** Affordability-simulator verdict. */
export const Verdict = {
  Yes: "yes",
  No: "no",
  Attention: "attention",
} as const;

export type Verdict = (typeof Verdict)[keyof typeof Verdict];
