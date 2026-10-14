/**
 * Captures every demo screen used by the deck (production build on :3199), then run:  python scripts/postprocess_shots.py
 * Order: next build && next start -p 3199 && npx tsx scripts/make-shots.ts && python scripts/postprocess_shots.py
 */
import { mkdirSync } from "node:fs";
import { launch } from "./browser";

const base = "http://localhost:3199";
async function main() {
  mkdirSync("shots_raw", { recursive: true });
  const b = await launch();

  // ---- desktop (1440 x 900, 2x)
  const dc = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const d = await dc.newPage();
  await d.goto(base + "/demo/desktop", { waitUntil: "networkidle" }); await d.waitForTimeout(900);
  const go = async (n: string) => { await d.locator("aside nav").getByRole("button", { name: n }).first().click(); await d.waitForTimeout(500); };
  const shot = async (n: string, h = 900) => { await d.setViewportSize({ width: 1440, height: h }); await d.waitForTimeout(300); await d.screenshot({ path: `shots_raw/d-${n}.png` }); };
  await shot("dashboard");
  await go("Laporan"); await d.getByRole("button", { name: "Biaya Siklus 1" }).click(); await d.waitForTimeout(400); await shot("biaya", 820);
  await go("Produksi"); await shot("produksi");
  await go("Stok"); await shot("stok", 820);
  await go("Gudang Dingin"); await shot("gudang");
  await go("Jadwal"); await shot("jadwal");
  await go("Keuangan"); await shot("keuangan");
  await d.setViewportSize({ width: 1440, height: 820 });
  await go("Asisten AI");
  for (const q of ["Tagihan mana yang telat?", "Ekor mana hasilnya paling rendah?"]) { await d.getByRole("button", { name: q }).click(); await d.waitForTimeout(1200); }
  await d.screenshot({ path: "shots_raw/d-asisten.png" });

  // ---- phone (390 x 844, 3x)
  const pc = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const p = await pc.newPage();
  await p.goto(base + "/demo/phone", { waitUntil: "networkidle" }); await p.waitForTimeout(2300);
  const pshot = (n: string) => p.screenshot({ path: `shots_raw/p-${n}.png` });
  const scroll = async (y: number) => { await p.evaluate((y) => (document.querySelector(".overflow-y-auto") as HTMLElement).scrollTo(0, y), y); await p.waitForTimeout(300); };
  const modul = async (name: string) => { await p.getByRole("button", { name: "Modul", exact: true }).click(); await p.waitForTimeout(400); await p.getByText(name, { exact: true }).first().click(); await p.waitForTimeout(550); };
  await pshot("home");
  await p.getByRole("button", { name: "Setuju", exact: true }).click(); await p.waitForTimeout(600); await pshot("approve");
  await p.getByRole("button", { name: "Modul", exact: true }).click(); await p.waitForTimeout(600); await pshot("modul");
  await p.getByRole("button", { name: "Laporan", exact: true }).click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: "Biaya Siklus 1" }).click(); await p.waitForTimeout(400); await scroll(0); await pshot("biaya");
  await modul("Produksi"); await scroll(420); await pshot("produksi");
  await modul("Stok"); await scroll(0); await pshot("stok");
  await modul("Gudang Dingin"); await scroll(520); await pshot("gudang");
  await modul("Jadwal"); await scroll(0); await pshot("jadwal");
  await modul("Keuangan"); await scroll(980); await pshot("keuangan");
  await modul("Asisten AI");
  await p.getByRole("button", { name: "Berapa saldo kas sekarang?" }).click(); await p.waitForTimeout(1200);
  await p.getByRole("button", { name: "Tagihan mana yang telat?" }).click(); await p.waitForTimeout(1200); await pshot("asisten");
  await b.close();
}
main();
