"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";
import type { HasilForm } from "./auth";

/* Aksi persetujuan. Izin sebenarnya dijaga fungsi database (pemeriksa dan penyetuju per jenis transaksi);
   cek di sini hanya memberi pesan lebih awal. */

async function izin(aksi: string): Promise<HasilForm | null> {
  try {
    await requireIzin(aksi);
    return null;
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
}

const IdApv = z.uuid("Persetujuan tidak valid");
const Alasan = z.string().trim().min(1, "Tulis alasannya").max(500, "Alasan terlalu panjang");

export async function periksa(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("persetujuan.read");
  if (tolak) return tolak;
  const id = IdApv.safeParse(fd.get("id"));
  if (!id.success) return { error: id.error.issues[0].message };
  const catatan = z.string().trim().max(500).safeParse(fd.get("catatan") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("periksa_persetujuan", { p_approval: id.data, p_catatan: catatan.success ? catatan.data : "" });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Diperiksa. Menunggu persetujuan Owner." };
}

/** Setujui satu atau banyak. Total yang tampil di layar konfirmasi dikirim lagi dan harus cocok dengan database. */
export async function setujui(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("persetujuan.read");
  if (tolak) return tolak;
  const ids = z.array(IdApv).min(1, "Pilih minimal satu persetujuan").max(100).safeParse(fd.getAll("id"));
  if (!ids.success) return { error: ids.error.issues[0].message };
  const total = z.coerce.number().min(0).safeParse(fd.get("total"));
  if (!total.success) return { error: "Total konfirmasi tidak valid. Muat ulang halaman." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("setujui_persetujuan", { p_ids: ids.data, p_total_konfirmasi: total.data });
  if (error) return { error: pesanDb(error) };
  refresh();
  const hasil = data as { jumlah: number };
  return { pesan: `${hasil.jumlah} pengajuan disetujui.` };
}

export async function tolakPengajuan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("persetujuan.read");
  if (tolak) return tolak;
  const id = IdApv.safeParse(fd.get("id"));
  const alasan = Alasan.safeParse(fd.get("alasan"));
  if (!id.success) return { error: id.error.issues[0].message };
  if (!alasan.success) return { kolom: { alasan: [alasan.error.issues[0].message] } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("tolak_persetujuan", { p_approval: id.data, p_alasan: alasan.data });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Pengajuan ditolak." };
}

export async function mintaRevisi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("persetujuan.read");
  if (tolak) return tolak;
  const id = IdApv.safeParse(fd.get("id"));
  const alasan = Alasan.safeParse(fd.get("alasan"));
  if (!id.success) return { error: id.error.issues[0].message };
  if (!alasan.success) return { kolom: { alasan: [alasan.error.issues[0].message] } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("minta_revisi", { p_approval: id.data, p_alasan: alasan.data });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Dikembalikan ke pengaju untuk direvisi." };
}
