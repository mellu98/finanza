/**
 * SavingsGoal entity.
 *
 * A single user-defined savings target: emergency fund, vacation, new
 * car, etc. The savings-goal engine projects the daily quota, progress,
 * and allocation strategy for a goal.
 *
 * Money amounts are `big.js` `Big` instances (the `Money` type from
 * `@features/daily-coach/money`).
 *
 * Relocated from `src/features/daily-coach/domain.ts` in PR3 (carry-forward
 * of PR2 deviation #6).
 */
import type { IsoDate, IsoDateTime } from "../daily-coach/isoDate";
import type { Money } from "../daily-coach/money";

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: Money;
  currentAmount: Money;
  deadline: IsoDate;
  emergencyFund: boolean;
  createdAt: IsoDateTime;
  notes?: string;
}
