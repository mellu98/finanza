/**
 * `DailyCoachDashboard` — the `/dashboard` home page.
 *
 * Composes the 9 dashboard cards in a mobile-first grid:
 *   1. StatusCard             (full width, on top)
 *   2. DailyBudgetCard        (1/3 width on lg, 1/2 on md)
 *   3. SpentTodayCard
 *   4. RemainingTodayCard
 *   5. DailySaveQuotaCard
 *   6. DaysToNextIncomeCard
 *   7. EndOfMonthForecastCard
 *   8. AlertsCard
 *   9. ActionOfTheDayCard
 *
 * Mobile-first: every card is full-width by default, 1/2 on tablet,
 * 1/3 on desktop. The Tailwind grid handles responsiveness without
 * any custom CSS.
 *
 * a11y: every card uses semantic headings (h1 for the page title,
 * h2 for the StatusCard, h3 for the rest) so the keyboard /
 * screen-reader outline makes sense; the StatusCard carries
 * `role="status"` (handled inside the card) and the AlertsCard
 * carries `role="alert"`.
 *
 * When no plan is set, the dashboard shows the friendly
 * `EmptyPlanCard` (which itself carries a CTA to `/plan`) instead
 * of the money cards. The status card stays on top so the user
 * always sees the empty state.
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
			className="py-3"
			data-testid="daily-coach-dashboard"
			role="region"
			aria-label="Daily coach dashboard"
		>
			<h1
				className="mb-4 font-display text-3xl font-bold tracking-tight"
				data-testid="dashboard-title"
			>
				Buongiorno 👋
			</h1>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
