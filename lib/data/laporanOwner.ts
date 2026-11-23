import "server-only";
import { hariIni } from "@/lib/format";
import { jumlahPer, loinPerGrade, rentangPeriode, ringkasProduksi, seriHarian, totalBulat, type PeriodeOwner, type Porsi, type TitikHarian } from "@/lib/logic/laporanOwner";
import type { StatusTagihan } from "@/lib/logic/penjualan";
import { hitungSaldo } from "@/lib/logic/dashboardOwner";
import { createClient } from "@/lib/supabase/server";
import type { ProduksiBaris } from "@/lib/types/produksi";

/* Data laporan khusus owner (23 Nov 2026). Klien pengguna, jadi RLS berlaku. Kalau satu bagian gagal, bagian itu kosong aja. */

async function aman<T>(p: PromiseLike<T>, kosong: T): Promise<T> {
  try {
    return await p;
  } catch {
    return kosong;
  }
}

export type TrenOwner = { dari: string; sampai: string; ikanMasuk: TitikHarian[]; loin: TitikHarian[]; uangMasuk: TitikHarian[]; uangKeluar: TitikHarian[] };

/** Tren harian 30 hari terakhir buat dashboard owner. Tiap seri cuma diambil kalau izinnya ada. */
export async function trenOwner(izin: { mutu: boolean; produksi: boolean; keuangan: boolean }): Promise<TrenOwner> {
  const sb = await createClient();
  const { dari, sampai } = rentangPeriode(hariIni(), "30");
  const [lots, prod, kas] = await Promise.all([
    izin.mutu ? aman(sb.from("lots").select("tanggal_terima, kg").gte("tanggal_terima", dari).lte("tanggal_terima", sampai).limit(5000).then((r) => r.data ?? []), []) : Promise.resolve([]),
    izin.produksi ? aman(sb.from("v_productions").select("tanggal, loin_kg").gte("tanggal", dari).lte("tanggal", sampai).limit(5000).then((r) => r.data ?? []), []) : Promise.resolve([]),
    izin.keuangan ? aman(sb.from("ledger").select("tanggal, arah, jumlah").gte("tanggal", dari).lte("tanggal", sampai).limit(20000).then((r) => r.data ?? []), []) : Promise.resolve([]),
  ]);
  const l = lots as { tanggal_terima: string; kg: number }[];
  const p = prod as { tanggal: string; loin_kg: number }[];
  const k = kas as { tanggal: string; arah: string; jumlah: number }[];
  return {
    dari, sampai,
    ikanMasuk: izin.mutu ? seriHarian(l, dari, sampai, (r) => r.tanggal_terima, (r) => r.kg) : [],
    loin: izin.produksi ? seriHarian(p, dari, sampai, (r) => r.tanggal, (r) => r.loin_kg) : [],
    uangMasuk: izin.keuangan ? seriHarian(k.filter((r) => r.arah === "masuk"), dari, sampai, (r) => r.tanggal, (r) => r.jumlah, 100) : [],
    uangKeluar: izin.keuangan ? seriHarian(k.filter((r) => r.arah === "keluar"), dari, sampai, (r) => r.tanggal, (r) => r.jumlah, 100) : [],
  };
}

export type LaporanProduksiOwner = {
  periode: PeriodeOwner;
  dari: string;
  sampai: string;
  ringkas: ReturnType<typeof ringkasProduksi>;
  loinHarian: TitikHarian[];
  grade: ReturnType<typeof loinPerGrade>;
  targetPct: number | null;
  daftar: ProduksiBaris[];
};

/** Laporan produksi buat owner per periode: total, yield dibanding target, loin per hari, loin per grade, daftar produksi. */
export async function laporanProduksiOwner(periode: PeriodeOwner): Promise<LaporanProduksiOwner> {
  const sb = await createClient();
  const { dari, sampai } = rentangPeriode(hariIni(), periode);
  const [{ data: rows }, { data: target }] = await Promise.all([
    sb.from("v_productions").select("*").gte("tanggal", dari).lte("tanggal", sampai).order("tanggal", { ascending: false }).order("kode", { ascending: false }).limit(500),
    sb.from("settings").select("nilai").eq("kunci", "rencana_hasil_pct").maybeSingle(),
  ]);
  const daftar = (rows ?? []) as ProduksiBaris[];
  const ids = daftar.map((r) => r.id);
  const [total, potong] = ids.length > 0
    ? await Promise.all([
        sb.from("production_loin_totals").select("kg, grades(kode, urutan)").in("production_id", ids).gt("kg", 0),
        sb.from("production_items").select("kg, grades(kode, urutan)").in("production_id", ids).eq("batal", false),
      ])
    : [{ data: [] }, { data: [] }];
  const baris = [...(total.data ?? []), ...(potong.data ?? [])] as unknown as { kg: number; grades: { kode: string; urutan: number } | null }[];
  const t = Number(target?.nilai);
  return {
    periode, dari, sampai,
    ringkas: ringkasProduksi(daftar),
    loinHarian: seriHarian(daftar, dari, sampai, (r) => r.tanggal, (r) => r.loin_kg),
    grade: loinPerGrade(baris),
    targetPct: Number.isFinite(t) && t > 0 ? t : null,
    daftar,
  };
}

