import "server-only";
import { hariIni, rp, tanggal } from "@/lib/format";
import { boleh, type Sesi } from "@/lib/izin";
import { cariBentrok } from "@/lib/logic/jadwal";
import { hasilPerEkor } from "@/lib/logic/grid";
import { formatKg } from "@/lib/logic/neraca";
import { createClient } from "@/lib/supabase/server";

/* Alat baca terbatas untuk Asisten AI (F22). Semuanya HANYA MEMBACA dan memakai klien pengguna yang bertanya,
   jadi RLS dan izin database tetap berlaku: yang tidak boleh dilihat pengguna tidak akan pernah sampai ke Asisten.
   Tautan hanya ke halaman internal yang sudah dikenal. */

export type Tautan = { label: string; href: string };
/** Rincian berbentuk tabel; kolom ke-`kananDari` dan seterusnya rata kanan (angka). */
export type TabelAlat = { kepala: string[]; baris: string[][]; kananDari?: number };
/** Satu bagian dalam laporan berbagian: judul, beberapa kalimat ringkas, dan satu tabel. */
export type BagianLaporan = { judul: string; ringkas?: string[]; tabel?: TabelAlat };
export type Laporan = { judul: string; periode: string; dibuat: string; bagian: BagianLaporan[] };
export type HasilAlat = { ringkas: string[]; data: unknown; tautan: Tautan[]; tabel?: TabelAlat; laporan?: Laporan };

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
  { nama: "laporan_periode", label: "Laporan lengkap", deskripsi: "Laporan siap baca untuk satu periode: aktivitas (pembelian, ikan diterima, loin, penjualan, uang masuk dan keluar), posisi sekarang (kas, piutang, utang), isi tiap ruangan gudang dingin, barang penunjang yang menipis, dan hal yang menunggu keputusan. Hanya bagian yang boleh dilihat pengguna yang ikut.",
    izin: ["keuangan.read", "laporan.read", "penjualan.read", "pembelian.read", "produksi.read", "stok.read", "gudang.read"],
    skema: { type: "object", properties: { periode: { type: "string", description: "hari_ini, minggu_ini (Senin sampai hari ini), atau bulan_ini. Bila tidak disebut, pakai hari_ini." } } } },
  { nama: "isi_ruangan", label: "Isi tiap ruangan gudang", deskripsi: "Isi dan kapasitas tiap ruangan gudang dingin (ABF 1, 2, 3 dan Cold Storage 1), dipisah milik sendiri dan titipan, beserta yang belum ditempatkan di ruangan.", izin: ["gudang.read", "stok.read"], skema: { type: "object", properties: {} } },
  { nama: "barang_menipis", label: "Barang penunjang menipis", deskripsi: "Barang penunjang kerja dan penunjang pekerja (apron, masker, kemasan, dan sejenisnya) yang stoknya sudah di bawah minimum atau habis.", izin: ["stok.read"], skema: { type: "object", properties: {} } },
  { nama: "biaya_siklus", label: "Biaya dan laba satu siklus", deskripsi: "Pendapatan, biaya (ikan dan biaya lain per kategori), dan laba kotor satu siklus. Tanpa kode siklus, dipakai siklus terbaru.", izin: ["keuangan.read", "laporan.read"],
    skema: { type: "object", properties: { siklus: { type: "string", description: "Kode siklus, misalnya SIK-0001. Boleh dikosongkan." } } } },
];

