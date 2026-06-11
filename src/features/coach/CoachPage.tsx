/**
 * `CoachPage` — the `/coach` page.
 *
 * Renders the 8 `QuickQuestions` chips. When the user picks one, the
 * page:
 *   1. Composes the engine payload via `useDailyBudget` (which runs
 *      the deterministic engines).
 *   2. Calls `narrate(decision, settings, port, signal)` (the
 *      orchestrator from `ai-coach.ts`). `narrate` falls back to the
 *      deterministic narrator whenever Ollama is unreachable, the
 *      model is missing, or `settings.aiEnabled` is `false`.
 *   3. Adds the resulting turn to the `CoachContext` via `useCoach`
 *      so the chat history is persisted (per the spec's 20-turn cap).
 *   4. Renders the narration text.
 *
 * The yellow "Ollama not reachable" banner is rendered via
 * `NarrationBanner` (T6.9 part 2) when
 * `useCoach().lastNarrationSource === "deterministic"`.
 *
 * The page is a pure consumer — the engine + orchestrator live in
 * `src/features/daily-coach/*` and the Ollama HTTP client in
 * `src/features/daily-coach/infrastructure/ollamaService.ts`. Wiring
 * up a real `OllamaPort` here means constructing one from
 * `useCoachSettings().settings` on demand; the port is cheap to
 * build so we do it per-question.
 */
import { useState } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { narrate } from "../daily-coach/ai-coach";
import { createOllamaService } from "../daily-coach/infrastructure/ollamaService";
import { todayIso } from "../daily-coach/isoDate";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { NarrationBanner } from "./NarrationBanner";
import { QUICK_QUESTIONS, type QuickQuestion } from "./QuickQuestions";
import { useCoach } from "./useCoach";
import { useCoachSettings } from "./useCoachSettings";

export function CoachPage() {
	const result = useDailyBudget(todayIso());
	const { settings } = useCoachSettings();
	const { addTurn, lastNarrationSource, turns } = useCoach();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const lastTurn = turns[turns.length - 1];

	const handleAsk = async (q: QuickQuestion) => {
		if (!result || !settings) return;
		setPending(true);
		setError(null);
		try {
			const port = createOllamaService({
				baseUrl: settings.ollamaBaseUrl,
				model: settings.modelName,
			});
			const controller = new AbortController();
			// The orchestrator builds the prompt from the system prompt +
			// JSON payload internally; the chip's userPrompt is the
			// user-facing label, not part of the wire prompt.
			const narration = await narrate(
				result.decision,
				settings,
				port,
				controller.signal,
			);
			addTurn({ userPrompt: q.label, narration }, true);
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "Unknown error while narrating.",
			);
		} finally {
			setPending(false);
		}
	};

	return (
		<div
			className="space-y-4 py-3"
			data-testid="coach-page"
			role="region"
			aria-label="Coach"
		>
			<h1
				className="font-display text-2xl font-semibold"
				data-testid="coach-page-title"
			>
				Coach
			</h1>
			<NarrationBanner source={lastNarrationSource} />
			{error && (
				<div
					data-testid="coach-error-alert"
					role="alert"
					className="rounded-2xl border border-coach-red-fg/30 bg-coach-red px-4 py-3 text-sm text-coach-red-fg"
				>
					{error}
				</div>
			)}
			{!result && (
				<div
					data-testid="coach-no-plan"
					role="status"
					className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground"
				>
					Set up a monthly plan first to get a coach narration.
				</div>
			)}
			<Card data-testid="coach-chips-card">
				<CardHeader>
					<CardTitle className="font-display text-lg font-semibold">
						Quick questions
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						className="flex flex-wrap gap-2"
						data-testid="coach-chips-container"
					>
						{QUICK_QUESTIONS.map((q) => (
							<Button
								key={q.id}
								variant="outline"
								size="sm"
								disabled={pending || !result || !settings}
								onClick={() => handleAsk(q)}
								data-testid={`coach-chip-${q.id}`}
								aria-label={q.label}
							>
								{q.label}
							</Button>
						))}
					</div>
				</CardContent>
			</Card>
			{pending && (
				<div
					data-testid="coach-pending-alert"
					role="status"
					className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground"
				>
					Talking to Ollama…
				</div>
			)}
			{lastTurn && (
				<Card data-testid="coach-narration-card">
					<CardHeader>
						<CardTitle className="font-display text-lg font-semibold">
							{lastTurn.userPrompt}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p
							className="mb-0"
							data-testid="coach-narration-text"
							data-source={lastTurn.narration.source}
						>
							{lastTurn.narration.text}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
