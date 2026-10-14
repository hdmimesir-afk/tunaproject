/**
 * Generates original hero artwork for the dark / lime deck style: contour waves, a tuna outline and soft glows.
 * No stock photos or AI imagery, so nothing misrepresents the client's real operations.
 * Output: public/art/hero.png (1800x800, rounded) and public/art/panel.png (800x640, rounded).
 */
import { mkdirSync } from "node:fs";
import { launch } from "./browser";

function waves(seed: number, y0: number, count: number, amp: number, w: number, color: string, op: [number, number], gap = 24) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const base = y0 + i * gap;
    const a = amp * (0.5 + 0.9 * Math.sin(seed + i * 0.35) ** 2);
    const ph = seed + i * 0.42;
    const pts: string[] = [];
    for (let x = -40; x <= w + 40; x += 30) pts.push(`${x},${(base + a * Math.sin(x / 210 + ph) + a * 0.45 * Math.sin(x / 90 + ph * 1.7)).toFixed(1)}`);
    out += `<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${(1.2 + t * 1.6).toFixed(2)}" opacity="${(op[0] + (op[1] - op[0]) * t).toFixed(3)}"/>`;
  }
  return out;
}

const tuna = (x: number, y: number, s: number, rot: number, op: number, color: string) => `
<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="none" stroke="${color}" stroke-width="${(2.6 / s).toFixed(2)}" opacity="${op}" stroke-linejoin="round" stroke-linecap="round">
  <path d="M0 70 C50 28 140 8 262 12 C342 14 420 40 482 62 L548 18 C540 50 540 90 548 122 L482 80 C420 104 342 128 262 130 C140 134 50 112 0 70 Z"/>
  <path d="M196 14 C206 -22 238 -34 276 -18 C262 -4 262 6 270 14"/>
  <path d="M190 128 C196 156 214 170 236 172 C230 158 232 146 240 130"/>
  <path d="M330 18 L346 4 M352 22 L368 8 M374 27 L390 13"/>
  <path d="M60 66 C120 52 240 52 330 70 C400 84 440 78 482 71" opacity=".7"/>
  <path d="M70 84 C140 94 250 100 340 90 C400 83 440 78 482 71" opacity=".5"/>
  <circle cx="84" cy="62" r="7"/>
</g>`;

const hero = `
<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="800" viewBox="0 0 1800 800">
  <defs>
    <clipPath id="c"><rect width="1800" height="800" rx="56"/></clipPath>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E2A22"/><stop offset=".55" stop-color="#14503E"/><stop offset="1" stop-color="#1E8F6B"/></linearGradient>
    <radialGradient id="glow" cx=".78" cy=".35" r=".55"><stop offset="0" stop-color="#C6F25A" stop-opacity=".55"/><stop offset=".5" stop-color="#C6F25A" stop-opacity=".12"/><stop offset="1" stop-color="#C6F25A" stop-opacity="0"/></radialGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0A1A15" stop-opacity=".82"/><stop offset=".55" stop-color="#0A1A15" stop-opacity=".25"/><stop offset="1" stop-color="#0A1A15" stop-opacity="0"/></linearGradient>
  </defs>
  <g clip-path="url(#c)">
    <rect width="1800" height="800" fill="url(#bg)"/>
    <rect width="1800" height="800" fill="url(#glow)"/>
    ${waves(0.8, 40, 34, 44, 1800, "#BFF06A", [0.08, 0.5], 22)}
    ${tuna(930, 250, 1.35, -8, 0.9, "#D8FF86")}
    ${tuna(1180, 520, 0.8, 6, 0.35, "#D8FF86")}
    <rect width="1800" height="800" fill="url(#shade)"/>
  </g>
</svg>`;

const panel = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="640" viewBox="0 0 800 640">
  <defs>
    <clipPath id="c"><rect width="800" height="640" rx="48"/></clipPath>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14503E"/><stop offset="1" stop-color="#0E2A22"/></linearGradient>
    <radialGradient id="glow" cx=".25" cy=".25" r=".7"><stop offset="0" stop-color="#C6F25A" stop-opacity=".5"/><stop offset="1" stop-color="#C6F25A" stop-opacity="0"/></radialGradient>
  </defs>
  <g clip-path="url(#c)">
    <rect width="800" height="640" fill="url(#bg)"/>
    <rect width="800" height="640" fill="url(#glow)"/>
    ${waves(2.2, 200, 26, 34, 800, "#BFF06A", [0.1, 0.55], 20)}
    ${tuna(90, 120, 1.15, -6, 0.85, "#D8FF86")}
  </g>
</svg>`;

async function main() {
  mkdirSync("public/art", { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1800, height: 800 } });
  for (const [name, svg, w, h] of [["hero", hero, 1800, 800], ["panel", panel, 800, 640]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await page.screenshot({ path: `public/art/${name}.png`, clip: { x: 0, y: 0, width: w, height: h }, omitBackground: true });
  }
  await browser.close();
  console.log("hero art generated");
}
main();
