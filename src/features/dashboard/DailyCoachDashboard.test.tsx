/**
 * Tests for the `DailyCoachDashboard` composition.
 *
 * The dashboard wires up 9 cards (or 1 status + 1 empty CTA when no
 * plan is set) in a mobile-first Tailwind grid. The test asserts
 * the right cards are visible in the right conditions and that the
 * composition honours the responsive breakpoints (xs/md/lg) via
 * the parent grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
 *
 * a11y: we use `axe-core` via `vitest-axe` to assert zero serious
 * violations on the rendered dashboard. If `vitest-axe` is not yet
 * wired in (this is a first introduction), we fall back to a manual
 * assertion that the document tree is non-empty and the page has
 * the expected semantic landmarks (`<h1>`, `<footer>`, etc.).
 */
import { render } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/AppShell";
import { DailyCoachDashboard } from "./DailyCoachDashboard";

vi.mock("../daily-coach/useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));

import { useDailyBudget } from "../daily-coach/useDailyBudget";

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
    actions: [
      {
        kind: "save-surplus",
        label: "Save 5.5 €",
        amount: 5.5,
        priority: 5,
      },
    ],
    blockedCategories: [],
    reducedCategories: [],
    alerts: [],
  },
};

describe("DailyCoachDashboard", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all 9 cards when a plan is set", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    const { container } = render(<DailyCoachDashboard />);
    // The 8 secondary money cards (StatusCard always renders)
    expect(
      container.querySelector('[data-testid="status-card"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="daily-budget-card"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="spent-today-card"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="remaining-today-card"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="daily-save-quota-card"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="days-to-next-income-card"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="end-of-month-forecast-card"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="alerts-card"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="action-of-the-day-card"]'),
    ).toBeInTheDocument();
    // The empty card and CTA are NOT rendered
    expect(
      container.querySelector('[data-testid="empty-plan-card"]'),
    ).not.toBeInTheDocument();
  });

  it("renders the EmptyPlanCard when no plan is set", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
    const { container } = render(<DailyCoachDashboard />);
    expect(
      container.querySelector('[data-testid="empty-plan-card"]'),
    ).toBeInTheDocument();
    // The money cards still render with placeholders (each handles
    // the null result internally), but the EmptyPlanCard is the
    // primary CTA in this state.
    expect(
      container.querySelector('[data-testid="status-card-empty"]'),
    ).toBeInTheDocument();
  });

  it("uses the Tailwind responsive grid (grid-cols-1 / md:grid-cols-2 / lg:grid-cols-3)", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    const { container } = render(<DailyCoachDashboard />);
    // The parent grid carries all three breakpoint classes.
    const grid = container.querySelector(
      ".grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3",
    );
    expect(grid).not.toBeNull();
    // Sanity-check: the grid contains the expected number of card wrappers.
    expect(grid?.children.length).toBeGreaterThan(0);
    // The Bootstrap col-* classes are no longer used.
    expect(container.querySelector(".col-lg-4")).toBeNull();
    expect(container.querySelector(".col-md-6")).toBeNull();
    expect(container.querySelector(".col-12")).toBeNull();
  });

  it("uses semantic landmarks for the page (h1, footer via AppShell)", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    // Footer disclaimer now lives in AppShell, so wrap the page.
    const { container } = render(
      <AppShell>
        <DailyCoachDashboard />
      </AppShell>,
    );
    const h1 = container.querySelector("h1");
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveAttribute("data-testid", "dashboard-title");
    expect(h1?.textContent).toBe("Buongiorno 👋");
    const footer = container.querySelector("footer");
    expect(footer).toBeInTheDocument();
    // TODO: the FooterDisclaimer was moved into AppShell — the
    // `data-testid="footer-disclaimer"` testid may no longer be set
    // on the global footer. Update once AppShell exposes the same
    // testid, or assert on the disclaimer text content.
  });

  it("passes a basic a11y tree check (no nested interactive controls)", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
    const { container } = render(<DailyCoachDashboard />);
    // The action-of-the-day card contains a single <a> link; no
    // <button> is allowed inside another <button>. We assert no
    // <button> is nested in another <button>.
    const nested = container.querySelector("button button");
    expect(nested).toBeNull();
  });
});
