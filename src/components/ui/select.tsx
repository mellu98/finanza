/**
 * Select — wrapper shadcn-style sul `<select>` nativo.
 *
 * Manteniamo il tag `<select>` nativo (no Radix Select) per:
 * - zero dipendenze aggiuntive
 * - accessibilità garantita dal browser (su iOS mostra il picker nativo)
 * - supporto completo di tastiera, screen reader, e mobile pickers
 *
 * Allineato visivamente con `Input.tsx`:
 * - h-11 (44px) = touch target Apple HIG
 * - focus-visible:ring-2 coerente con gli altri componenti
 * - stesso border-radius, padding, transizioni
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	({ className, children, ...props }, ref) => (
		<select
			ref={ref}
			className={cn(
				"flex h-11 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			{children}
		</select>
	),
);
Select.displayName = "Select";
