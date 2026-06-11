import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * EmptyState — warm-tinted, generous, scannable empty placeholder.
 *
 * Used everywhere there's "nothing here yet" instead of the default
 * "No data" table cell. Always offers a clear path forward (CTA or
 * helper text), and uses an emoji-or-icon hero for instant recognition.
 */
interface EmptyStateProps {
	icon?: LucideIcon;
	emoji?: string;
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
	variant?: "card" | "page";
}

function EmptyState({
	icon: Icon,
	emoji,
	title,
	description,
	action,
	className,
	variant = "card",
}: EmptyStateProps) {
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				"flex flex-col items-center justify-center text-center",
				variant === "card" ? "rounded-2xl border border-dashed border-border/80 bg-card/50 p-8"
					: "min-h-screen-safe px-6 py-16",
				className,
			)}
		>
			<div
				aria-hidden
				className={cn(
					"mb-4 grid place-items-center rounded-2xl",
					variant === "card"
						? "size-14 bg-accent/10"
						: "size-20 bg-gradient-to-br from-violet-500/15 to-violet-600/5 shadow-glow",
				)}
			>
				{Icon ? (
					<Icon
						className={cn(
							"text-accent",
							variant === "card" ? "size-7" : "size-10",
						)}
					/>
				) : emoji ? (
					<span className={cn(variant === "card" ? "text-3xl" : "text-5xl")}>
						{emoji}
					</span>
				) : null}
			</div>
			<h3
				className={cn(
					"font-display font-semibold tracking-tight",
					variant === "card" ? "text-base" : "text-2xl",
				)}
			>
				{title}
			</h3>
			{description ? (
				<p
					className={cn(
						"mt-1 max-w-sm text-muted-foreground",
						variant === "card" ? "text-sm" : "text-base",
					)}
				>
					{description}
				</p>
			) : null}
			{action ? <div className="mt-5">{action}</div> : null}
		</div>
	);
}

export { EmptyState };
export type { EmptyStateProps };
