import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Absen, AbsenHarian, Izin, LokasiKerja, RekapHadir } from "@/lib/types/absensi";

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function lokasiKerja(): Promise<LokasiKerja[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("work_sites").select("*").order("nama");
  if (error) gagal("lokasi kerja");
  return (data ?? []) as LokasiKerja[];
}

/** Absen milik sendiri, termasuk percobaan yang ditolak. Difilter ke pengguna ini karena yang berhak merekap melihat semua baris. */
export async function absenSaya(userId: string): Promise<Absen[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("attendance")
    .select("id, user_id, jenis, waktu, tanggal, akurasi_m, jarak_m, hasil, alasan_gagal, terlambat_menit")
    .eq("user_id", userId)
    .order("waktu", { ascending: false })
    .limit(60);
  if (error) gagal("riwayat absen");
  return (data ?? []) as Absen[];
}

export async function daftarIzin(): Promise<Izin[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("daftar_izin");
  if (error) gagal("daftar izin");
  return (data ?? []) as Izin[];
}

export async function absensiHarian(tanggal: string): Promise<AbsenHarian[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("absensi_harian", { p_tanggal: tanggal });
  if (error) gagal("absen hari itu");
  return (data ?? []) as AbsenHarian[];
}

export async function rekapKehadiran(bulan: string): Promise<RekapHadir[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("rekap_kehadiran", { p_bulan: `${bulan}-01` });
  if (error) gagal("rekap kehadiran");
  return (data ?? []) as RekapHadir[];
}
