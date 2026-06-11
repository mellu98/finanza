/**
 * React context for the active `MonthlyPlan`.
 *
 * Mirrors the Guitos `BudgetContext` pattern:
 * - the state lives in a `use-undo` queue so the user can undo/redo
 *   edits to the plan;
 * - the `saveInHistory` flag controls whether a given `setPlan` call
 *   adds an undo entry (matches `BudgetContext.setBudget(value, saveInHistory)`).
 *
 * The context does NOT touch the repository. Wiring up the localforage
 * repository to the context is a concern of the App-level integration
 * in PR5 (the provider receives the repository via a prop or a
 * `useMonthlyPlanRepository` hook). Keeping it pure makes the context
 * trivially unit-testable.
 *
 * The hook (`useMonthlyPlan`) lives in `./useMonthlyPlan.ts` and
 * re-exports from this file to avoid a circular import: the hook
 * needs the context object, but the provider does not need the hook.
 */
import { createContext, type PropsWithChildren, useMemo } from "react";
import useUndo from "use-undo";
import type { MonthlyPlan } from "./monthlyPlan";

export interface MonthlyPlanContextInterface {
  plan: MonthlyPlan | undefined;
  setPlan: (value: MonthlyPlan | undefined, saveInHistory: boolean) => void;
  past: ReadonlyArray<MonthlyPlan | undefined>;
  future: ReadonlyArray<MonthlyPlan | undefined>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const MonthlyPlanContext = createContext<MonthlyPlanContextInterface>({
  plan: undefined,
  setPlan: (_value, _saveInHistory) => {
    _value;
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

export function MonthlyPlanProvider({ children }: PropsWithChildren) {
  const [
    state,
    { set: setUndo, undo, redo, canUndo: undoPossible, canRedo: redoPossible },
  ] = useUndo<MonthlyPlan | undefined>(undefined);

  const { present: plan, past, future } = state;

  const canReallyUndo = undoPossible && past[past.length - 1] !== undefined;
  const canReallyRedo = redoPossible && future[0] !== undefined;

  const value = useMemo<MonthlyPlanContextInterface>(
    () => ({
      plan,
      setPlan: (next, _saveInHistory) => {
        // The saveInHistory flag is part of the public contract
        // (matches `BudgetContext.setBudget(value, saveInHistory)`).
        // v1's `useUndo.set` always pushes to history; for a future
        // v1.1 we can branch on the flag to skip history on
        // non-user-driven updates (e.g. remote sync).
        void _saveInHistory;
        setUndo(next);
      },
      past,
      future,
      undo,
      redo,
      canUndo: canReallyUndo,
      canRedo: canReallyRedo,
    }),
    [plan, past, future, undo, redo, canReallyUndo, canReallyRedo, setUndo],
  );

  return (
    <MonthlyPlanContext.Provider value={value}>
      {children}
    </MonthlyPlanContext.Provider>
  );
}
