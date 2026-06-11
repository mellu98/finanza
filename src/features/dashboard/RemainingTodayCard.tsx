/**
 * `RemainingTodayCard` — budget minus today's spend.
 *
 * Reads `useDailyBudget()` and shows the difference. The accent
 * follows the sign: positive (green), zero (yellow), negative (red).
 *
 * A negative remaining means the user has spent more than the daily
 * budget allows and the rest of the period is at risk.
 */

import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { BudgetStatCard } from "./BudgetStatCard";

export function RemainingTodayCard() {
  const result = useDailyBudget(todayIso());
  if (!result) {
    return (
      <BudgetStatCard
        testId="remaining-today-card"
        title="Remaining today"
        value="—"
        hint="No plan yet"
        accent="none"
      />
    );
  }
  const remaining = result.daily.dailyBudgetRounded - result.daily.spentToday;
  const accent: "green" | "yellow" | "red" =
    remaining > 0 ? "green" : remaining < 0 ? "red" : "yellow";
  return (
    <BudgetStatCard
      testId="remaining-today-card"
      title="Remaining today"
      value={String(remaining)}
      hint={remaining < 0 ? "In the red" : "Left to spend"}
      accent={accent}
    />
  );
}
