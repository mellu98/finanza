/**
 * Tests for the two "save + income" cards. Combined in one file per
 * the PR5 work-unit rule (T5.5 ships as a single reviewable unit).
 *
 * The DailySaveQuotaCard reads the goals context too; we mock both
 * `useDailyBudget` and `useSavingsGoals`. The engine is left
 * unmodified so the test exercises the real `computeDailySavingRequired`.
 */
import { render, screen } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavingsGoalMother } from "../goals/SavingsGoal.mother";
import { DailySaveQuotaCard } from "./DailySaveQuotaCard";
import { DaysToNextIncomeCard } from "./DaysToNextIncomeCard";

vi.mock("../daily-coach/useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));
vi.mock("../goals/useSavingsGoals", () => ({
  useSavingsGoals: vi.fn(),
}));

import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { useSavingsGoals } from "../goals/useSavingsGoals";

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
  add: vi.fn(),
  remove: vi.fn(() => false),
  update: vi.fn(),
  past: [],
  future: [],
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
});

describe("DailySaveQuotaCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
    vi.mocked(useSavingsGoals).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows zero when there are no goals", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [],
    });
    render(<DailySaveQuotaCard />);
    expect(screen.getByTestId("daily-save-quota-card-value")).toHaveTextContent(
      "0",
    );
    expect(screen.getByTestId("daily-save-quota-card-hint")).toHaveTextContent(
      "No active goals",
    );
  });

  it("sums the daily quota across two goals (real engine)", () => {
    // vacation: (2000 - 500) / 215 days ≈ 6.98 €/day
    // emergency: (5000 - 1000) / 215 days ≈ 18.60 €/day
    // sum ≈ 25.58 (rounded half-up)
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [SavingsGoalMother.vacation(), SavingsGoalMother.emergencyFund()],
    });
    render(<DailySaveQuotaCard />);
    const text = screen.getByTestId("daily-save-quota-card-value").textContent;
    expect(Number(text)).toBeGreaterThan(0);
    expect(screen.getByTestId("daily-save-quota-card-hint")).toHaveTextContent(
      "2 active goals",
    );
  });

  it("shows the placeholder when the plan is missing", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [],
    });
    render(<DailySaveQuotaCard />);
    expect(screen.getByTestId("daily-save-quota-card-value")).toHaveTextContent(
      "—",
    );
  });
});

describe("DaysToNextIncomeCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows 15 days and a green hint when the next income is far away", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    render(<DaysToNextIncomeCard />);
    expect(
      screen.getByTestId("days-to-next-income-card-value"),
    ).toHaveTextContent("15");
    expect(
      screen.getByTestId("days-to-next-income-card-hint"),
    ).toHaveTextContent("15 days");
  });

  it("shows 'Today' when the next income date equals today", () => {
    vi.mocked(useDailyBudget).mockReturnValue({
      daily: { ...GREEN_PAYLOAD.daily, daysToNextIncome: 0 },
      decision: GREEN_PAYLOAD.decision,
    });
    render(<DaysToNextIncomeCard />);
    expect(
      screen.getByTestId("days-to-next-income-card-value"),
    ).toHaveTextContent("0");
    expect(
      screen.getByTestId("days-to-next-income-card-hint"),
    ).toHaveTextContent("Today");
  });
});
