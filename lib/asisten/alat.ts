import "server-only";
import { rp, tanggal } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import { cariBentrok } from "@/lib/logic/jadwal";
import { hasilPerEkor } from "@/lib/logic/grid";
import { createClient } from "@/lib/supabase/server";

/* Alat baca terbatas untuk Asisten AI (F22). Semuanya HANYA MEMBACA dan memakai klien pengguna yang bertanya,
   jadi RLS dan izin database tetap berlaku: yang tidak boleh dilihat pengguna tidak akan pernah sampai ke Asisten.
   Tautan hanya ke halaman internal yang sudah dikenal. */

export type Tautan = { label: string; href: string };
/** Rincian berbentuk tabel; kolom ke-`kananDari` dan seterusnya rata kanan (angka). */
export type TabelAlat = { kepala: string[]; baris: string[][]; kananDari?: number };
export type HasilAlat = { ringkas: string[]; data: unknown; tautan: Tautan[]; tabel?: TabelAlat };

export type DefAlat = {
  nama: string;
  label: string;
  deskripsi: string;
  /** Salah satu izin ini cukup untuk memakai alat. */
  izin: string[];
  skema: { type: "object"; properties: Record<string, { type: "string"; description: string }>; required?: string[] };
};

export const DAFTAR_ALAT: DefAlat[] = [
  { nama: "piutang_terlambat", label: "Piutang yang terlambat", deskripsi: "Daftar invoice penjualan dan jasa yang melewati jatuh tempo beserta sisa tagihan dan hari terlambatnya.", izin: ["penjualan.read"], skema: { type: "object", properties: {} } },
  { nama: "saldo_kas", label: "Saldo kas", deskripsi: "Uang masuk, uang keluar, dan saldo dari buku kas, total dan bulan ini.", izin: ["keuangan.read"], skema: { type: "object", properties: {} } },
  { nama: "hasil_per_ekor", label: "Hasil per ekor", deskripsi: "Hasil loin per ekor (loin ÷ berat utuh) untuk satu produksi. Tanpa kode produksi, dipakai produksi terbaru.", izin: ["produksi.read"],
    skema: { type: "object", properties: { produksi: { type: "string", description: "Kode produksi, misalnya PRD-001. Boleh dikosongkan." } } } },
  { nama: "jadwal_bentrok", label: "Jadwal mesin dan bentrok", deskripsi: "Jadwal ABF dan produksi mitra 14 hari ke depan, dan apakah ada yang bentrok.", izin: ["gudang.read"], skema: { type: "object", properties: {} } },
  { nama: "perlu_persetujuan", label: "Yang menunggu keputusan", deskripsi: "Jumlah PO, biaya, koreksi stok, dan produksi yang menunggu persetujuan atau pemeriksaan.", izin: ["persetujuan.read", "keuangan.read", "stok.read", "produksi.read"], skema: { type: "object", properties: {} } },
  { nama: "isi_gudang_dingin", label: "Isi gudang dingin", deskripsi: "Isi gudang dingin terhadap kapasitas: stok sendiri, titipan per pelanggan, dan sisa kapasitas.", izin: ["gudang.read", "stok.read"], skema: { type: "object", properties: {} } },
  { nama: "kelengkapan_dokumen", label: "Transaksi tanpa nota atau bukti", deskripsi: "Jumlah dan daftar PO yang belum punya nota serta pembayaran yang belum punya bukti.", izin: ["keuangan.read", "pembelian.read"], skema: { type: "object", properties: {} } },
  { nama: "biaya_siklus", label: "Biaya dan laba satu siklus", deskripsi: "Pendapatan, biaya (ikan dan biaya lain per kategori), dan laba kotor satu siklus. Tanpa kode siklus, dipakai siklus terbaru.", izin: ["keuangan.read", "laporan.read"],
    skema: { type: "object", properties: { siklus: { type: "string", description: "Kode siklus, misalnya SIK-0001. Boleh dikosongkan." } } } },
];

type Sb = Awaited<ReturnType<typeof createClient>>;
const kg = (n: number) => `${tampilKg(Math.round(Number(n) * 1000))} kg`;

