/**
 * `DaysToNextIncomeCard` — countdown to the next expected income.
 *
 * Reads `useDailyBudget()` and shows `daysToNextIncome` from the
 * engine's result. A value of `0` means income is today.
 *
 * The card's accent follows the urgency: ≥ 7 days (green), 1..6
 * days (yellow), 0 or overdue (red). The colour is paired with a
 * textual hint so the meaning doesn't depend on colour alone.
 */

import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { BudgetStatCard } from "./BudgetStatCard";

export function DaysToNextIncomeCard() {
  const result = useDailyBudget(todayIso());
  if (!result) {
    return (
      <BudgetStatCard
        testId="days-to-next-income-card"
        title="Prossima entrata tra"
        value="—"
        hint="Nessun piano ancora"
        accent="none"
      />
    );
  }
  const d = result.daily.daysToNextIncome;
  const accent: "green" | "yellow" | "red" =
    d >= 7 ? "green" : d >= 1 ? "yellow" : "red";
  const hint = d === 0 ? "Oggi" : d === 1 ? "Domani" : `${d} giorni`;
  return (
    <BudgetStatCard
      testId="days-to-next-income-card"
      title="Prossima entrata tra"
      value={String(d)}
      hint={hint}
      accent={accent}
    />
  );
}
