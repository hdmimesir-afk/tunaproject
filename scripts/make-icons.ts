/** Renders Lucide icons (ISC licence) to transparent PNGs in the deck's colours: public/icons/<name>-<color>.png */
import { readFileSync, mkdirSync } from "node:fs";
import { launch } from "./browser";

export const ICONS = ["layout-dashboard", "circle-check", "bell", "lock", "tag", "snowflake", "receipt-text", "calendar-clock", "trending-down", "file-signature", "truck", "scale", "wallet", "check", "triangle-alert", "clock", "smartphone", "monitor", "arrow-right", "users", "shield-check", "shopping-cart", "factory", "package", "flask-conical", "chart-column", "circle-dollar-sign", "layers", "fish", "sparkles", "message-circle", "flag"];
const COLORS: Record<string, string> = { ink: "#00171F", green: "#003459", mint: "#1B7FC4", white: "#FFFFFF", amber: "#C98A1B", red: "#B4443C", gray: "#7F909A" };

async function main() {
  mkdirSync("public/icons", { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 128, height: 128 }, deviceScaleFactor: 2 });
  for (const name of ICONS) {
    let svg: string;
    try { svg = readFileSync(`node_modules/lucide-static/icons/${name}.svg`, "utf8"); } catch { console.log("skip", name); continue; }
    for (const [cn, hex] of Object.entries(COLORS)) {
      const s = svg.replace(/stroke="currentColor"/, `stroke="${hex}"`).replace(/stroke-width="2"/, 'stroke-width="1.75"').replace(/width="24"/, 'width="128"').replace(/height="24"/, 'height="128"');
      await page.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`);
      await page.screenshot({ path: `public/icons/${name}-${cn}.png`, clip: { x: 0, y: 0, width: 128, height: 128 }, omitBackground: true });
    }
  }
  await browser.close();
  console.log("icons done");
}
main();
