/**
 * `ActionOfTheDayCard` — the top-priority action from the coach.
 *
 * Reads the first action in `decision.actions` (the engine caps at
 * 3 and sorts by priority, so index 0 is the top-priority one). The
 * card surfaces the action label in a large readable format and
 * links to `/coach` for the full list.
 *
 * The card uses a "call-to-action" visual treatment (violet accent
 * border + arrow link) to set it apart from the other money-stat
 * cards — it's a recommendation, not a number.
 */
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";

import { Card, CardContent } from "@/components/ui/card";
import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";

export function ActionOfTheDayCard() {
	const result = useDailyBudget(todayIso());
	if (!result) {
		return (
			<Card
				data-testid="action-of-the-day-card-empty"
				aria-label="Action of the day: no plan yet"
				className="mb-3 shadow-soft"
			>
				<CardContent className="p-5">
					<h3 className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Sparkles className="size-4" aria-hidden /> Azione del giorno
					</h3>
					<p className="mb-0 text-xs text-muted-foreground">
						Nessun piano ancora — impostane uno per vedere le azioni.
					</p>
				</CardContent>
			</Card>
		);
	}
	const top = result.decision.actions[0];
	return (
		<Card
			data-testid="action-of-the-day-card"
			aria-label={`Action of the day: ${top ? top.label : "no action"}`}
			className="mb-3 border-l-4 border-l-accent shadow-card"
		>
			<CardContent className="p-5">
				<h3
					className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"
					data-testid="action-of-the-day-title"
				>
					<Sparkles className="size-4 text-accent" aria-hidden /> Azione del giorno
				</h3>
				{top ? (
					<>
						<p
							className="mb-3 font-display text-lg font-semibold leading-snug"
							data-testid="action-of-the-day-label"
							data-action-kind={top.kind}
						>
							{top.label}
						</p>
						<Link
							href="/coach"
							className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
							data-testid="action-of-the-day-see-all"
						>
							Vedi tutte le azioni <ArrowRight className="size-3.5" />
						</Link>
					</>
				) : (
					<p
						className="mb-0 text-sm text-muted-foreground"
						data-testid="action-of-the-day-label"
						data-action-kind="none"
					>
						Nessuna azione specifica adesso — continua così.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
