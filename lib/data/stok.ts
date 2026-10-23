import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Opsi } from "@/lib/types/pembelian";
import type { AturanTarif, Booking, GerakStok, IsiGudang, ProduksiSiapStok, Tagihan, UnitStok } from "@/lib/types/stok";

/* Lapisan akses data stok dan gudang dingin. Klien pengguna, jadi RLS dan izin database berlaku. */

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function daftarUnit(): Promise<UnitStok[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("storage_units").select("*").order("masuk_pada", { ascending: false }).limit(300);
  if (error) gagal("daftar stok");
  return (data ?? []) as UnitStok[];
}

export async function isiGudang(): Promise<IsiGudang> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_gudang_isi").select("*").maybeSingle();
  if (error) gagal("isi gudang");
  return (data as IsiGudang | null) ?? { kapasitas_kg: 17500, isi_sendiri_kg: 0, isi_titipan_kg: 0 };
}

/** Koreksi stok yang menunggu keputusan Owner, beserta unitnya. */
export async function koreksiMenunggu(): Promise<(GerakStok & { unit_kode: string; sisa_kg: number })[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("storage_movements").select("*, storage_units(kode, sisa_kg)").eq("jenis", "koreksi").eq("status", "diajukan").order("waktu");
  if (error) gagal("koreksi stok");
  return (data ?? []).map((m) => {
    const x = m as unknown as GerakStok & { storage_units: { kode: string; sisa_kg: number } | null };
    return { ...x, unit_kode: x.storage_units?.kode ?? "?", sisa_kg: x.storage_units?.sisa_kg ?? 0 };
  });
}

/** Produksi yang sudah disetujui Owner dan hasilnya belum seluruhnya masuk stok. */
export async function produksiSiapStok(): Promise<ProduksiSiapStok[]> {
  const sb = await createClient();
  const [p, u] = await Promise.all([
    sb.from("v_productions").select("id, kode, loin_kg, samping_kg").eq("status", "diperiksa").order("kode", { ascending: false }).limit(50),
    sb.from("storage_units").select("production_id, kg_masuk").not("production_id", "is", null),
  ]);
  if (p.error || u.error) gagal("daftar produksi");
  const terpakai = new Map<string, number>();
  for (const r of u.data ?? []) terpakai.set(r.production_id as string, (terpakai.get(r.production_id as string) ?? 0) + Number(r.kg_masuk));
  return (p.data ?? [])
    .map((x) => ({ id: x.id as string, kode: x.kode as string, sisaKg: Math.round((Number(x.loin_kg) + Number(x.samping_kg) - (terpakai.get(x.id as string) ?? 0)) * 1000) / 1000 }))
    .filter((x) => x.sisaKg > 0);
}

export async function produkAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("products").select("id, nama").eq("aktif", true).order("nama");
  if (error) gagal("daftar produk");
  return (data ?? []).map((x) => ({ id: x.id as string, label: x.nama as string }));
}

export async function gradeStok(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("grades").select("id, kode").eq("aktif", true).order("urutan");
  if (error) gagal("daftar grade");
  return (data ?? []).map((x) => ({ id: x.id as string, label: x.kode as string }));
}

export async function pelangganAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("buyers").select("id, nama").eq("aktif", true).order("nama");
  if (error) gagal("daftar pelanggan");
  return (data ?? []).map((x) => ({ id: x.id as string, label: x.nama as string }));
}

export async function daftarTagihan(): Promise<Tagihan[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("service_charges").select("*").order("dibuat_pada", { ascending: false }).limit(200);
  if (error) gagal("tagihan jasa");
  return (data ?? []) as Tagihan[];
}

export async function daftarTarif(): Promise<AturanTarif[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("tariff_rules").select("*").order("jenis").order("berlaku_dari", { ascending: false });
  if (error) gagal("tarif");
  return (data ?? []) as AturanTarif[];
}

/** Jadwal aktif mulai kemarin ke depan. */
export async function daftarBooking(): Promise<Booking[]> {
  const sb = await createClient();
  const dari = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await sb.from("bookings").select("*").eq("status", "aktif").gte("selesai", dari).order("mulai").limit(300);
  if (error) gagal("jadwal");
  return (data ?? []) as Booking[];
}

export async function mitraAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("partners").select("id, nama").eq("aktif", true).order("nama");
  if (error) gagal("daftar mitra");
  return (data ?? []).map((x) => ({ id: x.id as string, label: x.nama as string }));
}