type Sb = Awaited<ReturnType<typeof createClient>>;
/** Berat dengan koma desimal dan tanpa nol di belakang yang tidak perlu, sama dengan gaya jawaban Asisten (300,94 kg). */
const kg = (n: number) => `${formatKg(Number(n))} kg`;

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
  const ruangan = await bacaRuangan(sb);
  const tabelIsi: TabelAlat = { kepala: ["Isi gudang", "Berat"], kananDari: 1, baris: [["Stok milik sendiri", kg(g.isi_sendiri_kg)], ...[...per.entries()].map(([n, gram]) => [`Titipan ${n}`, kg(gram / 1000)])] };
  return {
    ringkas: [`Gudang terisi ${kg(total)} dari kapasitas ${kg(g.kapasitas_kg)}; sisa ruang ${kg(Math.max(0, g.kapasitas_kg - total))}.`],
    // Dengan ruangan: dua tabel (per ruangan, lalu milik sendiri dan titipan) dalam satu laporan kecil. Tanpa ruangan: satu tabel seperti dulu.
    tabel: ruangan ? undefined : tabelIsi,
    laporan: ruangan ? { judul: "Isi gudang dingin", periode: tanggal(hariIni()), dibuat: new Date().toISOString(), bagian: [{ judul: "Per ruangan", tabel: tabelRuangan(ruangan) }, { judul: "Milik sendiri dan titipan", tabel: tabelIsi }] } : undefined,
    data: { ...g, titipanPerPelanggan: Object.fromEntries(per), ruangan: ruangan?.ruangan ?? [] }, tautan: [{ label: "Gudang dingin", href: "/gudang" }, { label: "Stok", href: "/stok" }],
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

/* ------------------------------------------------- ruangan dan penunjang */
type RuanganBaris = { kode: string; nama: string; jenis: string; kapasitas_kg: number; isi_kg: number; isi_sendiri_kg: number; isi_titipan_kg: number; jumlah_unit: number };
const persen1 = (n: number) => n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

async function bacaRuangan(sb: Sb): Promise<{ ruangan: RuanganBaris[]; belumDitempatkan: number } | null> {
  const [r, g] = await Promise.all([
    sb.from("v_ruangan_isi").select("kode, nama, jenis, kapasitas_kg, isi_kg, isi_sendiri_kg, isi_titipan_kg, jumlah_unit").eq("aktif", true).order("urutan"),
    sb.from("v_gudang_isi").select("isi_sendiri_kg, isi_titipan_kg").maybeSingle(),
  ]);
  if (r.error || !r.data || r.data.length === 0) return null;
  const ruangan = r.data.map((x) => ({ ...x, kapasitas_kg: Number(x.kapasitas_kg), isi_kg: Number(x.isi_kg), isi_sendiri_kg: Number(x.isi_sendiri_kg), isi_titipan_kg: Number(x.isi_titipan_kg) })) as RuanganBaris[];
  const total = Number(g.data?.isi_sendiri_kg ?? 0) + Number(g.data?.isi_titipan_kg ?? 0);
  const diRuangan = ruangan.reduce((a, x) => a + Math.round(x.isi_kg * 1000), 0) / 1000;
  return { ruangan, belumDitempatkan: Math.max(0, Math.round((total - diRuangan) * 1000) / 1000) };
}

const tabelRuangan = (d: { ruangan: RuanganBaris[]; belumDitempatkan: number }): TabelAlat => ({
  kepala: ["Ruangan", "Terisi", "Kapasitas", "Persen"], kananDari: 1,
  baris: [
    ...d.ruangan.map((x) => [x.nama, kg(x.isi_kg), kg(x.kapasitas_kg), `${persen1(x.kapasitas_kg > 0 ? (x.isi_kg / x.kapasitas_kg) * 100 : 0)}%`]),
    ...(d.belumDitempatkan > 0 ? [["Belum ditempatkan", kg(d.belumDitempatkan), "-", "-"]] : []),
  ],
});

async function isiRuangan(sb: Sb): Promise<HasilAlat> {
  const d = await bacaRuangan(sb);
  if (!d) return { ringkas: ["Ruangan gudang dingin belum diatur."], data: null, tautan: [{ label: "Gudang dingin", href: "/gudang" }] };
  const total = d.ruangan.reduce((a, x) => a + Math.round(x.isi_kg * 1000), 0) / 1000;
  const kap = d.ruangan.reduce((a, x) => a + Math.round(x.kapasitas_kg * 1000), 0) / 1000;
  const penuh = d.ruangan.filter((x) => x.kapasitas_kg > 0 && x.isi_kg / x.kapasitas_kg > 0.9).map((x) => x.nama);
  return {
    ringkas: [
      `${d.ruangan.length} ruangan terisi ${kg(total)} dari kapasitas ${kg(kap)} (${persen1(kap > 0 ? (total / kap) * 100 : 0)}%).`,
      penuh.length > 0 ? `Hampir penuh (di atas 90%): ${penuh.join(", ")}.` : "Tidak ada ruangan yang hampir penuh.",
      ...(d.belumDitempatkan > 0 ? [`${kg(d.belumDitempatkan)} belum ditempatkan di ruangan tertentu.`] : []),
    ],
    tabel: tabelRuangan(d), data: d, tautan: [{ label: "Gudang dingin", href: "/gudang" }, { label: "Stok", href: "/stok" }],
  };
}

type BarangBaris = { kode: string; kategori: string; nama: string; satuan: string; stok: number; stok_minimum: number; status_stok: string };
async function barangMenipis(sb: Sb): Promise<HasilAlat> {
  const { data, error } = await sb.from("v_supply_stok").select("kode, kategori, nama, satuan, stok, stok_minimum, status_stok").eq("aktif", true).in("status_stok", ["menipis", "habis"]).order("status_stok").order("nama").limit(40);
  if (error) return { ringkas: ["Stok penunjang belum bisa dibaca."], data: null, tautan: [{ label: "Stok", href: "/stok" }] };
  const baris = (data ?? []) as BarangBaris[];
  const habis = baris.filter((b) => b.status_stok === "habis").length;
  return {
    ringkas: baris.length === 0 ? ["Semua barang penunjang masih di atas stok minimum."] : [`${baris.length} barang penunjang perlu diisi ulang: ${baris.length - habis} menipis dan ${habis} habis.`],
    tabel: baris.length === 0 ? undefined : {
      kepala: ["Barang", "Kelompok", "Status", "Stok", "Minimum"], kananDari: 3,
      baris: baris.map((b) => [b.nama, b.kategori === "kerja" ? "Penunjang kerja" : "Penunjang pekerja", b.status_stok === "habis" ? "Habis" : "Menipis", `${formatKg(Number(b.stok))} ${b.satuan}`, `${formatKg(Number(b.stok_minimum))} ${b.satuan}`]),
    },
    data: baris, tautan: [{ label: "Penunjang kerja", href: "/stok?tab=kerja" }, { label: "Penunjang pekerja", href: "/stok?tab=pekerja" }],
  };
}

/* ------------------------------------------------------------- laporan */
const PERIODE = { hari_ini: "hari ini", minggu_ini: "minggu ini", bulan_ini: "bulan ini" } as const;
type Periode = keyof typeof PERIODE;
const tambahHari = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
/** Awal periode (inklusif) dalam tanggal Jakarta. Minggu dimulai hari Senin. */
export function awalPeriode(p: Periode, hari: string): string {
  if (p === "hari_ini") return hari;
  if (p === "bulan_ini") return `${hari.slice(0, 7)}-01`;
  const [y, m, d] = hari.split("-").map(Number);
  const sejakSenin = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return tambahHari(hari, -sejakSenin);
}

async function laporanPeriode(sb: Sb, sesi: Sesi | undefined, input: { periode?: string }): Promise<HasilAlat> {
  const periode: Periode = input.periode && Object.hasOwn(PERIODE, input.periode) ? (input.periode as Periode) : "hari_ini";
  const hari = hariIni();
  const mulai = awalPeriode(periode, hari);
  const izin = (a: string) => (sesi ? boleh(sesi, a) : false);
  const bagian: BagianLaporan[] = [];
  const tautan: Tautan[] = [{ label: "Dashboard", href: "/dashboard" }];

  const [h, d] = await Promise.all([
    sb.from("v_ringkasan_harian").select("*").gte("tanggal", mulai).lte("tanggal", hari),
    sb.from("v_dashboard").select("*").maybeSingle(),
  ]);
  if (h.error || d.error || !d.data) throw new Error("Gagal membaca laporan.");
  const jumlah = (k: string) => (h.data ?? []).reduce((a, r) => a + Math.round(Number((r as Record<string, unknown>)[k] ?? 0) * 1000), 0) / 1000;
  const dash = d.data as Record<string, number>;
  const periodeTeks = mulai === hari ? tanggal(hari) : `${tanggal(mulai)} s.d. ${tanggal(hari)}`;

  // 1. Aktivitas dalam periode. Hanya baris yang boleh dilihat pengguna ini, supaya "0" tidak menyesatkan.
  const aktivitas: string[][] = [];
  if (izin("pembelian.read")) aktivitas.push(["Pembelian ikan (PO disetujui)", `${rp(jumlah("nilai_beli"))} · ${jumlah("jumlah_po")} PO`]);
  if (izin("mutu.read") || izin("pembelian.read")) aktivitas.push(["Ikan diterima", kg(jumlah("kg_diterima"))]);
  if (izin("produksi.read")) aktivitas.push(["Loin dihasilkan", kg(jumlah("kg_loin"))]);
  if (izin("penjualan.read")) aktivitas.push(["Penjualan terkirim", `${rp(jumlah("nilai_penjualan"))} · ${kg(jumlah("kg_kirim"))}`]);
  if (izin("keuangan.read")) aktivitas.push(["Uang masuk", rp(jumlah("uang_masuk"))], ["Uang keluar", rp(jumlah("uang_keluar"))], ["Selisih kas", rp(Math.round((jumlah("uang_masuk") - jumlah("uang_keluar")) * 100) / 100)]);
  if (aktivitas.length > 0) bagian.push({ judul: `Aktivitas ${PERIODE[periode]}`, tabel: { kepala: ["Kegiatan", "Jumlah"], kananDari: 1, baris: aktivitas } });

  // 2. Posisi saat ini.
  const posisi: string[][] = [];
  if (izin("penjualan.read")) posisi.push(["Piutang (belum dibayar pembeli)", rp(dash.piutang)], ["Piutang terlambat", dash.invoice_terlambat > 0 ? `${rp(dash.piutang_terlambat)} · ${dash.invoice_terlambat} invoice` : "Tidak ada"]);
  if (izin("pembelian.read")) posisi.push(["Utang ke pemasok", rp(dash.hutang_pemasok)]);
  if (izin("keuangan.read")) posisi.push(["Kas bulan ini (masuk dikurangi keluar)", rp(Math.round((dash.kas_masuk_bulan_ini - dash.kas_keluar_bulan_ini) * 100) / 100)]);
  if (izin("stok.read")) posisi.push(["Stok ikan milik sendiri", kg(dash.stok_sendiri_kg)], ["Titipan pelanggan", kg(dash.stok_titipan_kg)]);
  if (posisi.length > 0) bagian.push({ judul: "Posisi sekarang", tabel: { kepala: ["Pos", "Nilai"], kananDari: 1, baris: posisi } });

  // 3. Ruangan gudang dingin.
  if (izin("gudang.read") || izin("stok.read")) {
    const r = await bacaRuangan(sb);
    if (r) {
      const penuh = r.ruangan.filter((x) => x.kapasitas_kg > 0 && x.isi_kg / x.kapasitas_kg > 0.9).map((x) => x.nama);
      bagian.push({ judul: "Gudang dingin per ruangan", ringkas: penuh.length > 0 ? [`Hampir penuh: ${penuh.join(", ")}.`] : undefined, tabel: tabelRuangan(r) });
      tautan.push({ label: "Gudang dingin", href: "/gudang" });
    }
  }

  // 4. Barang penunjang yang perlu diisi ulang.
  if (izin("stok.read") && dash.barang_menipis !== undefined) {
    const b = await barangMenipis(sb);
    bagian.push({ judul: "Barang penunjang perlu diisi ulang", ringkas: b.ringkas, tabel: b.tabel });
    tautan.push({ label: "Stok penunjang", href: "/stok?tab=kerja" });
  }

  // 5. Menunggu keputusan atau pemeriksaan.
  const tunggu: string[][] = [];
  if (izin("persetujuan.read")) tunggu.push(["PO menunggu persetujuan", String(dash.persetujuan_menunggu)]);
  if (izin("keuangan.read")) tunggu.push(["Biaya menunggu Owner", String(dash.biaya_menunggu)]);
  if (izin("stok.read")) tunggu.push(["Koreksi stok menunggu Owner", String(dash.koreksi_menunggu)]);
  if (izin("produksi.read")) tunggu.push(["Produksi menunggu pemeriksaan", String(dash.produksi_menunggu)], ["Produksi berjalan", String(dash.produksi_berjalan)]);
  if (izin("mutu.read")) tunggu.push(["Lot menunggu cek mutu", String(dash.lot_menunggu_mutu)]);
  if (izin("penjualan.read")) tunggu.push(["Pesanan belum dikirim", String(dash.pesanan_belum_dikirim)]);
  if (tunggu.length > 0) bagian.push({ judul: "Menunggu keputusan atau tindakan", tabel: { kepala: ["Urusan", "Jumlah"], kananDari: 1, baris: tunggu } });

  // 6. Tagihan yang terlambat.
  if (izin("penjualan.read") && dash.invoice_terlambat > 0) {
    const { data } = await sb.from("v_invoices").select("kode, buyer_nama, sisa, hari_telat").eq("status_tagihan", "terlambat").order("hari_telat", { ascending: false }).limit(8);
    if (data && data.length > 0) {
      bagian.push({ judul: "Tagihan terlambat", tabel: { kepala: ["Invoice", "Pembeli", "Terlambat", "Sisa"], kananDari: 2, baris: data.map((r) => [r.kode as string, r.buyer_nama as string, `${r.hari_telat} hari`, rp(Number(r.sisa))]) } });
      tautan.push({ label: "Piutang dan invoice", href: "/penjualan" });
    }
  }

  const judul = `Laporan ${PERIODE[periode]}`;
  const sorot: string[] = [];
  if (izin("keuangan.read")) sorot.push(`uang masuk ${rp(jumlah("uang_masuk"))}, uang keluar ${rp(jumlah("uang_keluar"))}`);
  if (izin("penjualan.read") && dash.invoice_terlambat > 0) sorot.push(`${dash.invoice_terlambat} invoice terlambat senilai ${rp(dash.piutang_terlambat)}`);
  if (dash.barang_menipis !== undefined && izin("stok.read") && dash.barang_menipis + (dash.barang_habis ?? 0) > 0) sorot.push(`${dash.barang_menipis + (dash.barang_habis ?? 0)} barang penunjang perlu diisi ulang`);
  const laporan: Laporan = { judul, periode: periodeTeks, dibuat: new Date().toISOString(), bagian };
  return {
    ringkas: [`${judul} (${periodeTeks}): ${sorot.length > 0 ? sorot.join("; ") : "belum ada angka yang bisa ditampilkan untuk peran ini"}.`],
    data: { periode, mulai, sampai: hari, bagian: bagian.map((b) => b.judul) }, tautan, laporan,
  };
}

export async function jalankanAlat(nama: string, input: Record<string, unknown>, sesi?: Sesi): Promise<HasilAlat> {
  const sb = await createClient();
  const teks = (k: string) => (typeof input[k] === "string" ? (input[k] as string).slice(0, 40) : undefined);
  switch (nama) {
    case "laporan_periode": return laporanPeriode(sb, sesi, { periode: teks("periode") });
    case "isi_ruangan": return isiRuangan(sb);
    case "barang_menipis": return barangMenipis(sb);
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
