"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { isKunciPengaturan, isTabelMaster, PENGATURAN, skemaMaster } from "@/lib/master";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";
import type { HasilForm } from "./auth";

async function izin(aksi: string): Promise<HasilForm | null> {
  try {
    await requireIzin(aksi);
    return null;
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
}

/** Tambah (tanpa id) atau ubah (dengan id) satu baris data master. */
export async function simpanMaster(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("master.write");
  if (tolak) return tolak;
  const tabel = fd.get("tabel");
  if (!isTabelMaster(tabel)) return { error: "Tabel tidak dikenal." };
  const p = skemaMaster(tabel).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };

  const supabase = await createClient();
  const id = fd.get("id");
  const { error } = typeof id === "string" && id
    ? await supabase.from(tabel).update(p.data).eq("id", id)
    : await supabase.from(tabel).insert(p.data);
  if (error) return { error: pesanDb(error) };
  refresh();
  return undefined;
}

/** Nonaktifkan atau aktifkan lagi. Data master tidak pernah dihapus. */
export async function setAktifMaster(fd: FormData) {
  const tolak = await izin("master.write");
  if (tolak) return;
  const tabel = fd.get("tabel");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!isTabelMaster(tabel) || !id.success) return;
  const supabase = await createClient();
  await supabase.from(tabel).update({ aktif: fd.get("aktif") === "true" }).eq("id", id.data);
  refresh();
}

export async function simpanPengaturan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("pengaturan.write");
  if (tolak) return tolak;
  const kunci = fd.get("kunci");
  if (!isKunciPengaturan(kunci)) return { error: "Pengaturan tidak dikenal." };
  const batas = PENGATURAN[kunci];
  const nilai = z.coerce.number().min(batas.min).max(batas.max).safeParse(fd.get("nilai"));
  if (!nilai.success) return { error: `${batas.label}: isi angka ${batas.min} sampai ${batas.max}.` };
  const supabase = await createClient();
  const { error } = await supabase.from("settings").update({ nilai: nilai.data }).eq("kunci", kunci);
  if (error) return { error: pesanDb(error) };
  refresh();
  return undefined;
}
