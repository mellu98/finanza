/**
 * PWAPrompt — listens for the custom `pwa:*` events dispatched by
 * `src/index.tsx` and shows toasts for:
 *
 *  - `pwa:install-available` — the user can install the app
 *  - `pwa:installed`         — the user has just installed
 *  - `pwa:update-available`  — a new service worker is ready
 *  - `pwa:offline-ready`     — assets cached, offline-ready
 *
 * The install prompt keeps a `deferredPrompt` ref until the user
 * accepts, then calls `prompt()` and clears the ref. We never use the
 * browser's default banner.
 */
import { RefreshCw, WifiOff, Download, CheckCircle2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY_DISMISSED = "pwa_install_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAPrompt() {
	React.useEffect(() => {
		const onInstall = (e: Event) => {
			const detail = (e as CustomEvent<BeforeInstallPromptEvent>).detail;
			// Don't show if user recently dismissed
			const lastDismissed = Number(
				localStorage.getItem(STORAGE_KEY_DISMISSED) ?? 0,
			);
			if (Date.now() - lastDismissed < DISMISS_TTL_MS) return;

			const isStandalone =
				window.matchMedia("(display-mode: standalone)").matches ||
				("standalone" in window.navigator &&
					(window.navigator as { standalone?: boolean }).standalone === true);
			if (isStandalone) return;

			const id = toast(
				<div className="flex items-start gap-3">
					<Download className="mt-0.5 size-5 shrink-0 text-accent" />
					<div className="flex-1">
						<div className="font-semibold">Installa Coach Quotidiano</div>
						<div className="text-xs text-muted-foreground">
							Aggiungi l'app alla Home per accesso rapido e uso offline.
						</div>
					</div>
				</div>,
				{
					duration: 12000,
					position: "top-center",
					action: {
						label: "Installa",
						onClick: () => {
							detail.prompt();
							detail.userChoice.finally(() => {
								toast.dismiss(id);
							});
						},
					},
					cancel: {
						label: "Non ora",
						onClick: () => {
							localStorage.setItem(
								STORAGE_KEY_DISMISSED,
								String(Date.now()),
							);
							toast.dismiss(id);
						},
					},
				},
			);
		};

		const onInstalled = () => {
			toast.success("Coach Quotidiano è installato. Buon coaching! 🎉", {
				duration: 4000,
			});
		};

		const onUpdate = () => {
			const id = toast(
				<div className="flex items-start gap-3">
					<RefreshCw className="mt-0.5 size-5 shrink-0 text-accent" />
					<div className="flex-1">
						<div className="font-semibold">Nuova versione disponibile</div>
						<div className="text-xs text-muted-foreground">
							Ricarica per usare l'ultima release.
						</div>
					</div>
				</div>,
				{
					duration: Infinity,
					action: {
						label: "Ricarica",
						onClick: () => {
							const update = (
								window as unknown as { __pwaUpdate?: () => Promise<void> }
							).__pwaUpdate;
							if (update) {
								update().catch(() => {
									window.location.reload();
								});
							} else {
								window.location.reload();
							}
							toast.dismiss(id);
						},
					},
				},
			);
		};

		const onOfflineReady = () => {
			toast.success(
				<div className="flex items-start gap-3">
					<CheckCircle2 className="mt-0.5 size-5 shrink-0 text-coach-green-fg" />
					<div className="flex-1">
						<div className="font-semibold">Pronto per l'uso offline</div>
						<div className="text-xs text-muted-foreground">
							I tuoi dati sono salvati sul dispositivo.
						</div>
					</div>
				</div>,
				{ duration: 3500 },
			);
		};

		window.addEventListener("pwa:install-available", onInstall);
		window.addEventListener("pwa:installed", onInstalled);
		window.addEventListener("pwa:update-available", onUpdate);
		window.addEventListener("pwa:offline-ready", onOfflineReady);

		return () => {
			window.removeEventListener("pwa:install-available", onInstall);
			window.removeEventListener("pwa:installed", onInstalled);
			window.removeEventListener("pwa:update-available", onUpdate);
			window.removeEventListener("pwa:offline-ready", onOfflineReady);
		};
	}, []);

	return null;
}

/**
 * OnlineIndicator — piccolo banner che mostra lo stato della connessione.
 *
 * iOS PWA ha un bug noto: `navigator.onLine` ritorna `false` anche
 * quando la rete c'è, specialmente in modalità standalone dopo
 * che il SW intercetta le navigation. Per questo NON ci fidiamo
 * di `navigator.onLine`:
 *
 * 1. Mostriamo l'indicatore SOLO dopo che il browser emette un
 *    evento `offline` reale OPPURE se un ping fetch fallisce
 * 2. Lo nascondiamo SOLO dopo un ping fetch riuscito
 * 3. Al mount: NON mostriamo l'indicatore. Dopo 2s eseguiamo un
 *    ping "invisibile" che, se passa, non fa nulla; se fallisce,
 *    mostra l'indicatore. Poi un polling ogni 30s per recuperare
 *    automaticamente quando la rete torna.
 */
export function OnlineIndicator() {
	const [showOffline, setShowOffline] = React.useState(false);

	const verifyOnline = React.useCallback(async () => {
		try {
			// cache: 'no-store' per non leggere la cache del SW
			// favicon.svg esiste sempre, è piccolo, e ci dice se il
			// server risponde davvero
			const res = await fetch("/favicon.svg?probe=" + Date.now(), {
				cache: "no-store",
				method: "HEAD",
			});
			if (res.ok) {
				setShowOffline(false);
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}, []);

	React.useEffect(() => {
		const onOnline = () => {
			void verifyOnline();
		};
		const onOffline = () => {
			setShowOffline(true);
		};

		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);

		// Ping iniziale ritardato (2s): dà tempo al browser/iOS di
		// inizializzare lo stato di rete. Se la rete c'è, non vediamo
		// mai l'indicatore. Se manca, lo mostriamo.
		const initialProbe = window.setTimeout(() => {
			void (async () => {
				const ok = await verifyOnline();
				if (!ok) setShowOffline(true);
			})();
		}, 2000);

		// Polling ogni 30s: se la rete torna, l'indicatore sparisce
		// senza dover ricaricare la pagina.
		const poll = window.setInterval(() => {
			void verifyOnline();
		}, 30_000);

		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
			window.clearTimeout(initialProbe);
			window.clearInterval(poll);
		};
	}, [verifyOnline]);

	if (!showOffline) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-top-4"
		>
			<div className="pointer-events-auto flex items-center gap-2 rounded-full border border-coach-yellow-fg/30 bg-coach-yellow px-4 py-1.5 text-coach-yellow-fg shadow-card">
				<WifiOff className="size-3.5" />
				<span className="text-xs font-medium">
					Offline — i tuoi dati sono al sicuro
				</span>
			</div>
		</div>
	);
}

/** Hook to expose a manual update trigger (used by debug menus etc.) */
export function usePWAUpdate() {
	return React.useCallback(() => {
		const update = (window as unknown as { __pwaUpdate?: () => Promise<void> })
			.__pwaUpdate;
		if (update) return update();
		window.location.reload();
		return Promise.resolve();
	}, []);
}
