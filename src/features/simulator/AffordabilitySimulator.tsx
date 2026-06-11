/**
 * `AffordabilitySimulator` — the `/simulator` page.
 *
 * Answers "can I afford this?" for a candidate purchase. The page
 * composes:
 *   - the `affordability-simulator` engine (pure TS, PR2)
 *   - `useDailyBudget()` for the live daily-budget result
 *   - `useMonthlyPlan()` for the plan fields
 *   - `useTransactions()` for the "Apply" materialisation
 *
 * Verdict semantics (per the engine):
 *   - "yes"        → fits, consumes < 50 % of today's remaining
 *   - "attention"  → fits, consumes ≥ 50 % of today's remaining
 *   - "no"         → does not fit
 *
 * The verdict chip uses BOTH a colored background AND a visible
 * label ("YES" / "NO" / "ATTENTION") so WCAG 1.4.1 (color is not
 * the sole channel) is satisfied. The chip carries `role="status"`
 * so screen readers announce the verdict change.
 *
 * The "Apply" button creates a `Transaction` via
 * `useTransactions().add(tx, true)` — `true` pushes to the undo
 * stack so the user can undo a regretted purchase.
 */
import Big from "big.js";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { simulate } from "../daily-coach/affordability-simulator";
import { Verdict } from "../daily-coach/constants";
import { todayIso } from "../daily-coach/isoDate";
import { roundBig } from "../daily-coach/money";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { useMonthlyPlan } from "../monthly-plan/useMonthlyPlan";
import { DEFAULT_CATEGORIES } from "../transactions/categories";
import type { Transaction } from "../transactions/transaction";
import { Classification, TransactionType } from "../transactions/transaction";
import { useTransactions } from "../transactions/useTransactions";

interface PreviewState {
  verdict: "yes" | "no" | "attention";
  effectOnToday: number;
  effectOnNextDays: number;
  newDailyBudget: number;
  coachSuggestion: string;
  category: string;
  amount: number;
  description: string;
}

const VERDICT_META: Record<
  "yes" | "no" | "attention",
  { label: string; classes: string }
> = {
  yes: { label: "YES", classes: "bg-coach-green text-coach-greenFg" },
  no: { label: "NO", classes: "bg-coach-red text-coach-redFg" },
  attention: {
    label: "ATTENTION",
    classes: "bg-coach-yellow text-coach-yellowFg",
  },
};

const toBig = (raw: string, fallback = 0): Big => {
  if (raw.trim() === "" || raw.trim() === "-") return new Big(fallback);
  try {
    return new Big(raw);
  } catch {
    return new Big(fallback);
  }
};

