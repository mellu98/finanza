/**
 * Test plan for `MonthlyPlanContext`.
 *
 * The context is the React-side mirror of `MonthlyPlanRepository`:
 * it holds the active plan in state, exposes `setPlan` (with the
 * `saveInHistory` flag from `BudgetContext.setBudget(...)` so the
 * undo/redo stack behaves the same way as the legacy Guitos budget
 * context), and a small undo/redo API.
 *
 * The test asserts the externally observable behaviour via button
 * clicks (no setState during render — the test harness
 * `console-fail-test` rejects that pattern).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthlyPlanProvider } from "./MonthlyPlanContext";
import { MonthlyPlanMother } from "./MonthlyPlanMother";
import { useMonthlyPlan } from "./useMonthlyPlan";

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
});
