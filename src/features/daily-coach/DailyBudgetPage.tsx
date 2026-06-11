/**
 * `DailyBudgetPage` — the `/budget` page.
 *
 * Shows the daily-budget formula expanded (each input + the
 * result), the StatusCard, the end-of-period forecast, and a
 * "Recompute" button. The Recompute button is a UX nicety: the
 * dashboard already auto-recomputes on any context change, but a
 * manual "Recompute" button gives the user a clear "this is fresh"
 * affordance. The actual computation re-runs via the
 * `useDailyBudget()` hook, which is always up-to-date.
 *
 * The page is mobile-first: a single column on xs, two columns on
 * md+ via Tailwind grid.
 */
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatusCard } from "../dashboard/StatusCard";
import { useMonthlyPlan } from "../monthly-plan/useMonthlyPlan";
import { todayIso } from "./isoDate";
import { roundBig } from "./money";
import { useDailyBudget } from "./useDailyBudget";

/** Maps a status to Tailwind traffic-light classes. */
const STATUS_PILL = {
	green: "bg-coach-green text-coach-greenFg",
	yellow: "bg-coach-yellow text-coach-yellowFg",
	red: "bg-coach-red text-coach-redFg",
} as const;

export function DailyBudgetPage() {
	const result = useDailyBudget(todayIso());
	const { plan } = useMonthlyPlan();
	// The Recompute button increments a counter; useMemo in
	// useDailyBudget doesn't depend on it (it depends on the
	// contexts), so we use the counter as a visual feedback signal
	// (a toast-like status line) without forcing a re-render of the
	// entire tree. The actual re-derivation happens on any context
	// change anyway.
	const [recomputeCount, setRecomputeCount] = useState(0);
	const [lastRecomputed, setLastRecomputed] = useState<string | null>(null);

	const handleRecompute = () => {
		setRecomputeCount((n) => n + 1);
		setLastRecomputed(new Date().toLocaleTimeString());
	};

	return (
		<div
			className="p-4"
			data-testid="daily-budget-page"
			role="region"
			aria-label="Daily budget"
		>
			<h1
				className="mb-3 font-display text-2xl font-semibold"
				data-testid="daily-budget-page-title"
			>
				Budget giornaliero
			</h1>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<StatusCard />
				</div>
				<div>
					<Card
						className="mb-3 shadow-soft"
						data-testid="daily-budget-formula-card"
						aria-label="Daily budget formula"
					>
						<CardContent className="p-5">
							<h2 className="mb-3 font-display text-lg font-semibold">
								Formula
							</h2>
							<p
								className="mb-2 font-mono tabular-nums"
								data-testid="daily-budget-formula"
							>
								daily_budget = (currentBalance + expectedIncome − mandatory −
								debt − savings − emergencyBuffer) / daysRemaining
							</p>
							{plan && (
								<ul
									className="mb-0 space-y-1 text-sm"
									data-testid="daily-budget-formula-inputs"
								>
									<li
										className="font-mono tabular-nums"
										data-testid="formula-input-currentBalance"
									>
										currentBalance = {roundBig(plan.currentBalance, 2)}
									</li>
									<li
										className="font-mono tabular-nums"
										data-testid="formula-input-expectedIncome"
									>
										expectedIncome ={" "}
										{roundBig(plan.expectedIncomeUntilPeriodEnd, 2)}
									</li>
									<li
										className="font-mono tabular-nums"
										data-testid="formula-input-mandatory"
									>
										mandatory = {roundBig(plan.mandatoryExpensesRemaining, 2)}
									</li>
									<li
										className="font-mono tabular-nums"
										data-testid="formula-input-debt"
									>
										debt = {roundBig(plan.debtPaymentsRemaining, 2)}
									</li>
									<li
										className="font-mono tabular-nums"
										data-testid="formula-input-savings"
									>
										savings = {roundBig(plan.savingsGoalRemaining, 2)}
									</li>
									<li
										className="font-mono tabular-nums"
										data-testid="formula-input-emergency"
									>
										emergencyBuffer = {roundBig(plan.emergencyBuffer, 2)}
									</li>
									<li
										className="font-mono tabular-nums"
										data-testid="formula-input-daysRemaining"
									>
										daysRemaining = {plan.daysRemaining}
									</li>
								</ul>
							)}
							{result && (
								<div
									className={cn(
										"mt-3 rounded-xl border border-border/60 px-4 py-3 text-sm font-medium shadow-soft",
										STATUS_PILL[result.daily.status],
									)}
									role="status"
									data-testid="daily-budget-result-alert"
								>
									daily_budget ={" "}
									<strong
										className="font-mono tabular-nums"
										data-testid="daily-budget-result-value"
									>
										{result.daily.dailyBudgetRounded}
									</strong>{" "}
									· status = {result.daily.status} · forecast ={" "}
									<span className="font-mono tabular-nums">
										{result.daily.forecastRounded}
									</span>
								</div>
							)}
							<div className="mt-3 flex items-center gap-2">
								<Button
									variant="default"
									size="sm"
									onClick={handleRecompute}
									data-testid="recompute-button"
									type="button"
								>
									Ricalcola
								</Button>
								{lastRecomputed && (
									<span
										className="text-xs text-muted-foreground"
										data-testid="recompute-timestamp"
										aria-live="polite"
									>
										Ricalcolato alle {lastRecomputed} ({recomputeCount}×)
									</span>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
