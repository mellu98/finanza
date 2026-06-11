/**
 * Object Mother for `Transaction` fixtures.
 *
 * Mirrors `MonthlyPlanMother` and the Guitos `BudgetMother` pattern:
 * a class with static factory methods that return valid `Transaction`
 * objects with sensible defaults and per-field overrides.
 *
 * The `Transaction` entity is intentionally permissive: it carries
 * `category`, `description`, `paymentMethod`, and `notes` as plain
 * strings so the mother can stand in for any UI-driven input.
 *
 * The default `category` is `"groceries"` because it sits in the
 * middle of the classification taxonomy (controllable + necessary) —
 * it makes test assertions about classification and necessity
 * meaningful without having to override the field.
 */
import Big from "big.js";
import type { IsoDate } from "../daily-coach/isoDate";
import { parseIsoDate } from "../daily-coach/isoDate";
import type { Money } from "../daily-coach/money";
import type { Transaction } from "./transaction";
import { Classification, TransactionType } from "./transaction";

const DEFAULT_DATE: IsoDate = parseIsoDate("2026-06-10");

/** Partial-override shape for `Transaction` test fixtures. */
export type TransactionOverrides = Partial<Transaction>;

/**
 * Object Mother for `Transaction`. Static methods mirror the Guitos
 * `BudgetMother` pattern (e.g. `BudgetMother.testBudget()`).
 */
export class TransactionMother {
  /**
   * A valid `Transaction` with sensible defaults and per-field
   * overrides. Defaults: an expense of `Big(0)` on `2026-06-10` in
   * the "groceries" category, marked `controllable` and not
   * necessary.
   */
  static testTransaction(overrides: TransactionOverrides = {}): Transaction {
    return {
      id: overrides.id ?? "tx-test-1",
      date: overrides.date ?? DEFAULT_DATE,
      type: overrides.type ?? TransactionType.Expense,
      category: overrides.category ?? "groceries",
      description: overrides.description ?? "test transaction",
      amount: (overrides.amount ?? new Big(0)) as Money,
      paymentMethod: overrides.paymentMethod,
      necessary: overrides.necessary ?? false,
      classification: overrides.classification ?? Classification.Controllable,
      notes: overrides.notes,
      categoryBudget: overrides.categoryBudget,
    };
  }

  /**
   * A "buy groceries" expense for €42.50. Useful when a test needs a
   * recognisable, non-zero transaction without writing a full
   * `testTransaction` call.
   */
  static groceriesExpense42(): Transaction {
    return TransactionMother.testTransaction({
      id: "tx-groceries-42",
      amount: new Big("42.50"),
      category: "groceries",
      description: "weekly groceries",
      necessary: true,
    });
  }

  /**
   * An "income" transaction (e.g. salary) of €1500. Useful for tests
   * that need to assert income flows through the engine.
   */
  static salary1500(): Transaction {
    return TransactionMother.testTransaction({
      id: "tx-salary-1500",
      type: TransactionType.Income,
      amount: new Big("1500"),
      category: "income",
      description: "monthly salary",
      necessary: true,
    });
  }
}
