/**
 * Content QA:
 *  1. every full Rupiah figure on a slide is looked up in the extracted source proposal text;
 *     unmatched figures are listed so they can be confirmed as derived / illustrative / commercial.
 *  2. all 12 modules are represented; package prices and roadmap durations are present.
 *  3. slide titles, count and unique ids.
 * Usage: npx tsx scripts/verify-content.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { slides } from "../data/slides";
import type { El, Run, Cell } from "../lib/scene";

const source = readFileSync("docs/source/proposal-text-extract.txt", "utf8");
const sourceDigits = new Set((source.match(/\d[\d.]{3,}\d/g) ?? []).map((s) => s.replace(/\./g, "")));

const cellText = (c: Cell) => (typeof c === "string" ? c : c.t);
const textOf = (el: El): string[] => {
  if (el.t === "text") return [typeof el.text === "string" ? el.text : (el.text as Run[]).map((r) => r.text).join("")];
  if (el.t === "table") return [...(el.head ?? []), ...el.rows.flat().map(cellText)];
  return [];
};

const all = slides.map((s) => ({ id: s.id, title: s.title, text: s.els.flatMap(textOf).join("\n") }));
const out: string[] = [];
let problems = 0;

// 0. basics
out.push(`Jumlah slide: ${slides.length}`);
if (slides.length < 12) { out.push("!! jumlah slide terlalu sedikit"); problems++; }
if (new Set(slides.map((s) => s.id)).size !== slides.length) { out.push("!! id slide duplikat"); problems++; }

// 1. Rupiah figures
const unmatched: Record<number, string[]> = {};
const matched = new Set<string>();
all.forEach((s) => {
  (s.text.match(/Rp[\d.]{4,}/g) ?? []).forEach((m) => {
    const digits = m.replace(/Rp|\./g, "");
    if (digits.length < 4) return;
    if (sourceDigits.has(digits)) matched.add(m);
    else (unmatched[s.id] ??= []).push(m);
  });
});
out.push(`\nAngka Rupiah penuh yang cocok dengan proposal: ${matched.size} nilai unik`);
out.push("Angka Rupiah yang TIDAK ada di proposal (harus berstatus turunan/ilustrasi/komersial):");
Object.entries(unmatched).forEach(([id, v]) => out.push(`  slide ${id}: ${Array.from(new Set(v)).join(", ")}`));

// 2. modules
const joined = all.map((s) => s.text + s.title).join("\n");
out.push("\nCek fitur tampil di deck:");
for (const f of ["Dashboard", "Pembelian", "Produksi", "Mutu", "Stok", "Penjualan", "Keuangan", "Gudang dingin", "Jadwal", "skenario", "Akses"]) {
  const has = joined.toLowerCase().includes(f.toLowerCase());
  out.push(`  ${has ? "ok " : "!! "} ${f}`);
  if (!has) problems++;
}

// 3. pricing + roadmap strings
const must = ["1 bulan", "Minggu 4", "Paket Lengkap", "Asisten AI"];
out.push("\nCek harga, durasi, dan ketentuan:");
must.forEach((m) => {
  const has = joined.toLowerCase().includes(m.toLowerCase());
  out.push(`  ${has ? "ok " : "!! "} ${m}`);
  if (!has) problems++;
});

// 4. guard-rail phrases
const guard = ["CONTOH", "belum mengikat"];
out.push("\nCek pagar pengaman:");
guard.forEach((g) => {
  const has = joined.toLowerCase().includes(g.toLowerCase());
  out.push(`  ${has ? "ok " : "!! "} ${g}`);
  if (!has) problems++;
});

// 5. banned claims
const banned = ["Rp45 – 70", "Rp90 – 150", "Rp175 – 300", "Rp27–45", "12–18%", "60–90 hari", "investor", "bagi hasil", "pembagian laba", "jaminan ROI", "dijamin", "pasti untung", "tersertifikasi", "ISO 27001", "testimoni"];
out.push("\nCek klaim terlarang (harus tidak ada):");
banned.forEach((b) => {
  const idx = joined.toLowerCase().indexOf(b.toLowerCase());
  out.push(`  ${idx < 0 ? "ok " : "!! "} ${b}`);
  if (idx >= 0) problems++;
});

out.push("\nDaftar judul slide:");
slides.forEach((s) => out.push(`  ${String(s.id).padStart(2, "0")}  ${s.title}`));
out.push(`\nMasalah: ${problems}`);
const report = out.join("\n");
console.log(report);
writeFileSync("output/_render/content-verification.txt", report);
