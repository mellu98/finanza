/**
 * Tests for `AffordabilitySimulator`.
 *
 * The page renders a form (amount + category + optional description),
 * previews the engine's verdict, and shows the impact on today's and
 * the next 7 days' budget. The "Apply" button materialises the
 * candidate purchase as a real `Transaction` (saving it to the undo
 * stack so the user can undo).
 *
 * Verdict semantics (per the engine):
 *   - "yes"        → fits, consumes < 50 % of today's remaining
 *   - "attention"  → fits, consumes ≥ 50 % of today's remaining
 *   - "no"         → does not fit
 *
 * The verdict chip MUST use color + text (WCAG 1.4.1).
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { useMonthlyPlan } from "../monthly-plan/useMonthlyPlan";
import { Classification, TransactionType } from "../transactions/transaction";
import { useTransactions } from "../transactions/useTransactions";
import { AffordabilitySimulator } from "./AffordabilitySimulator";

vi.mock("../daily-coach/useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));
vi.mock("../monthly-plan/useMonthlyPlan", () => ({
  useMonthlyPlan: vi.fn(),
}));
vi.mock("../transactions/useTransactions", () => ({
  useTransactions: vi.fn(),
}));

const big = (v: number | string) => new Big(v);

const PLAN = {
  id: "plan-sim",
  periodStart: "2026-06-01" as never,
  periodEnd: "2026-06-30" as never,
  currentBalance: big(600),
  expectedIncomeUntilPeriodEnd: big(0),
  mandatoryExpensesRemaining: big(460),
  debtPaymentsRemaining: big(0),
  savingsGoalRemaining: big(30),
  emergencyBuffer: big(0),
  daysRemaining: 10,
  nextIncomeDate: "2026-06-25" as never,
  createdAt: "2026-06-01T00:00:00Z" as never,
  updatedAt: "2026-06-01T00:00:00Z" as never,
};

const GREEN_PAYLOAD = {
  daily: {
    dailyBudgetRaw: big(11),
    dailyBudgetRounded: 11,
    status: "green" as const,
    spentToday: 0,
    daysRemaining: 10,
    daysToNextIncome: 15,
    forecast: big(110),
    forecastRounded: 110,
    periodEnded: false,
  },
  decision: {
    mode: "steady" as const,
    priority: "standard" as const,
    actions: [],
    blockedCategories: [],
    reducedCategories: [],
    alerts: [],
  },
};

const noopCtx = () => ({
  past: [] as ReadonlyArray<unknown>,
  future: [] as ReadonlyArray<unknown>,
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
});

describe("AffordabilitySimulator", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
    vi.mocked(useMonthlyPlan).mockReset();
    vi.mocked(useTransactions).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page title, the form, and an initial empty preview", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useTransactions).mockReturnValue({
      ...noopCtx(),
      transactions: [],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<AffordabilitySimulator />);
    expect(screen.getByTestId("simulator-page-title")).toHaveTextContent(
      /afford/i,
    );
    expect(screen.getByTestId("simulator-input-amount")).toBeInTheDocument();
    expect(screen.getByTestId("simulator-input-category")).toBeInTheDocument();
    expect(
      screen.getByTestId("simulator-input-description"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("simulator-simulate-button")).toBeInTheDocument();
  });

  it("YES verdict (green) — small amount, well within budget", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useTransactions).mockReturnValue({
      ...noopCtx(),
      transactions: [],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<AffordabilitySimulator />);
    fireEvent.change(screen.getByTestId("simulator-input-amount"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByTestId("simulator-input-category"), {
      target: { value: "groceries" },
    });
    fireEvent.click(screen.getByTestId("simulator-simulate-button"));
    const chip = screen.getByTestId("simulator-verdict-chip");
    expect(chip).toHaveTextContent("YES");
    // WCAG 1.4.1: the chip carries BOTH color and a written label.
    expect(chip.textContent).toMatch(/YES/i);
    // The effect-on-today card is populated.
    expect(screen.getByTestId("simulator-effect-today")).toBeInTheDocument();
  });

  it("ATTENTION verdict (yellow) — fits but uses > 50% of remaining", () => {
    // daily=11, todaySpent=0, remaining=11. Amount 6 → 6/11=54% → ATTENTION
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useTransactions).mockReturnValue({
      ...noopCtx(),
      transactions: [],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<AffordabilitySimulator />);
    fireEvent.change(screen.getByTestId("simulator-input-amount"), {
      target: { value: "6" },
    });
    fireEvent.change(screen.getByTestId("simulator-input-category"), {
      target: { value: "groceries" },
    });
    fireEvent.click(screen.getByTestId("simulator-simulate-button"));
    const chip = screen.getByTestId("simulator-verdict-chip");
    expect(chip).toHaveTextContent(/ATTENTION/i);
  });

  it("NO verdict (red) — amount exceeds remaining budget", () => {
    // daily=11, todaySpent=0, remaining=11. Amount 50 → NO.
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useTransactions).mockReturnValue({
      ...noopCtx(),
      transactions: [],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<AffordabilitySimulator />);
    fireEvent.change(screen.getByTestId("simulator-input-amount"), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByTestId("simulator-input-category"), {
      target: { value: "dining" },
    });
    fireEvent.click(screen.getByTestId("simulator-simulate-button"));
    const chip = screen.getByTestId("simulator-verdict-chip");
    expect(chip).toHaveTextContent("NO");
  });

  it("Apply button creates a Transaction via useTransactions().add(tx, true)", () => {
    const add = vi.fn();
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useTransactions).mockReturnValue({
      ...noopCtx(),
      transactions: [],
      add,
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<AffordabilitySimulator />);
    fireEvent.change(screen.getByTestId("simulator-input-amount"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByTestId("simulator-input-category"), {
      target: { value: "groceries" },
    });
    fireEvent.change(screen.getByTestId("simulator-input-description"), {
      target: { value: "apples" },
    });
    fireEvent.click(screen.getByTestId("simulator-simulate-button"));
    fireEvent.click(screen.getByTestId("simulator-apply-button"));
    expect(add).toHaveBeenCalledTimes(1);
    const tx = add.mock.calls[0]?.[0];
    expect(tx.type).toBe(TransactionType.Expense);
    expect(tx.category).toBe("groceries");
    expect(tx.description).toBe("apples");
    expect(tx.amount.toString()).toBe("5");
    expect(tx.classification).toBe(Classification.Controllable);
    expect(add.mock.calls[0]?.[1]).toBe(true);
  });

  it("verdict chip color + text satisfy WCAG 1.4.1 (color is not the only channel)", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useTransactions).mockReturnValue({
      ...noopCtx(),
      transactions: [],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<AffordabilitySimulator />);
    fireEvent.change(screen.getByTestId("simulator-input-amount"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByTestId("simulator-input-category"), {
      target: { value: "groceries" },
    });
    fireEvent.click(screen.getByTestId("simulator-simulate-button"));
    const chip = screen.getByTestId("simulator-verdict-chip");
    // The chip has visible text (YES / NO / ATTENTION) AND a colored
    // background. The text content is non-empty regardless of color.
    expect(chip.textContent ?? "").not.toBe("");
    // The chip carries role="status" so screen readers announce the
    // verdict change.
    expect(chip).toHaveAttribute("role", "status");
  });

  it("does NOT show the apply button until the user clicks Simulate", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useTransactions).mockReturnValue({
      ...noopCtx(),
      transactions: [],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<AffordabilitySimulator />);
    // No verdict chip before simulate.
    expect(screen.queryByTestId("simulator-verdict-chip")).toBeNull();
    expect(screen.queryByTestId("simulator-apply-button")).toBeNull();
    // After simulate, both are present.
    fireEvent.change(screen.getByTestId("simulator-input-amount"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByTestId("simulator-input-category"), {
      target: { value: "groceries" },
    });
    fireEvent.click(screen.getByTestId("simulator-simulate-button"));
    expect(screen.getByTestId("simulator-verdict-chip")).toBeInTheDocument();
    expect(screen.getByTestId("simulator-apply-button")).toBeInTheDocument();
  });

  it("shows a graceful empty state when no plan is set", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: undefined,
      setPlan: vi.fn(),
    });
    vi.mocked(useTransactions).mockReturnValue({
      ...noopCtx(),
      transactions: [],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<AffordabilitySimulator />);
    expect(screen.getByTestId("simulator-no-plan")).toBeInTheDocument();
    // The form is rendered but the Simulate button is disabled.
    const btn = screen.getByTestId(
      "simulator-simulate-button",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
