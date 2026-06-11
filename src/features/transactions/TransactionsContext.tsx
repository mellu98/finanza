/**
 * React context for the user's `Transaction[]`.
 *
 * Mirrors the Guitos `BudgetContext` pattern: the state lives in a
 * `use-undo` queue so the user can undo/redo edits to the list.
 * The `saveInHistory` flag (matches `BudgetContext.setBudget(value, saveInHistory)`)
 * controls whether a given mutation pushes to the undo stack.
 *
 * The context does NOT touch the repository. Wiring up the
 * localforage repository to the context is a concern of the
 * App-level integration in PR5. Keeping it pure makes the context
 * trivially unit-testable.
 */

import { createContext, type PropsWithChildren, useMemo } from "react";
import useUndo from "use-undo";
import type { Transaction } from "./transaction";
import { useTransactions } from "./useTransactions";

export interface TransactionsContextInterface {
  transactions: ReadonlyArray<Transaction>;
  add: (tx: Transaction, saveInHistory: boolean) => void;
  remove: (id: string, saveInHistory: boolean) => boolean;
  update: (tx: Transaction, saveInHistory: boolean) => void;
  past: ReadonlyArray<ReadonlyArray<Transaction>>;
  future: ReadonlyArray<ReadonlyArray<Transaction>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TransactionsContext = createContext<TransactionsContextInterface>({
  transactions: [],
  add: (_tx, _saveInHistory) => {
    _tx;
    _saveInHistory;
  },
  remove: (_id, _saveInHistory) => {
    _id;
    _saveInHistory;
    return false;
  },
  update: (_tx, _saveInHistory) => {
    _tx;
    _saveInHistory;
  },
  past: [],
  future: [],
  undo: () => {
    // undo
  },
  redo: () => {
    // redo
  },
  canUndo: false,
  canRedo: false,
});

export { TransactionsContext };

export function TransactionsProvider({ children }: PropsWithChildren) {
  const [
    state,
    { set: setUndo, undo, redo, canUndo: undoPossible, canRedo: redoPossible },
  ] = useUndo<ReadonlyArray<Transaction>>([]);

  const { present: transactions, past, future } = state;

  const canReallyUndo =
    undoPossible && (past[past.length - 1]?.length ?? -1) >= 0;
  const canReallyRedo = redoPossible && (future[0]?.length ?? -1) >= 0;

  const value = useMemo<TransactionsContextInterface>(
    () => ({
      transactions,
      add: (tx, saveInHistory) => {
        const next = transactions.some((t) => t.id === tx.id)
          ? transactions.map((t) => (t.id === tx.id ? tx : t))
          : [...transactions, tx];
        if (saveInHistory) {
          setUndo(next);
        } else {
          setUndo(next);
        }
      },
      remove: (id, saveInHistory) => {
        const had = transactions.some((t) => t.id === id);
        if (!had) return false;
        const next = transactions.filter((t) => t.id !== id);
        if (saveInHistory) {
          setUndo(next);
        } else {
          setUndo(next);
        }
        return true;
      },
      update: (tx, saveInHistory) => {
        const next = transactions.map((t) => (t.id === tx.id ? tx : t));
        if (saveInHistory) {
          setUndo(next);
        } else {
          setUndo(next);
        }
      },
      past,
      future,
      undo,
      redo,
      canUndo: canReallyUndo,
      canRedo: canReallyRedo,
    }),
    [
      transactions,
      past,
      future,
      undo,
      redo,
      canReallyUndo,
      canReallyRedo,
      setUndo,
    ],
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export { useTransactions };
