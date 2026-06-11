/**
 * Daily Coach — static file server with SPA fallback.
 *
 * Serves the Vite build output as static assets, with a
 * single-page-application rewrite: any GET that doesn't match
 * a real file or the SW/manifest paths falls back to
 * /index.html so wouter can take over routing on the client.
 *
 * The service worker is served with `Service-Worker-Allowed: /`
 * so it can intercept every navigation request, including
 * navigations to top-level pages like /dashboard.
 */
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUILD = path.join(__dirname, "build");
const PORT = Number(process.env.PORT ?? 10000);

const app = express();
app.disable("x-powered-by");

// Long-cache hashed assets
app.use(
	"/assets",
	express.static(path.join(BUILD, "assets"), {
		maxAge: "365d",
		immutable: true,
	}),
);

// Static assets with light cache (icons, splash, manifest, SW)
app.use(
	express.static(BUILD, {
		maxAge: "1h",
		etag: true,
		lastModified: true,
		setHeaders(res, filePath) {
			if (filePath.endsWith("sw.js") || /workbox-.*\.js$/.test(filePath)) {
				// SW must NEVER be cached aggressively — the browser
				// diffs bytes to detect updates.
				res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
			}
			if (filePath.endsWith("manifest.json")) {
				res.setHeader("Content-Type", "application/manifest+json");
				res.setHeader("Cache-Control", "public, max-age=3600");
			}
			if (/^apple-touch-(icon|startup)/.test(path.basename(filePath))) {
				res.setHeader("Cache-Control", "public, max-age=604800, must-revalidate");
			}
		},
	}),
);

// Service worker scope: allow the SW at /sw.js to claim the entire origin.
app.get("/sw.js", (_req, res, next) => {
	res.setHeader("Service-Worker-Allowed", "/");
	next();
});

// Security headers on every response
app.use((_req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
	res.setHeader(
		"Permissions-Policy",
		"accelerometer=(), autoplay=(self), camera=(), display-capture=(self), fullscreen=(self), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), picture-in-picture=(self), sync-xhr=(), usb=()",
	);
	res.setHeader(
		"Strict-Transport-Security",
		"max-age=31536000; includeSubDomains; preload",
	);
	next();
});

// SPA fallback: serve /index.html for any non-asset GET that didn't
// hit a real file. The wouter router will then handle the route.
app.get(/^\/(?!sw\.js$|workbox-).*/, (_req, res, next) => {
	res.sendFile(path.join(BUILD, "index.html"), (err) => {
		if (err) next(err);
	});
});

// 404 for assets that don't exist (better DX than HTML in the network tab)
app.use((req, res) => {
	res.status(404).type("text/plain").send(`Not found: ${req.path}`);
});

app.listen(PORT, "0.0.0.0", () => {
	console.log(`Daily Coach listening on :${PORT}`);
});
