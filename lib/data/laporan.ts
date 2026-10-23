import "server-only";
import type { BarisBiaya, BarisPendapatan, InputLabaRugi, KelompokPendapatan } from "@/lib/logic/labarugi";
import { jumlahBaris } from "@/lib/logic/penjualan";
import { createClient } from "@/lib/supabase/server";
import type { BarisHargaBeli, BarisLabaSiklus, DetailBaris, RingkasSiklus, Transaksi } from "@/lib/types/keuangan";

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function trenSiklus(): Promise<BarisLabaSiklus[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_laba_rugi_siklus").select("*").order("kode");
  if (error) gagal("laba rugi siklus");
  return (data ?? []) as BarisLabaSiklus[];
}

export async function hargaBeli(): Promise<BarisHargaBeli[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_harga_beli").select("*").order("tanggal", { ascending: false }).limit(2000);
  if (error) gagal("harga beli");
  return (data ?? []) as BarisHargaBeli[];
}

export type DataLabaRugi = {
  siklus: { id: string; kode: string; ref: string };
  input: InputLabaRugi;
  detailPendapatan: DetailBaris[];
  detailBiaya: DetailBaris[];
};

const KELOMPOK: Record<string, KelompokPendapatan> = { loin: "loin", hasil_samping: "hasil_samping", limbah: "limbah" };

