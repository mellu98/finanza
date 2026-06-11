/**
 * Test for the PR3 context-test helpers in `src/setupTests.ts`.
 *
 * Verifies that each `render*Context` helper mounts its provider
 * correctly, that the context value is captured into the
 * `*ContextCapture` ref, and that the `test*Context` plain-object
 * constants are well-formed (i.e. they have all the expected keys).
 */
import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
	renderCoachSettingsContext,
	renderDebtsContext,
	renderMonthlyPlanContext,
	renderSavingsGoalsContext,
	renderTransactionsContext,
	testCoachSettingsContext,
	testCoachSettingsContextCapture,
	testDebtsContext,
	testDebtsContextCapture,
	testMonthlyPlanContext,
	testMonthlyPlanContextCapture,
	testSavingsGoalsContext,
	testSavingsGoalsContextCapture,
	testTransactionsContext,
	testTransactionsContextCapture,
} from "../../setupTests";

describe("PR3 setupTests helpers", () => {
	describe("test*Context constants", () => {
		it("testMonthlyPlanContext has the expected shape", () => {
			expect(testMonthlyPlanContext.plan).toBeDefined();
			expect(testMonthlyPlanContext.plan?.id).toBe("plan-test-setup");
			expect(typeof testMonthlyPlanContext.setPlan).toBe("function");
		});

		it("testTransactionsContext has the expected shape", () => {
			expect(testTransactionsContext.transactions).toHaveLength(2);
			expect(testTransactionsContext.transactions[0]?.id).toBe(
				"tx-groceries-42",
			);
			expect(typeof testTransactionsContext.add).toBe("function");
		});

		it("testSavingsGoalsContext has the expected shape", () => {
			expect(testSavingsGoalsContext.goals).toHaveLength(2);
			expect(typeof testSavingsGoalsContext.add).toBe("function");
		});

		it("testDebtsContext has the expected shape", () => {
			expect(testDebtsContext.debts).toHaveLength(2);
			expect(testDebtsContext.debts[0]?.id).toBe("debt-credit-card");
		});

		it("testCoachSettingsContext has the expected shape", () => {
			expect(testCoachSettingsContext.settings).toBeDefined();
			expect(testCoachSettingsContext.settings?.modelName).toBe("llama3.2");
		});
	});

	describe("render*Context helpers", () => {
		it("renderMonthlyPlanContext mounts and captures the context", () => {
			const result = renderMonthlyPlanContext(createElement("div"));
			expect(result.container).toBeInTheDocument();
			expect(testMonthlyPlanContextCapture).toBeDefined();
		});

		it("renderTransactionsContext mounts", () => {
			const result = renderTransactionsContext(createElement("div"));
			expect(result.container).toBeInTheDocument();
			expect(testTransactionsContextCapture).toBeDefined();
		});

		it("renderSavingsGoalsContext mounts", () => {
			const result = renderSavingsGoalsContext(createElement("div"));
			expect(result.container).toBeInTheDocument();
			expect(testSavingsGoalsContextCapture).toBeDefined();
		});

		it("renderDebtsContext mounts", () => {
			const result = renderDebtsContext(createElement("div"));
			expect(result.container).toBeInTheDocument();
			expect(testDebtsContextCapture).toBeDefined();
		});

		it("renderCoachSettingsContext mounts", () => {
			const result = renderCoachSettingsContext(createElement("div"));
			expect(result.container).toBeInTheDocument();
			expect(testCoachSettingsContextCapture).toBeDefined();
		});
	});

	it("regression: legacy RTL render still works", () => {
		const result = render(createElement("div", null, "hello"));
		expect(result.container.textContent).toBe("hello");
	});
});
