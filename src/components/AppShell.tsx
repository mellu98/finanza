import * as React from "react";

import { FooterDisclaimer } from "@/components/FooterDisclaimer";
import { NavBar } from "@/components/NavBar";
import { PWAPrompt } from "@/components/PWAPrompt";
import { cn } from "@/lib/utils";

/**
 * AppShell — la cornice della pagina.
 *
 * Padding responsive generoso su TUTTI i viewport (è una PWA, usata
 * soprattutto su mobile, ma anche desktop deve respirare):
 * - Mobile:   px-5 (20px), top 7, bottom 24 (per la bottom tab bar)
 * - Tablet:   px-7 (28px), top 9
 * - Desktop:  container centrato max-w-6xl, px-10 (40px), top 12
 *
 * Safe area iOS: pt-safe-top + pb-safe-bottom per il notch/home indicator.
 * Animazione `page-enter` per transizioni soft tra rotte.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		// flex flex-col obbligatorio: serve a "main flex-1" per espandersi
		// e a "footer mt-auto" per spingere il footer in fondo. Senza
		// flex-col, in pagine corte (dashboard, goals vuota) la bottom
		// tab bar fixed "saliva" perché lo sfondo del wrapper era
		// visibile sopra di essa.
		<div className="flex min-h-screen-safe flex-col bg-background text-foreground">
			<NavBar />
			<main
				className={cn(
					"mx-auto w-full max-w-6xl flex-1 page-enter",
					// Mobile: pb-20 (80px) per la bottom tab bar fixed.
					// pb-24 era troppo e creava spazio vuoto in pagine
					// corte. La tab bar è alta ~64px + safe-area bottom
					// (~20-34px su iPhone con home indicator) = ~88px max.
					// 80px è il giusto compromesso per non lasciare buchi.
					"px-5 pt-7 pb-20",
					// Tablet piccolo
					"sm:px-7 sm:pt-9",
					// Desktop: padding-top più generoso per compensare
					// l'altezza di header (56px) + nav orizzontale (56px)
					// = 112px totali sopra il contenuto.
					"md:px-10 md:pt-28 md:pb-12",
					"lg:pt-32",
					// Safe area iOS
					"pt-safe-top",
				)}
			>
				{children}
			</main>
			{/* Footer disclaimer: only on desktop/tablet — on mobile the bottom
			    tab bar is the canonical navigation and there is no room for
			    the disclaimer without the tab bar covering it. */}
			<footer className="mt-auto hidden border-t border-border/60 bg-secondary/30 pt-safe-top md:block md:pb-0">
				<div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-7 md:px-10">
					<FooterDisclaimer />
				</div>
			</footer>
			<PWAPrompt />
		</div>
	);
}
