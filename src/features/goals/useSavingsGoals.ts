/**
 * `useSavingsGoals` — hook for consuming `SavingsGoalsContext`.
 *
 * Mirrors `useBudget` in `@guitos/context/BudgetContext`. Returns the
 * full context interface so callers can pick what they need.
 */
import { useContext } from "react";
import {
  SavingsGoalsContext,
  type SavingsGoalsContextInterface,
} from "./SavingsGoalsContext";

export const useSavingsGoals = (): SavingsGoalsContextInterface =>
  useContext(SavingsGoalsContext);
