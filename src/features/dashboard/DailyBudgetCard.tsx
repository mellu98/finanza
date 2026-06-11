/**
 * `DailyBudgetCard` — today's max spend (the headline number).
 *
 * Reads `useDailyBudget()` and shows the rounded daily budget. The
 * card's accent follows the status (green/yellow/red) so the
 * colour coding is consistent with the StatusCard, while the
 * StatusCard itself remains the loudest visual on the page.
 *
 * The number is displayed in plain text (no currency formatting) for
 * v1 — the user's `CoachSettings.baseCurrency` formatting arrives in
 * PR6 with the transactions page.
 */

import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { BudgetStatCard } from "./BudgetStatCard";

export function DailyBudgetCard() {
  const result = useDailyBudget(todayIso());
  if (!result) {
    return (
      <BudgetStatCard
        testId="daily-budget-card"
        title="Daily budget"
        value="—"
        hint="Set up a monthly plan to see your daily budget."
        accent="none"
      />
    );
  }
  return (
    <BudgetStatCard
      testId="daily-budget-card"
      title="Daily budget"
      value={String(result.daily.dailyBudgetRounded)}
      hint={`For the next ${result.daily.daysRemaining} days`}
      accent={result.daily.status}
    />
  );
}