async function piutangTerlambat(sb: Sb): Promise<HasilAlat> {
  const { data, error } = await sb.from("v_invoices").select("id, kode, buyer_nama, sisa, jatuh_tempo, hari_telat").eq("status_tagihan", "terlambat").order("hari_telat", { ascending: false }).limit(25);
  if (error) throw new Error("Gagal membaca piutang.");
  const baris = data ?? [];
  const total = baris.reduce((a, r) => a + Math.round(Number(r.sisa) * 100), 0) / 100;
  return {
    ringkas: baris.length === 0 ? ["Tidak ada invoice yang terlambat."] : [`${baris.length} invoice terlambat dengan total sisa tagihan ${rp(total)}.`],
    tabel: baris.length === 0 ? undefined : { kepala: ["Invoice", "Pembeli", "Jatuh tempo", "Terlambat", "Sisa tagihan"], kananDari: 3, baris: baris.map((r) => [r.kode as string, r.buyer_nama as string, tanggal(r.jatuh_tempo as string), `${r.hari_telat} hari`, rp(Number(r.sisa))]) },
    data: baris, tautan: [{ label: "Piutang dan invoice", href: "/penjualan" }, ...baris.slice(0, 5).map((r) => ({ label: r.kode as string, href: `/penjualan?inv=${r.id}` }))],
  };
}

async function saldoKas(sb: Sb): Promise<HasilAlat> {
  const { data, error } = await sb.from("ledger").select("tanggal, arah, jumlah");
  if (error) throw new Error("Gagal membaca buku kas.");
  const bulan = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 7);
  let masuk = 0, keluar = 0, masukB = 0, keluarB = 0;
  for (const r of data ?? []) {
    const s = Math.round(Number(r.jumlah) * 100);
    const ini = (r.tanggal as string).startsWith(bulan);
    if (r.arah === "masuk") { masuk += s; if (ini) masukB += s; } else { keluar += s; if (ini) keluarB += s; }
  }
  return {
    ringkas: [`Saldo kas tercatat ${rp((masuk - keluar) / 100)}.`, "Saldo dihitung dari buku kas di sistem, belum termasuk modal awal atau catatan lama."],
    tabel: { kepala: ["", "Uang masuk", "Uang keluar", "Selisih"], kananDari: 1, baris: [["Bulan ini", rp(masukB / 100), rp(keluarB / 100), rp((masukB - keluarB) / 100)], ["Seluruhnya", rp(masuk / 100), rp(keluar / 100), rp((masuk - keluar) / 100)]] },
    data: { masuk: masuk / 100, keluar: keluar / 100, masukBulanIni: masukB / 100, keluarBulanIni: keluarB / 100 }, tautan: [{ label: "Buku kas", href: "/keuangan" }],
  };
}

async function hasilEkor(sb: Sb, input: { produksi?: string }): Promise<HasilAlat> {
  const q = sb.from("v_productions").select("id, kode, loin_kg").order("kode", { ascending: false }).limit(1);
  const { data: p, error } = await (input.produksi ? q.eq("kode", input.produksi.toUpperCase()) : q);
  if (error) throw new Error("Gagal membaca produksi.");
  const prod = p?.[0];
  if (!prod) return { ringkas: ["Produksi tidak ditemukan."], data: null, tautan: [{ label: "Produksi", href: "/produksi" }] };
  const [it, ek] = await Promise.all([
    sb.from("production_items").select("no_ekor, kg").eq("production_id", prod.id).eq("batal", false).not("no_ekor", "is", null),
    sb.from("production_fish").select("no_ekor, berat_utuh_kg").eq("production_id", prod.id),
  ]);
  const loin = new Map<number, number>();
  for (const r of it.data ?? []) loin.set(r.no_ekor as number, (loin.get(r.no_ekor as number) ?? 0) + Math.round(Number(r.kg) * 1000));
  const baris = (ek.data ?? []).map((e) => ({ ekor: e.no_ekor as number, utuh: Number(e.berat_utuh_kg), loinG: loin.get(e.no_ekor as number) ?? 0 }))
    .map((e) => ({ ...e, pct: hasilPerEkor(e.loinG, e.utuh) })).sort((a, b) => a.ekor - b.ekor);
  return {
    ringkas: baris.length === 0 ? [`${prod.kode}: belum ada berat ikan utuh per ekor, jadi hasil per ekor belum bisa dihitung.`] : [`Hasil per ekor untuk ${prod.kode} (loin ÷ berat ikan utuh).`],
    tabel: baris.length === 0 ? undefined : { kepala: ["Ekor", "Utuh", "Loin", "Hasil"], kananDari: 1, baris: baris.map((e) => [String(e.ekor), kg(e.utuh), kg(e.loinG / 1000), e.pct === null ? "-" : `${e.pct.toLocaleString("id-ID", { minimumFractionDigits: 1 })}%`]) },
    data: baris, tautan: [{ label: `Produksi ${prod.kode}`, href: `/produksi?p=${prod.id}` }],
  };
}

