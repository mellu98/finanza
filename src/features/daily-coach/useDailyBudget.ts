/**
 * `useDailyBudget` — the composition hook for the daily-budget view.
 *
 * Reads the 5 per-feature contexts (MonthlyPlan, Transactions,
 * SavingsGoals, Debts, CoachSettings) and runs the two deterministic
 * engines:
 *   - `computeDailyBudget`     → `DailyBudgetResult` (status + numbers)
 *   - `evaluateCoachRules`     → `CoachDecision`       (mode + actions)
 *
 * Memoizes the result so the dashboard cards don't recompute on
 * unrelated renders. The memo depends on every input the engines
 * consume, so a change to any of the 5 contexts triggers a
 * recomputation.
 *
 * Returns `null` when no plan is set — the dashboard renders an
 * `EmptyPlanCard` in that case. The `today` parameter is injectable
 * so tests can pin the calendar; the UI omits it and gets the local
 * calendar date at call time.
 *
 * This is the ONLY file under `src/features/daily-coach/` that
 * imports React. Engines stay pure TS (no React, no fetch, no
 * localforage). The rule is enforced by code review; the engines
 * import no React at all.
 */
import { useMemo } from "react";
import { useCoachSettings } from "../coach/useCoachSettings";
import { useDebts } from "../debts/useDebts";
import { useSavingsGoals } from "../goals/useSavingsGoals";
import { useMonthlyPlan } from "../monthly-plan/useMonthlyPlan";
import { useTransactions } from "../transactions/useTransactions";
import type { CoachDecision } from "./coach-rules-engine";
import { evaluateCoachRules } from "./coach-rules-engine";
import type { DailyBudgetResult } from "./daily-budget-engine";
import { computeDailyBudget } from "./daily-budget-engine";
import type { IsoDate } from "./isoDate";
import { todayIso } from "./isoDate";

/** The hook's composed output. */
export interface DailyBudgetHookResult {
  /** Output of `computeDailyBudget`. */
  daily: DailyBudgetResult;
  /** Output of `evaluateCoachRules` for the same input. */
  decision: CoachDecision;
}

/**
 * Compose the daily budget + coach decision from the per-feature
 * contexts. Returns `null` when no plan is set.
 *
 * @param today - the calendar date the engines evaluate against.
 *   Defaults to `todayIso()` (the local calendar date at call time).
 *   Tests pass a fixed value; the UI omits the argument.
 */
export const useDailyBudget = (
  today?: IsoDate,
): DailyBudgetHookResult | null => {
  const { plan } = useMonthlyPlan();
  const { transactions } = useTransactions();
  const { goals } = useSavingsGoals();
  const { debts } = useDebts();
  const { settings } = useCoachSettings();

  // Stable memo key: the `today` parameter itself, plus each
  // context-provided array. `useMemo` will short-circuit when all
  // references are unchanged, so unrelated renders don't recompute.
  const evaluationDate: IsoDate = today ?? todayIso();

  return useMemo<DailyBudgetHookResult | null>(() => {
    if (!plan || !settings) return null;

    const dailyResult = computeDailyBudget({
      plan,
      transactions,
      goals,
      debts,
      evaluationDate,
    });
    if (!dailyResult.ok) return null;

    const decisionResult = evaluateCoachRules({
      daily: dailyResult.value,
      txs: transactions,
      goals,
      debts,
      plan,
      settings,
      today: evaluationDate,
    });
    if (!decisionResult.ok) return null;

    return {
      daily: dailyResult.value,
      decision: decisionResult.value,
    };
  }, [plan, transactions, goals, debts, settings, evaluationDate]);
};
