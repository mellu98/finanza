/**
 * `EmptyPlanCard` — friendly first-run state when no plan is set.
 *
 * Reads `useDailyBudget()`. When the hook returns `null` (no
 * `MonthlyPlan`), the card shows a large CTA linking to `/plan` so
 * the user can set up their first plan. When a plan IS set, the
 * card renders nothing (so callers can drop it in unconditionally).
 *
 * The card uses a dashed accent border to signal "placeholder" and
 * a friendly welcome copy. The body of the app is in Italian; the
 * technical labels stay English for clarity.
 */
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";

export function EmptyPlanCard() {
	const result = useDailyBudget(todayIso());
	if (result) return null;
	return (
		<Card
			data-testid="empty-plan-card"
			aria-label="Empty plan: set up your monthly plan"
			className="mb-3 border-2 border-dashed border-accent/40 bg-accent/5 shadow-soft"
		>
			<CardContent className="p-6">
				<div className="mb-3 flex items-center gap-2">
					<Sparkles className="size-5 text-accent" aria-hidden />
					<h3
						className="font-display text-xl font-semibold"
						data-testid="empty-plan-card-title"
					>
						Ciao! Cominciamo.
					</h3>
				</div>
				<p className="mb-4 text-sm text-muted-foreground" data-testid="empty-plan-card-body">
					Per calcolare il tuo budget giornaliero ho bisogno di qualche
					numero: saldo attuale, entrate previste, spese obbligatorie. Ci
					vuole un minuto.
				</p>
				<Button asChild data-testid="empty-plan-card-cta">
					<Link href="/plan">
						Imposta il piano mensile <ArrowRight className="size-4" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
