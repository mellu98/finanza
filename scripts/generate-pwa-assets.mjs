/**
 * Generate all PWA assets from favicon.svg:
 *  - icon-192.png, icon-512.png, icon-maskable-512.png
 *  - apple-touch-icon.png (180x180)
 *  - apple-touch-startup-image-* (iPhone splash screens)
 *
 * Run: node scripts/generate-pwa-assets.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const ROOT = path.resolve(process.cwd(), "public");
const SVG_RAW = await fs.readFile(path.join(ROOT, "favicon.svg"), "utf-8");

// Strip outer <svg> tag so we can nest the inner content into another SVG.
const inner = SVG_RAW
	.replace(/^[\s\S]*?<svg[^>]*>/, "")
	.replace(/<\/svg>\s*$/, "");

function render(svgString, size) {
	const resvg = new Resvg(svgString, {
		fitTo: { mode: "width", value: size },
		font: { loadSystemFonts: true },
	});
	return resvg.render().asPng();
}

async function write(name, data) {
	const out = path.join(ROOT, name);
	await fs.writeFile(out, data);
	console.log(`  ${name.padEnd(46)} ${data.length.toString().padStart(7)} bytes`);
}

console.log("Generating PWA assets...");

// Standard PWA icons
await write("icon-192.png", render(SVG_RAW, 192));
await write("icon-512.png", render(SVG_RAW, 512));

// Maskable icon: 80px padding on all sides (icon must fit inside inner 60%)
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 672 672">
  <rect width="672" height="672" fill="#6d28d9"/>
  <g transform="translate(80 80)">${inner}</g>
</svg>`;
await write("icon-maskable-512.png", render(maskable, 512));

// Apple touch icon (180x180) — uses purple brand background
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#8b5cf6"/>
  <g transform="translate(14 14) scale(0.296875)">${inner}</g>
</svg>`;
await write("apple-touch-icon.png", render(apple, 180));
await write("apple-touch-icon-precomposed.png", render(apple, 180));

// Apple touch startup images (splash screens)
function splash(w, h) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#faf8f4"/>
      <stop offset="100%" stop-color="#f3efe7"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g transform="translate(${w / 2 - 180} ${h / 2 - 400}) scale(0.703)">${inner}</g>
  <text x="${w / 2}" y="${h / 2 + 220}" text-anchor="middle"
        font-family="-apple-system,ui-sans-serif,system-ui,Inter,sans-serif"
        font-size="64" font-weight="700" fill="#1c1917" letter-spacing="-1.5">Daily Coach</text>
  <text x="${w / 2}" y="${h / 2 + 280}" text-anchor="middle"
        font-family="-apple-system,ui-sans-serif,system-ui,Inter,sans-serif"
        font-size="28" font-weight="500" fill="#78716c">Quanto posso spendere oggi?</text>
</svg>`;
}

// Portrait splash screens for iPhone (most common)
await write("apple-touch-startup-image-1170x2532.png", render(splash(1170, 2532), 1170));
await write("apple-touch-startup-image-1284x2778.png", render(splash(1284, 2778), 1284));
await write("apple-touch-startup-image-1179x2556.png", render(splash(1179, 2556), 1179));
await write("apple-touch-startup-image-1290x2796.png", render(splash(1290, 2796), 1290));
await write("apple-touch-startup-image-1536x2048.png", render(splash(1536, 2048), 1536));

console.log("Done!");
