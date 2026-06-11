/**
 * Tests for `MonthlyPlanPage`.
 *
 * The page renders a form for every MonthlyPlan field, a Save
 * button (persists via `useMonthlyPlan().setPlan`), a Live daily
 * budget preview, and a yellow period-ended banner when
 * `daysRemaining <= 0`.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonthlyPlanPage } from "./MonthlyPlanPage";

vi.mock("./useMonthlyPlan", () => ({
  useMonthlyPlan: vi.fn(),
}));
vi.mock("../daily-coach/useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));

import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { useMonthlyPlan } from "./useMonthlyPlan";

const noopCtx = () => ({
  past: [] as ReadonlyArray<unknown>,
  future: [] as ReadonlyArray<unknown>,
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
});

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

const PLAN = {
  id: "plan-form-test",
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

describe("MonthlyPlanPage", () => {
  beforeEach(() => {
    vi.mocked(useMonthlyPlan).mockReset();
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all the MonthlyPlan fields", () => {
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    render(<MonthlyPlanPage />);
    expect(screen.getByTestId("plan-input-currentBalance")).toBeInTheDocument();
    expect(screen.getByTestId("plan-input-expectedIncome")).toBeInTheDocument();
    expect(screen.getByTestId("plan-input-mandatory")).toBeInTheDocument();
    expect(screen.getByTestId("plan-input-debt")).toBeInTheDocument();
    expect(screen.getByTestId("plan-input-savings")).toBeInTheDocument();
    expect(screen.getByTestId("plan-input-emergency")).toBeInTheDocument();
    expect(screen.getByTestId("plan-input-daysRemaining")).toBeInTheDocument();
    expect(screen.getByTestId("plan-input-nextIncomeDate")).toBeInTheDocument();
    expect(screen.getByTestId("plan-save-button")).toBeInTheDocument();
  });

  it("Save button calls setPlan(plan, true)", () => {
    const setPlan = vi.fn();
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan,
    });
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    render(<MonthlyPlanPage />);
    // happy-dom's `fireEvent.click` on a submit button doesn't always
    // dispatch a form submit; submit the form directly to be safe.
    const form = document.querySelector("form");
    if (form) {
      fireEvent.submit(form);
    } else {
      fireEvent.click(screen.getByTestId("plan-save-button"));
    }
    expect(setPlan).toHaveBeenCalledTimes(1);
    expect(setPlan.mock.calls[0]?.[1]).toBe(true);
  });

  it("shows the live daily-budget preview when a plan is set", () => {
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    render(<MonthlyPlanPage />);
    expect(screen.getByTestId("plan-recompute-card")).toBeInTheDocument();
    expect(screen.getByTestId("plan-recompute-value")).toHaveTextContent("11");
  });

  it("shows the period-ended banner when daysRemaining is 0", () => {
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: { ...PLAN, daysRemaining: 0 },
      setPlan: vi.fn(),
    });
    vi.mocked(useDailyBudget).mockReturnValue({
      ...GREEN_PAYLOAD,
      daily: { ...GREEN_PAYLOAD.daily, daysRemaining: 0, periodEnded: true },
    });
    render(<MonthlyPlanPage />);
    expect(screen.getByTestId("period-ended-banner")).toBeInTheDocument();
    expect(screen.getByTestId("period-ended-banner")).toHaveTextContent(
      "period has ended",
    );
  });

  it("renders the form with empty defaults when no plan exists", () => {
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: undefined,
      setPlan: vi.fn(),
    });
    vi.mocked(useDailyBudget).mockReturnValue(null);
    render(<MonthlyPlanPage />);
    // All inputs are present with zero defaults.
    expect(screen.getByTestId("plan-input-currentBalance")).toHaveValue(0);
    expect(screen.getByTestId("plan-save-button")).toBeInTheDocument();
  });
});
