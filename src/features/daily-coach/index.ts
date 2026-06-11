/**
 * Barrel for the `daily-coach` engine kernel.
 *
 * Re-exports every pure-TS engine, helper, and DTO so consumers can
 * import from a single entry point:
 *
 *   import { computeDailyBudget, evaluateCoachRules } from "@features/daily-coach";
 *
 * Engines are pure TS — they MUST NOT import `react`, `localforage`,
 * or `fetch` (see `sdd/daily-coach/design` §15).
 */

export type {
  SimulatorInput,
  SimulatorResult,
} from "./affordability-simulator";
export { simulate } from "./affordability-simulator";
export type { CategoryBudgetStatus } from "./category-freeze";
export { pickFreezeCandidates } from "./category-freeze";
// Prompts (locked by the spec; see coach-prompts.test.ts)
export {
  buildCoachUserPrompt,
  COACH_SYSTEM_PROMPT,
  COACH_USER_PROMPT_HEADER,
} from "./coach-prompts";
export {
  type CoachAction,
  type CoachAlert,
  type CoachDecision,
  type CoachPriority,
  type CoachRulesInput,
  evaluateCoachRules,
} from "./coach-rules-engine";

// Constants + action kinds + modes
export {
  ACTION_PRIORITY_ORDER,
  ActionKind,
  type ActionKind as ActionKindT,
  AVOIDABLE_SHARE_THRESHOLD,
  CoachMode,
  type CoachMode as CoachModeT,
  RED_SPEND_THRESHOLD,
  RED_SPEND_WINDOW_DAYS,
  STATUS_THRESHOLDS,
  Status,
  type Status as StatusT,
  Verdict,
  type Verdict as VerdictT,
} from "./constants";
// Engines (pure TS)
export {
  computeDailyBudget,
  type DailyBudgetInput,
  type DailyBudgetResult,
} from "./daily-budget-engine";
export {
  canAffordInstallment,
  debtPaymentsRemainingInPeriod,
  isDebtOverdue,
  sortDebts,
} from "./debts-engine";
// Domain DTOs (entities live in PR3; for now the contracts are colocated)
export {
  type CategoryDef,
  Classification,
  type Classification as ClassificationT,
  type CoachSettings,
  DEFAULT_CATEGORIES,
  type Debt,
  DebtPriority,
  type DebtPriority as DebtPriorityT,
  type MonthlyPlan,
  type SavingsGoal,
  type Transaction,
  TransactionType,
  type TransactionType as TransactionTypeT,
} from "./domain";
// Errors
export {
  EngineError,
  type EngineErrorDetail,
  engineErr,
} from "./engineErrors";
export type { ClassificationResult } from "./expense-classifier";
// Expense classifier
export {
  classify,
  DEFAULT_CATEGORY_KEYS,
  lookupCategory,
} from "./expense-classifier";
export type { IsoDate, IsoDateTime } from "./isoDate";
export {
  daysBetween,
  isoDateToUtc,
  parseIsoDate,
  parseIsoDateTime,
  todayIso,
} from "./isoDate";
export type { DisplayMoney, Money } from "./money";
export { roundBig, roundHalfUp } from "./money";
export type { OverspendRecoveryResult } from "./overspend-recovery";
export { computeOverspendRecovery } from "./overspend-recovery";
// Cross-cutting helpers
export { err, ok, type Result } from "./result";
export {
  computeDailySavingRequired,
  computeProgressPct,
} from "./savings-goal-engine";
export { isSurvival } from "./survival-mode";
