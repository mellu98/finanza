/**
 * Tests for the forecast + alerts cards. One combined test file per
 * the PR5 work-unit rule (T5.6 ships as a single reviewable unit).
 */
import { render, screen } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlertsCard } from "./AlertsCard";
import { EndOfMonthForecastCard } from "./EndOfMonthForecastCard";

vi.mock("../daily-coach/useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));

import { useDailyBudget } from "../daily-coach/useDailyBudget";

const makePayload = (overrides: {
  forecast: number;
  alerts?: ReadonlyArray<{
    kind: string;
    severity: "info" | "warn" | "error";
  }>;
  status?: "green" | "yellow" | "red";
}) => ({
  daily: {
    dailyBudgetRaw: new Big(overrides.forecast),
    dailyBudgetRounded: overrides.forecast,
    status: overrides.status ?? "green",
    spentToday: 0,
    daysRemaining: 10,
    daysToNextIncome: 15,
    forecast: new Big(overrides.forecast),
    forecastRounded: overrides.forecast,
    periodEnded: false,
  },
  decision: {
    mode: "steady" as const,
    priority: "standard" as const,
    actions: [],
    blockedCategories: [],
    reducedCategories: [],
    alerts: overrides.alerts ?? [],
  },
});

describe("EndOfMonthForecastCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a positive forecast with a green hint", () => {
    vi.mocked(useDailyBudget).mockReturnValue(makePayload({ forecast: 110 }));
    render(<EndOfMonthForecastCard />);
    expect(
      screen.getByTestId("end-of-month-forecast-card-value"),
    ).toHaveTextContent("110");
    expect(
      screen.getByTestId("end-of-month-forecast-card-hint"),
    ).toHaveTextContent(/Projected balance/);
  });

  it("shows a negative forecast with a shortfall hint", () => {
    vi.mocked(useDailyBudget).mockReturnValue(makePayload({ forecast: -25 }));
    render(<EndOfMonthForecastCard />);
    expect(
      screen.getByTestId("end-of-month-forecast-card-value"),
    ).toHaveTextContent("-25");
    expect(
      screen.getByTestId("end-of-month-forecast-card-hint"),
    ).toHaveTextContent("Shortfall");
  });

  it("falls back to a placeholder when no plan exists", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    render(<EndOfMonthForecastCard />);
    expect(
      screen.getByTestId("end-of-month-forecast-card-value"),
    ).toHaveTextContent("—");
  });
});

describe("AlertsCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the empty line when the engine emits zero alerts", () => {
    vi.mocked(useDailyBudget).mockReturnValue(makePayload({ forecast: 100 }));
    render(<AlertsCard />);
    expect(screen.getByTestId("alerts-card")).toBeInTheDocument();
    expect(screen.getByTestId("alerts-card-empty-line")).toHaveTextContent(
      "Nessun avviso",
    );
  });

  it("lists each alert with its severity", () => {
    vi.mocked(useDailyBudget).mockReturnValue(
      makePayload({
        forecast: 50,
        alerts: [
          { kind: "alert-avoidable-share", severity: "warn" },
          { kind: "block-category", severity: "error" },
        ],
      }),
    );
    render(<AlertsCard />);
    const list = screen.getByTestId("alerts-card-list");
    expect(list.children.length).toBe(2);
    expect(
      screen.getByTestId("alerts-card-item-alert-avoidable-share"),
    ).toHaveAttribute("data-severity", "warn");
    expect(
      screen.getByTestId("alerts-card-item-block-category"),
    ).toHaveAttribute("data-severity", "error");
  });

  it("falls back to a placeholder when no plan exists", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    render(<AlertsCard />);
    expect(screen.getByTestId("alerts-card-empty")).toBeInTheDocument();
  });

  it("uses role=alert for screen-reader announcement", () => {
    vi.mocked(useDailyBudget).mockReturnValue(makePayload({ forecast: 100 }));
    render(<AlertsCard />);
    expect(screen.getByTestId("alerts-card")).toHaveAttribute("role", "alert");
  });
});
