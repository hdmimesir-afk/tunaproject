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
    .select("*, suppliers(nama), grades(kode, nama), cycles(kode, nama), lot_grades(grade_id, kg, grades(kode)), purchase_orders(kode, status_persetujuan), lot_ekor(id, urutan, no_tag, spesies, kg, grade_id, gancu, potongan_kg, kg_bayar, batal)")
    .order("kode", { ascending: false }).limit(100);
  if (error) gagal("daftar lot");
  // Ekor yang dibuang lewat koreksi nggak ditampilkan; urut sesuai catatan.
  return ((data ?? []) as unknown as LotBaris[]).map((l) => ({ ...l, lot_ekor: (l.lot_ekor ?? []).filter((e) => !e.batal).sort((a, b) => a.urutan - b.urutan) }));
}

/** Potongan berat per tusukan gancu (kg), dari Pengaturan. */
export async function potonganGancu(): Promise<number> {
  const sb = await createClient();
  const { data } = await sb.from("settings").select("nilai").eq("kunci", "potongan_gancu_kg").maybeSingle();
  const n = Number(data?.nilai);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

export async function gradeAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  // CONG grade khusus buat lot sistem cong (nggak digrading), jadi nggak ikut tombol AB/C/D.
  const { data, error } = await sb.from("grades").select("id, kode, nama").eq("aktif", true).eq("jenis", "utuh").neq("kode", "CONG").order("urutan");
  if (error) gagal("daftar kelas mutu");
  return (data ?? []).map((g) => ({ id: g.id as string, label: g.nama ? `${g.kode} · ${g.nama}` : (g.kode as string) }));
}

/** Id grade CONG (lot sistem cong). Null kalau migrasi 20261123001000 belum jalan atau grade-nya dimatiin. */
export async function idGradeCong(): Promise<string | null> {
  const sb = await createClient();
  const { data } = await sb.from("grades").select("id").eq("kode", "CONG").eq("aktif", true).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}