/** Menyusun bahan laporan laba rugi satu siklus dari baris transaksi asli (penjualan terkirim, PO disetujui, biaya disetujui, neraca produksi). */
export async function dataLabaRugi(cycleId: string, rencanaPct: number): Promise<DataLabaRugi | null> {
  const sb = await createClient();
  const [cy, jual, po, biaya, prod] = await Promise.all([
    sb.from("cycles").select("id, kode, ref_po_pembeli").eq("id", cycleId).maybeSingle(),
    sb.from("sale_allocations")
      .select("id, product_nama, grade_kode, kelompok, harga_per_kg, kg_kirim, kg_diterima, unit_kode, order_id, sales_orders!inner(kode, cycle_id, status, buyer_nama, dikirim_pada)")
      .eq("batal", false).eq("sales_orders.cycle_id", cycleId).eq("sales_orders.status", "terkirim"),
    sb.from("purchase_orders").select("id, kode, kg, harga_per_kg, total, tanggal").eq("cycle_id", cycleId).eq("status_persetujuan", "disetujui").order("kode"),
    sb.from("expenses").select("id, kode, kategori_nama, uraian, jumlah, tanggal").eq("cycle_id", cycleId).eq("status", "disetujui").order("kode"),
    sb.from("v_productions").select("kode, masuk_kg, loin_kg, samping_kg, limbah_kg, susut_kg, belum_jelas_kg").eq("cycle_id", cycleId),
  ]);
  if (cy.error || jual.error || po.error || biaya.error || prod.error) gagal("bahan laporan");
  if (!cy.data) return null;

  // Pendapatan: satu baris per produk, grade, dan harga; rincian transaksi di bawahnya.
  const pend = new Map<string, { baris: BarisPendapatan; gram: number; trx: Transaksi[] }>();
  for (const r of jual.data ?? []) {
    const x = r as unknown as { id: string; product_nama: string; grade_kode: string | null; kelompok: string; harga_per_kg: number; kg_kirim: number | null; kg_diterima: number | null; unit_kode: string; order_id: string; sales_orders: { kode: string; buyer_nama: string; dikirim_pada: string | null } };
    const kg = x.kg_diterima ?? x.kg_kirim ?? 0;
    const label = `${x.product_nama}${x.grade_kode ? ` ${x.grade_kode}` : ""}`;
    const kunci = `${x.kelompok}|${label}|${x.harga_per_kg}`;
    const ada = pend.get(kunci) ?? { baris: { kelompok: KELOMPOK[x.kelompok] ?? "lainnya", label, kg: 0, hargaPerKg: Number(x.harga_per_kg) }, gram: 0, trx: [] };
    ada.gram += Math.round(kg * 1000);
    ada.trx.push({ kode: x.sales_orders.kode, uraian: `${x.sales_orders.buyer_nama} · ${x.unit_kode} · ${kg} kg`, jumlah: jumlahBaris(kg, Number(x.harga_per_kg)), tanggal: x.sales_orders.dikirim_pada?.slice(0, 10), href: `/penjualan?p=${x.order_id}` });
    pend.set(kunci, ada);
  }
  const pendBaris: BarisPendapatan[] = [];
  const detailPendapatan: DetailBaris[] = [];
  for (const v of [...pend.values()].sort((a, b) => a.baris.kelompok.localeCompare(b.baris.kelompok) || b.gram - a.gram)) {
    pendBaris.push({ ...v.baris, kg: v.gram / 1000 });
    detailPendapatan.push({ label: v.baris.label, transaksi: v.trx });
  }

  const nr = { masukKg: 0, loinKg: 0, hasilSampingKg: 0, limbahG: 0, susutG: 0, adaLimbah: false, adaSusut: false, belumJelasG: 0 };
  for (const p of prod.data ?? []) {
    nr.masukKg += Math.round(Number(p.masuk_kg) * 1000);
    nr.loinKg += Math.round(Number(p.loin_kg) * 1000);
    nr.hasilSampingKg += Math.round(Number(p.samping_kg) * 1000);
    nr.belumJelasG += Math.round(Number(p.belum_jelas_kg) * 1000);
    if (p.limbah_kg !== null) { nr.limbahG += Math.round(Number(p.limbah_kg) * 1000); nr.adaLimbah = true; }
    if (p.susut_kg !== null) { nr.susutG += Math.round(Number(p.susut_kg) * 1000); nr.adaSusut = true; }
  }
  // Limbah yang ditimbang dicatat dengan nilai Rp0 supaya terlihat di laporan.
  if (nr.adaLimbah && nr.limbahG > 0) pendBaris.push({ kelompok: "limbah", label: "Limbah (ditimbang total, dibuang)", kg: nr.limbahG / 1000, hargaPerKg: 0 });

  const biayaBaris: BarisBiaya[] = [];
  const detailBiaya: DetailBaris[] = [];
  const poList = po.data ?? [];
  if (poList.length > 0) {
    const jumlahSen = poList.reduce((a, p) => a + Math.round(Number(p.total) * 100), 0);
    const gram = poList.reduce((a, p) => a + Math.round(Number(p.kg) * 1000), 0);
    biayaBaris.push({ kategori: "Bahan baku: ikan utuh", jumlah: jumlahSen / 100, kg: gram / 1000, hargaPerKg: gram > 0 ? Math.round(jumlahSen / 100 / (gram / 1000)) : 0, ikan: true });
    detailBiaya.push({ label: "Bahan baku: ikan utuh", transaksi: poList.map((p) => ({ kode: p.kode as string, uraian: `${p.kg} kg × ${p.harga_per_kg}`, jumlah: Number(p.total), tanggal: p.tanggal as string, href: `/pembelian?po=${p.id}` })) });
  }
  const perKat = new Map<string, Transaksi[]>();
  for (const e of biaya.data ?? []) {
    const arr = perKat.get(e.kategori_nama as string) ?? [];
    arr.push({ kode: e.kode as string, uraian: e.uraian as string, jumlah: Number(e.jumlah), tanggal: e.tanggal as string, href: `/keuangan?b=${e.id}` });
    perKat.set(e.kategori_nama as string, arr);
  }
  for (const [kategori, trx] of perKat) {
    biayaBaris.push({ kategori, jumlah: trx.reduce((a, t) => a + Math.round(t.jumlah * 100), 0) / 100 });
    detailBiaya.push({ label: kategori, transaksi: trx });
  }

  return {
    siklus: { id: cy.data.id as string, kode: cy.data.kode as string, ref: (cy.data.ref_po_pembeli as string) ?? "" },
    input: {
      pendapatan: pendBaris,
      biaya: biayaBaris,
      neraca: {
        masukKg: nr.masukKg / 1000, loinKg: nr.loinKg / 1000, hasilSampingKg: nr.hasilSampingKg / 1000,
        limbahKg: nr.adaLimbah ? nr.limbahG / 1000 : null, susutKg: nr.adaSusut ? nr.susutG / 1000 : null, belumJelasKg: nr.belumJelasG / 1000,
      },
      rencanaHasilPct: rencanaPct,
    },
    detailPendapatan,
    detailBiaya,
  };
}

