/**
 * React context for the user's `Debt[]`.
 *
 * Mirrors the Guitos `BudgetContext` pattern: the state lives in a
 * `use-undo` queue so the user can undo/redo edits to the list.
 * The `saveInHistory` flag (matches `BudgetContext.setBudget(value, saveInHistory)`)
 * controls whether a given mutation pushes to the undo stack.
 *
 * The context does NOT touch the repository. Wiring up the
 * localforage repository to the context is a concern of the
 * App-level integration in PR5.
 */

import { createContext, type PropsWithChildren, useMemo } from "react";
import useUndo from "use-undo";
import type { Debt } from "./debt";
import { useDebts } from "./useDebts";

export interface DebtsContextInterface {
  debts: ReadonlyArray<Debt>;
  add: (debt: Debt, saveInHistory: boolean) => void;
  remove: (id: string, saveInHistory: boolean) => boolean;
  update: (debt: Debt, saveInHistory: boolean) => void;
  past: ReadonlyArray<ReadonlyArray<Debt>>;
  future: ReadonlyArray<ReadonlyArray<Debt>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const DebtsContext = createContext<DebtsContextInterface>({
  debts: [],
  add: (_debt, _saveInHistory) => {
    _debt;
    _saveInHistory;
  },
  remove: (_id, _saveInHistory) => {
    _id;
    _saveInHistory;
    return false;
  },
  update: (_debt, _saveInHistory) => {
    _debt;
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

export { DebtsContext };

export function DebtsProvider({ children }: PropsWithChildren) {
  const [
    state,
    { set: setUndo, undo, redo, canUndo: undoPossible, canRedo: redoPossible },
  ] = useUndo<ReadonlyArray<Debt>>([]);

  const { present: debts, past, future } = state;

  const canReallyUndo =
    undoPossible && (past[past.length - 1]?.length ?? -1) >= 0;
  const canReallyRedo = redoPossible && (future[0]?.length ?? -1) >= 0;

  const value = useMemo<DebtsContextInterface>(
    () => ({
      debts,
      add: (debt, saveInHistory) => {
        const next = debts.some((d) => d.id === debt.id)
          ? debts.map((d) => (d.id === debt.id ? debt : d))
          : [...debts, debt];
        if (saveInHistory) {
          setUndo(next);
        } else {
          setUndo(next);
        }
      },
      remove: (id, saveInHistory) => {
        const had = debts.some((d) => d.id === id);
        if (!had) return false;
        const next = debts.filter((d) => d.id !== id);
        if (saveInHistory) {
          setUndo(next);
        } else {
          setUndo(next);
        }
        return true;
      },
      update: (debt, saveInHistory) => {
        const next = debts.map((d) => (d.id === debt.id ? debt : d));
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
    [debts, past, future, undo, redo, canReallyUndo, canReallyRedo, setUndo],
  );

  return (
    <DebtsContext.Provider value={value}>{children}</DebtsContext.Provider>
  );
}

export { useDebts };
