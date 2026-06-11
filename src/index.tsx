import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

// Build-time version stamp (defined in vite.config.ts as APP_VERSION).
// Embed this in the SW registration URL as a cache-buster: any
// change in version forces the browser to fetch a new SW immediately.
const APP_VERSION = (import.meta.env.APP_VERSION as string | undefined) ??
	"dev";

// Register the service worker. We DO auto-activate new SW versions
// (vite-plugin-pwa configured with skipWaiting + clientsClaim) so users
// always run the latest code. A "Ricarica" toast is also offered in
// case the user wants to reload manually to apply changes.
const updateSW = registerSW(`/sw.js?v=${APP_VERSION}`, {
	onNeedRefresh() {
		window.dispatchEvent(new CustomEvent("pwa:update-available"));
		// Skip the prompt and activate immediately so the new SW takes
		// over on the next navigation. This is essential on iOS PWA
		// where users often don't see browser-driven update prompts.
		void updateSW(true);
	},
	onOfflineReady() {
		window.dispatchEvent(new CustomEvent("pwa:offline-ready"));
	},
	onRegisteredSW(_swUrl, registration) {
		// Expose updateSW so a user-initiated "Reload" button can call it
		(window as unknown as { __pwaUpdate?: () => Promise<void> }).__pwaUpdate =
			updateSW;

		// Periodically (every 60min) check for SW updates so the user
		// doesn't need to manually close & reopen the PWA.
		if (registration) {
			setInterval(
				() => {
					registration.update().catch(() => {
						// network error during update check — non-fatal
					});
				},
				60 * 60 * 1000,
			);
		}

		// Once the new SW is activated, force-reload the page so all
		// cached JS/CSS modules are re-fetched against the new SW.
		// Without this, iOS PWA sometimes keeps serving the OLD bundle
		// from the old SW's precache, even after the new SW claims
		// the page. The check `controller` filters out the very first
		// install (where there is no previous controller).
		navigator.serviceWorker.addEventListener("controllerchange", () => {
			// controllerchange fires also on first install; guard
			// against an infinite reload loop by checking if there's
			// a previous controller.
			if (window.__pwaReloaded) return;
			window.__pwaReloaded = true;
			window.location.reload();
		});
	},
});

declare global {
	interface Window {
		__pwaReloaded?: boolean;
	}
}

// Capture the beforeinstallprompt event so the React UI can show a custom
// "Install" prompt. We never show the browser's default banner.
window.addEventListener("beforeinstallprompt", (e) => {
	e.preventDefault();
	window.dispatchEvent(new CustomEvent("pwa:install-available", { detail: e }));
});

window.addEventListener("appinstalled", () => {
	window.dispatchEvent(new CustomEvent("pwa:installed"));
});

const rootElement = document.getElementById("root");
if (rootElement) {
	// Clear the pre-hydration splash element so React owns the DOM from here on
	rootElement.innerHTML = "";
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
}
