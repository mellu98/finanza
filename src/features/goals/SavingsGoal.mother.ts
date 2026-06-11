/**
 * Object Mother for `SavingsGoal` fixtures.
 *
 * Mirrors the other `*.mother.ts` classes: static factory methods
 * with sensible defaults and per-field overrides.
 */
import Big from "big.js";
import type { IsoDate, IsoDateTime } from "../daily-coach/isoDate";
import { parseIsoDate, parseIsoDateTime } from "../daily-coach/isoDate";
import type { Money } from "../daily-coach/money";
import type { SavingsGoal } from "./savingsGoal";

const DEFAULT_DEADLINE: IsoDate = parseIsoDate("2026-12-31");
const DEFAULT_CREATED_AT: IsoDateTime = parseIsoDateTime(
  "2026-06-01T00:00:00Z",
);

const ZERO: Money = new Big(0);

/** Partial-override shape for `SavingsGoal` test fixtures. */
export type SavingsGoalOverrides = Partial<SavingsGoal>;

/**
 * Object Mother for `SavingsGoal`. Static methods mirror the Guitos
 * `BudgetMother` pattern (e.g. `BudgetMother.testBudget()`).
 */
export class SavingsGoalMother {
  /**
   * A valid `SavingsGoal` with sensible defaults and per-field
   * overrides. Defaults: a "Test goal" with zero amounts, a
   * 2026-12-31 deadline, and `emergencyFund: false`.
   */
  static testGoal(overrides: SavingsGoalOverrides = {}): SavingsGoal {
    return {
      id: overrides.id ?? "goal-test-1",
      name: overrides.name ?? "Test goal",
      targetAmount: overrides.targetAmount ?? ZERO,
      currentAmount: overrides.currentAmount ?? ZERO,
      deadline: overrides.deadline ?? DEFAULT_DEADLINE,
      emergencyFund: overrides.emergencyFund ?? false,
      createdAt: overrides.createdAt ?? DEFAULT_CREATED_AT,
      notes: overrides.notes,
    };
  }

  /**
   * A "vacation" goal: €2000 target, €500 current, deadline 2026-12-31.
   * Useful when a test needs a non-zero, non-emergency goal.
   */
  static vacation(): SavingsGoal {
    return SavingsGoalMother.testGoal({
      id: "goal-vacation",
      name: "Vacation",
      targetAmount: new Big("2000"),
      currentAmount: new Big("500"),
    });
  }

  /**
   * An "emergency fund" goal: €5000 target, €1000 current, flagged
   * as `emergencyFund: true`. Used by the coach rules engine to
   * distinguish emergency goals from discretionary ones.
   */
  static emergencyFund(): SavingsGoal {
    return SavingsGoalMother.testGoal({
      id: "goal-emergency",
      name: "Emergency fund",
      targetAmount: new Big("5000"),
      currentAmount: new Big("1000"),
      emergencyFund: true,
    });
  }
}