export async function rencanaHasil(): Promise<number> {
  const sb = await createClient();
  const { data } = await sb.from("settings").select("nilai").eq("kunci", "rencana_hasil_pct").maybeSingle();
  const n = Number(data?.nilai);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

export async function daftarRingkasSiklus(): Promise<RingkasSiklus[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_rincian_siklus").select("*").order("kode", { ascending: false });
  if (error) gagal("daftar siklus");
  return (data ?? []) as RingkasSiklus[];
}

export type RantaiSiklus = {
  ringkas: RingkasSiklus;
  po: { id: string; kode: string; supplier_nama: string; kg: number; total: number; status_persetujuan: string; total_bayar: number }[];
  lot: { id: string; kode: string; po_kode: string; kg: number; qc: string }[];
  produksi: { id: string; kode: string; status: string; masuk_kg: number; loin_kg: number }[];
  pesanan: { id: string; kode: string; buyer_nama: string; status: string; total_final: number; total_pesan: number; invoice_kode: string | null; invoice_id: string | null }[];
  invoice: { id: string; kode: string; total: number; sisa: number; status_tagihan: string }[];
  biaya: { id: string; kode: string; kategori_nama: string; jumlah: number; status: string }[];
};

/** Satu siklus dari beli sampai uang masuk: semua transaksi yang berkaitan, tanpa input ulang. */
export async function rantaiSiklus(id: string): Promise<RantaiSiklus | null> {
  const sb = await createClient();
  const [r, po, lot, pr, ps, inv, by] = await Promise.all([
    sb.from("v_rincian_siklus").select("*").eq("cycle_id", id).maybeSingle(),
    sb.from("v_purchase_orders").select("id, kode, supplier_nama, kg, total, status_persetujuan, total_bayar").eq("cycle_id", id).order("kode"),
    sb.from("lots").select("id, kode, po_kode, kg, qc").eq("cycle_id", id).order("kode"),
    sb.from("v_productions").select("id, kode, status, masuk_kg, loin_kg").eq("cycle_id", id).order("kode"),
    sb.from("v_sales_orders").select("id, kode, buyer_nama, status, total_final, total_pesan, invoice_kode, invoice_id").eq("cycle_id", id).order("kode"),
    sb.from("v_invoices").select("id, kode, total, sisa, status_tagihan").eq("cycle_id", id).neq("status_terbit", "dibatalkan").order("kode"),
    sb.from("v_expenses").select("id, kode, kategori_nama, jumlah, status").eq("cycle_id", id).order("kode"),
  ]);
  if (r.error) gagal("siklus");
  if (!r.data) return null;
  return {
    ringkas: r.data as RingkasSiklus,
    po: (po.data ?? []) as RantaiSiklus["po"],
    lot: (lot.data ?? []) as RantaiSiklus["lot"],
    produksi: (pr.data ?? []) as RantaiSiklus["produksi"],
    pesanan: (ps.data ?? []) as RantaiSiklus["pesanan"],
    invoice: (inv.data ?? []) as RantaiSiklus["invoice"],
    biaya: (by.data ?? []) as RantaiSiklus["biaya"],
  };
}
