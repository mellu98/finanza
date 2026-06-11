/**
 * Test plan for `DebtsContext`.
 *
 * The context holds the user's debts in state and exposes
 * `add` / `remove` / `update` operations with the same
 * `saveInHistory` flag pattern used by `BudgetContext`,
 * `MonthlyPlanContext`, `TransactionsContext`, and
 * `SavingsGoalsContext`.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebtMother } from "./Debt.mother";
import { DebtsProvider } from "./DebtsContext";
import { useDebts } from "./useDebts";

function TestComponent() {
  const { debts, add, remove, undo, canUndo, canRedo } = useDebts();
  return (
    <>
      <p data-testid="count">{debts.length}</p>
      <p data-testid="ids">{debts.map((d) => d.id).join(",")}</p>
      <p data-testid="canUndo">{String(canUndo)}</p>
      <p data-testid="canRedo">{String(canRedo)}</p>
      <button
        data-testid="addCredit"
        onClick={() => add(DebtMother.creditCard(), true)}
        type="button"
      >
        add credit
      </button>
      <button
        data-testid="addLoan"
        onClick={() => add(DebtMother.personalLoan(), true)}
        type="button"
      >
        add loan
      </button>
      <button
        data-testid="removeCredit"
        onClick={() => remove("debt-credit-card", true)}
        type="button"
      >
        remove credit
      </button>
      <button data-testid="undo" onClick={() => undo()} type="button">
        undo
      </button>
    </>
  );
}

describe("DebtsProvider", () => {
  it("starts with an empty list and no undo/redo", () => {
    render(
      <DebtsProvider>
        <TestComponent />
      </DebtsProvider>,
    );
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("ids").textContent).toBe("");
    expect(screen.getByTestId("canUndo").textContent).toBe("false");
    expect(screen.getByTestId("canRedo").textContent).toBe("false");
  });

  it("add(debt, true) appends to the list and adds an undo step", () => {
    render(
      <DebtsProvider>
        <TestComponent />
      </DebtsProvider>,
    );
    fireEvent.click(screen.getByTestId("addCredit"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("ids").textContent).toBe("debt-credit-card");
    expect(screen.getByTestId("canUndo").textContent).toBe("true");
  });

  it("add then remove then undo restores the removed debt", () => {
    render(
      <DebtsProvider>
        <TestComponent />
      </DebtsProvider>,
    );
    fireEvent.click(screen.getByTestId("addCredit"));
    fireEvent.click(screen.getByTestId("removeCredit"));
    expect(screen.getByTestId("count").textContent).toBe("0");
    fireEvent.click(screen.getByTestId("undo"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("ids").textContent).toBe("debt-credit-card");
  });

  it("add twice keeps insertion order", () => {
    render(
      <DebtsProvider>
        <TestComponent />
      </DebtsProvider>,
    );
    fireEvent.click(screen.getByTestId("addCredit"));
    fireEvent.click(screen.getByTestId("addLoan"));
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("ids").textContent).toBe(
      "debt-credit-card,debt-personal-loan",
    );
  });
});
