/**
 * Tests for `DailyBudgetPage`.
 *
 * The page renders the formula, the inputs, the live result, the
 * status card, and a Recompute button. Tests assert each of those
 * is present and that the Recompute button toggles the
 * "last recomputed at" timestamp.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DailyBudgetPage } from "./DailyBudgetPage";

vi.mock("./useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));
vi.mock("../monthly-plan/useMonthlyPlan", () => ({
  useMonthlyPlan: vi.fn(),
}));

import { useMonthlyPlan } from "../monthly-plan/useMonthlyPlan";
import { useDailyBudget } from "./useDailyBudget";

const GREEN_PAYLOAD = {
  daily: {
    dailyBudgetRaw: new Big(11),
    dailyBudgetRounded: 11,
    status: "green" as const,
    spentToday: 0,
    daysRemaining: 10,
    daysToNextIncome: 15,
    forecast: new Big(110),
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

const PLAN = {
  id: "plan-page-test",
  periodStart: "2026-06-01" as never,
  periodEnd: "2026-06-30" as never,
  currentBalance: new Big(600),
  expectedIncomeUntilPeriodEnd: new Big(0),
  mandatoryExpensesRemaining: new Big(460),
  debtPaymentsRemaining: new Big(0),
  savingsGoalRemaining: new Big(30),
  emergencyBuffer: new Big(0),
  daysRemaining: 10,
  nextIncomeDate: "2026-06-25" as never,
  createdAt: "2026-06-01T00:00:00Z" as never,
  updatedAt: "2026-06-01T00:00:00Z" as never,
};

describe("DailyBudgetPage", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
    vi.mocked(useMonthlyPlan).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the formula, inputs, and the live result alert", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    render(<DailyBudgetPage />);
    expect(screen.getByTestId("daily-budget-formula")).toHaveTextContent(
      "daily_budget = (currentBalance",
    );
    expect(
      screen.getByTestId("formula-input-currentBalance"),
    ).toHaveTextContent("600");
    expect(screen.getByTestId("daily-budget-result-value")).toHaveTextContent(
      "11",
    );
    expect(screen.getByTestId("daily-budget-result-alert")).toHaveTextContent(
      "status = green",
    );
  });

  it("renders the StatusCard and a Recompute button", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    render(<DailyBudgetPage />);
    expect(screen.getByTestId("status-card")).toBeInTheDocument();
    expect(screen.getByTestId("recompute-button")).toBeInTheDocument();
  });

  it("Recompute button toggles the timestamp", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    render(<DailyBudgetPage />);
    // No timestamp before clicking
    expect(screen.queryByTestId("recompute-timestamp")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("recompute-button"));
    expect(screen.getByTestId("recompute-timestamp")).toHaveTextContent(
      "Ricalcolato alle",
    );
  });

  it("renders gracefully when no plan is set", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: undefined,
      setPlan: vi.fn(),
    });
    render(<DailyBudgetPage />);
    // The page still renders; the StatusCard flips to its empty
    // variant, and the formula card has no inputs.
    expect(
      screen.queryByTestId("daily-budget-formula-inputs"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("status-card-empty")).toBeInTheDocument();
  });
});
