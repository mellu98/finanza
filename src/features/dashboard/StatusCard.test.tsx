/**
 * Tests for `StatusCard` (and a tiny check that the
 * `FooterDisclaimer` renders its current text).
 *
 * The card reads its data from `useDailyBudget()`; we mock the hook
 * at the module level so the test pins the exact `DailyBudgetResult`
 * + `CoachDecision` shape. We exercise four scenarios:
 *   - green + steady (the happy path)
 *   - yellow + recovery (an overspend day)
 *   - red + survival (mathematically impossible plan)
 *   - null hook return (no plan) → renders the empty CTA
 *
 * The footer test asserts the current Italian disclaimer text. The
 * footer itself is rendered globally by `<AppShell>`.
 */
import { render, screen } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FooterDisclaimer } from "./FooterDisclaimer";
import { StatusCard } from "./StatusCard";

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

const YELLOW_PAYLOAD = {
  daily: {
    dailyBudgetRaw: new Big(7),
    dailyBudgetRounded: 7,
    status: "yellow" as const,
    spentToday: 12,
    daysRemaining: 8,
    daysToNextIncome: 20,
    forecast: new Big(56),
    forecastRounded: 56,
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

const RED_PAYLOAD = {
  daily: {
    dailyBudgetRaw: new Big(-5),
    dailyBudgetRounded: -5,
    status: "red" as const,
    spentToday: 5,
    daysRemaining: 3,
    daysToNextIncome: 25,
    forecast: new Big(-15),
    forecastRounded: -15,
    periodEnded: false,
  },
  decision: {
    mode: "survival" as const,
    priority: "standard" as const,
    actions: [],
    blockedCategories: [],
    reducedCategories: [],
    alerts: [],
  },
};

vi.mock("../daily-coach/useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));

import { useDailyBudget } from "../daily-coach/useDailyBudget";

describe("StatusCard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the green + steady status with the Tutto ok label", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    render(<StatusCard />);
    const card = screen.getByTestId("status-card");
    expect(card).toHaveAttribute("data-status", "green");
    expect(card).toHaveAttribute("data-mode", "steady");
    expect(card).toHaveAttribute("role", "status");
    expect(screen.getByTestId("status-card-label")).toHaveTextContent(
      "Tutto ok",
    );
    expect(screen.getByTestId("status-card-mode")).toHaveTextContent("Steady");
  });

  it("renders the yellow + recovery status with the Occhio, oggi label", () => {
    vi.mocked(useDailyBudget).mockReturnValue(YELLOW_PAYLOAD);
    render(<StatusCard />);
    expect(screen.getByTestId("status-card")).toHaveAttribute(
      "data-status",
      "yellow",
    );
    expect(screen.getByTestId("status-card-label")).toHaveTextContent(
      "Occhio, oggi",
    );
    expect(screen.getByTestId("status-card-mode")).toHaveTextContent(
      "Recovery",
    );
  });

  it("renders the red + survival status with the Stai sforando label", () => {
    vi.mocked(useDailyBudget).mockReturnValue(RED_PAYLOAD);
    render(<StatusCard />);
    expect(screen.getByTestId("status-card")).toHaveAttribute(
      "data-status",
      "red",
    );
    expect(screen.getByTestId("status-card-label")).toHaveTextContent(
      "Stai sforando",
    );
    expect(screen.getByTestId("status-card-mode")).toHaveTextContent(
      "Survival",
    );
  });

  it("falls back to the empty CTA when the hook returns null", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    render(<StatusCard />);
    const empty = screen.getByTestId("status-card-empty");
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveAttribute("role", "status");
    expect(screen.getByTestId("status-card-label")).toHaveTextContent(
      "Nessun piano ancora",
    );
    const cta = screen.getByTestId("status-card-cta");
    expect(cta).toHaveAttribute("href", "/plan");
    expect(cta).toHaveTextContent(/Imposta il piano/);
  });

  it("carries an aria-label so screen readers describe the state", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    render(<StatusCard />);
    const card = screen.getByTestId("status-card");
    expect(card.getAttribute("aria-label")).toMatch(/Tutto ok/);
    expect(card.getAttribute("aria-label")).toMatch(/Steady/);
  });
});

describe("FooterDisclaimer", () => {
  it("renders the current Italian disclaimer text", () => {
    render(<FooterDisclaimer />);
    expect(
      screen.getByText(/non fornisce consulenza finanziaria professionale/i),
    ).toBeInTheDocument();
  });
});
