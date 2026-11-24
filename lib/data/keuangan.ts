import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Dokumen, Opsi } from "@/lib/types/pembelian";
import type { BarisKas, Biaya, BiayaTetap, Dashboard, KategoriBiaya } from "@/lib/types/keuangan";
import { liniInvoice, type LiniBiaya } from "@/lib/logic/lini";

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function daftarBiaya(): Promise<Biaya[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_expenses").select("*").order("tanggal").order("kode").limit(5000);
  if (error) gagal("daftar biaya");
  return (data ?? []) as Biaya[];
}

/** Ringkasan satu lini bisnis bulan ini (25 Nov 2026): pendapatan (subtotal - diskon, tanpa pajak), uang masuk, biaya disetujui,
    dan piutang (semua waktu). */
export async function ringkasLini(lini: LiniBiaya, bulan: string): Promise<{ pendapatan: number; uangMasuk: number; biaya: number; piutang: number }> {
  const sb = await createClient();
  const awal = `${bulan}-01`;
  const [y, m] = bulan.split("-").map(Number);
  const akhir = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const [inv, bayar, biaya] = await Promise.all([
    sb.from("v_invoices").select("id, jenis, tanggal, subtotal, diskon, sisa, status_tagihan, cycle_id").neq("status_terbit", "dibatalkan").limit(2000),
    sb.from("customer_payments").select("jumlah, tanggal, invoice_id").gte("tanggal", awal).lte("tanggal", akhir).limit(2000),
    sb.from("expenses").select("jumlah").eq("status", "disetujui").eq("lini_bisnis", lini).gte("tanggal", awal).lte("tanggal", akhir).limit(2000),
  ]);
  if (inv.error || bayar.error || biaya.error) gagal("ringkasan lini bisnis");
  const idProyek = [...new Set((inv.data ?? []).map((i) => i.cycle_id as string | null).filter((x): x is string => !!x))];
  const { data: cy } = idProyek.length > 0 ? await sb.from("cycles").select("id, lini_bisnis").in("id", idProyek) : { data: [] as { id: string; lini_bisnis: string }[] };
  const liniProyek = new Map((cy ?? []).map((c) => [c.id as string, c.lini_bisnis as string]));
  const punya = (inv.data ?? []).filter((i) => liniInvoice(i.jenis as string, i.cycle_id ? liniProyek.get(i.cycle_id as string) : null) === lini);
  const idPunya = new Set(punya.map((i) => i.id as string));
  const sen = (n: unknown) => Math.round(Number(n ?? 0) * 100);
  return {
    pendapatan: punya.filter((i) => (i.tanggal as string) >= awal && (i.tanggal as string) <= akhir).reduce((a, i) => a + sen(i.subtotal) - sen(i.diskon), 0) / 100,
    uangMasuk: (bayar.data ?? []).filter((b) => idPunya.has(b.invoice_id as string)).reduce((a, b) => a + sen(b.jumlah), 0) / 100,
    biaya: (biaya.data ?? []).reduce((a, b) => a + sen(b.jumlah), 0) / 100,
    piutang: punya.reduce((a, i) => a + sen(i.sisa), 0) / 100,
  };
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
  const { data, error } = await sb.from("ledger").select("*").order("tanggal").order("dibuat_pada").limit(10000);
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
