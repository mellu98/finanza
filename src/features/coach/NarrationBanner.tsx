/**
 * `NarrationBanner` — the yellow "Ollama not reachable" banner shown
 * above the coach narration when the orchestrator fell back to the
 * deterministic narrator.
 *
 * WCAG 1.4.1: the banner uses BOTH a yellow background (the project's
 * `bg-coach-yellow` token) AND a written message ("Ollama not reachable
 * — using built-in rules"). The icon is purely decorative.
 *
 * Props:
 *   - `source` — the narration source from `CoachContext`:
 *     - `"deterministic"` → banner is visible
 *     - `"ollama"`        → banner is hidden
 *     - `undefined`       → banner is hidden (no narration yet)
 */
import type { NarrationSource } from "../daily-coach/ai-coach";

export interface NarrationBannerProps {
	source: NarrationSource | undefined;
}

export function NarrationBanner({ source }: NarrationBannerProps) {
	if (source !== "deterministic") return null;
	return (
		<div
			data-testid="narration-fallback-banner"
			role="status"
			aria-label="Ollama unreachable, using built-in rules"
			className="mb-3 flex items-start gap-2 rounded-2xl border border-coach-yellow-fg/20 bg-coach-yellow px-4 py-3 text-sm text-coach-yellow-fg"
		>
			<span aria-hidden={true} className="font-semibold">
				⚠
			</span>
			<span>
				Ollama non raggiungibile — uso le regole integrate.
			</span>
		</div>
	);
}