async function jadwalBentrok(sb: Sb): Promise<HasilAlat> {
  const dari = new Date(); const sampai = new Date(Date.now() + 14 * 86400_000);
  const { data, error } = await sb.from("bookings").select("id, label, jenis, mulai, selesai").eq("status", "aktif").gte("selesai", dari.toISOString()).lte("mulai", sampai.toISOString()).order("mulai");
  if (error) throw new Error("Gagal membaca jadwal.");
  const j = (data ?? []).map((b) => ({ id: b.id as string, label: b.label as string, mulai: new Date(b.mulai as string), selesai: new Date(b.selesai as string) }));
  const bentrok: string[] = [];
  for (const b of j) for (const o of cariBentrok(j.filter((x) => x.id > b.id), b)) bentrok.push(`${b.label} bentrok dengan ${o.label}`);
  const wib = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", hourCycle: "h23" });
  return {
    ringkas: [j.length === 0 ? "Tidak ada jadwal 14 hari ke depan." : `${j.length} jadwal dalam 14 hari ke depan.`, bentrok.length === 0 ? "Tidak ada jadwal yang bentrok." : `Bentrok: ${bentrok.join("; ")}.`],
    tabel: j.length === 0 ? undefined : { kepala: ["Jadwal", "Mulai", "Selesai"], baris: j.map((b) => [b.label, wib.format(b.mulai), wib.format(b.selesai)]) },
    data: { jadwal: j.length, bentrok }, tautan: [{ label: "Jadwal mesin", href: "/gudang" }],
  };
}

async function perluPersetujuan(sb: Sb): Promise<HasilAlat> {
  const { data, error } = await sb.from("v_dashboard").select("persetujuan_menunggu, biaya_menunggu, koreksi_menunggu, produksi_menunggu, lot_menunggu_mutu").maybeSingle();
  if (error || !data) throw new Error("Gagal membaca antrean.");
  const d = data as Record<string, number>;
  return {
    ringkas: [`${d.persetujuan_menunggu + d.biaya_menunggu + d.koreksi_menunggu + d.produksi_menunggu + d.lot_menunggu_mutu} hal menunggu keputusan atau pemeriksaan.`],
    tabel: { kepala: ["Yang menunggu", "Jumlah"], kananDari: 1, baris: [["PO menunggu persetujuan", String(d.persetujuan_menunggu)], ["Biaya menunggu Owner", String(d.biaya_menunggu)], ["Koreksi stok menunggu Owner", String(d.koreksi_menunggu)], ["Produksi menunggu pemeriksaan", String(d.produksi_menunggu)], ["Lot menunggu cek mutu", String(d.lot_menunggu_mutu)]] },
    data: d, tautan: [{ label: "Persetujuan", href: "/persetujuan" }, { label: "Biaya", href: "/keuangan" }, { label: "Stok", href: "/stok" }, { label: "Produksi", href: "/produksi" }],
  };
}

async function isiGudang(sb: Sb): Promise<HasilAlat> {
  const [isi, unit] = await Promise.all([
    sb.from("v_gudang_isi").select("*").maybeSingle(),
    sb.from("storage_units").select("pemilik_nama, sisa_kg, buyer_id").eq("status", "aktif").not("buyer_id", "is", null),
  ]);
  if (isi.error || unit.error || !isi.data) throw new Error("Gagal membaca gudang.");
  const g = isi.data as { kapasitas_kg: number; isi_sendiri_kg: number; isi_titipan_kg: number };
  const per = new Map<string, number>();
  for (const u of unit.data ?? []) per.set(u.pemilik_nama as string, (per.get(u.pemilik_nama as string) ?? 0) + Math.round(Number(u.sisa_kg) * 1000));
  const total = Number(g.isi_sendiri_kg) + Number(g.isi_titipan_kg);
  return {
    ringkas: [`Gudang terisi ${kg(total)} dari kapasitas ${kg(g.kapasitas_kg)}; sisa ruang ${kg(Math.max(0, g.kapasitas_kg - total))}.`],
    tabel: { kepala: ["Isi gudang", "Berat"], kananDari: 1, baris: [["Stok milik sendiri", kg(g.isi_sendiri_kg)], ...[...per.entries()].map(([n, gram]) => [`Titipan ${n}`, kg(gram / 1000)])] },
    data: { ...g, titipanPerPelanggan: Object.fromEntries(per) }, tautan: [{ label: "Gudang dingin", href: "/gudang" }, { label: "Stok", href: "/stok" }],
  };
}

