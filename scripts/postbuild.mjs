/**
 * postbuild — copy index.html to 404.html so the static host
 * (Render, Netlify, Vercel, GitHub Pages, …) can serve the SPA
 * shell for any unmatched route. The React Router (wouter) then
 * reads window.location.pathname and renders the right page.
 *
 * Also ensures the SW knows about 404.html by rewriting the
 * precache manifest with the new entry.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const BUILD = path.resolve(process.cwd(), "build");

const indexPath = path.join(BUILD, "index.html");
const fallbackPath = path.join(BUILD, "404.html");

const indexHtml = await fs.readFile(indexPath, "utf-8");
await fs.writeFile(fallbackPath, indexHtml);
console.log(`  ${"404.html".padEnd(46)} ${indexHtml.length.toString().padStart(7)} bytes (copy of index.html)`);

// Update the generated sw.js to also precache 404.html so the SW
// can serve it when offline.
const swPath = path.join(BUILD, "sw.js");
let sw = await fs.readFile(swPath, "utf-8");
// Add 404.html to the precache list if not already there.
// Format in generated sw.js: {url:"index.html",revision:"..."}
if (!sw.includes("404.html")) {
	sw = sw.replace(
		/(\{url:"index\.html",revision:"[^"]+"\})/,
		'$1,{url:"404.html",revision:null}',
	);
	await fs.writeFile(swPath, sw);
	console.log("  sw.js: precache updated to include 404.html");
}

console.log("postbuild done.");
