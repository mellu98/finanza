/**
 * `BudgetStatCard` — a small internal helper shared by the three
 * money-stat cards (DailyBudget, SpentToday, RemainingToday, etc.).
 *
 * Each card shows a single big number with a label and an optional
 * unit. They share the same visual rhythm so the dashboard reads
 * coherently. Kept as an internal helper (NOT exported as a public
 * feature) so the test can still assert on the public cards in isolation.
 */
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface BudgetStatCardProps {
	testId: string;
	title: string;
	value: string;
	hint?: string;
	/** Traffic-light accent for the card's left border. */
	accent?: "green" | "yellow" | "red" | "none";
	/** Pre-formatted value to display in the test-renderable badge. */
	badge?: ReactNode;
}

const ACCENT_CLASS = {
	green: "border-l-coach-green",
	yellow: "border-l-coach-yellow",
	red: "border-l-coach-red",
	none: "border-l-transparent",
} as const;

export function BudgetStatCard({
	testId,
	title,
	value,
	hint,
	accent = "none",
	badge,
}: BudgetStatCardProps) {
	return (
		<Card
			data-testid={testId}
			aria-label={`${title}: ${value}`}
			className={cn(
				"mb-3 border-l-4 shadow-soft",
				ACCENT_CLASS[accent],
			)}
		>
			<CardContent className="p-5">
				<h3
					className="mb-1 text-sm font-medium text-muted-foreground"
					data-testid={`${testId}-title`}
				>
					{title}
				</h3>
				<p
					className="mb-1 font-mono text-3xl font-bold tabular-nums text-foreground"
					data-testid={`${testId}-value`}
				>
					{value}
					{badge && (
						<span
							data-testid={`${testId}-badge`}
							className="ml-2 align-middle text-base font-normal text-muted-foreground"
						>
							{badge}
						</span>
					)}
				</p>
				{hint && (
					<p
						className="mb-0 text-xs text-muted-foreground"
						data-testid={`${testId}-hint`}
					>
						{hint}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
