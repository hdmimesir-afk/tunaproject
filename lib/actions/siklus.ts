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
  if (!p.success) return { error: "Siklus tidak valid." };
  return panggil("tutup_siklus", { p_cycle: p.data.id, p_catatan: p.data.catatan ?? "" }, "Siklus ditutup. PO, pesanan, dan biaya baru tidak bisa masuk lagi.");
}

export async function bukaKembaliSiklus(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ id: z.uuid(), alasan: z.string().trim().min(1, "Tulis alasan").max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("buka_kembali_siklus", { p_cycle: p.data.id, p_alasan: p.data.alasan }, "Siklus dibuka kembali.");
}
