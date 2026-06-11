/**
 * Tests for `ActionOfTheDayCard` and `EmptyPlanCard`. Combined in
 * one file per the PR5 work-unit rule (T5.7 ships as a single
 * reviewable unit).
 */
import { render, screen } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionOfTheDayCard } from "./ActionOfTheDayCard";
import { EmptyPlanCard } from "./EmptyPlanCard";

vi.mock("../daily-coach/useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));

import { useDailyBudget } from "../daily-coach/useDailyBudget";

const baseDaily = {
  dailyBudgetRaw: new Big(11),
  dailyBudgetRounded: 11,
  status: "green" as const,
  spentToday: 0,
  daysRemaining: 10,
  daysToNextIncome: 15,
  forecast: new Big(110),
  forecastRounded: 110,
  periodEnded: false,
};

describe("ActionOfTheDayCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the top-priority action and a See all link", () => {
    vi.mocked(useDailyBudget).mockReturnValue({
      daily: baseDaily,
      decision: {
        mode: "steady",
        priority: "standard",
        actions: [
          {
            kind: "save-surplus",
            label: "Save 5.5 € (50% of today's surplus).",
            amount: 5.5,
            priority: 5,
          },
          {
            kind: "freeze-category",
            label: 'Freeze "dining" — over the per-category budget.',
            category: "dining",
            priority: 2,
          },
        ],
        blockedCategories: [],
        reducedCategories: [],
        alerts: [],
      },
    });
    render(<ActionOfTheDayCard />);
    const title = screen.getByTestId("action-of-the-day-title");
    expect(title).toHaveTextContent("Azione del giorno");
    const label = screen.getByTestId("action-of-the-day-label");
    expect(label).toHaveAttribute("data-action-kind", "save-surplus");
    expect(label).toHaveTextContent("Save 5.5 €");
    const seeAll = screen.getByTestId("action-of-the-day-see-all");
    expect(seeAll).toHaveAttribute("href", "/coach");
  });

  it("shows a 'keep going' message when there are no actions", () => {
    vi.mocked(useDailyBudget).mockReturnValue({
      daily: baseDaily,
      decision: {
        mode: "steady",
        priority: "standard",
        actions: [],
        blockedCategories: [],
        reducedCategories: [],
        alerts: [],
      },
    });
    render(<ActionOfTheDayCard />);
    expect(screen.getByTestId("action-of-the-day-label")).toHaveTextContent(
      "Nessuna azione specifica adesso",
    );
  });

  it("falls back to the empty card when no plan exists", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    render(<ActionOfTheDayCard />);
    expect(
      screen.getByTestId("action-of-the-day-card-empty"),
    ).toBeInTheDocument();
  });
});

describe("EmptyPlanCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the CTA when no plan is set", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    render(<EmptyPlanCard />);
    const cta = screen.getByTestId("empty-plan-card-cta");
    expect(cta).toHaveAttribute("href", "/plan");
    expect(screen.getByTestId("empty-plan-card-title")).toHaveTextContent(
      "Ciao! Cominciamo.",
    );
  });

  it("renders nothing when a plan is set", () => {
    vi.mocked(useDailyBudget).mockReturnValue({
      daily: baseDaily,
      decision: {
        mode: "steady",
        priority: "standard",
        actions: [],
        blockedCategories: [],
        reducedCategories: [],
        alerts: [],
      },
    });
    const { container } = render(<EmptyPlanCard />);
    expect(container.firstChild).toBeNull();
  });
});
