/**
 * Debt entity and priority levels.
 *
 * A single debt: creditor, amounts, next due date, and a 1..5 priority.
 * The debts engine sorts, projects, and answers "can I afford the
 * installment?" for the coach.
 *
 * Money amounts are `big.js` `Big` instances (the `Money` type from
 * `@features/daily-coach/money`).
 *
 * Relocated from `src/features/daily-coach/domain.ts` in PR3 (carry-forward
 * of PR2 deviation #6).
 */
import type { IsoDate } from "../daily-coach/isoDate";
import type { Money } from "../daily-coach/money";

/* ---------- Priority ---------- */

export const DebtPriority = {
  Priority1: 1,
  Priority2: 2,
  Priority3: 3,
  Priority4: 4,
  Priority5: 5,
} as const;
export type DebtPriority = (typeof DebtPriority)[keyof typeof DebtPriority];

/* ---------- Debt ---------- */

export interface Debt {
  id: string;
  creditor: string;
  totalAmount: Money;
  remainingAmount: Money;
  monthlyInstallment: Money;
  nextDueDate: IsoDate;
  priority: DebtPriority;
  riskIfUnpaid?: string;
  notes?: string;
}
