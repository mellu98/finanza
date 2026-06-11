import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

// Register the service worker. We do NOT auto-update on new versions
// because the user may be in the middle of something (entering a transaction).
// Instead, dispatch a custom event the UI listens to and offers a "Reload" toast.
const updateSW = registerSW({
	onNeedRefresh() {
		window.dispatchEvent(new CustomEvent("pwa:update-available"));
	},
	onOfflineReady() {
		window.dispatchEvent(new CustomEvent("pwa:offline-ready"));
	},
	onRegisteredSW(_swUrl, _registration) {
		// Expose updateSW so a user-initiated "Reload" button can call it
		(window as unknown as { __pwaUpdate?: () => Promise<void> }).__pwaUpdate =
			updateSW;
	},
});

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
