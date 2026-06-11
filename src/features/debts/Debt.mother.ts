/**
 * Object Mother for `Debt` fixtures.
 *
 * Mirrors the other `*.mother.ts` classes: static factory methods
 * with sensible defaults and per-field overrides.
 *
 * Defaults to a single "Bank" debt with zero amounts, priority 3
 * (middle of the 1..5 scale), and a next-due-date one day after the
 * fixed project "today" (2026-06-10).
 */
import Big from "big.js";
import type { IsoDate, IsoDateTime } from "../daily-coach/isoDate";
import { parseIsoDate, parseIsoDateTime } from "../daily-coach/isoDate";
import type { Money } from "../daily-coach/money";
import { type Debt, DebtPriority } from "./debt";

const DEFAULT_NEXT_DUE: IsoDate = parseIsoDate("2026-06-15");
const _DEFAULT_CREATED_AT: IsoDateTime = parseIsoDateTime(
  "2026-06-01T00:00:00Z",
);

const ZERO: Money = new Big(0);

/** Partial-override shape for `Debt` test fixtures. */
export type DebtOverrides = Partial<Debt>;

/**
 * Object Mother for `Debt`. Static methods mirror the Guitos
 * `BudgetMother` pattern.
 */
export class DebtMother {
  /**
   * A valid `Debt` with sensible defaults and per-field overrides.
   * Defaults: a "Bank" debt with zero amounts, `DebtPriority.Priority3`
   * (middle of the 1..5 scale), next-due-date 2026-06-15.
   */
  static testDebt(overrides: DebtOverrides = {}): Debt {
    return {
      id: overrides.id ?? "debt-test-1",
      creditor: overrides.creditor ?? "Bank",
      totalAmount: overrides.totalAmount ?? ZERO,
      remainingAmount: overrides.remainingAmount ?? ZERO,
      monthlyInstallment: overrides.monthlyInstallment ?? ZERO,
      nextDueDate: overrides.nextDueDate ?? DEFAULT_NEXT_DUE,
      priority: overrides.priority ?? DebtPriority.Priority3,
      riskIfUnpaid: overrides.riskIfUnpaid,
      notes: overrides.notes,
    };
  }

  /**
   * A high-priority debt (priority 1): €5000 total, €2500 remaining,
   * €250/month installment. Used by the debts engine to verify the
   * sort-by-priority ordering.
   */
  static creditCard(): Debt {
    return DebtMother.testDebt({
      id: "debt-credit-card",
      creditor: "Credit Card",
      totalAmount: new Big("5000"),
      remainingAmount: new Big("2500"),
      monthlyInstallment: new Big("250"),
      priority: DebtPriority.Priority1,
      riskIfUnpaid: "Credit score impact",
    });
  }

  /**
   * A low-priority debt (priority 5): €1000 total, €800 remaining,
   * €50/month installment. Used to verify multi-debt ordering.
   */
  static personalLoan(): Debt {
    return DebtMother.testDebt({
      id: "debt-personal-loan",
      creditor: "Personal Loan",
      totalAmount: new Big("1000"),
      remainingAmount: new Big("800"),
      monthlyInstallment: new Big("50"),
      priority: DebtPriority.Priority5,
    });
  }
}
