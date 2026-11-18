import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LotBaris, Opsi } from "@/lib/types/pembelian";

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

/** Lot ikan terbaru. Kode dan status PO cuma kebaca sama yang boleh lihat pembelian (RLS), selain itu kosong. */
export async function daftarLot(): Promise<LotBaris[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("lots")
    .select("*, suppliers(nama), grades(kode, nama), cycles(kode, nama), lot_grades(grade_id, kg, grades(kode)), purchase_orders(kode, status_persetujuan)")
    .order("kode", { ascending: false }).limit(100);
  if (error) gagal("daftar lot");
  return (data ?? []) as unknown as LotBaris[];
}

export async function gradeAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("grades").select("id, kode, nama").eq("aktif", true).eq("jenis", "utuh").order("urutan");
  if (error) gagal("daftar kelas mutu");
  return (data ?? []).map((g) => ({ id: g.id as string, label: g.nama ? `${g.kode} · ${g.nama}` : (g.kode as string) }));
}
