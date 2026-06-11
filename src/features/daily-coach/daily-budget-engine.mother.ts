/**
 * Object Mother for the daily-budget engine.
 *
 * The test fixtures pin a frozen `TODAY` so the engine output is
 * deterministic across runs. Engines never call `new Date()` — they
 * take `evaluationDate: IsoDate` as an argument.
 */

import Big from "big.js";
import type {
  Classification,
  Debt,
  MonthlyPlan,
  SavingsGoal,
  Transaction,
  TransactionType,
} from "./domain";
import { type IsoDate, parseIsoDate } from "./isoDate";

/** Frozen "today" used by every test fixture. */
export const TODAY: IsoDate = parseIsoDate("2026-06-10");
/** Frozen "yesterday" — 1 day before TODAY. */
export const YESTERDAY: IsoDate = parseIsoDate("2026-06-09");
/** Frozen "tomorrow" — 1 day after TODAY. */
export const TOMORROW: IsoDate = parseIsoDate("2026-06-11");

const FIXED_NEXT_INCOME: IsoDate = parseIsoDate("2026-06-25");
const FIXED_PERIOD_START: IsoDate = parseIsoDate("2026-06-01");
const FIXED_PERIOD_END: IsoDate = parseIsoDate("2026-06-30");
const FIXED_CREATED_AT = "2026-06-10T00:00:00Z" as never;
const FIXED_UPDATED_AT = "2026-06-10T00:00:00Z" as never;

export interface MonthlyPlanOverrides {
  id?: string;
  periodStart?: IsoDate;
  periodEnd?: IsoDate;
  currentBalance?: Big;
  expectedIncomeUntilPeriodEnd?: Big;
  mandatoryExpensesRemaining?: Big;
  debtPaymentsRemaining?: Big;
  savingsGoalRemaining?: Big;
  emergencyBuffer?: Big;
  daysRemaining?: number;
  nextIncomeDate?: IsoDate;
}

/**
 * Build a `MonthlyPlan` with sensible defaults and per-field overrides.
 * Money fields default to `Big(0)`; `daysRemaining` defaults to 10.
 */
export const makePlan = (
  overrides: MonthlyPlanOverrides = {},
): MonthlyPlan => ({
  id: overrides.id ?? "plan-1",
  periodStart: overrides.periodStart ?? FIXED_PERIOD_START,
  periodEnd: overrides.periodEnd ?? FIXED_PERIOD_END,
  currentBalance: overrides.currentBalance ?? new Big(0),
  expectedIncomeUntilPeriodEnd:
    overrides.expectedIncomeUntilPeriodEnd ?? new Big(0),
  mandatoryExpensesRemaining:
    overrides.mandatoryExpensesRemaining ?? new Big(0),
  debtPaymentsRemaining: overrides.debtPaymentsRemaining ?? new Big(0),
  savingsGoalRemaining: overrides.savingsGoalRemaining ?? new Big(0),
  emergencyBuffer: overrides.emergencyBuffer ?? new Big(0),
  daysRemaining: overrides.daysRemaining ?? 10,
  nextIncomeDate: overrides.nextIncomeDate ?? FIXED_NEXT_INCOME,
  createdAt: FIXED_CREATED_AT,
  updatedAt: FIXED_UPDATED_AT,
});

export interface TransactionOverrides {
  id?: string;
  date?: IsoDate;
  type?: TransactionType;
  category?: string;
  description?: string;
  amount?: Big;
  classification?: Classification;
  necessary?: boolean;
  notes?: string;
}

/** Build a `Transaction` with sensible defaults. */
export const makeTransaction = (
  overrides: TransactionOverrides = {},
): Transaction => ({
  id: overrides.id ?? "tx-1",
  date: overrides.date ?? TODAY,
  type: overrides.type ?? ("expense" as TransactionType),
  category: overrides.category ?? "groceries",
  description: overrides.description ?? "test transaction",
  amount: overrides.amount ?? new Big(0),
  classification:
    overrides.classification ?? ("controllable" as Classification),
  necessary: overrides.necessary ?? false,
  notes: overrides.notes,
});

/** Subtract `n` days from the given `IsoDate` and return a new `IsoDate`. */
export const dayBefore = (d: IsoDate, n = 1): IsoDate => {
  const [yyyy, mm, dd] = d.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  dt.setUTCDate(dt.getUTCDate() - n);
  const y = dt.getUTCFullYear().toString().padStart(4, "0");
  const m = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  const da = dt.getUTCDate().toString().padStart(2, "0");
  return parseIsoDate(`${y}-${m}-${da}`);
};

/* Re-export savings-goal and debt factories for downstream tests. */
export interface SavingsGoalOverrides {
  id?: string;
  name?: string;
  targetAmount?: Big;
  currentAmount?: Big;
  deadline?: IsoDate;
  emergencyFund?: boolean;
}

export const makeSavingsGoal = (
  overrides: SavingsGoalOverrides = {},
): SavingsGoal => ({
  id: overrides.id ?? "goal-1",
  name: overrides.name ?? "Test goal",
  targetAmount: overrides.targetAmount ?? new Big(0),
  currentAmount: overrides.currentAmount ?? new Big(0),
  deadline: overrides.deadline ?? TOMORROW,
  emergencyFund: overrides.emergencyFund ?? false,
  createdAt: FIXED_CREATED_AT,
  notes: undefined,
});

export interface DebtOverrides {
  id?: string;
  creditor?: string;
  totalAmount?: Big;
  remainingAmount?: Big;
  monthlyInstallment?: Big;
  nextDueDate?: IsoDate;
  priority?: 1 | 2 | 3 | 4 | 5;
}

export const makeDebt = (overrides: DebtOverrides = {}): Debt => ({
  id: overrides.id ?? "debt-1",
  creditor: overrides.creditor ?? "Bank",
  totalAmount: overrides.totalAmount ?? new Big(0),
  remainingAmount: overrides.remainingAmount ?? new Big(0),
  monthlyInstallment: overrides.monthlyInstallment ?? new Big(0),
  nextDueDate: overrides.nextDueDate ?? TOMORROW,
  priority: (overrides.priority ?? 3) as Debt["priority"],
  riskIfUnpaid: undefined,
  notes: undefined,
});
