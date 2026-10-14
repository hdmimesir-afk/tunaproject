/**
 * Generates the vector-style background art used on the cover and closing slides.
 * Original artwork (contour waves + a stylised tuna outline). No stock or AI imagery is used,
 * so nothing misrepresents the client's real facility or operations.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { launch } from "./browser";

function waves(seed: number, y0: number, count: number, amp: number, op: [number, number]) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const base = y0 + i * 26;
    const a = amp * (0.5 + 0.9 * Math.sin(seed + i * 0.35) ** 2);
    const ph = seed + i * 0.42;
    const pts: string[] = [];
    for (let x = -40; x <= 1960; x += 40) {
      const y = base + a * Math.sin(x / 210 + ph) + a * 0.45 * Math.sin(x / 90 + ph * 1.7);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    const o = op[0] + (op[1] - op[0]) * t;
    out += `<polyline points="${pts.join(" ")}" fill="none" stroke="#3FB4AE" stroke-width="${(1.2 + t * 1.4).toFixed(2)}" opacity="${o.toFixed(3)}"/>`;
  }
  return out;
}

const tuna = (x: number, y: number, s: number, rot: number, op: number) => `
<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="none" stroke="#8FD6D1" stroke-width="${(2.2 / s).toFixed(2)}" opacity="${op}" stroke-linejoin="round" stroke-linecap="round">
  <path d="M0 70 C50 28 140 8 262 12 C342 14 420 40 482 62 L548 18 C540 50 540 90 548 122 L482 80 C420 104 342 128 262 130 C140 134 50 112 0 70 Z"/>
  <path d="M196 14 C206 -22 238 -34 276 -18 C262 -4 262 6 270 14"/>
  <path d="M190 128 C196 156 214 170 236 172 C230 158 232 146 240 130"/>
  <path d="M330 18 L346 4 M352 22 L368 8 M374 27 L390 13"/>
  <path d="M60 66 C120 52 240 52 330 70 C400 84 440 78 482 71" opacity=".7"/>
  <path d="M70 84 C140 94 250 100 340 90 C400 83 440 78 482 71" opacity=".5"/>
  <circle cx="84" cy="62" r="7"/>
</g>`;

const cover = `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000"/><stop offset=".42" stop-color="#000"/><stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#fff"/>
    </linearGradient>
    <mask id="m"><rect width="1920" height="1080" fill="url(#fade)"/></mask>
  </defs>
  <rect width="1920" height="1080" fill="#10283F"/>
  <g mask="url(#m)">${waves(0.6, 120, 30, 46, [0.10, 0.5])}</g>
  <rect x="0" y="0" width="1920" height="1080" fill="none"/>
</svg>`;

const closing = `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000"/><stop offset=".35" stop-color="#000"/><stop offset=".85" stop-color="#fff"/><stop offset="1" stop-color="#fff"/>
    </linearGradient>
    <mask id="m"><rect width="1920" height="1080" fill="url(#fade)"/></mask>
  </defs>
  <rect width="1920" height="1080" fill="#10283F"/>
  <g mask="url(#m)">${waves(2.1, 520, 24, 40, [0.12, 0.55])}</g>
</svg>`;

async function main() {
  mkdirSync("public/art", { recursive: true });
  writeFileSync("public/art/cover.svg", cover);
  writeFileSync("public/art/closing.svg", closing);
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const name of ["cover", "closing"]) {
    await page.setContent(`<html><body style="margin:0">${name === "cover" ? cover : closing}</body></html>`);
    await page.screenshot({ path: `public/art/${name}.png`, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }
  await browser.close();
  console.log("art generated");
}
main();
