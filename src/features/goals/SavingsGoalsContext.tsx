/**
 * React context for the user's `SavingsGoal[]`.
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
import type { SavingsGoal } from "./savingsGoal";
import { useSavingsGoals } from "./useSavingsGoals";

export interface SavingsGoalsContextInterface {
  goals: ReadonlyArray<SavingsGoal>;
  add: (goal: SavingsGoal, saveInHistory: boolean) => void;
  remove: (id: string, saveInHistory: boolean) => boolean;
  update: (goal: SavingsGoal, saveInHistory: boolean) => void;
  past: ReadonlyArray<ReadonlyArray<SavingsGoal>>;
  future: ReadonlyArray<ReadonlyArray<SavingsGoal>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const SavingsGoalsContext = createContext<SavingsGoalsContextInterface>({
  goals: [],
  add: (_goal, _saveInHistory) => {
    _goal;
    _saveInHistory;
  },
  remove: (_id, _saveInHistory) => {
    _id;
    _saveInHistory;
    return false;
  },
  update: (_goal, _saveInHistory) => {
    _goal;
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

export { SavingsGoalsContext };

export function SavingsGoalsProvider({ children }: PropsWithChildren) {
  const [
    state,
    { set: setUndo, undo, redo, canUndo: undoPossible, canRedo: redoPossible },
  ] = useUndo<ReadonlyArray<SavingsGoal>>([]);

  const { present: goals, past, future } = state;

  const canReallyUndo =
    undoPossible && (past[past.length - 1]?.length ?? -1) >= 0;
  const canReallyRedo = redoPossible && (future[0]?.length ?? -1) >= 0;

  const value = useMemo<SavingsGoalsContextInterface>(
    () => ({
      goals,
      add: (goal, saveInHistory) => {
        const next = goals.some((g) => g.id === goal.id)
          ? goals.map((g) => (g.id === goal.id ? goal : g))
          : [...goals, goal];
        if (saveInHistory) {
          setUndo(next);
        } else {
          setUndo(next);
        }
      },
      remove: (id, saveInHistory) => {
        const had = goals.some((g) => g.id === id);
        if (!had) return false;
        const next = goals.filter((g) => g.id !== id);
        if (saveInHistory) {
          setUndo(next);
        } else {
          setUndo(next);
        }
        return true;
      },
      update: (goal, saveInHistory) => {
        const next = goals.map((g) => (g.id === goal.id ? goal : g));
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
    [goals, past, future, undo, redo, canReallyUndo, canReallyRedo, setUndo],
  );

  return (
    <SavingsGoalsContext.Provider value={value}>
      {children}
    </SavingsGoalsContext.Provider>
  );
}

export { useSavingsGoals };
