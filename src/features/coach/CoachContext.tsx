/**
 * React context for the user's coach chat state.
 *
 * Mirrors the Guitos `BudgetContext` pattern:
 *   - the state lives in a `use-undo` queue so the user can undo
 *     accidental adds;
 *   - the `saveInHistory` flag is part of the public contract
 *     (matches `BudgetContext.setBudget(value, saveInHistory)`).
 *     v1's `useUndo.set` always pushes; future v1.1 can branch on
 *     the flag to skip history on non-user-driven updates.
 *
 * The context does NOT touch the repository. Wiring up the
 * localforage repository to the context is a concern of the
 * App-level integration in PR5 (the provider receives the repository
 * via a prop or a `useCoachStateRepository` hook). Keeping it pure
 * makes the context trivially unit-testable.
 *
 * PR3 deviation #1 (no useImmer + use-undo): we use `use-undo` only,
 * mirroring all 4 sibling contexts (MonthlyPlan, Transactions,
 * SavingsGoals, Debts, CoachSettings). The `useImmer` desync is
 * avoided by always going through `setUndo(next)`.
 */
import { createContext, type PropsWithChildren, useMemo } from "react";
import useUndo from "use-undo";
import type { CoachState, CoachTurn, NarrationRecord } from "./coachState";

export interface CoachContextInterface {
  /** The current state (defaults to `{ turns: [] }`). */
  state: CoachState;
  /** Append a turn. Auto-generates `id` + `timestamp` if not provided. */
  addTurn: (
    input: { userPrompt: string; narration: NarrationRecord },
    saveInHistory: boolean,
  ) => void;
  /** Replace the whole state (e.g. after loading from localforage). */
  setState: (state: CoachState, saveInHistory: boolean) => void;
  /** The narration source of the most recent turn (drives the yellow banner). */
  lastNarrationSource: NarrationRecord["source"] | undefined;
  /** Read-only view of the turn list. */
  turns: ReadonlyArray<CoachTurn>;
  /** Undo/redo state from `use-undo`. */
  past: ReadonlyArray<CoachState>;
  future: ReadonlyArray<CoachState>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const EMPTY_STATE: CoachState = { turns: [] };

const CoachContext = createContext<CoachContextInterface>({
  state: EMPTY_STATE,
  addTurn: (_input, _saveInHistory) => {
    _input;
    _saveInHistory;
  },
  setState: (_value, _saveInHistory) => {
    _value;
    _saveInHistory;
  },
  lastNarrationSource: undefined,
  turns: [],
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

export { CoachContext };

let turnCounter = 0;
const nextTurnId = (): string => {
  turnCounter += 1;
  return `turn-${Date.now()}-${turnCounter}`;
};

const nowIso = (): string => new Date().toISOString() as never;

export function CoachContextProvider({ children }: PropsWithChildren) {
  const [
    state,
    { set: setUndo, undo, redo, canUndo: undoPossible, canRedo: redoPossible },
  ] = useUndo<CoachState>(EMPTY_STATE);

  const { present: current, past, future } = state;
  const turns = current.turns;
  const lastTurn = turns[turns.length - 1];
  const lastNarrationSource = lastTurn?.narration.source;

  const canReallyUndo = undoPossible && past[past.length - 1] !== undefined;
  const canReallyRedo = redoPossible && future[0] !== undefined;

  const value = useMemo<CoachContextInterface>(
    () => ({
      state: current,
      addTurn: ({ userPrompt, narration }, _saveInHistory) => {
        void _saveInHistory;
        const turn: CoachTurn = {
          id: nextTurnId(),
          timestamp: nowIso(),
          userPrompt,
          narration,
        };
        setUndo({ turns: [...current.turns, turn] });
      },
      setState: (next, _saveInHistory) => {
        void _saveInHistory;
        setUndo(next);
      },
      lastNarrationSource,
      turns,
      past,
      future,
      undo,
      redo,
      canUndo: canReallyUndo,
      canRedo: canReallyRedo,
    }),
    [
      current,
      lastNarrationSource,
      turns,
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
    <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
  );
}
