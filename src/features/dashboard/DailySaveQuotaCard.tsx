/**
 * `DailySaveQuotaCard` — sum of all active savings goals' daily quotas.
 *
 * Reads the per-goal quota via the savings-goal engine
 * (`computeDailySavingRequired`) and adds them up. The card stays
 * simple: one number ("set aside N today") and a hint listing the
 * number of active goals.
 *
 * Money is summed with `big.js` to avoid float drift; the result is
 * rounded half-up to 2 dp at the UI boundary.
 */
import Big from "big.js";
import { todayIso } from "../daily-coach/isoDate";
import { computeDailySavingRequired } from "../daily-coach/savings-goal-engine";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { useSavingsGoals } from "../goals/useSavingsGoals";
import { BudgetStatCard } from "./BudgetStatCard";

export function DailySaveQuotaCard() {
  const result = useDailyBudget(todayIso());
  const { goals } = useSavingsGoals();

  // Sum the daily quota across all goals. The plan-level
  // `savingsGoalRemaining` is already subtracted by the engine; this
  // number tells the user HOW to distribute today's saving.
  const today = todayIso();
  let total = new Big(0);
  let overdueCount = 0;
  for (const goal of goals) {
    const r = computeDailySavingRequired(goal, today);
    if (r.ok) {
      total = total.plus(r.value.quota);
      if (r.value.overdue) overdueCount += 1;
    }
  }
  const rounded = Number(total.round(2, 0).toString());

  if (!result) {
    return (
      <BudgetStatCard
        testId="daily-save-quota-card"
        title="Save today"
        value="—"
        hint="No plan yet"
        accent="none"
      />
    );
  }

  return (
    <BudgetStatCard
      testId="daily-save-quota-card"
      title="Save today"
      value={String(rounded)}
      hint={
        goals.length === 0
          ? "No active goals"
          : overdueCount > 0
            ? `${goals.length} goals · ${overdueCount} overdue`
            : `${goals.length} active goal${goals.length === 1 ? "" : "s"}`
      }
      accent="green"
    />
  );
}
