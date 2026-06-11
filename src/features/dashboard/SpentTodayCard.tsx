/**
 * `SpentTodayCard` — total expenses recorded today.
 *
 * Reads `useDailyBudget()` and shows the rounded `spentToday` value.
 * The card's accent turns red when today's spend exceeds the daily
 * budget (so the user sees the overspend at a glance, even if they
 * don't read the StatusCard).
 */

import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { BudgetStatCard } from "./BudgetStatCard";

export function SpentTodayCard() {
  const result = useDailyBudget(todayIso());
  if (!result) {
    return (
      <BudgetStatCard
        testId="spent-today-card"
        title="Spent today"
        value="—"
        hint="No plan yet"
        accent="none"
      />
    );
  }
  const overspent = result.daily.spentToday > result.daily.dailyBudgetRounded;
  return (
    <BudgetStatCard
      testId="spent-today-card"
      title="Spent today"
      value={String(result.daily.spentToday)}
      hint={overspent ? "Over the daily budget" : "So far today"}
      accent={overspent ? "red" : "none"}
    />
  );
}
