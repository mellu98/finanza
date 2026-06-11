/**
 * `AlertsCard` — the list of active coach alerts.
 *
 * Reads the `CoachDecision.alerts` from `useDailyBudget()` and
 * surfaces each one as a row. The card itself is empty (with a
 * friendly "no alerts" line) when the engine emits zero alerts.
 *
 * The container uses `role="alert"` so screen readers announce the
 * list when it changes. Each row carries its own `aria-label` and a
 * severity-tinted left border.
 */
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";

const SEVERITY_CLASS = {
	info: "border-l-cyan-400",
	warn: "border-l-coach-yellow",
	error: "border-l-coach-red",
} as const;

const SEVERITY_DOT = {
	info: "bg-cyan-400",
	warn: "bg-amber-500",
	error: "bg-rose-500",
} as const;

const KIND_LABEL: Record<string, string> = {
	"alert-avoidable-share": "Spese evitabili troppo alte",
	"pay-debt-urgent": "Debito urgente in scadenza",
	"freeze-category": "Categoria fuori budget",
	"block-category": "Categoria in rosso",
	"allocate-extra": "Entrata extra da allocare",
	"save-surplus": "Accantona il surplus di oggi",
};

export function AlertsCard() {
	const result = useDailyBudget(todayIso());
	if (!result) {
		return (
			<Card
				data-testid="alerts-card-empty"
				role="alert"
				aria-label="Avvisi: nessun piano ancora"
				className="mb-3 shadow-soft"
			>
				<CardContent className="p-5">
					<h3 className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Bell className="size-4" aria-hidden /> Avvisi
					</h3>
					<p className="mb-0 text-xs text-muted-foreground" data-testid="alerts-card-empty-line">
						Nessun piano ancora — impostane uno per ricevere avvisi.
					</p>
				</CardContent>
			</Card>
		);
	}
	const { alerts } = result.decision;
	if (alerts.length === 0) {
		return (
			<Card
				data-testid="alerts-card"
				role="alert"
				aria-label="Avvisi: nessuno"
				className="mb-3 shadow-soft"
			>
				<CardContent className="p-5">
					<h3
						className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground"
						data-testid="alerts-card-title"
					>
						<Bell className="size-4" aria-hidden /> Avvisi
					</h3>
					<p className="mb-0 text-xs text-muted-foreground" data-testid="alerts-card-empty-line">
						Nessun avviso — continua così.
					</p>
				</CardContent>
			</Card>
		);
	}
	return (
		<Card
			data-testid="alerts-card"
			role="alert"
			aria-label={`Avvisi: ${alerts.length} attiv${alerts.length === 1 ? "o" : "i"}`}
			className="mb-3 shadow-soft"
		>
			<CardContent className="p-5">
				<h3
					className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"
					data-testid="alerts-card-title"
				>
					<Bell className="size-4" aria-hidden />
					<span>Avvisi</span>
					<Badge variant="secondary" className="ml-1">
						{alerts.length}
					</Badge>
				</h3>
				<ul
					className="m-0 list-none space-y-1.5 p-0"
					data-testid="alerts-card-list"
					aria-label="Avvisi del mentore"
				>
					{alerts.map((a) => (
						<li
							key={a.kind}
							data-testid={`alerts-card-item-${a.kind}`}
							data-kind={a.kind}
							data-severity={a.severity}
							className={cn(
								"flex items-center gap-2 rounded-lg border-l-4 bg-secondary/30 px-3 py-2 text-sm",
								SEVERITY_CLASS[a.severity],
							)}
						>
							<span
								aria-hidden
								className={cn("size-2 shrink-0 rounded-full", SEVERITY_DOT[a.severity])}
							/>
							<span data-testid={`alerts-card-item-label-${a.kind}`}>
								{KIND_LABEL[a.kind] ?? a.kind}
							</span>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
