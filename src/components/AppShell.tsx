import * as React from "react";

import { FooterDisclaimer } from "@/components/FooterDisclaimer";
import { NavBar } from "@/components/NavBar";
import { OnlineIndicator, PWAPrompt } from "@/components/PWAPrompt";
import { cn } from "@/lib/utils";

/**
 * AppShell — the page frame.
 *
 * Mobile-first: a sticky top bar (brand + theme toggle + drawer) that
 * sits below the iOS status bar (env(safe-area-inset-top)), the routed
 * page content, and a sticky bottom tab bar with the four most-used
 * destinations (above the iOS home indicator). Footer disclaimer at the
 * bottom.
 *
 * - Uses `100dvh` so iOS keyboard resizes the app shell correctly.
 * - Uses `pt-safe-top` / `pb-safe-bottom` so nothing hides under the
 *   notch / home indicator on notched iPhones.
 * - Uses `page-enter` for soft route transitions.
 * - Mounts the PWA install/update toasts and the offline indicator.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen-safe bg-background text-foreground">
			<NavBar />
			<main
				className={cn(
					"container flex-1 page-enter",
					// Bottom padding accounts for the bottom tab bar (h-16) + home indicator
					"pb-24 md:pb-12",
					// Top padding accounts for the iOS status bar when launched as PWA
					"pt-safe-top",
				)}
			>
				{children}
			</main>
			<footer className="mt-auto border-t border-border/60 bg-secondary/30 pb-24 pt-safe-top md:pb-0">
				<div className="container py-6">
					<FooterDisclaimer />
				</div>
			</footer>
			<PWAPrompt />
			<OnlineIndicator />
		</div>
	);
}
