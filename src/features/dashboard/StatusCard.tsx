/**
 * `StatusCard` — the largest, most prominent card on the dashboard.
 *
 * Reads `useDailyBudget()` and surfaces the two most important
 * signals at a glance:
 *   1. The traffic-light status (green / yellow / red)
 *   2. The CoachMode (Steady / Recovery / Survival / Growth)
 *
 * The card MUST communicate status without relying on colour alone
 * (WCAG 1.4.1). We pair the colour with:
 *   - an icon glyph (▲ green / ● yellow / ▼ red)
 *   - a written label ("ON TRACK" / "BE CAREFUL" / "OVER BUDGET")
 *   - the `role="status"` attribute for screen readers
 *
 * When the user has no plan set (`useDailyBudget` returns `null`),
 * the card flips to a friendly "No plan" state with a CTA linking
 * to the Plan page. The card stays at full width so the empty state
 * is impossible to miss.
 */
import { ArrowRight, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";

/** Maps a status to icon + label + Warm colour tokens. */
const STATUS_META = {
	green: {
		icon: CheckCircle2,
		label: "Tutto ok",
		pill: "bg-coach-green text-coach-greenFg",
		dot: "bg-emerald-500",
	},
	yellow: {
		icon: AlertTriangle,
		label: "Occhio, oggi",
		pill: "bg-coach-yellow text-coach-yellowFg",
		dot: "bg-amber-500",
	},
	red: {
		icon: AlertOctagon,
		label: "Stai sforando",
		pill: "bg-coach-red text-coach-redFg",
		dot: "bg-rose-500",
	},
} as const;

const MODE_LABEL = {
	steady: "Equilibrio",
	recovery: "Recupero",
	survival: "Sopravvivenza",
	growth: "Crescita",
} as const;

export function StatusCard() {
	const result = useDailyBudget(todayIso());

	if (!result) {
		return (
			<Card
				data-testid="status-card-empty"
				role="status"
				aria-label="Status: no plan yet"
				className="mb-3 shadow-soft"
			>
				<CardContent className="p-6">
					<h2
						className="mb-2 font-display text-2xl font-semibold"
						data-testid="status-card-heading"
					>
						Stato
					</h2>
					<p className="mb-1 text-lg" data-testid="status-card-label">
						Nessun piano ancora
					</p>
					<p className="mb-4 text-sm text-muted-foreground" data-testid="status-card-mode">
						Imposta il tuo piano mensile per vedere lo stato.
					</p>
					<Button asChild data-testid="status-card-cta">
						<Link href="/plan">
							Imposta il piano <ArrowRight className="size-4" />
						</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	const { daily, decision } = result;
	const meta = STATUS_META[daily.status];
	const modeLabel = MODE_LABEL[decision.mode];
	const Icon = meta.icon;

	return (
		<Card
			data-testid="status-card"
			data-status={daily.status}
			data-mode={decision.mode}
			role="status"
			aria-label={`Status: ${meta.label}, mode ${modeLabel}`}
			className={cn("mb-3 overflow-hidden shadow-card")}
		>
			<CardContent className="p-6">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"flex size-12 shrink-0 items-center justify-center rounded-2xl",
							meta.pill,
						)}
						aria-hidden
					>
						<Icon className="size-6" />
					</div>
					<div>
						<h2
							className="font-display text-2xl font-semibold leading-none"
							data-testid="status-card-heading"
						>
							Stato
						</h2>
						<p
							className="mt-1 text-base font-semibold"
							data-testid="status-card-label"
						>
							{meta.label}
						</p>
					</div>
				</div>
				<p
					className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
					data-testid="status-card-mode"
				>
					<span className={cn("size-2 rounded-full", meta.dot)} aria-hidden />
					Modalità: <strong className="text-foreground">{modeLabel}</strong>
				</p>
			</CardContent>
		</Card>
	);
}
