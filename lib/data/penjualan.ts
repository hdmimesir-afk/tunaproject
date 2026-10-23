import "server-only";
import { tersedia } from "@/lib/logic/penjualan";
import { createClient } from "@/lib/supabase/server";
import type { Dokumen, Opsi } from "@/lib/types/pembelian";
import type { AlokasiJual, Invoice, JasaBelumDitagih, PembayaranPembeli, Pembeli, Pesanan, UnitJual } from "@/lib/types/penjualan";

/* Lapisan akses data penjualan. Klien pengguna, jadi RLS dan izin database berlaku. */

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function daftarPesanan(): Promise<Pesanan[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_sales_orders").select("*").order("kode", { ascending: false }).limit(200);
  if (error) gagal("daftar pesanan");
  return (data ?? []) as Pesanan[];
}

export async function daftarInvoice(): Promise<Invoice[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_invoices").select("*").neq("status_terbit", "dibatalkan").order("kode", { ascending: false }).limit(300);
  if (error) gagal("daftar invoice");
  return (data ?? []) as Invoice[];
}

export async function pembeliAktif(): Promise<Pembeli[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("buyers").select("id, nama, kontak, tempo_hari").eq("aktif", true).order("nama");
  if (error) gagal("daftar pembeli");
  return (data ?? []) as Pembeli[];
}

export async function siklusTerbuka(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("cycles").select("id, kode, ref_po_pembeli").eq("status", "terbuka").order("kode", { ascending: false }).limit(50);
  if (error) gagal("daftar siklus");
  return (data ?? []).map((c) => ({ id: c.id as string, label: c.ref_po_pembeli ? `${c.kode} · ${c.ref_po_pembeli}` : (c.kode as string) }));
}

/** Unit stok milik sendiri yang bisa dijual, dengan jumlah tersedia (sisa dikurangi pesanan draf lain). */
export async function unitDijual(kecualiPesanan?: string): Promise<UnitJual[]> {
  const sb = await createClient();
  const [u, a] = await Promise.all([
    sb.from("storage_units").select("id, kode, product_nama, grade_kode, kondisi, sisa_kg").eq("status", "aktif").is("buyer_id", null).order("kode"),
    sb.from("sale_allocations").select("unit_id, kg_pesan, order_id, sales_orders!inner(status)").eq("batal", false).eq("sales_orders.status", "draf"),
  ]);
  if (u.error || a.error) gagal("stok yang bisa dijual");
  const dipesan = new Map<string, number>();
  for (const r of a.data ?? []) {
    if (kecualiPesanan && r.order_id === kecualiPesanan) continue;
    dipesan.set(r.unit_id as string, (dipesan.get(r.unit_id as string) ?? 0) + Number(r.kg_pesan));
  }
  return (u.data ?? []).map((x) => ({
    id: x.id as string,
    kode: x.kode as string,
    label: `${x.kode} · ${x.product_nama}${x.grade_kode ? ` ${x.grade_kode}` : ""} · ${x.kondisi}`,
    sisaKg: Number(x.sisa_kg),
    tersediaKg: tersedia(Number(x.sisa_kg), dipesan.get(x.id as string) ?? 0),
  }));
}

export async function jasaBelumDitagih(): Promise<JasaBelumDitagih[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("service_charges").select("id, kode, buyer_id, pemilik_nama, jenis, jumlah, kg_dasar").is("invoice_id", null).not("buyer_id", "is", null).gt("jumlah", 0).order("dibuat_pada");
  if (error) gagal("tagihan jasa");
  return (data ?? []) as JasaBelumDitagih[];
}

export type DetailPesanan = { pesanan: Pesanan; baris: AlokasiJual[]; invoice: Invoice | null };

export async function detailPesanan(id: string): Promise<DetailPesanan | null> {
  const sb = await createClient();
  const [p, b, i] = await Promise.all([
    sb.from("v_sales_orders").select("*").eq("id", id).maybeSingle(),
    sb.from("sale_allocations").select("*").eq("order_id", id).eq("batal", false).order("dibuat_pada"),
    sb.from("v_invoices").select("*").eq("order_id", id).eq("status_terbit", "terbit").maybeSingle(),
  ]);
  if (p.error || b.error || i.error) gagal("detail pesanan");
  if (!p.data) return null;
  return { pesanan: p.data as Pesanan, baris: (b.data ?? []) as AlokasiJual[], invoice: (i.data as Invoice | null) ?? null };
}

export type DetailInvoice = { invoice: Invoice; pembayaran: PembayaranPembeli[]; dokumen: Dokumen[]; kontak: string };

export async function detailInvoice(id: string): Promise<DetailInvoice | null> {
  const sb = await createClient();
  const { data: inv, error } = await sb.from("v_invoices").select("*").eq("id", id).maybeSingle();
  if (error) gagal("invoice");
  if (!inv) return null;
  const [pay, buyer] = await Promise.all([
    sb.from("customer_payments").select("*").eq("invoice_id", id).order("kode"),
    sb.from("buyers").select("kontak").eq("id", (inv as Invoice).buyer_id).maybeSingle(),
  ]);
  if (pay.error) gagal("pembayaran");
  const bayar = (pay.data ?? []) as PembayaranPembeli[];
  const refs = [id, ...bayar.map((x) => x.id)];
  const dok = await sb.from("documents").select("*").in("ref_id", refs).in("ref_tabel", ["invoices", "customer_payments"]).order("dibuat_pada", { ascending: false });
  if (dok.error) gagal("berkas");
  return { invoice: inv as Invoice, pembayaran: bayar, dokumen: (dok.data ?? []) as Dokumen[], kontak: (buyer.data?.kontak as string | undefined) ?? "" };
}
