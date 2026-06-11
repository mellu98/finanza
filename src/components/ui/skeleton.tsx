import { cn } from "@/lib/utils";

/**
 * Skeleton — pulsing placeholder shown while data is loading.
 *
 * Uses the warm-tinted `.skeleton` shimmer from globals.css.
 * Respects prefers-reduced-motion (the keyframe is short-circuited).
 */
function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			aria-hidden="true"
			className={cn("skeleton", className)}
			{...props}
		/>
	);
}

/** Pre-composed skeletons matching the dashboard card grid (1 + 2 + 1 layout). */
function DashboardSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-32 w-full rounded-2xl" />
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Skeleton className="h-28 rounded-2xl" />
				<Skeleton className="h-28 rounded-2xl" />
			</div>
			<Skeleton className="h-24 w-full rounded-2xl" />
			<Skeleton className="h-24 w-full rounded-2xl" />
		</div>
	);
}

export { Skeleton, DashboardSkeleton };
