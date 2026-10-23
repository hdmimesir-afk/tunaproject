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

/** Kolom yang boleh tidak dikirim sama sekali (mis. id pada formulir baru) atau dikirim kosong. */
const Opsional = z.string().trim().optional().transform((s) => (s ? s : null));

const FormBiaya = z.object({
  biayaId: Opsional.pipe(z.uuid().nullable()),
  kategoriId: z.uuid("Pilih kategori"),
  uraian: z.string().trim().min(1, "Tulis uraian").max(200),
  jumlah: z.string().trim().transform((s, ctx) => {
    const t = s.replace(/\./g, "").replace(",", ".");
    const n = Number(t);
    if (!/^\d+(\.\d{1,2})?$/.test(t) || !(n > 0)) {
      ctx.addIssue({ code: "custom", message: "Isi jumlah lebih dari nol" });
      return z.NEVER;
    }
    return n;
  }),
  tanggal: z.iso.date("Isi tanggal"),
  siklusId: Opsional.pipe(z.uuid().nullable()),
});

/** Simpan biaya sebagai draf. Nota dilampirkan sesudahnya, lalu biaya diajukan ke Owner. */
export async function simpanBiaya(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormBiaya.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("keuangan.write", "simpan_biaya", {
    p_id: p.data.biayaId, p_category: p.data.kategoriId, p_uraian: p.data.uraian, p_jumlah: p.data.jumlah, p_tanggal: p.data.tanggal, p_cycle: p.data.siklusId,
  }, "Biaya disimpan sebagai draf. Lampirkan nota lalu ajukan.");
}

export async function ajukanBiaya(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ biayaId: z.uuid() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Biaya tidak valid." };
  return panggil("keuangan.write", "ajukan_biaya", { p_id: p.data.biayaId }, "Biaya diajukan. Menunggu keputusan Owner.");
}

export async function putuskanBiaya(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ biayaId: z.uuid(), setuju: z.enum(["ya", "tidak"]), catatan: z.string().trim().max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Data tidak valid." };
  return panggil("biaya.setuju", "putuskan_biaya", { p_id: p.data.biayaId, p_setuju: p.data.setuju === "ya", p_catatan: p.data.catatan },
    p.data.setuju === "ya" ? "Biaya disetujui dan masuk buku kas." : "Biaya ditolak.");
}