/* ------------------------------------------------------------------ mutu dan penerimaan */
export type LotOwner = { id: string; kode: string; tanggal_terima: string; kg: number; qc: "menunggu" | "lulus" | "ditahan"; pemasok: string; proyek: string | null; grade: string };
export type LaporanMutuOwner = {
  periode: PeriodeOwner; dari: string; sampai: string;
  totalKg: number; jumlahLot: number; menunggu: number; ditahan: number; ditahanKg: number;
  harian: TitikHarian[]; grade: Porsi[]; pemasok: Porsi[]; daftar: LotOwner[];
};

/** Ikan yg diterima per periode: total, yg belum digrade, yg ditahan, grade tuna utuh, pemasok terbesar. */
export async function laporanMutuOwner(periode: PeriodeOwner): Promise<LaporanMutuOwner> {
  const sb = await createClient();
  const { dari, sampai } = rentangPeriode(hariIni(), periode);
  const { data } = await sb.from("lots").select("id, kode, tanggal_terima, kg, qc, suppliers(nama), cycles(kode, nama), lot_grades(kg, grades(kode))")
    .gte("tanggal_terima", dari).lte("tanggal_terima", sampai).order("tanggal_terima", { ascending: false }).order("kode", { ascending: false }).limit(3000);
  type Baris = { id: string; kode: string; tanggal_terima: string; kg: number; qc: LotOwner["qc"]; suppliers: { nama: string } | null;
    cycles: { kode: string; nama: string | null } | null; lot_grades: { kg: number; grades: { kode: string } | null }[] | null };
  const rows = (data ?? []) as unknown as Baris[];
  const gradeBaris = rows.filter((r) => r.qc !== "ditahan").flatMap((r) => (r.lot_grades ?? []).filter((x) => Number(x.kg) > 0));
  const daftar: LotOwner[] = rows.map((r) => ({
    id: r.id, kode: r.kode, tanggal_terima: r.tanggal_terima, kg: Number(r.kg), qc: r.qc, pemasok: r.suppliers?.nama ?? "",
    proyek: r.cycles ? [r.cycles.kode, r.cycles.nama].filter(Boolean).join(" · ") : null,
    grade: (r.lot_grades ?? []).filter((x) => Number(x.kg) > 0).map((x) => x.grades?.kode ?? "").filter(Boolean).join(", "),
  }));
  const ditahan = rows.filter((r) => r.qc === "ditahan");
  return {
    periode, dari, sampai,
    totalKg: totalBulat(rows, (r) => r.kg), jumlahLot: rows.length,
    menunggu: rows.filter((r) => r.qc === "menunggu").length, ditahan: ditahan.length, ditahanKg: totalBulat(ditahan, (r) => r.kg),
    harian: seriHarian(rows, dari, sampai, (r) => r.tanggal_terima, (r) => r.kg),
    grade: jumlahPer(gradeBaris, (x) => x.grades?.kode ?? "?", (x) => x.kg),
    pemasok: jumlahPer(rows, (r) => r.suppliers?.nama ?? "", (r) => r.kg, 1000, 5),
    daftar,
  };
}

/* ------------------------------------------------------------------ penjualan */
export type TagihanOwner = { id: string; kode: string; jenis: "penjualan" | "gudang_dingin"; buyer_nama: string; tanggal: string; jatuh_tempo: string;
  total: number; dibayar: number; sisa: number; status_tagihan: StatusTagihan; hari_telat: number };
export type LaporanPenjualanOwner = {
  periode: PeriodeOwner; dari: string; sampai: string;
  ditagih: number; diterima: number; kgTerkirim: number; jumlahPesanan: number; belumDikirim: number;
  piutang: number; telat: number; telatRp: number;
  harian: TitikHarian[]; pembeli: Porsi[]; belumLunas: TagihanOwner[];
};

