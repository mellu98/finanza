import { Heart } from "lucide-react";

/**
 * Footer disclaimer. Mandatory per spec module 16:
 * the app is NOT professional financial advice.
 */
export function FooterDisclaimer() {
	return (
		<div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:justify-center">
			<p>
				Daily Financial Coach non fornisce consulenza finanziaria
				professionale. È uno strumento di auto-gestione, open-source e
				local-first.
			</p>
			<span className="hidden sm:inline" aria-hidden>
				·
			</span>
			<p className="inline-flex items-center gap-1">
				Fatto con <Heart className="size-3 text-rose-500" aria-hidden /> per chi
				vuole arrivare a fine mese senza ansia.
			</p>
		</div>
	);
}
