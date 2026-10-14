/**
 * Generates docs/source-mapping.md (source-to-slide evidence mapping) from the `sources` metadata
 * attached to every slide, plus a reconciliation table of the key figures.
 */
import { writeFileSync } from "node:fs";
import { slides } from "../data/slides";
import { SRC } from "../data/figures";
import { rp } from "../lib/kit";

const kindLabel: Record<string, string> = {
  source: "SUMBER — fakta/angka dari proposal",
  derived: "TURUNAN — dihitung dari angka sumber",
  assumption: "ASUMSI — asumsi proposal atau asumsi proyek ERP",
  proposed: "USULAN — fitur/isi ERP yang diusulkan (bukan kondisi saat ini)",
  commercial: "KOMERSIAL — estimasi harga/jadwal vendor (indikatif)",
  illustrative: "ILUSTRATIF — data contoh pada mockup",
};

const lines: string[] = [];
lines.push("# Source-to-Slide Evidence Mapping");
lines.push("");
lines.push("Dihasilkan otomatis oleh `npm run docs` dari metadata `sources` pada setiap slide (`data/slides/*.ts`).");
lines.push("");
lines.push("**Dokumen sumber:** *Proposal Pendanaan dan Proyeksi Laba Usaha Perikanan Bungus*, PT Katalis Lintas Global, revisi per 1 Oktober 2026, 18 halaman (`docs/source/proposal-pendanaan-bungus-2026-10-01.pdf`; teks hasil ekstraksi di `docs/source/proposal-text-extract.txt`). Rujukan halaman memakai penomoran halaman pada proposal itu sendiri.");
lines.push("");
lines.push("## Klasifikasi bukti");
lines.push("");
Object.entries(kindLabel).forEach(([k, v]) => lines.push(`- **${k}** — ${v}`));
lines.push("");
lines.push("## Rekonsiliasi angka kunci");
lines.push("");
lines.push("| Angka | Nilai pada proposal | Halaman |");
lines.push("|---|---|---|");
[
  ["Laba simulasi bulanan pesimis / moderat / optimis (slide 19, simulasi)", `${rp(SRC.monthlyProfit.pess)} / ${rp(SRC.monthlyProfit.mod)} / ${rp(SRC.monthlyProfit.opt)}`, "1, 10"],
  ["Fresh natural: HPP / jual / margin", `${rp(SRC.fresh.natural.hpp)} / ${rp(SRC.fresh.natural.price)} / ${rp(SRC.fresh.natural.margin)} per kg`, "6"],
  ["Fresh CO: HPP / jual / margin", `${rp(SRC.fresh.co.hpp)} / ${rp(SRC.fresh.co.price)} / ${rp(SRC.fresh.co.margin)} per kg`, "6"],
  ["CO frozen: HPP maks. / jual", `${rp(SRC.frozen.hppMax)} / ${rp(SRC.frozen.priceLow)}–${rp(SRC.frozen.priceHigh)} per kg`, "5"],
  ["CV DUS: beli / nilai bahan", `${rp(SRC.dus.buy)} / ${rp(SRC.dus.material)} per kg`, "9"],
  ["Cold storage / ABF", `Rp${SRC.coldStorage.perKgDay}/kg/hari (min. ${SRC.coldStorage.minDays} hari) / ${rp(SRC.abf.perKg)}/kg`, "8"],
  ["Kapasitas nominal hari penuh / Sabtu", `${SRC.capacity.fullDayKg.toLocaleString("id-ID")} kg / ${SRC.capacity.saturdayKg.toLocaleString("id-ID")} kg (asumsi)`, "4"],
  ["Pool kas pembelian ikan / setelah komitmen Katalis", `${rp(SRC.wc.poolNow)} / ${rp(SRC.wc.poolAfterKatalis)}`, "16"],
  ["Kebutuhan kas 7 / 14 / 21 hari", SRC.wc.needs.map((n) => rp(n.need)).join(" / "), "17"],
].forEach(([a, b, p]) => lines.push(`| ${a} | ${b} | ${p} |`));
lines.push("");
lines.push("Nilai turunan yang dihitung deck (bukan angka proposal): total jam operasi mitra 49 jam/minggu (27 + 22); margin natural 14,29% dan CO 21,74% (sama dengan proposal hlm. 6); skenario invoice cold storage/ABF pada slide 14 (Rp35.200.000 total, lihat `scope-assumptions.md`).");
lines.push("");
lines.push("## Pemetaan per slide");
lines.push("");
slides.forEach((s) => {
  lines.push(`### Slide ${String(s.id).padStart(2, "0")} — ${s.title}`);
  lines.push("");
  lines.push("| Jenis | Rujukan | Klaim yang didukung |");
  lines.push("|---|---|---|");
  s.sources.forEach((r) => lines.push(`| ${r.kind} | ${r.ref} | ${r.claim.replace(/\|/g, "/")} |`));
  lines.push("");
  lines.push(`*Catatan presenter:* ${s.notes}`);
  lines.push("");
});

writeFileSync("docs/source-mapping.md", lines.join("\n"), "utf8");
console.log("docs/source-mapping.md written");
