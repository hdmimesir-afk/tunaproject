/** Captures the interactive demo (production build on :3199) for the deck. Then run: python scripts/postprocess_shots.py */
import { mkdirSync } from "node:fs";
import { launch } from "./browser";
async function main() {
  mkdirSync("shots_raw", { recursive: true });
  const b = await launch(); const base = "http://localhost:3199";
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(base + "/demo/phone", { waitUntil: "networkidle" }); await p.waitForTimeout(2300);
  await p.screenshot({ path: "shots_raw/phone-home.png" });
  await p.getByRole("button", { name: "Setuju", exact: true }).click(); await p.waitForTimeout(700);
  await p.screenshot({ path: "shots_raw/phone-approve.png" });
  await p.getByRole("button", { name: "Modul", exact: true }).click(); await p.waitForTimeout(700);
  await p.screenshot({ path: "shots_raw/phone-modul.png" });
  const c2 = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const d = await c2.newPage();
  await d.goto(base + "/demo/desktop", { waitUntil: "networkidle" }); await d.waitForTimeout(900);
  await d.screenshot({ path: "shots_raw/desktop-dashboard.png" });
  await b.close();
}
main();
