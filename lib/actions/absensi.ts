"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";
import type { HasilForm } from "./auth";

async function izin(aksi: string): Promise<{ error: string } | null> {
  try {
    await requireIzin(aksi);
    return null;
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
}

async function panggil(aksi: string, fn: string, args: Record<string, unknown>, pesan: string): Promise<HasilForm> {
  const tolak = await izin(aksi);
  if (tolak) return tolak;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan, id: typeof data === "string" ? data : undefined };
}

/* ------------------------------------------------------------------ absen */
export type HasilAbsen = { error?: string; ok?: boolean; alasan?: string; waktu?: string; terlambatMenit?: number; lokasi?: string; jarakM?: number | null };

const DataAbsen = z.object({
  jenis: z.enum(["masuk", "pulang"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  akurasi: z.number().min(0).max(100000).nullable(),
  foto: z.string().min(1).max(200),
});

/** Mencatat absen. Foto sudah diunggah dari kamera ke folder pengguna; lokasi dan waktu diputuskan database. */
export async function catatAbsen(input: unknown): Promise<HasilAbsen> {
  const tolak = await izin("absensi.absen");
  if (tolak) return tolak;
  const p = DataAbsen.safeParse(input);
  if (!p.success) return { error: "Data absen tidak lengkap. Nyalakan GPS dan kamera lalu coba lagi." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catat_absen", { p_jenis: p.data.jenis, p_lat: p.data.lat, p_lng: p.data.lng, p_akurasi: p.data.akurasi, p_foto: p.data.foto });
  if (error) return { error: pesanDb(error) };
  refresh();
  const r = (data ?? {}) as { ok?: boolean; alasan?: string; waktu?: string; terlambat_menit?: number; lokasi?: string; jarak_m?: number | null };
  return { ok: Boolean(r.ok), alasan: r.alasan ?? "", waktu: r.waktu, terlambatMenit: r.terlambat_menit ?? 0, lokasi: r.lokasi, jarakM: r.jarak_m ?? null };
}

/** Alamat sementara (60 detik) untuk membuka foto absen. Database membatasi: pemilik atau yang berhak merekap. */
export async function urlFotoAbsen(id: string): Promise<{ url?: string; error?: string }> {
  const tolak = await izin("absensi.absen");
  if (tolak) return tolak;
  const uuid = z.uuid().safeParse(id);
  if (!uuid.success) return { error: "Absen tidak valid." };
  const supabase = await createClient();
  const { data: baris } = await supabase.from("attendance").select("foto_path").eq("id", uuid.data).maybeSingle();
  if (!baris) return { error: "Foto tidak ditemukan." };
  const { data, error } = await supabase.storage.from("absensi").createSignedUrl(baris.foto_path as string, 60);
  if (error || !data) return { error: "Foto tidak bisa dibuka." };
  return { url: data.signedUrl };
}

/* ----------------------------------------------------------- lokasi kerja */
const Opsional = z.string().trim().optional().transform((s) => (s ? s : null));
const Desimal = (nama: string, batas: number) =>
  z.string().trim().transform((s, ctx) => {
    const t = s.replace(",", ".");
    const n = Number(t);
    if (!/^-?\d{1,3}(\.\d{1,8})?$/.test(t) || Math.abs(n) > batas) {
      ctx.addIssue({ code: "custom", message: `${nama} tidak valid` });
      return z.NEVER;
    }
    return n;
  });

const FormLokasi = z.object({
  id: Opsional.pipe(z.uuid().nullable()),
  nama: z.string().trim().min(1, "Isi nama lokasi").max(80),
  lat: Desimal("Garis lintang", 90),
  lng: Desimal("Garis bujur", 180),
  radius: z.coerce.number().int("Radius bulat").min(10, "Minimal 10 m").max(1000, "Maksimal 1000 m"),
  akurasiMaks: z.coerce.number().int("Akurasi bulat").min(5, "Minimal 5 m").max(500, "Maksimal 500 m"),
  jamMasuk: z.string().regex(/^\d{2}:\d{2}$/, "Isi jam masuk"),
  toleransi: z.coerce.number().int("Toleransi bulat").min(0, "Minimal 0").max(240, "Maksimal 240 menit"),
  aktif: z.string().optional(),
});

export async function simpanLokasiKerja(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormLokasi.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("absensi.kelola", "simpan_lokasi_kerja", {
    p_id: p.data.id, p_nama: p.data.nama, p_lat: p.data.lat, p_lng: p.data.lng, p_radius: p.data.radius, p_akurasi_maks: p.data.akurasiMaks,
    p_jam_masuk: p.data.jamMasuk, p_toleransi: p.data.toleransi, p_aktif: p.data.aktif === "on",
  }, "Lokasi kerja disimpan.");
}

/* ------------------------------------------------------------------- izin */
const FormIzin = z.object({
  jenis: z.enum(["izin", "sakit", "libur"], "Pilih jenis"),
  dari: z.iso.date("Isi tanggal mulai"),
  sampai: z.iso.date("Isi tanggal selesai"),
  alasan: z.string().trim().min(1, "Tulis alasannya").max(300),
});

export async function ajukanIzin(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormIzin.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("absensi.absen", "ajukan_izin", { p_jenis: p.data.jenis, p_dari: p.data.dari, p_sampai: p.data.sampai, p_alasan: p.data.alasan }, "Pengajuan terkirim. Menunggu keputusan Owner.");
}

export async function putuskanIzin(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ id: z.uuid(), setuju: z.enum(["ya", "tidak"]), catatan: z.string().trim().max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Data tidak valid." };
  return panggil("absensi.setuju", "putuskan_izin", { p_id: p.data.id, p_setuju: p.data.setuju === "ya", p_catatan: p.data.catatan }, p.data.setuju === "ya" ? "Pengajuan disetujui." : "Pengajuan ditolak.");
}

export async function batalkanIzin(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ id: z.uuid() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Data tidak valid." };
  return panggil("absensi.absen", "batalkan_izin", { p_id: p.data.id }, "Pengajuan dibatalkan.");
}
