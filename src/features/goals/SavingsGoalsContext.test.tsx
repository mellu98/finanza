/**
 * Test plan for `SavingsGoalsContext`.
 *
 * The context holds the user's savings goals in state and exposes
 * `add` / `remove` / `update` operations with the same
 * `saveInHistory` flag pattern used by `BudgetContext`,
 * `MonthlyPlanContext`, and `TransactionsContext`.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SavingsGoalMother } from "./SavingsGoal.mother";
import { SavingsGoalsProvider } from "./SavingsGoalsContext";
import { useSavingsGoals } from "./useSavingsGoals";

function TestComponent() {
  const { goals, add, remove, undo, canUndo, canRedo } = useSavingsGoals();
  return (
    <>
      <p data-testid="count">{goals.length}</p>
      <p data-testid="ids">{goals.map((g) => g.id).join(",")}</p>
      <p data-testid="canUndo">{String(canUndo)}</p>
      <p data-testid="canRedo">{String(canRedo)}</p>
      <button
        data-testid="addVacation"
        onClick={() => add(SavingsGoalMother.vacation(), true)}
        type="button"
      >
        add vacation
      </button>
      <button
        data-testid="addEmergency"
        onClick={() => add(SavingsGoalMother.emergencyFund(), true)}
        type="button"
      >
        add emergency
      </button>
      <button
        data-testid="removeVacation"
        onClick={() => remove("goal-vacation", true)}
        type="button"
      >
        remove vacation
      </button>
      <button data-testid="undo" onClick={() => undo()} type="button">
        undo
      </button>
    </>
  );
}

describe("SavingsGoalsProvider", () => {
  it("starts with an empty list and no undo/redo", () => {
    render(
      <SavingsGoalsProvider>
        <TestComponent />
      </SavingsGoalsProvider>,
    );
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("ids").textContent).toBe("");
    expect(screen.getByTestId("canUndo").textContent).toBe("false");
    expect(screen.getByTestId("canRedo").textContent).toBe("false");
  });

  it("add(goal, true) appends to the list and adds an undo step", () => {
    render(
      <SavingsGoalsProvider>
        <TestComponent />
      </SavingsGoalsProvider>,
    );
    fireEvent.click(screen.getByTestId("addVacation"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("ids").textContent).toBe("goal-vacation");
    expect(screen.getByTestId("canUndo").textContent).toBe("true");
  });

  it("add then remove then undo restores the removed goal", () => {
    render(
      <SavingsGoalsProvider>
        <TestComponent />
      </SavingsGoalsProvider>,
    );
    fireEvent.click(screen.getByTestId("addVacation"));
    fireEvent.click(screen.getByTestId("removeVacation"));
    expect(screen.getByTestId("count").textContent).toBe("0");
    fireEvent.click(screen.getByTestId("undo"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("ids").textContent).toBe("goal-vacation");
  });

  it("add twice keeps insertion order", () => {
    render(
      <SavingsGoalsProvider>
        <TestComponent />
      </SavingsGoalsProvider>,
    );
    fireEvent.click(screen.getByTestId("addVacation"));
    fireEvent.click(screen.getByTestId("addEmergency"));
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("ids").textContent).toBe(
      "goal-vacation,goal-emergency",
    );
  });
});
