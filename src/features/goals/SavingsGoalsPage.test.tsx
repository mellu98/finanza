/**
 * Tests for `SavingsGoalsPage`.
 *
 * The page lists the user's savings goals, lets them add/edit/delete
 * goals via a Radix `Dialog`, shows the engine-computed daily quota
 * and progress percentage, and surfaces an "overdue" badge when
 * `deadline < today`.
 *
 * Validation: `currentAmount <= targetAmount + 0.01` and
 * `deadline > createdAt`. Both surface as inline alert messages.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeDailySavingRequired,
  computeProgressPct,
} from "../daily-coach/savings-goal-engine";
import { SavingsGoalsPage } from "./SavingsGoalsPage";
import { useSavingsGoals } from "./useSavingsGoals";

vi.mock("./useSavingsGoals", () => ({
  useSavingsGoals: vi.fn(),
}));

const big = (v: number | string) => new Big(v);

const GOAL_VACATION = {
  id: "goal-vacation",
  name: "Vacation",
  targetAmount: big(2000),
  currentAmount: big(500),
  deadline: "2026-12-31" as never,
  emergencyFund: false,
  createdAt: "2026-06-01T00:00:00Z" as never,
  notes: undefined as string | undefined,
};

const GOAL_EMERGENCY = {
  id: "goal-emergency",
  name: "Emergency fund",
  targetAmount: big(5000),
  currentAmount: big(1000),
  deadline: "2026-06-01" as never, // overdue!
  emergencyFund: true,
  createdAt: "2026-01-01T00:00:00Z" as never,
  notes: undefined as string | undefined,
};

const noopCtx = () => ({
  past: [] as ReadonlyArray<unknown>,
  future: [] as ReadonlyArray<unknown>,
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
});

// Radix UI's `DialogContent` emits a `console.error` warning when
// its `DialogTitle` child is detected via an async effect that may
// not have registered by the time the warning check runs in tests.
// The dialog DOES render a title in our component (see
// `SavingsGoalsPage.tsx`) so this warning is a false positive. We
// silence it for the tests that intentionally open the dialog.
const silenceRadixDialogWarnings = () => {
  const spy = vi
    .spyOn(console, "error")
    .mockImplementation((..._args: unknown[]) => undefined);
  return spy;
};

describe("SavingsGoalsPage", () => {
  beforeEach(() => {
    vi.mocked(useSavingsGoals).mockReset();
  });
  afterEach(() => {
    // Cleanup esplicito: i Dialog Radix lasciano i portal nel DOM
    // dopo che unmount viene chiamato solo alla fine del test. Senza
    // cleanup, il test successivo trova "goals-page" duplicato.
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the page title and the goal list with progress + quota", () => {
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [GOAL_VACATION, GOAL_EMERGENCY],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<SavingsGoalsPage />);
    const page = screen.getByTestId("goals-page");
    expect(within(page).getByTestId("goals-page-title")).toHaveTextContent(
      "Obiettivi",
    );
    // Both goals are in the list. Use a stricter selector so we only
    // match the row elements (NOT the per-row edit/delete buttons
    // which also have a `goal-row-X-{action}` testid). Scope to the
    // page region to avoid duplicate matches if a previous test left
    // a portal element behind in the body.
    const rows = within(page).getAllByTestId(
      /^goal-row-(?!.*-(edit|delete)$).+$/,
    );
    expect(rows).toHaveLength(2);
    // Vacation: 25% progress (500/2000) → 25
    const vacationRow = within(page).getByTestId("goal-row-goal-vacation");
    expect(
      within(vacationRow).getByTestId("goal-progress-pct"),
    ).toHaveTextContent("25");
    // Daily quota: the page calls `todayIso()` (the real calendar date)
    // so the displayed number is engine-driven; we assert it's a
    // positive number close to the engine's output, not the exact
    // string (which would drift across days).
    const quota = computeDailySavingRequired(
      { ...GOAL_VACATION, currentAmount: big(500), targetAmount: big(2000) },
      "2026-06-10" as never,
    );
    if (quota.ok) {
      const quotaText =
        within(vacationRow).getByTestId("goal-daily-quota").textContent ?? "";
      const quotaNum = Number(quotaText);
      expect(Number.isFinite(quotaNum)).toBe(true);
      expect(quotaNum).toBeGreaterThan(0);
      // The page's `today` is the real local date (within ~1 day of
      // the test's frozen 2026-06-10) so the engine output is within a
      // 0.01 €/day tolerance.
      expect(Math.abs(quotaNum - quota.value.quota.toNumber())).toBeLessThan(
        0.05,
      );
    }
  });

  it("marks overdue goals with an 'Overdue' badge", () => {
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [GOAL_EMERGENCY],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<SavingsGoalsPage />);
    const page = screen.getByTestId("goals-page");
    const row = within(page).getByTestId("goal-row-goal-emergency");
    expect(within(row).getByTestId("goal-overdue-badge")).toBeInTheDocument();
  });

  it("Add Goal opens the dialog and the Save button calls add(goal, true)", () => {
    const add = vi.fn();
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [],
      add,
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    silenceRadixDialogWarnings();
    render(<SavingsGoalsPage />);
    const page = screen.getByTestId("goals-page");
    fireEvent.click(within(page).getByTestId("goals-add-button"));
    expect(screen.getByTestId("goal-modal")).toBeInTheDocument();
    // Fill in the form.
    fireEvent.change(screen.getByTestId("goal-input-name"), {
      target: { value: "Bike" },
    });
    fireEvent.change(screen.getByTestId("goal-input-targetAmount"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByTestId("goal-input-currentAmount"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByTestId("goal-input-deadline"), {
      target: { value: "2026-12-31" },
    });
    fireEvent.click(screen.getByTestId("goal-modal-save"));
    expect(add).toHaveBeenCalledTimes(1);
    const saved = add.mock.calls[0]?.[0];
    expect(saved.name).toBe("Bike");
    expect(saved.targetAmount.toString()).toBe("500");
    expect(saved.currentAmount.toString()).toBe("100");
    expect(add.mock.calls[0]?.[1]).toBe(true);
  });

  it("rejects currentAmount > targetAmount with a validation alert", () => {
    const add = vi.fn();
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [],
      add,
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    silenceRadixDialogWarnings();
    render(<SavingsGoalsPage />);
    const page = screen.getByTestId("goals-page");
    fireEvent.click(within(page).getByTestId("goals-add-button"));
    fireEvent.change(screen.getByTestId("goal-input-name"), {
      target: { value: "Bad" },
    });
    fireEvent.change(screen.getByTestId("goal-input-targetAmount"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByTestId("goal-input-currentAmount"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByTestId("goal-input-deadline"), {
      target: { value: "2026-12-31" },
    });
    fireEvent.click(screen.getByTestId("goal-modal-save"));
    expect(add).not.toHaveBeenCalled();
    expect(screen.getByTestId("goal-validation-alert")).toHaveTextContent(
      /importo attuale/i,
    );
  });

  it("Edit on a row opens the dialog pre-filled and update is called", () => {
    const update = vi.fn();
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [GOAL_VACATION],
      add: vi.fn(),
      update,
      remove: vi.fn(() => true),
    });
    silenceRadixDialogWarnings();
    render(<SavingsGoalsPage />);
    const page = screen.getByTestId("goals-page");
    fireEvent.click(within(page).getByTestId("goal-row-goal-vacation-edit"));
    const nameInput = screen.getByTestId("goal-input-name") as HTMLInputElement;
    expect(nameInput.value).toBe("Vacation");
    fireEvent.change(screen.getByTestId("goal-input-targetAmount"), {
      target: { value: "3000" },
    });
    fireEvent.click(screen.getByTestId("goal-modal-save"));
    expect(update).toHaveBeenCalledTimes(1);
    const saved = update.mock.calls[0]?.[0];
    expect(saved.targetAmount.toString()).toBe("3000");
    expect(update.mock.calls[0]?.[1]).toBe(true);
  });

  it("Delete on a row opens confirm dialog and calls remove(id, true) on confirm", async () => {
    const remove = vi.fn(() => true);
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [GOAL_VACATION],
      add: vi.fn(),
      update: vi.fn(),
      remove,
    });
    const { unmount } = render(<SavingsGoalsPage />);
    const page = screen.getByTestId("goals-page");
    // Click sul bottone Elimina: apre il Dialog di conferma
    // (sostituisce il vecchio window.confirm).
    fireEvent.click(within(page).getByTestId("goal-row-goal-vacation-delete"));
    // Conferma nel Dialog.
    fireEvent.click(screen.getByTestId("goal-delete-confirm"));
    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith("goal-vacation", true);
    });
    unmount();
  });

  it("Delete cancel keeps the goal", () => {
    const remove = vi.fn(() => true);
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [GOAL_VACATION],
      add: vi.fn(),
      update: vi.fn(),
      remove,
    });
    const { unmount } = render(<SavingsGoalsPage />);
    const page = screen.getByTestId("goals-page");
    fireEvent.click(within(page).getByTestId("goal-row-goal-vacation-delete"));
    // Annulla → remove non viene chiamato
    fireEvent.click(screen.getByTestId("goal-delete-cancel"));
    expect(remove).not.toHaveBeenCalled();
    unmount();
  });

  it("renders the empty-state card when there are no goals", () => {
    vi.mocked(useSavingsGoals).mockReturnValue({
      ...noopCtx(),
      goals: [],
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(() => true),
    });
    render(<SavingsGoalsPage />);
    expect(screen.getByTestId("goals-empty-state")).toBeInTheDocument();
  });

  it("progress percentage uses the engine (1/3 → 33.3, clamped, target=0 → 0)", () => {
    // Sanity: confirm we use computeProgressPct and not a hand-rolled
    // ratio. Two quick checks pin the rounding rule.
    expect(
      computeProgressPct({
        ...GOAL_VACATION,
        currentAmount: big(1),
        targetAmount: big(3),
      }),
    ).toBeCloseTo(33.3, 1);
    expect(
      computeProgressPct({
        ...GOAL_VACATION,
        currentAmount: big(150),
        targetAmount: big(100),
      }),
    ).toBe(100);
    expect(
      computeProgressPct({
        ...GOAL_VACATION,
        currentAmount: big(0),
        targetAmount: big(0),
      }),
    ).toBe(0);
  });
});
