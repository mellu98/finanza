/**
 * `useCoach` — hook for consuming `CoachContext`.
 *
 * Mirrors the other per-feature hooks (`useMonthlyPlan`,
 * `useTransactions`, etc.). Returns the full context interface so
 * callers can pick what they need.
 */
import { useContext } from "react";
import { CoachContext, type CoachContextInterface } from "./CoachContext";

export const useCoach = (): CoachContextInterface => useContext(CoachContext);
