/**
 * `EndOfMonthForecastCard` — the projected end-of-period balance.
 *
 * Reads `useDailyBudget()` and shows the engine's
 * `forecastRounded`. The forecast formula lives in the
 * `daily-budget-engine` (single source of truth) — the UI never
 * recomputes it; it just displays the engine's number.
 *
 * The card accent follows the sign: positive (green), zero
 * (yellow), negative (red). The hint always names the formula in
 * plain English so the user can sanity-check the number.
 */

import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { BudgetStatCard } from "./BudgetStatCard";

export function EndOfMonthForecastCard() {
  const result = useDailyBudget(todayIso());
  if (!result) {
    return (
      <BudgetStatCard
        testId="end-of-month-forecast-card"
        title="End of period"
        value="—"
        hint="No plan yet"
        accent="none"
      />
    );
  }
  const f = result.daily.forecastRounded;
  const accent: "green" | "yellow" | "red" =
    f > 0 ? "green" : f < 0 ? "red" : "yellow";
  return (
    <BudgetStatCard
      testId="end-of-month-forecast-card"
      title="End of period"
      value={String(f)}
      hint={
        f >= 0
          ? "Projected balance at the end of the period"
          : "Shortfall — adjust the plan"
      }
      accent={accent}
    />
  );
}
