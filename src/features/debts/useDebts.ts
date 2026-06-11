/**
 * `useDebts` — hook for consuming `DebtsContext`.
 *
 * Mirrors `useBudget` in `@guitos/context/BudgetContext`. Returns the
 * full context interface so callers can pick what they need.
 */
import { useContext } from "react";
import { DebtsContext, type DebtsContextInterface } from "./DebtsContext";

export const useDebts = (): DebtsContextInterface => useContext(DebtsContext);
