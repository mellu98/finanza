/**
 * Test plan for `TransactionsContext`.
 *
 * The context holds the user's transaction list in state and exposes
 * `add` / `remove` / `update` operations with the same
 * `saveInHistory` flag pattern used by `BudgetContext` and
 * `MonthlyPlanContext`.
 *
 * The test asserts the externally observable behaviour via button
 * clicks (no setState during render — the test harness
 * `console-fail-test` rejects that pattern).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionMother } from "./Transaction.mother";
import { TransactionsProvider } from "./TransactionsContext";
import { useTransactions } from "./useTransactions";

function TestComponent() {
  const { transactions, add, remove, undo, canUndo, canRedo } =
    useTransactions();
  return (
    <>
      <p data-testid="count">{transactions.length}</p>
      <p data-testid="ids">{transactions.map((t) => t.id).join(",")}</p>
      <p data-testid="canUndo">{String(canUndo)}</p>
      <p data-testid="canRedo">{String(canRedo)}</p>
      <button
        data-testid="addGrocery"
        onClick={() => add(TransactionMother.groceriesExpense42(), true)}
        type="button"
      >
        add grocery
      </button>
      <button
        data-testid="addSalary"
        onClick={() => add(TransactionMother.salary1500(), true)}
        type="button"
      >
        add salary
      </button>
      <button
        data-testid="removeGrocery"
        onClick={() => remove("tx-groceries-42", true)}
        type="button"
      >
        remove grocery
      </button>
      <button data-testid="undo" onClick={() => undo()} type="button">
        undo
      </button>
    </>
  );
}

describe("TransactionsProvider", () => {
  it("starts with an empty list and no undo/redo", () => {
    render(
      <TransactionsProvider>
        <TestComponent />
      </TransactionsProvider>,
    );
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("ids").textContent).toBe("");
    expect(screen.getByTestId("canUndo").textContent).toBe("false");
    expect(screen.getByTestId("canRedo").textContent).toBe("false");
  });

  it("add(tx, true) appends to the list and adds an undo step", () => {
    render(
      <TransactionsProvider>
        <TestComponent />
      </TransactionsProvider>,
    );
    fireEvent.click(screen.getByTestId("addGrocery"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("ids").textContent).toBe("tx-groceries-42");
    expect(screen.getByTestId("canUndo").textContent).toBe("true");
  });

  it("add then remove then undo restores the removed transaction", () => {
    render(
      <TransactionsProvider>
        <TestComponent />
      </TransactionsProvider>,
    );
    fireEvent.click(screen.getByTestId("addGrocery"));
    fireEvent.click(screen.getByTestId("removeGrocery"));
    expect(screen.getByTestId("count").textContent).toBe("0");
    fireEvent.click(screen.getByTestId("undo"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("ids").textContent).toBe("tx-groceries-42");
  });

  it("add twice keeps insertion order", () => {
    render(
      <TransactionsProvider>
        <TestComponent />
      </TransactionsProvider>,
    );
    fireEvent.click(screen.getByTestId("addGrocery"));
    fireEvent.click(screen.getByTestId("addSalary"));
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("ids").textContent).toBe(
      "tx-groceries-42,tx-salary-1500",
    );
  });
});
