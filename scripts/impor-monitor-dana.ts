/* Impor transaksi dari workbook Monitor Dana Bungus (sheet JURNAL) ke buku kas (tabel ledger).
   Pakai:
     npm run impor-monitor-dana              uji coba (tidak menulis apa pun), tampilkan ringkasan
     npm run impor-monitor-dana -- --tulis   tulis ke database di .env.local
   Aturan:
     - Hanya uang KELUAR yang diimpor. Baris Masuk (setoran investor / kontribusi, yaitu bagian modal) tidak diimpor.
     - Nomor rekening, tautan Drive, dan nama pemeriksa/penyetuju tidak diimpor.
     - Baris bernilai Rp0 dilewati (buku kas menolak nilai nol); baris duplikat arsip dilewati.
     - Baris tanpa tanggal transaksi memakai tanggal input dan ditandai di uraian.
     - Aman diulang: tiap baris punya rujukan tetap (ref_id dari ID item), yang sudah ada dilewati.
   Butuh NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY di .env.local. Kunci tidak dicetak. */
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

const BERKAS = "docs/source/monitor-dana-bungus.xlsx";
const RUJUKAN = "impor_monitor_dana";

type Sel = ExcelJS.CellValue;
const nilai = (v: Sel): string | number | Date | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) return nilai((v as { result: Sel }).result);
    if ("richText" in v) return (v as { richText: { text: string }[] }).richText.map((x) => x.text).join("");
    if ("text" in v) return String((v as { text: string }).text);
    return null;
  }
  return v as string | number | Date;
};
const teks = (v: Sel) => { const n = nilai(v); return n === null ? "" : n instanceof Date ? n.toISOString().slice(0, 10) : String(n).trim(); };
const angka = (v: Sel) => { const n = nilai(v); return typeof n === "number" ? n : n === null || n === "" ? 0 : Number(n) || 0; };
const tanggal = (v: Sel) => { const n = nilai(v); return n instanceof Date ? n.toISOString().slice(0, 10) : null; };

/** UUID tetap dari ID item, supaya impor ulang tidak menggandakan baris. */
function uuidDari(id: string) {
  const b = createHash("sha1").update(`${RUJUKAN}:${id}`).digest().subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

type Baris = { tanggal: string; arah: "keluar"; kategori_nama: string; uraian: string; jumlah: number; ref_tabel: string; ref_id: string; sumber: "impor" };

async function baca() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(BERKAS);
  const ws = wb.getWorksheet("JURNAL");
  if (!ws) throw new Error("Sheet JURNAL tidak ditemukan.");
  const diimpor: Baris[] = [];
  const dilewati: { id: string; alasan: string; jumlah: number }[] = [];
  let terbaca = 0;
  for (let r = 7; r <= ws.rowCount; r++) {
    const g = (k: string) => ws.getCell(`${k}${r}`).value;
    const id = teks(g("C"));
    const masuk = angka(g("K"));
    const keluar = angka(g("L"));
    if (!id && !masuk && !keluar) continue;
    terbaca++;
    const jenis = teks(g("D"));
    if (jenis === "Masuk" || masuk > 0) { dilewati.push({ id, alasan: "uang masuk / bagian modal (tidak diimpor)", jumlah: masuk }); continue; }
    if (id.includes("DUPLIKAT")) { dilewati.push({ id, alasan: "salinan arsip duplikat bernilai Rp0", jumlah: keluar }); continue; }
    if (!(keluar > 0)) { dilewati.push({ id, alasan: "nilai Rp0 (buku kas menolak nol)", jumlah: keluar }); continue; }
    let tgl = tanggal(g("B"));
    let catatanTgl = "";
    if (!tgl) { tgl = tanggal(g("V")); catatanTgl = " (tanggal nota belum terbaca; memakai tanggal input)"; }
    if (!tgl) { dilewati.push({ id, alasan: "tanpa tanggal sama sekali", jumlah: keluar }); continue; }
    const uraian = [teks(g("I")), teks(g("J")) && `— ${teks(g("J"))}`, `[${id}]`].filter(Boolean).join(" ") + catatanTgl;
    diimpor.push({ tanggal: tgl, arah: "keluar", kategori_nama: teks(g("G")) || "Tanpa kategori", uraian: uraian.slice(0, 400), jumlah: keluar, ref_tabel: RUJUKAN, ref_id: uuidDari(id), sumber: "impor" });
  }
  return { diimpor, dilewati, terbaca };
}

const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");

async function main() {
  const tulis = process.argv.includes("--tulis");
  const { diimpor, dilewati, terbaca } = await baca();
  const total = diimpor.reduce((a, b) => a + Math.round(b.jumlah * 100), 0) / 100;
  console.log(`Baris berisi di JURNAL: ${terbaca}`);
  console.log(`Akan diimpor: ${diimpor.length} baris uang keluar, total ${rp(total)}`);
  console.log(`Dilewati: ${dilewati.length}`);
  for (const d of dilewati) console.log(`  - ${d.id || "(tanpa ID)"}: ${d.alasan}${d.jumlah ? ` (${rp(d.jumlah)})` : ""}`);
  const per = new Map<string, { n: number; s: number }>();
  for (const b of diimpor) { const x = per.get(b.kategori_nama) ?? { n: 0, s: 0 }; per.set(b.kategori_nama, { n: x.n + 1, s: x.s + Math.round(b.jumlah * 100) }); }
  console.log("Per kategori:");
  for (const [k, v] of [...per.entries()].sort((a, b) => b[1].s - a[1].s)) console.log(`  ${k}: ${v.n} baris, ${rp(v.s / 100)}`);
  const tgls = diimpor.map((b) => b.tanggal).sort();
  console.log(`Tanggal: ${tgls[0]} s/d ${tgls[tgls.length - 1]}`);
  if (new Set(diimpor.map((b) => b.ref_id)).size !== diimpor.length) throw new Error("ID item ganda: impor dihentikan.");

  if (!tulis) { console.log("\nUji coba saja. Jalankan dengan --tulis untuk menulis ke database."); return; }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret?.startsWith("sb_secret_")) throw new Error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY di .env.local");
  const sb = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: ada, error: e1 } = await sb.from("ledger").select("ref_id").eq("ref_tabel", RUJUKAN);
  if (e1) throw new Error(`Gagal membaca buku kas: ${e1.message}`);
  const sudah = new Set((ada ?? []).map((x) => x.ref_id as string));
  const baru = diimpor.filter((b) => !sudah.has(b.ref_id));
  console.log(`\nSudah ada di buku kas: ${sudah.size}. Ditulis sekarang: ${baru.length}.`);
  for (let i = 0; i < baru.length; i += 100) {
    const { error } = await sb.from("ledger").insert(baru.slice(i, i + 100));
    if (error) throw new Error(`Gagal menulis (paket ${i / 100 + 1}): ${error.message}`);
  }
  const { data: cek, error: e2 } = await sb.from("ledger").select("jumlah").eq("ref_tabel", RUJUKAN);
  if (e2) throw new Error(`Gagal memeriksa hasil: ${e2.message}`);
  const dbTotal = (cek ?? []).reduce((a, x) => a + Math.round(Number(x.jumlah) * 100), 0) / 100;
  console.log(`Terverifikasi di database: ${(cek ?? []).length} baris, total ${rp(dbTotal)}`);
  if ((cek ?? []).length !== diimpor.length || dbTotal !== total) throw new Error("Jumlah di database berbeda dari berkas. Periksa sebelum melanjutkan.");
  console.log("Impor selesai dan cocok dengan berkas.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
