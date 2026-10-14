/**
 * Visual + layout QA against a running server (npm run dev / npm start on port 3100).
 *  - renders every slide to output/_render/slide-XX.png
 *  - flags text boxes whose content overflows its box (height or width)
 *  - flags elements that extend outside the 1920x1080 canvas
 * Usage: npx tsx scripts/qa.ts [baseUrl] [onlySlideIds comma separated]
 */
import { mkdirSync } from "node:fs";
import { launch } from "./browser";

const base = process.argv[2] ?? "http://localhost:3100";
const only = process.argv[3]?.split(",").map(Number);

async function main() {
  mkdirSync("output/_render", { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${base}/print`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const ids: number[] = await page.$$eval("[data-slide-id]", (els) => els.map((e) => Number(e.getAttribute("data-slide-id"))));
  if (ids.length === 0) { console.error("GAGAL: tidak ada slide yang ter-render (server error?)"); process.exit(1); }
  let problems = 0;
  for (const id of ids) {
    if (only && !only.includes(id)) continue;
    const handle = await page.$(`[data-slide-id="${id}"]`);
    if (!handle) continue;
    await handle.screenshot({ path: `output/_render/slide-${String(id).padStart(2, "0")}.png` });
    const issues: string[] = await handle.evaluate((root) => {
      const out: string[] = [];
      const rootRect = root.getBoundingClientRect();
      root.querySelectorAll<HTMLElement>("[data-slide-text]").forEach((el) => {
        const t = (el.textContent ?? "").slice(0, 42);
        if (el.scrollHeight > el.clientHeight + 2) out.push(`OVERFLOW-H "${t}" (${el.scrollHeight} > ${el.clientHeight})`);
        // width overflow: any child wider than the box
        const w = el.clientWidth;
        el.querySelectorAll<HTMLElement>("div, span").forEach((c) => {
          if (c.scrollWidth > w + 2) out.push(`OVERFLOW-W "${t}"`);
        });
        const r = el.getBoundingClientRect();
        if (r.right > rootRect.right + 1 || r.bottom > rootRect.bottom + 1 || r.left < rootRect.left - 1 || r.top < rootRect.top - 1) out.push(`OUTSIDE "${t}"`);
      });
      return Array.from(new Set(out));
    });
    if (issues.length) {
      problems += issues.length;
      console.log(`Slide ${String(id).padStart(2, "0")}:\n  ` + issues.join("\n  "));
    }
  }
  await browser.close();
  console.log(problems ? `\n${problems} potensi masalah ditemukan.` : "\nTidak ada overflow terdeteksi.");
}
main();
