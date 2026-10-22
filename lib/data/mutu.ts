import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LotBaris, Opsi, POSiapTerima } from "@/lib/types/pembelian";

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function daftarLot(): Promise<LotBaris[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("lots").select("*, suppliers(nama), grades(kode, nama)").order("kode", { ascending: false }).limit(100);
  if (error) gagal("daftar lot");
  return (data ?? []) as unknown as LotBaris[];
}

/** PO yang masih menunggu ikan, tanpa harga. Hanya untuk yang boleh menerima ikan. */
export async function poSiapTerima(): Promise<POSiapTerima[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("po_siap_terima");
  if (error) gagal("daftar PO yang siap diterima");
  return (data ?? []) as POSiapTerima[];
}

export async function gradeAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("grades").select("id, kode, nama").eq("aktif", true).order("urutan");
  if (error) gagal("daftar kelas mutu");
  return (data ?? []).map((g) => ({ id: g.id as string, label: g.nama ? `${g.kode} · ${g.nama}` : (g.kode as string) }));
}
