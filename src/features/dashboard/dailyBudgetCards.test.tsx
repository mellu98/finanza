/**
 * Tests for the three money-stat cards (DailyBudget, SpentToday,
 * RemainingToday). One combined test file because they share a
 * helper (`BudgetStatCard`) and exercise the same hook shape; this
 * keeps the test surface tight and reviewable as a single work
 * unit (per the PR5 work-unit-commits rule).
 */
import { render, screen } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DailyBudgetCard } from "./DailyBudgetCard";
import { RemainingTodayCard } from "./RemainingTodayCard";
import { SpentTodayCard } from "./SpentTodayCard";

vi.mock("../daily-coach/useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));

import { useDailyBudget } from "../daily-coach/useDailyBudget";

const GREEN_PAYLOAD = {
  daily: {
    dailyBudgetRaw: new Big(11),
    dailyBudgetRounded: 11,
    status: "green" as const,
    spentToday: 4,
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

const OVERSPEND_PAYLOAD = {
  daily: {
    dailyBudgetRaw: new Big(11),
    dailyBudgetRounded: 11,
    status: "green" as const,
    spentToday: 20,
    daysRemaining: 9,
    daysToNextIncome: 15,
    forecast: new Big(110),
    forecastRounded: 110,
    periodEnded: false,
  },
  decision: {
    mode: "recovery" as const,
    priority: "standard" as const,
    actions: [],
    blockedCategories: [],
    reducedCategories: [],
    alerts: [],
  },
};

describe("DailyBudgetCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the daily budget and the days-remaining hint", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    render(<DailyBudgetCard />);
    expect(screen.getByTestId("daily-budget-card-value")).toHaveTextContent(
      "11",
    );
    expect(screen.getByTestId("daily-budget-card-hint")).toHaveTextContent(
      "For the next 10 days",
    );
  });

  it("falls back to a placeholder when no plan is set", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    render(<DailyBudgetCard />);
    expect(screen.getByTestId("daily-budget-card-value")).toHaveTextContent(
      "—",
    );
    expect(screen.getByTestId("daily-budget-card-hint")).toHaveTextContent(
      "Set up a monthly plan",
    );
  });
});

describe("SpentTodayCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows today's spend and a green hint under the budget", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    render(<SpentTodayCard />);
    expect(screen.getByTestId("spent-today-card-value")).toHaveTextContent("4");
    expect(screen.getByTestId("spent-today-card-hint")).toHaveTextContent(
      "So far today",
    );
  });

  it("flips the hint to OVER BUDGET when spent > daily", () => {
    vi.mocked(useDailyBudget).mockReturnValue(OVERSPEND_PAYLOAD);
    render(<SpentTodayCard />);
    expect(screen.getByTestId("spent-today-card-value")).toHaveTextContent(
      "20",
    );
    expect(screen.getByTestId("spent-today-card-hint")).toHaveTextContent(
      "Over the daily budget",
    );
  });
});

describe("RemainingTodayCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows positive remaining as a green number", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    render(<RemainingTodayCard />);
    // 11 - 4 = 7
    expect(screen.getByTestId("remaining-today-card-value")).toHaveTextContent(
      "7",
    );
    expect(screen.getByTestId("remaining-today-card-hint")).toHaveTextContent(
      "Left to spend",
    );
  });

  it("shows negative remaining as a red IN THE RED hint", () => {
    vi.mocked(useDailyBudget).mockReturnValue(OVERSPEND_PAYLOAD);
    render(<RemainingTodayCard />);
    // 11 - 20 = -9
    expect(screen.getByTestId("remaining-today-card-value")).toHaveTextContent(
      "-9",
    );
    expect(screen.getByTestId("remaining-today-card-hint")).toHaveTextContent(
      "In the red",
    );
  });
});
