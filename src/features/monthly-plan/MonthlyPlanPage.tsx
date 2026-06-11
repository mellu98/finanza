/**
 * `MonthlyPlanPage` — the `/plan` page.
 *
 * A form to create or edit a `MonthlyPlan`. All fields use shadcn
 * form controls with currency inputs for money and a number input
 * for `daysRemaining`. The "Recompute" button shows the live
 * daily-budget result inline. The "Save" button persists via
 * `useMonthlyPlan().setPlan(plan, saveInHistory=true)`.
 *
 * End-of-period yellow banner: when `daysRemaining <= 0`, the form
 * shows a warning at the top so the user knows the period ended
 * and the engine will return `periodEnded: true`.
 *
 * Money inputs are stored as raw strings and converted to `Big`
 * on save. We keep it simple in v1 (no `react-currency-input-field`
 * integration); the user types numbers and the page stores the
 * `Big` directly.
 */

import Big from "big.js";
import { useState } from "react";
import { parseIsoDate, todayIso } from "../daily-coach/isoDate";
import { roundBig } from "../daily-coach/money";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { MonthlyPlanMother } from "./MonthlyPlanMother";
import type { MonthlyPlan } from "./monthlyPlan";
import { useMonthlyPlan } from "./useMonthlyPlan";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_PLAN = MonthlyPlanMother.emptyPlan();

const toBig = (raw: string): Big => {
  // Allow empty / invalid input to fall back to 0; the engine
  // rejects negative values and a real user will fix the input.
  if (raw.trim() === "" || raw.trim() === "-") return new Big(0);
  try {
    return new Big(raw);
  } catch {
    return new Big(0);
  }
};

export function MonthlyPlanPage() {
  const { plan, setPlan } = useMonthlyPlan();
  const [draft, setDraft] = useState<MonthlyPlan>(plan ?? DEFAULT_PLAN);
  const result = useDailyBudget(todayIso());

  const update = <K extends keyof MonthlyPlan>(key: K, value: MonthlyPlan[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    setPlan(draft, true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  const daysRemaining = draft.daysRemaining;
  const periodEnded = daysRemaining <= 0;

  return (
    <div
      className="p-4"
      data-testid="monthly-plan-page"
      role="region"
      aria-label="Piano mensile"
    >
      <h1
        className="font-display text-2xl font-semibold mb-4"
        data-testid="monthly-plan-page-title"
      >
        Piano mensile
      </h1>
      {periodEnded && (
        <div
          data-testid="period-ended-banner"
          role="alert"
          aria-label="Periodo terminato"
          className="mb-4 rounded-2xl border border-coach-yellow/60 bg-coach-yellow/20 text-coach-yellowFg p-4"
        >
          Il periodo corrente è terminato (giorni restanti = {daysRemaining}).
          Il motore segnala fine periodo; il budget giornaliero è 0. Imposta
          giorni restanti a un valore positivo per continuare.
        </div>
      )}
      <Card className="mb-4" data-testid="monthly-plan-form-card">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="plan-currentBalance">Saldo attuale</Label>
                <Input
                  id="plan-currentBalance"
                  type="number"
                  step="0.01"
                  value={draft.currentBalance.toString()}
                  onChange={(e) =>
                    update("currentBalance", toBig(e.target.value))
                  }
                  data-testid="plan-input-currentBalance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-expectedIncome">
                  Entrate previste (resto del periodo)
                </Label>
                <Input
                  id="plan-expectedIncome"
                  type="number"
                  step="0.01"
                  value={draft.expectedIncomeUntilPeriodEnd.toString()}
                  onChange={(e) =>
                    update(
                      "expectedIncomeUntilPeriodEnd",
                      toBig(e.target.value),
                    )
                  }
                  data-testid="plan-input-expectedIncome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-mandatory">
                  Spese obbligatorie rimanenti
                </Label>
                <Input
                  id="plan-mandatory"
                  type="number"
                  step="0.01"
                  value={draft.mandatoryExpensesRemaining.toString()}
                  onChange={(e) =>
                    update(
                      "mandatoryExpensesRemaining",
                      toBig(e.target.value),
                    )
                  }
                  data-testid="plan-input-mandatory"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-debt">Rate debiti rimanenti</Label>
                <Input
                  id="plan-debt"
                  type="number"
                  step="0.01"
                  value={draft.debtPaymentsRemaining.toString()}
                  onChange={(e) =>
                    update("debtPaymentsRemaining", toBig(e.target.value))
                  }
                  data-testid="plan-input-debt"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-savings">Obiettivo di risparmio rimanente</Label>
                <Input
                  id="plan-savings"
                  type="number"
                  step="0.01"
                  value={draft.savingsGoalRemaining.toString()}
                  onChange={(e) =>
                    update("savingsGoalRemaining", toBig(e.target.value))
                  }
                  data-testid="plan-input-savings"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-emergency">Fondo emergenza</Label>
                <Input
                  id="plan-emergency"
                  type="number"
                  step="0.01"
                  value={draft.emergencyBuffer.toString()}
                  onChange={(e) =>
                    update("emergencyBuffer", toBig(e.target.value))
                  }
                  data-testid="plan-input-emergency"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-days">Giorni rimanenti</Label>
                <Input
                  id="plan-days"
                  type="number"
                  min={0}
                  value={String(daysRemaining)}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    update("daysRemaining", Number.isNaN(n) ? 0 : n);
                  }}
                  data-testid="plan-input-daysRemaining"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-nextIncome">Data prossima entrata</Label>
                <Input
                  id="plan-nextIncome"
                  type="date"
                  value={draft.nextIncomeDate}
                  onChange={(e) =>
                    update(
                      "nextIncomeDate",
                      parseIsoDate(e.target.value || "2026-06-25"),
                    )
                  }
                  data-testid="plan-input-nextIncomeDate"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button type="submit" data-testid="plan-save-button">
                Salva piano
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {result && (
        <Card
          className="mb-4"
          data-testid="plan-recompute-card"
          aria-label="Anteprima ricalcolo"
        >
          <CardContent className="p-5">
            <h2 className="font-display text-lg font-semibold mb-2">
              Budget giornaliero in tempo reale
            </h2>
            <p className="mb-0" data-testid="plan-recompute-line">
              Puoi spendere{" "}
              <strong
                className="font-mono tabular-nums"
                data-testid="plan-recompute-value"
              >
                {roundBig(result.daily.dailyBudgetRaw, 2)}
              </strong>{" "}
              al giorno per i prossimi {result.daily.daysRemaining} giorni ·
              stato = {result.daily.status} · previsione ={" "}
              {result.daily.forecastRounded}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
