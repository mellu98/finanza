import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn/ui class merger. Combines clsx (conditional) and tailwind-merge
 * (resolves conflicts) so duplicate / conflicting Tailwind classes don't
 * fight each other in production.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
