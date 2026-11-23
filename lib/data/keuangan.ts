import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Dokumen, Opsi } from "@/lib/types/pembelian";
import type { BarisKas, Biaya, BiayaTetap, Dashboard, KategoriBiaya } from "@/lib/types/keuangan";

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function daftarBiaya(): Promise<Biaya[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_expenses").select("*").order("kode", { ascending: false }).limit(300);
  if (error) gagal("daftar biaya");
  return (data ?? []) as Biaya[];
}

/** Daftar biaya tetap, yg aktif dulu. */
export async function daftarBiayaTetap(): Promise<BiayaTetap[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("fixed_costs").select("id, nama, category_id, jumlah, aktif, catatan, kelompok, cara_bayar, bulan_bayar").order("aktif", { ascending: false }).order("nama");
  // Sebelum migrasi 20261123000400 tabelnya belum ada: daftarnya kosong aja, halaman tetap jalan.
  if (error) return [];
  return (data ?? []).map((x) => ({ ...x, jumlah: Number(x.jumlah) })) as BiayaTetap[];
}

export async function kategoriBiaya(): Promise<KategoriBiaya[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("expense_categories").select("id, nama, nota_wajib").eq("aktif", true).order("urutan");
  if (error) gagal("kategori biaya");
  return (data ?? []) as KategoriBiaya[];
}

/** Pilihan rujukan biaya: PO dan produksi terbaru. Dibaca dengan izin pengguna; yang tidak boleh dilihat tetap kosong. */
export async function rujukanBiaya(): Promise<{ po: Opsi[]; produksi: Opsi[] }> {
  const sb = await createClient();
  const [po, pr] = await Promise.all([
    sb.from("v_purchase_orders").select("id, kode, supplier_nama").in("status_persetujuan", ["diajukan", "disetujui"]).order("kode", { ascending: false }).limit(100),
    sb.from("productions").select("id, kode, tanggal").order("kode", { ascending: false }).limit(100),
  ]);
  return {
    po: (po.data ?? []).map((p) => ({ id: p.id as string, label: `${p.kode} · ${p.supplier_nama}` })),
    produksi: (pr.data ?? []).map((p) => ({ id: p.id as string, label: `${p.kode} · ${p.tanggal}` })),
  };
}

export async function bukuKas(): Promise<BarisKas[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("ledger").select("*").order("tanggal", { ascending: false }).order("dibuat_pada", { ascending: false }).limit(400);
  if (error) gagal("buku kas");
  return (data ?? []) as BarisKas[];
}

export async function berkasBiaya(id: string): Promise<Dokumen[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("documents").select("*").eq("ref_tabel", "expenses").eq("ref_id", id).order("dibuat_pada", { ascending: false });
  if (error) gagal("nota biaya");
  return (data ?? []) as Dokumen[];
}

export async function ambilDashboard(): Promise<Dashboard> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_dashboard").select("*").maybeSingle();
  if (error) gagal("dashboard");
  return data as Dashboard;
}

export async function bukuBulanan(): Promise<import("@/lib/types/keuangan").BukuBulanan[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_buku_bulanan").select("*").order("bulan", { ascending: false });
  if (error) gagal("rekap bulanan");
  return (data ?? []) as import("@/lib/types/keuangan").BukuBulanan[];
}
