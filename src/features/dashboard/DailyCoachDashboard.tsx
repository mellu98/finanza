/**
 * `DailyCoachDashboard` — la home page `/dashboard`.
 *
 * Componi 9 card in una griglia responsive:
 *   1. StatusCard             (full width, in alto)
 *   2. DailyBudgetCard        (1/3 width su lg, 1/2 su md)
 *   3. SpentTodayCard
 *   4. RemainingTodayCard
 *   5. DailySaveQuotaCard
 *   6. DaysToNextIncomeCard
 *   7. EndOfMonthForecastCard
 *   8. AlertsCard
 *   9. ActionOfTheDayCard
 *
 * Hero scalato: h1 più piccolo su mobile, più grande su desktop per
 * dare respiro. Margine generoso tra hero e prima card.
 *
 * Quando non c'è un piano, mostra `EmptyPlanCard` invece delle card
 * monetarie. Lo StatusCard resta in alto per mostrare lo stato vuoto.
 */
import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { ActionOfTheDayCard } from "./ActionOfTheDayCard";
import { AlertsCard } from "./AlertsCard";
import { DailyBudgetCard } from "./DailyBudgetCard";
import { DailySaveQuotaCard } from "./DailySaveQuotaCard";
import { DaysToNextIncomeCard } from "./DaysToNextIncomeCard";
import { EmptyPlanCard } from "./EmptyPlanCard";
import { EndOfMonthForecastCard } from "./EndOfMonthForecastCard";
import { RemainingTodayCard } from "./RemainingTodayCard";
import { SpentTodayCard } from "./SpentTodayCard";
import { StatusCard } from "./StatusCard";

export function DailyCoachDashboard() {
	const result = useDailyBudget(todayIso());
	const hasPlan = result !== null;
	return (
		<div
			className="space-y-6 sm:space-y-8"
			data-testid="daily-coach-dashboard"
			role="region"
			aria-label="Dashboard del coach quotidiano"
		>
			<header className="space-y-1">
				<p
					className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:text-sm"
					data-testid="dashboard-eyebrow"
				>
					Oggi · {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
				</p>
				<h1
					className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
					data-testid="dashboard-title"
				>
					Buongiorno <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
				</h1>
			</header>
			<div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
				<div className="md:col-span-2 lg:col-span-3">
					<StatusCard />
				</div>
				{hasPlan ? (
					<>
						<DailyBudgetCard />
						<SpentTodayCard />
						<RemainingTodayCard />
						<DailySaveQuotaCard />
						<DaysToNextIncomeCard />
						<EndOfMonthForecastCard />
						<AlertsCard />
						<ActionOfTheDayCard />
					</>
				) : (
					<div className="md:col-span-2 lg:col-span-3">
						<EmptyPlanCard />
					</div>
				)}
			</div>
		</div>
	);
}
