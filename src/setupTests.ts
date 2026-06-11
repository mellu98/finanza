// jest-dom adds custom jest matchers for asserting on DOM nodes.
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom/vitest";
import { cleanup, type RenderResult, render } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import { afterEach, vi } from "vitest";
import { CoachSettingsMother } from "./features/coach/CoachSettings.mother";
import {
	type CoachSettingsContextInterface,
	CoachSettingsProvider,
} from "./features/coach/CoachSettingsContext";
import { useCoachSettings } from "./features/coach/useCoachSettings";
import { DebtMother } from "./features/debts/Debt.mother";
import {
	type DebtsContextInterface,
	DebtsProvider,
} from "./features/debts/DebtsContext";
import { useDebts } from "./features/debts/useDebts";
import { SavingsGoalMother } from "./features/goals/SavingsGoal.mother";
import {
	type SavingsGoalsContextInterface,
	SavingsGoalsProvider,
} from "./features/goals/SavingsGoalsContext";
import { useSavingsGoals } from "./features/goals/useSavingsGoals";
import {
	type MonthlyPlanContextInterface,
	MonthlyPlanProvider,
} from "./features/monthly-plan/MonthlyPlanContext";
import { MonthlyPlanMother } from "./features/monthly-plan/MonthlyPlanMother";
import { useMonthlyPlan } from "./features/monthly-plan/useMonthlyPlan";
import { TransactionMother } from "./features/transactions/Transaction.mother";
import {
	type TransactionsContextInterface,
	TransactionsProvider,
} from "./features/transactions/TransactionsContext";
import { useTransactions } from "./features/transactions/useTransactions";

window.crypto.randomUUID = () => "035c2de4-00a4-403c-8f0e-f81339be9a4e";
window.isSecureContext = true;
global.URL.createObjectURL = vi.fn();

// silence recharts ResponsiveContainer error
vi.mock("recharts", async (importOriginal) => {
	const originalModule = await importOriginal();
	return {
		//@ts-expect-error
		...originalModule,
		ResponsiveContainer: () => createElement("div"),
	};
});

// Il filter per i warning Radix Dialog è in `src/consoleFilter.setup.ts`,
// caricato PRIMA di console-fail-test/setup in `vite.config.ts`.

// runs a cleanup after each test case (e.g. clearing happy-dom)
afterEach(() => {
	cleanup();
});

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: unknown) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

/* ------------------------------------------------------------------ *
 * Per-context test values + render helpers (PR3).
 * ------------------------------------------------------------------ */

const noopMock = vi.fn();

export const testMonthlyPlanContext: MonthlyPlanContextInterface = {
	plan: MonthlyPlanMother.testPlan({ id: "plan-test-setup" }),
	setPlan: noopMock,
	past: [],
	future: [],
	undo: noopMock,
	redo: noopMock,
	canUndo: false,
	canRedo: false,
};

export const testTransactionsContext: TransactionsContextInterface = {
	transactions: [
		TransactionMother.groceriesExpense42(),
		TransactionMother.salary1500(),
	],
	add: noopMock,
	remove: noopMock,
	update: noopMock,
	past: [],
	future: [],
	undo: noopMock,
	redo: noopMock,
	canUndo: false,
	canRedo: false,
};

export const testSavingsGoalsContext: SavingsGoalsContextInterface = {
	goals: [SavingsGoalMother.vacation(), SavingsGoalMother.emergencyFund()],
	add: noopMock,
	remove: noopMock,
	update: noopMock,
	past: [],
	future: [],
	undo: noopMock,
	redo: noopMock,
	canUndo: false,
	canRedo: false,
};

export const testDebtsContext: DebtsContextInterface = {
	debts: [DebtMother.creditCard(), DebtMother.personalLoan()],
	add: noopMock,
	remove: noopMock,
	update: noopMock,
	past: [],
	future: [],
	undo: noopMock,
	redo: noopMock,
	canUndo: false,
	canRedo: false,
};

export const testCoachSettingsContext: CoachSettingsContextInterface = {
	settings: CoachSettingsMother.testSettings(),
	setSettings: noopMock,
	past: [],
	future: [],
	undo: noopMock,
	redo: noopMock,
	canUndo: false,
	canRedo: false,
};

type ContextCapturer<T> = { current: T | undefined };

function renderWithProvider<T>(options: {
	element: ReactElement;
	provider: (props: { children: ReactElement }) => ReactElement;
	useContextValue: () => T;
	capture: ContextCapturer<T>;
}): RenderResult {
	const { element, provider, useContextValue, capture } = options;

	function Observer() {
		capture.current = useContextValue();
		return null;
	}

	return render(
		createElement(
			provider,
			null,
			createElement(Observer, null),
			element,
		) as ReactElement,
	);
}

export const testMonthlyPlanContextCapture: ContextCapturer<MonthlyPlanContextInterface> =
	{ current: undefined };
export const testTransactionsContextCapture: ContextCapturer<TransactionsContextInterface> =
	{ current: undefined };
export const testSavingsGoalsContextCapture: ContextCapturer<SavingsGoalsContextInterface> =
	{ current: undefined };
export const testDebtsContextCapture: ContextCapturer<DebtsContextInterface> = {
	current: undefined,
};
export const testCoachSettingsContextCapture: ContextCapturer<CoachSettingsContextInterface> =
	{ current: undefined };

// biome-ignore lint/suspicious/noExplicitAny: provider types vary; cast through any for the helper.
const asProvider = (p: any) =>
	p as (props: { children: ReactElement }) => ReactElement;

export const renderMonthlyPlanContext = (element: ReactElement): RenderResult =>
	renderWithProvider({
		element,
		provider: asProvider(MonthlyPlanProvider),
		useContextValue: useMonthlyPlan,
		capture: testMonthlyPlanContextCapture,
	});

export const renderTransactionsContext = (
	element: ReactElement,
): RenderResult =>
	renderWithProvider({
		element,
		provider: asProvider(TransactionsProvider),
		useContextValue: useTransactions,
		capture: testTransactionsContextCapture,
	});

export const renderSavingsGoalsContext = (
	element: ReactElement,
): RenderResult =>
	renderWithProvider({
		element,
		provider: asProvider(SavingsGoalsProvider),
		useContextValue: useSavingsGoals,
		capture: testSavingsGoalsContextCapture,
	});

export const renderDebtsContext = (element: ReactElement): RenderResult =>
	renderWithProvider({
		element,
		provider: asProvider(DebtsProvider),
		useContextValue: useDebts,
		capture: testDebtsContextCapture,
	});

export const renderCoachSettingsContext = (
	element: ReactElement,
): RenderResult =>
	renderWithProvider({
		element,
		provider: asProvider(CoachSettingsProvider),
		useContextValue: useCoachSettings,
		capture: testCoachSettingsContextCapture,
	});