export function AffordabilitySimulator() {
  const result = useDailyBudget(todayIso());
  const { plan } = useMonthlyPlan();
  const { add } = useTransactions();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(
    DEFAULT_CATEGORIES[0]?.key ?? "extra",
  );
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const handleSimulate = () => {
    if (!result || !plan) return;
    const a = toBig(amount, 0);
    if (a.lt(0)) return;
    const r = simulate({
      amount: a,
      category,
      description: description === "" ? undefined : description,
      plan,
      todaySpent: new Big(result.daily.spentToday),
      dailyBudget: result.daily.dailyBudgetRounded,
      daysRemaining: result.daily.daysRemaining,
    });
    if (!r.ok) return;
    // Engine returns "yes" | "no" | "attention"; map to the keys.
    const verdictKey: "yes" | "no" | "attention" =
      r.value.verdict === Verdict.Yes
        ? "yes"
        : r.value.verdict === Verdict.No
          ? "no"
          : "attention";
    setPreview({
      verdict: verdictKey,
      effectOnToday: r.value.effectOnToday,
      effectOnNextDays: r.value.effectOnNextDays,
      newDailyBudget: r.value.newDailyBudget,
      coachSuggestion: r.value.coachSuggestion,
      category,
      amount: a.toNumber(),
      description,
    });
  };

  const handleApply = () => {
    if (!preview) return;
    const today = todayIso();
    const cat = DEFAULT_CATEGORIES.find((c) => c.key === preview.category);
    const tx: Transaction = {
      id: crypto.randomUUID(),
      date: today,
      type: TransactionType.Expense,
      category: preview.category,
      description:
        preview.description === ""
          ? `Simulator purchase: ${preview.category}`
          : preview.description,
      amount: new Big(preview.amount) as Transaction["amount"],
      necessary: false,
      classification: cat?.classification ?? Classification.Controllable,
    };
    add(tx, true);
    setPreview({ ...preview, verdict: "yes" });
  };

  const noPlan = !plan || !result;
  const verdictMeta = preview ? VERDICT_META[preview.verdict] : null;

  return (
    <div
      className="p-4"
      data-testid="simulator-page"
      role="region"
      aria-label="Affordability simulator"
    >
      <h1
        className="font-display text-2xl font-semibold mb-4"
        data-testid="simulator-page-title"
      >
        Can I afford this?
      </h1>

      {noPlan && (
        <div
          className="mb-4 rounded-md border border-accent/40 bg-accent/10 p-4 text-sm text-foreground"
          data-testid="simulator-no-plan"
          role="status"
        >
          Set up a monthly plan first — the simulator needs the daily budget to
          compute verdicts.
        </div>
      )}

      <Card className="mb-4" data-testid="simulator-form-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Simulate a purchase</CardTitle>
          <CardDescription>
            Enter an amount and a category to see if it fits today&apos;s budget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="simulator-amount">Amount</Label>
              <Input
                id="simulator-amount"
                type="number"
                step="0.01"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="simulator-input-amount"
                placeholder="0.00"
                className="font-mono tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="simulator-category">Category</Label>
              <select
                id="simulator-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                data-testid="simulator-input-category"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.labelEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="simulator-description">Description (optional)</Label>
              <Input
                id="simulator-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="simulator-input-description"
                placeholder="apples, lunch, ..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              disabled={noPlan || amount.trim() === ""}
              onClick={handleSimulate}
              data-testid="simulator-simulate-button"
            >
              Simulate
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && verdictMeta && (
        <Card
          data-testid="simulator-preview-card"
          aria-live="polite"
          className="mb-4"
        >
          <CardContent className="pt-6">
            <div
              className={`flex items-center gap-2 mb-4 px-4 py-2 rounded-lg text-lg font-bold ${verdictMeta.classes}`}
              data-testid="simulator-verdict-chip"
              data-verdict={preview.verdict}
              role="status"
              aria-label={`Verdict: ${verdictMeta.label}`}
            >
              <span data-testid="simulator-verdict-label">
                {verdictMeta.label}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card data-testid="simulator-effect-today" className="h-full">
                <CardContent className="pt-4">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground">
                    Effect on today
                  </h3>
                  <p className="font-mono tabular-nums mb-0 text-2xl">
                    {roundBig(new Big(preview.effectOnToday), 2).toString()} €
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="simulator-effect-next-days" className="h-full">
                <CardContent className="pt-4">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground">
                    Effect on the next 7 days
                  </h3>
                  <p className="font-mono tabular-nums mb-0 text-2xl">
                    {preview.effectOnNextDays.toFixed(2)} €/day
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="simulator-new-daily" className="h-full">
                <CardContent className="pt-4">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground">
                    New daily budget
                  </h3>
                  <p className="font-mono tabular-nums mb-0 text-2xl">
                    {preview.newDailyBudget.toFixed(2)} €
                  </p>
                </CardContent>
              </Card>
            </div>
            <div
              className="mt-4 mb-0 rounded-md border border-border bg-muted/40 p-4 text-sm"
              data-testid="simulator-coach-suggestion"
            >
              {preview.coachSuggestion}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleApply}
                data-testid="simulator-apply-button"
              >
                Apply — record as a transaction
              </Button>
              <Button
                variant="outline"
                onClick={() => setPreview(null)}
                data-testid="simulator-clear-button"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
