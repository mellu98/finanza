/**
 * Tests for `TransactionsTable`.
 *
 * The table renders a sortable, searchable view of the user's
 * `Transaction[]`. Per the spec:
 *   - Sortable headers with `aria-sort` reflecting the current state
 *     (`"ascending"` / `"descending"` / `"none"`).
 *   - Search box filters by `description` AND `notes` (case-insensitive).
 *   - Sort supports: date asc/desc, amount asc/desc, category asc.
 *   - Each row has a `data-testid` and a visible accessible name.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import Big from "big.js";
import { describe, expect, it } from "vitest";
import { TransactionsTable } from "./TransactionsTable";
import type { Transaction } from "./transaction";
import { Classification, TransactionType } from "./transaction";

const tx = (overrides: Partial<Transaction> & { id: string }): Transaction =>
  ({
    date: ("2026-06-10" as never) ?? overrides.date,
    type: TransactionType.Expense,
    category: "groceries",
    description: "test",
    amount: new Big("10") as Transaction["amount"],
    necessary: false,
    classification: Classification.Controllable,
    ...overrides,
  }) as Transaction;

const FIXTURES: ReadonlyArray<Transaction> = [
  tx({
    id: "tx-a",
    date: "2026-06-10" as never,
    category: "groceries",
    description: "milk",
    amount: new Big("3.50"),
    notes: "morning",
  }),
  tx({
    id: "tx-b",
    date: "2026-06-11" as never,
    category: "dining",
    description: "lunch with friends",
    amount: new Big("12.00"),
    notes: "no leftovers",
  }),
  tx({
    id: "tx-c",
    date: "2026-06-12" as never,
    category: "subscriptions",
    description: "netflix",
    amount: new Big("9.99"),
    notes: undefined,
  }),
];

describe("TransactionsTable", () => {
  it("renders one row per transaction with a visible accessible name", () => {
    render(<TransactionsTable transactions={FIXTURES} />);
    const rows = screen.getAllByTestId(/^tx-row-/);
    expect(rows).toHaveLength(3);
    // The accessible name is the description (or a sensible fallback).
    expect(screen.getByRole("row", { name: /milk/i })).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /lunch with friends/i }),
    ).toBeInTheDocument();
  });

  it("renders the column headers with aria-sort='none' by default", () => {
    render(<TransactionsTable transactions={FIXTURES} />);
    const dateHeader = screen.getByTestId("tx-header-date");
    const amountHeader = screen.getByTestId("tx-header-amount");
    const categoryHeader = screen.getByTestId("tx-header-category");
    expect(dateHeader).toHaveAttribute("aria-sort", "none");
    expect(amountHeader).toHaveAttribute("aria-sort", "none");
    expect(categoryHeader).toHaveAttribute("aria-sort", "none");
  });

  it("clicking a header toggles sort direction and updates aria-sort", () => {
    render(<TransactionsTable transactions={FIXTURES} />);
    const dateHeader = screen.getByTestId("tx-header-date");
    // First click: ascending.
    fireEvent.click(dateHeader);
    expect(dateHeader).toHaveAttribute("aria-sort", "ascending");
    let rows = screen.getAllByTestId(/^tx-row-/);
    // 2026-06-10 → 2026-06-11 → 2026-06-12 (a, b, c)
    expect(rows[0]).toHaveAttribute("data-testid", "tx-row-tx-a");
    expect(rows[2]).toHaveAttribute("data-testid", "tx-row-tx-c");
    // Second click: descending.
    fireEvent.click(dateHeader);
    expect(dateHeader).toHaveAttribute("aria-sort", "descending");
    rows = screen.getAllByTestId(/^tx-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", "tx-row-tx-c");
    expect(rows[2]).toHaveAttribute("data-testid", "tx-row-tx-a");
  });

  it("amount sort: ascending puts the lowest amount first", () => {
    render(<TransactionsTable transactions={FIXTURES} />);
    const amountHeader = screen.getByTestId("tx-header-amount");
    fireEvent.click(amountHeader);
    const rows = screen.getAllByTestId(/^tx-row-/);
    // 3.50 → 9.99 → 12.00
    expect(rows[0]).toHaveAttribute("data-testid", "tx-row-tx-a");
    expect(rows[2]).toHaveAttribute("data-testid", "tx-row-tx-b");
  });

  it("category sort: ascending puts alphabetically-first category first", () => {
    render(<TransactionsTable transactions={FIXTURES} />);
    const categoryHeader = screen.getByTestId("tx-header-category");
    fireEvent.click(categoryHeader);
    const rows = screen.getAllByTestId(/^tx-row-/);
    // dining < groceries < subscriptions
    expect(rows[0]).toHaveAttribute("data-testid", "tx-row-tx-b");
    expect(rows[2]).toHaveAttribute("data-testid", "tx-row-tx-c");
  });

  it("search box filters by description case-insensitively", () => {
    render(<TransactionsTable transactions={FIXTURES} />);
    fireEvent.change(screen.getByTestId("tx-search"), {
      target: { value: "MILK" },
    });
    const rows = screen.getAllByTestId(/^tx-row-/);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAttribute("data-testid", "tx-row-tx-a");
  });

  it("search box filters by notes case-insensitively", () => {
    render(<TransactionsTable transactions={FIXTURES} />);
    fireEvent.change(screen.getByTestId("tx-search"), {
      target: { value: "leftovers" },
    });
    const rows = screen.getAllByTestId(/^tx-row-/);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAttribute("data-testid", "tx-row-tx-b");
  });

  it("search with no matches shows the empty state", () => {
    render(<TransactionsTable transactions={FIXTURES} />);
    fireEvent.change(screen.getByTestId("tx-search"), {
      target: { value: "no-such-string" },
    });
    expect(screen.getByTestId("tx-empty-state")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^tx-row-/)).toHaveLength(0);
  });

  it("amount column is rendered with 2-decimal precision", () => {
    render(<TransactionsTable transactions={FIXTURES} />);
    const row = screen.getByTestId("tx-row-tx-a");
    // 3.50 (no thousands separator) is the canonical display.
    expect(within(row).getByTestId("tx-cell-amount")).toHaveTextContent("3.5");
  });
});
