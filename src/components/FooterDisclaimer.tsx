import { Heart } from "lucide-react";

/**
 * Footer disclaimer. Obbligatorio per spec module 16:
 * l'app NON fornisce consulenza finanziaria professionale.
 *
 * Versione desktop (full): due paragrafi su desktop/tablet.
 * Versione mobile (compact): una sola riga, visibile sopra la tab bar.
 */
export function FooterDisclaimer() {
	return (
		<div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:justify-center sm:gap-3">
			<p>
				Coach Quotidiano non fornisce consulenza finanziaria professionale.
				È uno strumento di auto-gestione, open-source e local-first.
			</p>
			<span className="hidden sm:inline" aria-hidden>
				·
			</span>
			<p className="inline-flex items-center gap-1">
				Fatto con <Heart className="size-3 text-rose-500" aria-hidden /> per
				chi vuole arrivare a fine mese senza ansia.
			</p>
		</div>
	);
}

/**
 * Versione compatta del disclaimer (1 sola riga), pensata per mobile
 * dove il footer completo verrebbe coperto dalla bottom tab bar.
 * Da posizionare appena sopra la tab bar.
 */
export function MobileFooterNote() {
	return (
		<p className="text-center text-[10px] text-muted-foreground/70">
			Coach Quotidiano non fornisce consulenza finanziaria · Open-source,
			local-first · Fatto con <Heart className="inline size-2.5 text-rose-500" aria-hidden />
		</p>
	);
}
