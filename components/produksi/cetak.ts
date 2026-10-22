import { tampilKg } from "@/lib/logic/grid";
import type { DetailProduksi } from "@/lib/data/produksi";

/* Cetak formulir produksi dengan susunan FRM-PRD-01 rev 01: kepala (kode, tanggal, lot), tabel loin per potong,
   komponen hasil, dan neraca. Dibuat di jendela baru lalu dicetak browser (bisa disimpan sebagai PDF). */

const esc = (s: string | number) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
const kg = (n: number) => tampilKg(Math.round(n * 1000));

export function cetakFormulir(d: DetailProduksi, namaGrade: Map<string, string>, namaSamping: Map<string, string>) {
  const p = d.produksi;
  const loin = d.loin.filter((l) => !l.batal);
  const baris = loin.map((l) => `<tr><td>${esc(l.no_ekor ?? "")}</td><td>${esc(l.no_loin)}</td><td>${esc(namaGrade.get(l.grade_id) ?? "")}</td><td class="r">${kg(l.kg)}</td></tr>`).join("");
  const samping = d.samping.map((s) => `<tr><td>${esc(namaSamping.get(s.category_id) ?? "Hasil samping")}</td><td class="r">${kg(s.kg)}</td></tr>`).join("");
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(p.kode)} · FRM-PRD-01 rev 01</title>
<style>
  body{font:12px/1.45 Arial,sans-serif;color:#111;margin:24px}
  h1{font-size:16px;margin:0 0 2px} h2{font-size:13px;margin:18px 0 6px}
  table{border-collapse:collapse;width:100%} th,td{border:1px solid #888;padding:4px 7px;text-align:left} th{background:#eee} .r{text-align:right;font-variant-numeric:tabular-nums}
  .kepala td{border:none;padding:1px 14px 1px 0} .ttd{margin-top:40px;display:flex;gap:40px} .ttd div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center}
</style></head><body>
<h1>FORMULIR PRODUKSI (FRM-PRD-01 rev 01)</h1>
<table class="kepala"><tr><td>Kode produksi</td><td><b>${esc(p.kode)}</b></td><td>Tanggal</td><td>${esc(p.tanggal)}</td></tr>
<tr><td>Siklus</td><td>${esc(p.siklus_kode ?? "-")}</td><td>Status</td><td>${esc(p.status.replace("_", " "))}</td></tr>
<tr><td>Lot</td><td colspan="3">${esc(d.alokasi.map((a) => `${a.lot_kode} (${kg(a.kg)} kg)`).join(", ") || "-")}</td></tr></table>
<h2>Loin per potong</h2>
<table><thead><tr><th>No. ekor</th><th>No. loin</th><th>Grade</th><th class="r">Berat (kg)</th></tr></thead><tbody>${baris}</tbody>
<tfoot><tr><th colspan="3">Total ${loin.length} potong</th><th class="r">${kg(p.loin_kg)}</th></tr></tfoot></table>
<h2>Komponen hasil</h2>
<table><tbody>${samping}
<tr><td>Limbah (total)</td><td class="r">${p.limbah_kg === null ? "belum ditimbang" : kg(p.limbah_kg)}</td></tr>
<tr><td>Susut (total)</td><td class="r">${p.susut_kg === null ? "belum ditimbang" : kg(p.susut_kg)}</td></tr></tbody></table>
<h2>Neraca berat</h2>
<table><tbody>
<tr><td>Ikan masuk</td><td class="r">${kg(p.masuk_kg)}</td></tr>
<tr><td>Loin (${p.hasil_pct.toLocaleString("id-ID")}%)</td><td class="r">${kg(p.loin_kg)}</td></tr>
<tr><td>Hasil samping</td><td class="r">${kg(p.samping_kg)}</td></tr>
<tr><td>Selisih belum jelas (${p.belum_jelas_pct.toLocaleString("id-ID")}%)</td><td class="r">${kg(p.belum_jelas_kg)}</td></tr></tbody></table>
${p.penjelasan_selisih ? `<p>Penjelasan selisih: ${esc(p.penjelasan_selisih)}</p>` : ""}
<div class="ttd"><div>Penimbang</div><div>Pemeriksa QC</div><div>Owner</div></div>
<script>window.onload=function(){window.print()}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
