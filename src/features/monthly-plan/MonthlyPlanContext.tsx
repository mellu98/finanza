/**
 * React context for the active `MonthlyPlan`.
 *
 * Mirrors the Guitos `BudgetContext` pattern:
 * - the state lives in a `use-undo` queue so the user can undo/redo
 *   edits to the plan;
 * - the `saveInHistory` flag controls whether a given `setPlan` call
 *   adds an undo entry (matches `BudgetContext.setBudget(value, saveInHistory)`).
 *
 * The provider accepts an optional `repository` prop (dependency
 * injection). When omitted, a `localForageMonthlyPlanRepository` is
 * instantiated as the default so the production wiring in `App.tsx`
 * stays simple. Tests pass a mock repository via the prop.
 *
 * Integration layer (added in PR-fix-save-piano):
 * - On mount, `repository.getActive()` is called once and the returned
 *   plan is hydrated into the undo state.
 * - `save(plan)` persists via `repository.save`, stamps `updatedAt`,
 *   and commits the result into the undo history.
 *
 * The hook (`useMonthlyPlan`) lives in `./useMonthlyPlan.ts` and
 * re-exports from this file to avoid a circular import.
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import useUndo from "use-undo";
import { parseIsoDateTime } from "../daily-coach/isoDate";
import { localForageMonthlyPlanRepository } from "./localForageMonthlyPlanRepository";
import type { MonthlyPlanRepository } from "./MonthlyPlanRepository";
import type { MonthlyPlan } from "./monthlyPlan";

export interface MonthlyPlanContextInterface {
  plan: MonthlyPlan | undefined;
  setPlan: (value: MonthlyPlan | undefined, saveInHistory: boolean) => void;
  /** Persist `plan` via the repository, stamp `updatedAt`, commit in undo history. */
  save: (plan: MonthlyPlan) => Promise<void>;
  /** True while a `save()` is in flight. */
  isSaving: boolean;
  /** Last save error, or null. */
  saveError: Error | null;
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
  save: () => Promise.resolve(),
  isSaving: false,
  saveError: null,
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

export function MonthlyPlanProvider({
  children,
  repository,
}: PropsWithChildren<{ repository?: MonthlyPlanRepository }>) {
  const repo = useMemo<MonthlyPlanRepository>(
    () => repository ?? new localForageMonthlyPlanRepository(),
    [repository],
  );

  const [
    state,
    { set: setUndo, undo, redo, canUndo: undoPossible, canRedo: redoPossible },
  ] = useUndo<MonthlyPlan | undefined>(undefined);

  const { present: plan, past, future } = state;

  const canReallyUndo = undoPossible && past[past.length - 1] !== undefined;
  const canReallyRedo = redoPossible && future[0] !== undefined;

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  // Hydration: load active plan once on mount.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    let cancelled = false;
    repo
      .getActive()
      .then((active) => {
        if (cancelled || !active) return;
        setUndo(active);
      })
      .catch((err) => {
        // Non-fatal: log only, do not toast on boot.
        // eslint-disable-next-line no-console
        console.error("MonthlyPlanProvider: failed to hydrate active plan", err);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, setUndo]);

  // save(): persist + stamp updatedAt + commit to undo history.
  const save = useCallback(
    async (next: MonthlyPlan): Promise<void> => {
      setIsSaving(true);
      setSaveError(null);
      const stamped: MonthlyPlan = {
        ...next,
        updatedAt: parseIsoDateTime(new Date().toISOString()),
      };
      try {
        await repo.save(stamped);
        // Commit post-persistenza: l'undo history riflette solo i save
        // andati a buon fine, non i tentativi falliti.
        setUndo(stamped);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setSaveError(error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [repo, setUndo],
  );

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
      save,
      isSaving,
      saveError,
      past,
      future,
      undo,
      redo,
      canUndo: canReallyUndo,
      canRedo: canReallyRedo,
    }),
    [
      plan,
      past,
      future,
      undo,
      redo,
      canReallyUndo,
      canReallyRedo,
      setUndo,
      save,
      isSaving,
      saveError,
    ],
  );

  return (
    <MonthlyPlanContext.Provider value={value}>
      {children}
    </MonthlyPlanContext.Provider>
  );
}
