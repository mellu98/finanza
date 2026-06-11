/**
 * React context for the user's `CoachSettings`.
 *
 * Mirrors the Guitos `BudgetContext` pattern:
 * - the state lives in a `use-undo` queue so the user can undo/redo
 *   changes to their settings;
 * - the `saveInHistory` flag controls whether a given `setSettings`
 *   call adds an undo entry (matches `BudgetContext.setBudget(value, saveInHistory)`).
 *
 * The context does NOT touch the repository. Wiring up the
 * localforage repository to the context is a concern of the
 * App-level integration in PR5.
 */

import { createContext, type PropsWithChildren, useMemo } from "react";
import useUndo from "use-undo";
import type { CoachSettings } from "./coachSettings";
import { useCoachSettings } from "./useCoachSettings";

export interface CoachSettingsContextInterface {
  settings: CoachSettings | undefined;
  setSettings: (value: CoachSettings, saveInHistory: boolean) => void;
  past: ReadonlyArray<CoachSettings | undefined>;
  future: ReadonlyArray<CoachSettings | undefined>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const CoachSettingsContext = createContext<CoachSettingsContextInterface>({
  settings: undefined,
  setSettings: (_value, _saveInHistory) => {
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

export { CoachSettingsContext };

export function CoachSettingsProvider({ children }: PropsWithChildren) {
  const [
    state,
    { set: setUndo, undo, redo, canUndo: undoPossible, canRedo: redoPossible },
  ] = useUndo<CoachSettings | undefined>(undefined);

  const { present: settings, past, future } = state;

  const canReallyUndo =
    undoPossible && (past[past.length - 1]?.modelName?.length ?? -1) >= 0;
  const canReallyRedo =
    redoPossible && (future[0]?.modelName?.length ?? -1) >= 0;

  const value = useMemo<CoachSettingsContextInterface>(
    () => ({
      settings,
      setSettings: (next, _saveInHistory) => {
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
    [settings, past, future, undo, redo, canReallyUndo, canReallyRedo, setUndo],
  );

  return (
    <CoachSettingsContext.Provider value={value}>
      {children}
    </CoachSettingsContext.Provider>
  );
}

export { useCoachSettings };
