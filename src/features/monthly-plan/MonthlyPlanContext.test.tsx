/**
 * Test plan for `MonthlyPlanContext`.
 *
 * The context is the React-side mirror of `MonthlyPlanRepository`:
 * it holds the active plan in state, exposes `setPlan` (with the
 * `saveInHistory` flag from `BudgetContext.setBudget(...)` so the
 * undo/redo stack behaves the same way as the legacy Guitos budget
 * context), a `save(plan)` async method that persists via the
 * repository, and a small undo/redo API.
 *
 * The test asserts the externally observable behaviour via button
 * clicks (no setState during render — the test harness
 * `console-fail-test` rejects that pattern).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MonthlyPlanProvider } from "./MonthlyPlanContext";
import { MonthlyPlanMother } from "./MonthlyPlanMother";
import type { MonthlyPlanRepository } from "./MonthlyPlanRepository";
import { useMonthlyPlan } from "./useMonthlyPlan";

// Mock the default repository factory so jsdom doesn't touch localforage.
vi.mock("./localForageMonthlyPlanRepository", () => {
  return {
    localForageMonthlyPlanRepository: vi.fn().mockImplementation(
      (): MonthlyPlanRepository => ({
        save: vi.fn().mockResolvedValue(undefined),
        getActive: vi.fn().mockResolvedValue(undefined),
        setActive: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(false),
      }),
    ),
  };
});

function TestComponent() {
  const { plan, setPlan, undo, canUndo, canRedo } = useMonthlyPlan();
  const p1 = MonthlyPlanMother.testPlan({ id: "p1" });
  const p2 = MonthlyPlanMother.testPlan({ id: "p2" });
  return (
    <>
      <p data-testid="plan">{plan ? plan.id : "none"}</p>
      <p data-testid="canUndo">{String(canUndo)}</p>
      <p data-testid="canRedo">{String(canRedo)}</p>
      <button
        data-testid="setP1"
        onClick={() => setPlan(p1, false)}
        type="button"
      >
        set p1
      </button>
      <button
        data-testid="setP2"
        onClick={() => setPlan(p2, true)}
        type="button"
      >
        set p2
      </button>
      <button data-testid="undo" onClick={() => undo()} type="button">
        undo
      </button>
    </>
  );
}

describe("MonthlyPlanProvider", () => {
  it("renders with no active plan by default", () => {
    render(
      <MonthlyPlanProvider>
        <TestComponent />
      </MonthlyPlanProvider>,
    );
    expect(screen.getByTestId("plan").textContent).toBe("none");
    expect(screen.getByTestId("canUndo").textContent).toBe("false");
    expect(screen.getByTestId("canRedo").textContent).toBe("false");
  });

  it("setPlan(plan, false) stores the plan in context", () => {
    render(
      <MonthlyPlanProvider>
        <TestComponent />
      </MonthlyPlanProvider>,
    );
    fireEvent.click(screen.getByTestId("setP1"));
    expect(screen.getByTestId("plan").textContent).toBe("p1");
  });

  it("setPlan(plan, true) adds an undo step and undo returns to the previous plan", () => {
    render(
      <MonthlyPlanProvider>
        <TestComponent />
      </MonthlyPlanProvider>,
    );
    fireEvent.click(screen.getByTestId("setP1"));
    expect(screen.getByTestId("plan").textContent).toBe("p1");
    fireEvent.click(screen.getByTestId("setP2"));
    expect(screen.getByTestId("plan").textContent).toBe("p2");
    // After the second setPlan, undo should be available.
    expect(screen.getByTestId("canUndo").textContent).toBe("true");
    fireEvent.click(screen.getByTestId("undo"));
    expect(screen.getByTestId("plan").textContent).toBe("p1");
  });

  it("save(plan) persists the plan to the repository and commits in undo history", async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined);
    const repo: MonthlyPlanRepository = {
      save: saveMock,
      getActive: vi.fn().mockResolvedValue(undefined),
      setActive: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(false),
    };

    function SaveProbe() {
      const { plan, save: ctxSave } = useMonthlyPlan();
      const next = MonthlyPlanMother.testPlan({ id: "p-save" });
      return (
        <>
          <p data-testid="probe-plan">{plan ? plan.id : "none"}</p>
          <button
            data-testid="probe-save"
            type="button"
            onClick={() => {
              void ctxSave(next);
            }}
          >
            save
          </button>
        </>
      );
    }

    render(
      <MonthlyPlanProvider repository={repo}>
        <SaveProbe />
      </MonthlyPlanProvider>,
    );
    fireEvent.click(screen.getByTestId("probe-save"));
    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1);
    });
    // The committed plan should be the one we just saved.
    expect(screen.getByTestId("probe-plan").textContent).toBe("p-save");
  });
});
