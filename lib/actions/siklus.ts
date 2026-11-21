"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";
import type { HasilForm } from "./auth";

async function panggil(fn: string, args: Record<string, unknown>, pesan: string): Promise<HasilForm> {
  try {
    await requireIzin("siklus.tutup");
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan };
}

/** Menutup siklus: hanya Owner, dan hanya bila PO, produksi, pesanan, tagihan, dan biayanya sudah beres (dicek database). */
export async function tutupSiklus(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ id: z.uuid(), catatan: z.string().trim().max(300).optional() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Proyeknya nggak valid." };
  return panggil("tutup_siklus", { p_cycle: p.data.id, p_catatan: p.data.catatan ?? "" }, "Proyek udah ditutup. PO, pesanan, sama biaya baru nggak bisa masuk lagi.");
}

const FormProyek = z.object({
  nama: z.string().trim().min(1, "Tulis nama proyeknya").max(120, "Nama proyeknya kepanjangan"),
  lini: z.enum(["jual", "jasa", "titip"], "Pilih lini bisnisnya"),
  ptId: z.union([z.literal(""), z.uuid("Pilih PT-nya")]).optional(),
  tanggal: z.iso.date("Isi tanggalnya"),
});

/** Bikin proyek dari menu Rincian Proyek: nama, lini bisnis, PT pemilik ikan (jasa dan titip), dan tanggal.
    Izinnya sama kayak bikin proyek dari penerimaan, produksi, atau gudang (dicek database). Proyek baru ada di `id`. */
export async function buatProyek(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const izin = ["siklus.write", "produksi.write", "penerimaan.write", "gudang.write"];
  let boleh = false;
  for (const a of izin) {
    try { await requireIzin(a); boleh = true; break; } catch (e) { if (!(e instanceof TidakBerizin)) throw e; }
  }
  if (!boleh) return { error: "Peran ini nggak boleh bikin proyek baru." };
  const p = FormProyek.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const d = p.data;
  if (d.lini !== "jual" && !d.ptId) return { kolom: { ptId: ["Pilih PT pemilik ikannya"] } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buat_proyek", { p_nama: d.nama, p_lini: d.lini, p_pt: d.lini === "jual" ? null : d.ptId, p_tanggal: d.tanggal });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { id: data as string, pesan: "Proyek udah dibikin." };
}

export async function bukaKembaliSiklus(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ id: z.uuid(), alasan: z.string().trim().min(1, "Tulis alasan").max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("buka_kembali_siklus", { p_cycle: p.data.id, p_alasan: p.data.alasan }, "Proyek udah dibuka lagi.");
}
