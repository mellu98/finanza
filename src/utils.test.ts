import Big from "big.js";
import { expect, test } from "vitest";
import {
	getNestedProperty,
	getNestedValues,
	median,
	parseLocaleNumber,
	roundBig,
	total,
} from "./utils";

test("round", () => {
	expect(roundBig(Big(123.123123123), 5)).eq(123.12312);
	expect(roundBig(Big(123.123), 2)).eq(123.12);
	expect(roundBig(Big(1.125324235131234), 2)).eq(1.13);
	expect(roundBig(Big(123.124), 2)).eq(123.12);
	expect(roundBig(Big(123.125), 2)).eq(123.13);
	expect(roundBig(Big(123.125), 1)).eq(123.1);
	expect(roundBig(Big(123.126), 0)).eq(123);
});

test("parseLocaleNumber", () => {
	expect(parseLocaleNumber("123.45", "en-US")).eq(123.45);
	expect(parseLocaleNumber("123,45", "es")).eq(123.45);
	expect(parseLocaleNumber("12.054.100,55", "de-DE")).eq(12054100.55);
	expect(parseLocaleNumber("1,20,54,100.55", "en-IN")).eq(12054100.55);
});

test("median", () => {
	expect(median([123.43, 100, 300, -500])).eq(111.715);
	expect(median([123.43, 100, 300, 500])).eq(211.715);
	expect(median([123.45, 100, 300])).eq(123.45);
	expect(median([123.45, 100])).eq(111.725);
	expect(median([123.45])).eq(123.45);
	expect(median([0])).eq(0);
	expect(median([])).eq(0);
	expect(median([-1, -2])).eq(-1.5);
});

test("total", () => {
	expect(total([123.43, 100, 300, -500])).eq(23.43);
	expect(total([123.45, 100])).eq(223.45);
	expect(total([123.45])).eq(123.45);
	expect(total([0])).eq(0);
	expect(total([])).eq(0);
});

test("getNestedProperty", () => {
	const obj = { a: { b: 42 } } as { a: { b: number } };
	expect(getNestedProperty(obj, "a", "b")).eq(42);
});

test("getNestedValues", () => {
	const list = [
		{ a: { b: 1 } },
		{ a: { b: 2 } },
		{ a: { b: 3 } },
	] as Array<{ a: { b: number } }>;
	expect(getNestedValues(list, "a", "b")).toEqual([1, 2, 3]);
});
