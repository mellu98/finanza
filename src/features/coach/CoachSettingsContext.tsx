/**
 * React context for the user's `CoachSettings`.
 *
 * Mirrors the Guitos `BudgetContext` pattern:
 * - the state lives in a `use-undo` queue so the user can undo/redo
 *   changes to their settings;
 * - the `saveInHistory` flag controls whether a given `setSettings`
 *   call adds an undo entry (matches `BudgetContext.setBudget(value, saveInHistory)`).
 *
 * Integration (PR-fix-save-piano):
 * - Il Provider accetta un `repository?` opzionale (default:
 *   `localForageCoachSettingsRepository`).
 * - Al mount, idrata con `repository.getActive()` (o i defaults se
 *   l'utente non ha mai salvato).
 * - Espone `save()` che persiste + stampa `updatedAt`.
 *
 * IMPORTANTE: a differenza di `MonthlyPlanContext`, qui `settings`
 * parte SEMPRE con un valore di default (`CoachSettingsMother.defaults()`)
 * invece di `undefined`. Questo perché `useDailyBudget` ritorna
 * `null` se `settings === undefined`, mostrando "non hai ancora un
 * piano" anche quando il piano c'è. I default settings permettono
 * al motore di calcolare il budget anche senza configurazione esplicita.
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
import { CoachSettingsMother } from "./CoachSettings.mother";
import type { CoachSettings } from "./coachSettings";
import { localForageCoachSettingsRepository } from "./localForageCoachSettingsRepository";
import type { CoachSettingsRepository } from "./CoachSettingsRepository";

export interface CoachSettingsContextInterface {
	settings: CoachSettings | undefined;
	setSettings: (value: CoachSettings, saveInHistory: boolean) => void;
	/** Persist settings via the repository, commit in undo history. */
	save: (next: CoachSettings) => Promise<void>;
	isSaving: boolean;
	saveError: Error | null;
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

export { CoachSettingsContext };

export function CoachSettingsProvider({
	children,
	repository,
}: PropsWithChildren<{ repository?: CoachSettingsRepository }>) {
	const repo = useMemo<CoachSettingsRepository>(
		() => repository ?? new localForageCoachSettingsRepository(),
		[repository],
	);

	// IMPORTANTE: parte con i DEFAULT, non undefined, altrimenti
	// useDailyBudget ritorna null e la dashboard mostra "non hai
	// ancora un piano" anche se il piano c'è.
	const [
		state,
		{ set: setUndo, undo, redo, canUndo: undoPossible, canRedo: redoPossible },
	] = useUndo<CoachSettings | undefined>(CoachSettingsMother.defaults());

	const { present: settings, past, future } = state;

	const canReallyUndo = undoPossible && past[past.length - 1] !== undefined;
	const canReallyRedo = redoPossible && future[0] !== undefined;

	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<Error | null>(null);

	// Hydration: carica settings salvati al mount (se esistono).
	// Se l'utente non ha mai salvato, mantiene i defaults.
	const hydratedRef = useRef(false);
	useEffect(() => {
		if (hydratedRef.current) return;
		hydratedRef.current = true;
		let cancelled = false;
		repo
			.get()
			.then((active) => {
				if (cancelled || !active) return;
				setUndo(active);
			})
			.catch((err) => {
				// Non-fatal: log only, keep defaults.
				// eslint-disable-next-line no-console
				console.error("CoachSettingsProvider: failed to hydrate", err);
			});
		return () => {
			cancelled = true;
		};
	}, [repo, setUndo]);

	const save = useCallback(
		async (next: CoachSettings): Promise<void> => {
			setIsSaving(true);
			setSaveError(null);
			try {
				await repo.save(next);
				setUndo(next);
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

	const value = useMemo<CoachSettingsContextInterface>(
		() => ({
			settings,
			setSettings: (next, _saveInHistory) => {
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
			settings,
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
		<CoachSettingsContext.Provider value={value}>
			{children}
		</CoachSettingsContext.Provider>
	);
}
