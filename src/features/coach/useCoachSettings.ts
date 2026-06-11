/**
 * `useCoachSettings` — hook for consuming `CoachSettingsContext`.
 *
 * Mirrors `useBudget` in `@guitos/context/BudgetContext`. Returns the
 * full context interface so callers can pick what they need.
 */
import { useContext } from "react";
import {
  CoachSettingsContext,
  type CoachSettingsContextInterface,
} from "./CoachSettingsContext";

export const useCoachSettings = (): CoachSettingsContextInterface =>
  useContext(CoachSettingsContext);
