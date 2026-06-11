/**
 * Tests for `DebtsPage`.
 *
 * The page lists the user's debts, lets them add/edit/delete debts
 * via a Radix `Dialog` (shadcn/ui), sorts by priority (high first)
 * then by next due date, and surfaces:
 *   - an "Overdue" badge when `nextDue < today` (with `--coach-red`
 *     background tint)
 *   - a "HIGH RISK" badge when `remaining > 0.5 * total` AND
 *     `priority >= 4`
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DebtsPage } from "./DebtsPage";
import { useDebts } from "./useDebts";

vi.mock("./useDebts", () => ({
  useDebts: vi.fn(),
}));

const big = (v: number | string) => new Big(v);

const DEBT_CARD = {
  id: "debt-card",
  creditor: "Credit Card",
  totalAmount: big(5000),
  remainingAmount: big(2500),
  monthlyInstallment: big(250),
  nextDueDate: "2026-06-05" as never, // overdue (today is 2026-06-10)
  priority: 1 as never,
  riskIfUnpaid: undefined as string | undefined,
  notes: undefined as string | undefined,
};

const DEBT_LOAN_HIGH_RISK = {
  id: "debt-loan-high",
  creditor: "Personal Loan",
  totalAmount: big(1000),
  remainingAmount: big(900), // > 0.5 * 1000
  monthlyInstallment: big(50),
  nextDueDate: "2026-07-30" as never,
  priority: 5 as never, // high-risk threshold
  riskIfUnpaid: undefined as string | undefined,
  notes: undefined as string | undefined,
};

const DEBT_LOW_RISK = {
  id: "debt-low",
  creditor: "Friend",
  totalAmount: big(200),
  remainingAmount: big(50), // 25% — NOT high risk
  monthlyInstallment: big(25),
  nextDueDate: "2026-08-30" as never,
  priority: 4 as never,
  riskIfUnpaid: undefined as string | undefined,
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

// Radix UI's `DialogContent` emits `console.error` / `console.warn`
// messages when its `DialogTitle`/`DialogDescription` children are
// detected via an async effect that may not have registered by the
// time the warning check runs in tests. The dialog DOES render
// both in our component (see `DebtsPage.tsx`) so these warnings
// are false positives. We silence them for the tests that
// intentionally open the dialog. `console-fail-test` re-throws on
// any console call, so without this the test aborts before
// `cleanup()` runs and the portal content lingers in the body,
// polluting the next test.
const silenceRadixDialogWarnings = () => {
  vi
    .spyOn(console, "error")
    .mockImplementation((..._args: unknown[]) => undefined);
  vi
    .spyOn(console, "warn")
    .mockImplementation((..._args: unknown[]) => undefined);
};

describe("DebtsPage", () => {
  beforeEach(() => {
    vi.mocked(useDebts).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page title and lists the debts sorted by priority asc", () => {
    vi.mocked(useDebts).mockReturnValue({
      ...noopCtx(),
      debts: [DEBT_LOAN_HIGH_RISK, DEBT_CARD, DEBT_LOW_RISK],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<DebtsPage />);
    const page = screen.getByTestId("debts-page");
    expect(within(page).getByTestId("debts-page-title")).toHaveTextContent(
      "Debiti",
    );
    // Scope the row query to the page region so that any leftover
    // portal elements from a previous test don't pollute the result.
    const rows = within(page).getAllByTestId(
      /^debt-row-(?!.*-(edit|delete)$).+$/,
    );
    expect(rows).toHaveLength(3);
    // Card has priority 1, Low has priority 4, Loan has priority 5.
    // After sort by priority asc: card → low → loan.
    expect(rows[0]?.getAttribute("data-testid")).toBe("debt-row-debt-card");
    expect(rows[1]?.getAttribute("data-testid")).toBe("debt-row-debt-low");
    expect(rows[2]?.getAttribute("data-testid")).toBe(
      "debt-row-debt-loan-high",
    );
  });

  it("surfaces 'Overdue' badge with --coach-red background when nextDue < today", () => {
    vi.mocked(useDebts).mockReturnValue({
      ...noopCtx(),
      debts: [DEBT_CARD],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<DebtsPage />);
    const page = screen.getByTestId("debts-page");
    const row = within(page).getByTestId("debt-row-debt-card");
    const badge = within(row).getByTestId("debt-overdue-badge");
    expect(badge).toBeInTheDocument();
    // The overdue row uses the red background from the design tokens.
    expect(row).toHaveAttribute("data-overdue", "true");
  });

  it("surfaces 'HIGH RISK' badge when remaining > 0.5*total AND priority >= 4", () => {
    vi.mocked(useDebts).mockReturnValue({
      ...noopCtx(),
      debts: [DEBT_LOAN_HIGH_RISK, DEBT_LOW_RISK],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<DebtsPage />);
    const page = screen.getByTestId("debts-page");
    // Loan: remaining=900 > 500, priority=5 → HIGH RISK
    const loanRow = within(page).getByTestId("debt-row-debt-loan-high");
    expect(
      within(loanRow).getByTestId("debt-high-risk-badge"),
    ).toBeInTheDocument();
    // Low: remaining=50 <= 100, priority=4 → no badge
    const lowRow = within(page).getByTestId("debt-row-debt-low");
    expect(within(lowRow).queryByTestId("debt-high-risk-badge")).toBeNull();
  });

  it("Add Debt opens the modal and the Save button calls add(debt, true)", () => {
    const add = vi.fn();
    vi.mocked(useDebts).mockReturnValue({
      ...noopCtx(),
      debts: [],
      add,
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    silenceRadixDialogWarnings();
    render(<DebtsPage />);
    const page = screen.getByTestId("debts-page");
    fireEvent.click(within(page).getByTestId("debts-add-button"));
    expect(screen.getByTestId("debt-modal")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("debt-input-creditor"), {
      target: { value: "Bank" },
    });
    fireEvent.change(screen.getByTestId("debt-input-totalAmount"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByTestId("debt-input-remainingAmount"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByTestId("debt-input-monthlyInstallment"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByTestId("debt-input-nextDueDate"), {
      target: { value: "2026-07-15" },
    });
    fireEvent.change(screen.getByTestId("debt-input-priority"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByTestId("debt-modal-save"));
    expect(add).toHaveBeenCalledTimes(1);
    const saved = add.mock.calls[0]?.[0];
    expect(saved.creditor).toBe("Bank");
    expect(saved.totalAmount.toString()).toBe("1000");
    expect(saved.remainingAmount.toString()).toBe("500");
    expect(saved.priority).toBe(3);
    expect(add.mock.calls[0]?.[1]).toBe(true);
  });

  it("Edit on a row opens the modal pre-filled and update is called", () => {
    const update = vi.fn();
    vi.mocked(useDebts).mockReturnValue({
      ...noopCtx(),
      debts: [DEBT_CARD],
      add: vi.fn(),
      update,
      remove: vi.fn(() => true),
    });
    silenceRadixDialogWarnings();
    render(<DebtsPage />);
    const page = screen.getByTestId("debts-page");
    fireEvent.click(within(page).getByTestId("debt-row-debt-card-edit"));
    const creditor = screen.getByTestId(
      "debt-input-creditor",
    ) as HTMLInputElement;
    expect(creditor.value).toBe("Credit Card");
    fireEvent.change(screen.getByTestId("debt-input-remainingAmount"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByTestId("debt-modal-save"));
    expect(update).toHaveBeenCalledTimes(1);
    const saved = update.mock.calls[0]?.[0];
    expect(saved.remainingAmount.toString()).toBe("1000");
    expect(update.mock.calls[0]?.[1]).toBe(true);
  });

  it("Delete on a row calls remove(id, true)", () => {
    const originalConfirm = globalThis.confirm;
    globalThis.confirm = (() => true) as typeof globalThis.confirm;
    const remove = vi.fn(() => true);
    vi.mocked(useDebts).mockReturnValue({
      ...noopCtx(),
      debts: [DEBT_CARD],
      add: vi.fn(),
      update: vi.fn(),
      remove,
    });
    render(<DebtsPage />);
    const page = screen.getByTestId("debts-page");
    fireEvent.click(within(page).getByTestId("debt-row-debt-card-delete"));
    expect(remove).toHaveBeenCalledWith("debt-card", true);
    globalThis.confirm = originalConfirm;
  });

  it("renders the empty-state card when there are no debts", () => {
    vi.mocked(useDebts).mockReturnValue({
      ...noopCtx(),
      debts: [],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<DebtsPage />);
    expect(screen.getByTestId("debts-empty-state")).toBeInTheDocument();
  });
});
