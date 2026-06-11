import Big from "big.js";
import type { RefObject } from "react";

/* Legacy Guitos types have been inlined or removed. The helpers
 * below are still useful for the new feature code; legacy guitos-
 * specific helpers (Budget, BudgetNameList, NavBar prompt) have
 * been deleted. Add new helpers here as the feature set grows.
 */

export function roundBig(number: Big, precision: number): number {
	return Big(number).round(precision, 1).toNumber();
}

export function median(arr: number[]): number {
	if (!arr.length) return 0;

	const s = [...arr].toSorted((a, b) => Big(a).minus(b).toNumber());
	const mid = Math.floor(s.length / 2);
	return s.length % 2 === 0
		? Big(s[mid - 1])
				.plus(s[mid])
				.div(2)
				.toNumber()
		: s[mid];
}

export function total(arr: number[]): number {
	if (!arr.length) return 0;

	return arr.reduce((sum, value) => sum.plus(value), Big(0)).toNumber();
}

export function getNestedProperty<O, K extends keyof O, L extends keyof O[K]>(
	object: O,
	firstProp: K,
	secondProp: L,
): O[K][L] {
	return object[firstProp][secondProp];
}

export function getNestedValues<T, K extends keyof T, L extends keyof T[K]>(
	list: T[] | undefined,
	prop1: K,
	prop2: L,
): T[K][L][] {
	// biome-ignore lint/style/noNonNullAssertion: for simplicity
	return list!.map((o: T) => {
		return getNestedProperty(o, prop1, prop2);
	});
}

export function focusRef(ref: RefObject<HTMLInputElement | null>) {
	if (ref.current) {
		ref.current.focus();
	}
}

export function parseLocaleNumber(
	stringNumber: string,
	locale: string | undefined,
): number {
	const thousandSeparator = Intl.NumberFormat(locale)
		.format(11111)
		.replace(/\p{Number}/gu, "");
	const decimalSeparator = Intl.NumberFormat(locale)
		.format(1.1)
		.replace(/\p{Number}/gu, "");

	return Number.parseFloat(
		stringNumber
			.replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
			.replace(new RegExp(`\\${decimalSeparator}`), "."),
	);
}

export function saveLastOpenedPlan(
	name: string,
	navigateFn: (string: string) => void,
) {
	navigateFn(`/${name}`);
	localStorage.setItem("daily_coach_lastOpenedPlan", name);
}
