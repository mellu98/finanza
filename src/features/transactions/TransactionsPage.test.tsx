/**
 * Tests for `TransactionsPage`.
 *
 * The page composes the table with two action buttons:
 *   - "Importa CSV": opens a Dialog (Radix) with a textarea (paste) +
 *     file upload. On submit, calls `importCSV` and surfaces the
 *     result (success alert OR per-row error report) and the import
 *     never partial-commits.
 *   - "Esporta CSV": triggers a browser download of the CSV blob.
 *
 * The page also surfaces a small "Budget per categoria" section that
 * lets the user set/update a `categoryBudget` on the most recent
 * transaction of a category (PR2 #3 resolution surface).
 */
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CSV_HEADER } from "./TransactionsCsvService";
import { TransactionsPage } from "./TransactionsPage";
import type { Transaction } from "./transaction";
import { Classification, TransactionType } from "./transaction";
import { useTransactions } from "./useTransactions";

vi.mock("./useTransactions", () => ({
	useTransactions: vi.fn(),
}));

const big = (v: number | string) => new Big(v);

const TX_GROCERY = {
	id: "tx-grocery",
	date: "2026-06-10" as never,
	type: TransactionType.Expense,
	category: "groceries",
	description: "milk",
	amount: big("3.50") as Transaction["amount"],
	necessary: true,
	classification: Classification.Controllable,
	notes: undefined as string | undefined,
};

const TX_DINING = {
	id: "tx-dining",
	date: "2026-06-11" as never,
	type: TransactionType.Expense,
	category: "dining",
	description: "lunch",
	amount: big("12.00") as Transaction["amount"],
	necessary: false,
	classification: Classification.Avoidable,
	notes: undefined as string | undefined,
};

const noopCtx = () => ({
	past: [] as ReadonlyArray<unknown>,
	future: [] as ReadonlyArray<unknown>,
	undo: vi.fn(),
	redo: vi.fn(),
	canUndo: false,
	canRedo: false,
});

// Radix UI's `DialogContent` emits a `console.error` warning when
// its `DialogTitle` child is detected via an async effect that may
// not have registered by the time the warning check runs in tests.
// The dialog DOES render a title in our component (see
// `TransactionsPage.tsx`) so this warning is a false positive. We
// silence it for the tests that intentionally open the dialog.
const silenceRadixDialogWarnings = () => {
	const spy = vi
		.spyOn(console, "error")
		.mockImplementation((..._args: unknown[]) => undefined);
	return spy;
};

