import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import * as React from "react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";

/**
 * Offline fallback page.
 *
 * Served by the service worker (workbox navigateFallback → /index.html)
 * and rendered when the user navigates to a route while offline AND the
 * page is not in the precache.
 *
 * The brand promise: even offline, your data is safe because everything
 * is stored locally (localforage → IndexedDB). When you come back
 * online, the app rehydrates from the cache.
 */
export function OfflinePage() {
	const [retrying, setRetrying] = React.useState(false);
	const [online, setOnline] = React.useState(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);

	React.useEffect(() => {
		const on = () => setOnline(true);
		const off = () => setOnline(false);
		window.addEventListener("online", on);
		window.addEventListener("offline", off);
		return () => {
			window.removeEventListener("online", on);
			window.removeEventListener("offline", off);
		};
	}, []);

	const handleRetry = async () => {
		setRetrying(true);
		// Give the network a moment to come back
		await new Promise((r) => setTimeout(r, 600));
		if (navigator.onLine) {
			window.location.reload();
		} else {
			setRetrying(false);
		}
	};

	return (
		<div className="flex min-h-screen-safe flex-col items-center justify-center px-6 py-12 text-center">
			<div className="relative mb-8">
				<div
					aria-hidden
					className="absolute inset-0 -z-10 animate-pulse rounded-full bg-coach-yellow/40 blur-2xl"
				/>
				<div className="grid size-24 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-glow">
					<CloudOff className="size-12 text-white" />
				</div>
			</div>

			<h1 className="mb-2 font-display text-3xl font-bold tracking-tight">
				Sei offline
			</h1>
			<p className="mb-1 text-base text-muted-foreground">
				Niente connessione, ma i tuoi dati sono al sicuro sul dispositivo.
			</p>
			<p className="mb-8 text-sm text-muted-foreground/80">
				Riapri l'app quando torni online — tutto si sincronizzerà
				automaticamente.
			</p>

			<div className="flex w-full max-w-sm flex-col gap-3">
				<Button
					size="lg"
					onClick={handleRetry}
					disabled={retrying}
					className="w-full"
				>
					{retrying ? (
						<>
							<RefreshCw className="size-4 animate-spin" />
							Riprovo…
						</>
					) : (
						<>
							<RefreshCw className="size-4" />
							Riprova
						</>
					)}
				</Button>

				<Button
					asChild
					variant="outline"
					size="lg"
					className="w-full bg-transparent"
				>
					<Link href="/dashboard">
						<Wifi className="size-4" />
						Vai alla Dashboard
					</Link>
				</Button>
			</div>

			<div className="mt-10 grid w-full max-w-md gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 text-left text-sm">
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground">Stato rete</span>
					<span
						className={
							online
								? "font-semibold text-coach-green-fg"
								: "font-semibold text-coach-red-fg"
						}
					>
						{online ? "Connesso" : "Disconnesso"}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground">Dati locali</span>
					<span className="font-semibold text-coach-green-fg">Sincronizzati</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground">Cache app</span>
					<span className="font-semibold text-coach-green-fg">Disponibile</span>
				</div>
			</div>

			<p className="mt-8 text-xs text-muted-foreground/60">
				Daily Coach è local-first: nessun dato lascia il tuo dispositivo.
			</p>
		</div>
	);
}
