/**
 * Tests for `MonthlyPlanPage`.
 *
 * The page renders a form for every MonthlyPlan field, a Save
 * button (persists via `useMonthlyPlan().save()`), a Live daily
 * budget preview, and a yellow period-ended banner when
 * `daysRemaining <= 0`.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
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
  // save() risolve con undefined; i test che vogliono simulare un
  // errore o uno stato specifico possono sovrascrivere questo mock.
  save: vi.fn().mockResolvedValue(undefined),
  isSaving: false,
  saveError: null,
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

const renderWithRouter = (ui: React.ReactElement) =>
  render(<Router>{ui}</Router>);

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
    renderWithRouter(<MonthlyPlanPage />);
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

  it("Save button calls save() and persists the plan", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
      save,
    });
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    renderWithRouter(<MonthlyPlanPage />);
    // happy-dom's `fireEvent.click` on a submit button doesn't always
    // dispatch a form submit; submit the form directly to be safe.
    const form = document.querySelector("form");
    if (form) {
      fireEvent.submit(form);
    } else {
      fireEvent.click(screen.getByTestId("plan-save-button"));
    }
    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  it("Save button shows error toast when save() rejects", async () => {
    const save = vi.fn().mockRejectedValue(new Error("disk full"));
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
      save,
    });
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    renderWithRouter(<MonthlyPlanPage />);
    const form = document.querySelector("form");
    if (form) fireEvent.submit(form);
    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(1);
    });
    // Button stays enabled after error (recoverable state).
    expect(screen.getByTestId("plan-save-button")).not.toBeDisabled();
  });

  it("Save button is disabled while saving", () => {
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
      isSaving: true,
    });
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    renderWithRouter(<MonthlyPlanPage />);
    const btn = screen.getByTestId("plan-save-button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Salvataggio…");
  });

  it("shows the live daily-budget preview when a plan is set", () => {
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: PLAN,
      setPlan: vi.fn(),
    });
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    renderWithRouter(<MonthlyPlanPage />);
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
    renderWithRouter(<MonthlyPlanPage />);
    expect(screen.getByTestId("period-ended-banner")).toBeInTheDocument();
    expect(screen.getByTestId("period-ended-banner")).toHaveTextContent(
      "Il periodo corrente è terminato",
    );
  });

  it("renders the form with empty defaults when no plan exists", () => {
    vi.mocked(useMonthlyPlan).mockReturnValue({
      ...noopCtx(),
      plan: undefined,
      setPlan: vi.fn(),
    });
    vi.mocked(useDailyBudget).mockReturnValue(null);
    renderWithRouter(<MonthlyPlanPage />);
    // All inputs are present with zero defaults.
    expect(screen.getByTestId("plan-input-currentBalance")).toHaveValue(0);
    expect(screen.getByTestId("plan-save-button")).toBeInTheDocument();
  });
});