describe("TransactionsPage", () => {
	beforeEach(() => {
		vi.mocked(useTransactions).mockReset();
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders the page title, table, and action buttons", () => {
		vi.mocked(useTransactions).mockReturnValue({
			...noopCtx(),
			transactions: [TX_GROCERY, TX_DINING],
			add: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(() => true),
		});
		render(<TransactionsPage />);
		expect(screen.getByTestId("transactions-page-title")).toHaveTextContent(
			"Transazioni",
		);
		expect(screen.getByTestId("tx-import-button")).toBeInTheDocument();
		expect(screen.getByTestId("tx-export-button")).toBeInTheDocument();
		expect(
			screen.getByTestId("transactions-table-wrapper"),
		).toBeInTheDocument();
	});

	it("Import modal opens; importing an all-valid CSV shows a success alert and calls add for each row", async () => {
		const add = vi.fn();
		vi.mocked(useTransactions).mockReturnValue({
			...noopCtx(),
			transactions: [],
			add,
			update: vi.fn(),
			remove: vi.fn(() => true),
		});
		silenceRadixDialogWarnings();
		const { unmount } = render(<TransactionsPage />);
		fireEvent.click(screen.getByTestId("tx-import-button"));
		expect(screen.getByTestId("tx-import-modal")).toBeInTheDocument();
		const csv = [
			CSV_HEADER,
			"2026-06-10,expense,groceries,milk,3.50,cash,true,controllable,",
			"2026-06-11,expense,dining,lunch,12.00,card,false,avoidable,with friends",
		].join("\n");
		fireEvent.change(screen.getByTestId("tx-import-textarea"), {
			target: { value: csv },
		});
		fireEvent.click(screen.getByTestId("tx-import-submit"));
		await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
		expect(screen.getByTestId("tx-import-success-alert")).toHaveTextContent(
			/importate 2/i,
		);
		// Close the dialog explicitly so the Radix portal doesn't leak
		// into the next test (the success auto-close is 1.2s, too
		// long for the test suite).
		fireEvent.click(screen.getByTestId("tx-import-cancel"));
		unmount();
	});

	it("Import modal with a 1-bad-row CSV shows a per-row error report and calls add zero times", () => {
		const add = vi.fn();
		vi.mocked(useTransactions).mockReturnValue({
			...noopCtx(),
			transactions: [],
			add,
			update: vi.fn(),
			remove: vi.fn(() => true),
		});
		silenceRadixDialogWarnings();
		const { unmount } = render(<TransactionsPage />);
		fireEvent.click(screen.getByTestId("tx-import-button"));
		const csv = [
			CSV_HEADER,
			"2026-06-10,expense,groceries,milk,3.50,cash,true,controllable,",
			"2026-06-10,foo,dining,snack,5.00,cash,false,avoidable,", // bad type
			"2026-06-10,expense,dining,lunch,12.00,card,false,avoidable,",
		].join("\n");
		fireEvent.change(screen.getByTestId("tx-import-textarea"), {
			target: { value: csv },
		});
		fireEvent.click(screen.getByTestId("tx-import-submit"));
		expect(add).not.toHaveBeenCalled();
		expect(screen.getByTestId("tx-import-error-alert")).toBeInTheDocument();
		expect(
			screen.getByTestId("tx-import-error-alert").textContent ?? "",
		).toMatch(/Riga 2/);
		// Close the dialog before unmounting so the Radix portal
		// doesn't leak into the next test.
		fireEvent.click(screen.getByTestId("tx-import-cancel"));
		unmount();
	});

	it("Export button calls exportCSV and triggers a download", () => {
		// Stub URL.createObjectURL + a clickable anchor.
		const createObjectURL = vi.fn(() => "blob:url");
		const revokeObjectURL = vi.fn();
		globalThis.URL.createObjectURL =
			createObjectURL as unknown as typeof URL.createObjectURL;
		globalThis.URL.revokeObjectURL =
			revokeObjectURL as unknown as typeof URL.revokeObjectURL;
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});
		vi.mocked(useTransactions).mockReturnValue({
			...noopCtx(),
			transactions: [TX_GROCERY, TX_DINING],
			add: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(() => true),
		});
		render(<TransactionsPage />);
		fireEvent.click(screen.getByTestId("tx-export-button"));
		// The blob URL was created from a CSV string.
		expect(createObjectURL).toHaveBeenCalledTimes(1);
		const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
		expect(blob).toBeInstanceOf(Blob);
		// Cleanup.
		clickSpy.mockRestore();
	});

	it("Category-budget editor: setting a budget updates the most recent transaction in that category", async () => {
		const update = vi.fn();
		vi.mocked(useTransactions).mockReturnValue({
			...noopCtx(),
			transactions: [TX_GROCERY, TX_DINING],
			add: vi.fn(),
			update,
			remove: vi.fn(() => true),
		});
		render(<TransactionsPage />);
		// The section is present.
		expect(screen.getByTestId("category-budget-editor")).toBeInTheDocument();
		// With the new controlled-input editor: the "Save" button is
		// disabled until the user types something different from the
		// current budget. We type the new value first.
		const input = screen.getByTestId(
			"budget-amount-input-groceries",
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "5" } });
		expect(input.value).toBe("5");
		fireEvent.click(screen.getByTestId("budget-save-groceries"));
		// Con controlled input + React state, l'update è asincrono: usiamo
		// waitFor per dare tempo a React di applicare l'update.
		await waitFor(() => {
			expect(update).toHaveBeenCalledTimes(1);
		});
		const saved = update.mock.calls[0]?.[0];
		expect(saved.category).toBe("groceries");
		expect(saved.categoryBudget?.toString()).toBe("5");
		expect(update.mock.calls[0]?.[1]).toBe(true);
	});

	it("renders the empty state when there are no transactions", () => {
		vi.mocked(useTransactions).mockReturnValue({
			...noopCtx(),
			transactions: [],
			add: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(() => true),
		});
		render(<TransactionsPage />);
		expect(screen.getByTestId("transactions-empty-state")).toBeInTheDocument();
	});

	it("import textarea is empty by default and can be pasted into", () => {
		vi.mocked(useTransactions).mockReturnValue({
			...noopCtx(),
			transactions: [],
			add: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(() => true),
		});
		silenceRadixDialogWarnings();
		const { unmount } = render(<TransactionsPage />);
		fireEvent.click(screen.getByTestId("tx-import-button"));
		const textarea = screen.getByTestId(
			"tx-import-textarea",
		) as HTMLTextAreaElement;
		expect(textarea.value).toBe("");
		// Close the dialog before unmounting so the Radix portal
		// doesn't leak into the next test.
		fireEvent.click(screen.getByTestId("tx-import-cancel"));
		unmount();
	});
});