/** Penjualan per periode: yg ditagih, uang yg masuk, barang terkirim, pembeli terbesar, tagihan yg belum lunas (semua periode). */
export async function laporanPenjualanOwner(periode: PeriodeOwner): Promise<LaporanPenjualanOwner> {
  const sb = await createClient();
  const { dari, sampai } = rentangPeriode(hariIni(), periode);
  const kolom = "id, kode, jenis, buyer_nama, tanggal, jatuh_tempo, total, dibayar, sisa, status_tagihan, hari_telat";
  const [inv, buka, bayar, pesanan, draf] = await Promise.all([
    aman(sb.from("v_invoices").select(kolom).neq("status_terbit", "dibatalkan").gte("tanggal", dari).lte("tanggal", sampai).limit(3000).then((r) => r.data ?? []), []),
    aman(sb.from("v_invoices").select(kolom).neq("status_terbit", "dibatalkan").gt("sisa", 0).order("jatuh_tempo").limit(300).then((r) => r.data ?? []), []),
    aman(sb.from("customer_payments").select("tanggal, jumlah").gte("tanggal", dari).lte("tanggal", sampai).limit(5000).then((r) => r.data ?? []), []),
    aman(sb.from("v_sales_orders").select("status, kg_final, dikirim_pada").neq("status", "dibatalkan").gte("tanggal", dari).lte("tanggal", sampai).limit(3000).then((r) => r.data ?? []), []),
    aman(sb.from("v_sales_orders").select("id", { count: "exact", head: true }).eq("status", "draf").then((r) => r.count ?? 0), 0),
  ]);
  const terbit = inv as unknown as TagihanOwner[];
  const belum = (buka as unknown as TagihanOwner[]).sort((a, b) => b.hari_telat - a.hari_telat || a.jatuh_tempo.localeCompare(b.jatuh_tempo));
  const telat = belum.filter((x) => x.status_tagihan === "terlambat");
  const p = pesanan as { status: string; kg_final: number }[];
  return {
    periode, dari, sampai,
    ditagih: totalBulat(terbit, (x) => x.total, 100),
    diterima: totalBulat(bayar as { jumlah: number }[], (x) => x.jumlah, 100),
    kgTerkirim: totalBulat(p.filter((x) => x.status === "terkirim"), (x) => x.kg_final),
    jumlahPesanan: p.length, belumDikirim: draf,
    piutang: totalBulat(belum, (x) => x.sisa, 100), telat: telat.length, telatRp: totalBulat(telat, (x) => x.sisa, 100),
    harian: seriHarian(terbit, dari, sampai, (x) => x.tanggal, (x) => x.total, 100),
    pembeli: jumlahPer(terbit, (x) => x.buyer_nama, (x) => x.total, 100, 5),
    belumLunas: belum,
  };
}

/* ------------------------------------------------------------------ keuangan */
export type BiayaOwner = { id: string; kode: string; kategori_nama: string; uraian: string; jumlah: number; tanggal: string; jml_nota: number };
export type LaporanKeuanganOwner = {
  periode: PeriodeOwner; dari: string; sampai: string;
  masuk: number; keluar: number; saldo: number | null;
  masukHarian: TitikHarian[]; keluarHarian: TitikHarian[];
  keluarPer: Porsi[]; masukPer: Porsi[]; biayaNunggu: BiayaOwner[];
};

/** Uang masuk dan keluar per periode (dari buku kas), pengeluaran per kategori, biaya yg nunggu persetujuan. */
export async function laporanKeuanganOwner(periode: PeriodeOwner): Promise<LaporanKeuanganOwner> {
  const sb = await createClient();
  const { dari, sampai } = rentangPeriode(hariIni(), periode);
  const [kas, biaya, saldo] = await Promise.all([
    aman(sb.from("ledger").select("tanggal, arah, jumlah, kategori_nama").gte("tanggal", dari).lte("tanggal", sampai).limit(20000).then((r) => r.data ?? []), []),
    aman(sb.from("v_expenses").select("id, kode, kategori_nama, uraian, jumlah, tanggal, jml_nota").eq("status", "diajukan").order("tanggal").limit(200).then((r) => r.data ?? []), []),
    // Saldo sama persis kayak di beranda owner: saldo awal (diatur owner) + saldo buku kas.
    aman(Promise.all([
      sb.from("v_saldo_kas").select("saldo_buku").maybeSingle(),
      sb.from("settings").select("nilai").eq("kunci", "saldo_awal_kas_rp").maybeSingle(),
    ]).then(([v, s]) => (v.error || !v.data ? null : hitungSaldo(Number(s.data?.nilai ?? 0) || 0, Number(v.data.saldo_buku ?? 0) || 0))), null),
  ]);
  const k = kas as { tanggal: string; arah: string; jumlah: number; kategori_nama: string }[];
  const masuk = k.filter((x) => x.arah === "masuk");
  const keluar = k.filter((x) => x.arah === "keluar");
  return {
    periode, dari, sampai,
    masuk: totalBulat(masuk, (x) => x.jumlah, 100), keluar: totalBulat(keluar, (x) => x.jumlah, 100), saldo,
    masukHarian: seriHarian(masuk, dari, sampai, (x) => x.tanggal, (x) => x.jumlah, 100),
    keluarHarian: seriHarian(keluar, dari, sampai, (x) => x.tanggal, (x) => x.jumlah, 100),
    keluarPer: jumlahPer(keluar, (x) => x.kategori_nama, (x) => x.jumlah, 100, 6),
    masukPer: jumlahPer(masuk, (x) => x.kategori_nama, (x) => x.jumlah, 100, 4),
    biayaNunggu: biaya as BiayaOwner[],
  };
}