async function kelengkapan(sb: Sb): Promise<HasilAlat> {
  const [d, po, dok] = await Promise.all([
    sb.from("v_dashboard").select("dokumen_kurang").maybeSingle(),
    sb.from("v_purchase_orders").select("id, kode, supplier_nama, total, status_persetujuan").in("status_persetujuan", ["diajukan", "disetujui"]).limit(200),
    sb.from("documents").select("ref_id").eq("ref_tabel", "purchase_orders").eq("jenis", "nota"),
  ]);
  if (d.error) throw new Error("Gagal membaca kelengkapan dokumen.");
  const punya = new Set((dok.data ?? []).map((x) => x.ref_id as string));
  const tanpa = (po.data ?? []).filter((p) => !punya.has(p.id as string));
  const jumlah = Number((d.data as { dokumen_kurang: number } | null)?.dokumen_kurang ?? 0);
  return {
    ringkas: [`${jumlah} transaksi belum punya nota atau bukti (PO, biaya, pembayaran).`],
    tabel: tanpa.length === 0 ? undefined : { kepala: ["PO tanpa nota", "Pemasok", "Total"], kananDari: 2, baris: tanpa.slice(0, 10).map((p) => [p.kode as string, p.supplier_nama as string, rp(Number(p.total))]) },
    data: { jumlah, poTanpaNota: tanpa.map((p) => p.kode) }, tautan: [{ label: "Pembelian", href: "/pembelian" }, { label: "Keuangan", href: "/keuangan" }, ...tanpa.slice(0, 3).map((p) => ({ label: p.kode as string, href: `/pembelian?po=${p.id}` }))],
  };
}

async function biayaSiklus(sb: Sb, input: { siklus?: string }): Promise<HasilAlat> {
  const q = sb.from("v_laba_rugi_siklus").select("*").order("kode", { ascending: false }).limit(1);
  const { data, error } = await (input.siklus ? q.eq("kode", input.siklus.toUpperCase()) : q);
  if (error) throw new Error("Gagal membaca laba rugi.");
  const s = data?.[0] as Record<string, number | string> | undefined;
  if (!s) return { ringkas: ["Siklus tidak ditemukan."], data: null, tautan: [{ label: "Laporan", href: "/laporan" }] };
  const { data: by } = await sb.from("v_expenses").select("kategori_nama, jumlah").eq("cycle_id", s.cycle_id as string).eq("status", "disetujui");
  const per = new Map<string, number>();
  for (const b of by ?? []) per.set(b.kategori_nama as string, (per.get(b.kategori_nama as string) ?? 0) + Math.round(Number(b.jumlah) * 100));
  return {
    ringkas: [`${s.kode}: laba kotor ${rp(Number(s.laba_kotor))}${s.margin_pct !== null ? ` (margin ${String(s.margin_pct).replace(".", ",")}%)` : ""} dari pendapatan ${rp(Number(s.pendapatan_total))} dan biaya ${rp(Number(s.biaya_total))}.`],
    tabel: { kepala: ["Komponen", "Rupiah"], kananDari: 1, baris: [["Pendapatan", rp(Number(s.pendapatan_total))], ["Biaya ikan (PO disetujui)", rp(Number(s.biaya_ikan))], ...[...per.entries()].map(([k, v]) => [`Biaya ${k}`, rp(v / 100)]), ["Laba kotor", rp(Number(s.laba_kotor))]] },
    data: s, tautan: [{ label: `Laba rugi ${s.kode}`, href: `/laporan?c=${s.cycle_id}` }, { label: "Rincian siklus", href: `/siklus?c=${s.cycle_id}` }],
  };
}

export async function jalankanAlat(nama: string, input: Record<string, unknown>): Promise<HasilAlat> {
  const sb = await createClient();
  const teks = (k: string) => (typeof input[k] === "string" ? (input[k] as string).slice(0, 40) : undefined);
  switch (nama) {
    case "piutang_terlambat": return piutangTerlambat(sb);
    case "saldo_kas": return saldoKas(sb);
    case "hasil_per_ekor": return hasilEkor(sb, { produksi: teks("produksi") });
    case "jadwal_bentrok": return jadwalBentrok(sb);
    case "perlu_persetujuan": return perluPersetujuan(sb);
    case "isi_gudang_dingin": return isiGudang(sb);
    case "kelengkapan_dokumen": return kelengkapan(sb);
    case "biaya_siklus": return biayaSiklus(sb, { siklus: teks("siklus") });
    default: throw new Error(`Alat tidak dikenal: ${nama}`);
  }
}
