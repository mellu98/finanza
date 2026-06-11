import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { sri } from "vite-plugin-sri3";

// biome-ignore lint/style/noDefaultExport: vite config
export default defineConfig((_) => {
	return {
		appType: "spa",
		build: {
			outDir: "build",
			sourcemap: false,
			cssCodeSplit: true,
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes("node_modules")) {
							if (
								id.includes("react") ||
								id.includes("wouter") ||
								id.includes("scheduler")
							) {
								return "react";
							}
							if (id.includes("@radix-ui")) {
								return "radix";
							}
							if (id.includes("lucide-react")) {
								return "icons";
							}
						}
					},
				},
			},
		},
		define: {
			APP_VERSION: JSON.stringify(process.env.npm_package_version),
		},
		resolve: {
			extensions: [".js", ".ts", ".tsx"],
			alias: [
				{ find: "@", replacement: path.resolve(__dirname, "./src") },
				{ find: "@shared", replacement: "/src/shared" },
			],
		},
		plugins: [
			tailwindcss(),
			react(),
			VitePWA({
				// PWA strategy: prompt user when new SW is available, register immediately
				registerType: "prompt",
				// Inject a script that wires updateSW to a custom event the React UI listens to
				injectRegister: "inline",
				// Bundle the manifest, do not fetch it
				manifest: false, // we ship /public/manifest.json verbatim
				// Use the public/manifest.json as-is
				useCredentials: false,
				// Generate the SW in dev too so we can inspect it
				devOptions: {
					enabled: false,
					type: "module",
					navigateFallback: "/index.html",
				},
				// Workbox runtime configuration
				workbox: {
					// When the user is offline, navigation requests that miss the
					// precache fall back to /offline.html (a static page with the
					// same warm-theme offline UX, no JS needed). All navigations
					// that hit the precache resolve to the precached /index.html.
					navigateFallback: "/offline.html",
					navigateFallbackDenylist: [
						/^\/api\//,
						/^\/sw\.js$/,
						/\.json$/,
						/^\/offline\.html$/,
					],
					// Precache everything we generate
					globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
					cleanupOutdatedCaches: true,
					// Aggressive caching of the app shell
					runtimeCaching: [
						{
							urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
							handler: "CacheFirst",
							options: {
								cacheName: "images-cache",
								expiration: {
									maxEntries: 100,
									maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
								},
							},
						},
						{
							urlPattern: /\.(?:woff2?|ttf|otf|eot)$/i,
							handler: "CacheFirst",
							options: {
								cacheName: "fonts-cache",
								expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
							},
						},
						{
							urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
							handler: "StaleWhileRevalidate",
							options: { cacheName: "google-fonts-stylesheets" },
						},
						{
							urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
							handler: "CacheFirst",
							options: {
								cacheName: "google-fonts-webfonts",
								expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
							},
						},
						{
							urlPattern: /\/api\/.*$/i,
							handler: "NetworkFirst",
							options: {
								cacheName: "api-cache",
								networkTimeoutSeconds: 10,
								expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
							},
						},
					],
					navigateFallbackAllowlist: [/^(?!\/__).*/],
				},
			}),
			sri(),
		],
		test: {
			clearMocks: true,
			coverage: {
				provider: "v8",
				include: ["src/**"],
				exclude: ["**/*.mother.ts", "**/*.test.ts", "**/*.test.tsx"],
			},
			pool: "vmThreads",
			globals: true,
			mockClear: true,
			environment: "happy-dom",
			setupFiles: ["./src/setupTests.ts", "console-fail-test/setup"],
			include: [
				"src/**/*.{test,spec}.?(c|m)[jt]s?(x)",
				"src/*.{test,spec}.?(c|m)[jt]s?(x)",
			],
		},
	};
});
