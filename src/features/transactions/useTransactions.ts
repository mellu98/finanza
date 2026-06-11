/**
 * `useTransactions` — hook for consuming `TransactionsContext`.
 *
 * Mirrors `useBudget` in `@guitos/context/BudgetContext`. Returns the
 * full context interface so callers can pick what they need.
 */
import { useContext } from "react";
import {
  TransactionsContext,
  type TransactionsContextInterface,
} from "./TransactionsContext";

export const useTransactions = (): TransactionsContextInterface =>
  useContext(TransactionsContext);
