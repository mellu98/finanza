import * as React from "react";

import { FooterDisclaimer } from "@/components/FooterDisclaimer";
import { NavBar } from "@/components/NavBar";
import { OnlineIndicator, PWAPrompt } from "@/components/PWAPrompt";
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
		<div className="min-h-screen-safe bg-background text-foreground">
			<NavBar />
			<main
				className={cn(
					"mx-auto w-full max-w-6xl flex-1 page-enter",
					// Mobile
					"px-5 pt-7 pb-24",
					// Tablet piccolo
					"sm:px-7 sm:pt-9",
					// Desktop: container già max-w-6xl, padding generoso
					"md:px-10 md:pt-12 md:pb-12",
					// Safe area iOS
					"pt-safe-top",
				)}
			>
				{children}
			</main>
			<footer className="mt-auto border-t border-border/60 bg-secondary/30 pt-safe-top pb-[calc(theme(spacing.16)+env(safe-area-inset-bottom,0px))] md:pb-0">
				<div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-7 md:px-10">
					<FooterDisclaimer />
				</div>
			</footer>
			<PWAPrompt />
			<OnlineIndicator />
		</div>
	);
}
