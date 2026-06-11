/**
 * `useMonthlyPlan` — hook for consuming `MonthlyPlanContext`.
 *
 * Mirrors `useBudget` in `@guitos/context/BudgetContext`. Returns the
 * full context interface so callers can pick what they need.
 */
import { useContext } from "react";
import {
  MonthlyPlanContext,
  type MonthlyPlanContextInterface,
} from "./MonthlyPlanContext";

export const useMonthlyPlan = (): MonthlyPlanContextInterface =>
  useContext(MonthlyPlanContext);
