"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { IMPOR, MAKS_BARIS, type HasilImpor, type JenisImpor } from "@/lib/imporMaster";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";

/* Upload Excel data master. File dibaca di browser; yg dikirim ke sini cuma baris yg udah dipetakan ke kolom.
   Isinya dicek ulang di database (public.impor_master), termasuk izin. */

const Masukan = z.object({
  jenis: z.enum(["suppliers", "buyers", "products", "supply_items"]),
  baris: z.array(z.record(z.string(), z.string().max(500, "Ada isi sel yg kepanjangan (maksimal 500 huruf)"))).min(1, "Belum ada baris data").max(MAKS_BARIS),
  namaFile: z.string().trim().max(200),
  kunci: z.uuid().optional(),
});

export type HasilAksiImpor = { ok: true; hasil: HasilImpor } | { ok: false; error: string };

async function jalan(input: unknown, simpan: boolean): Promise<HasilAksiImpor> {
  const p = Masukan.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Datanya nggak valid. Muat ulang halaman, terus coba lagi." };
  const d = p.data;
  try {
    await requireIzin(IMPOR[d.jenis as JenisImpor].izin);
  } catch (e) {
    if (e instanceof TidakBerizin) return { ok: false, error: e.message };
    throw e;
  }
  if (simpan && !d.kunci) return { ok: false, error: "Muat ulang halaman, terus coba lagi." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("impor_master", {
    p_jenis: d.jenis, p_baris: d.baris, p_simpan: simpan, p_kunci: d.kunci ?? null, p_nama_file: d.namaFile,
  });
  if (error) return { ok: false, error: pesanDb(error) };
  if (simpan) refresh();
  return { ok: true, hasil: data as HasilImpor };
}

/** Cek dulu tanpa nyimpen: tiap baris dapet status baru, diperbarui, sama, atau salah. */
export async function pratinjauImpor(input: { jenis: JenisImpor; baris: Record<string, string>[]; namaFile: string }): Promise<HasilAksiImpor> {
  return jalan(input, false);
}

/** Simpan semua baris sekaligus. Ada satu yg salah = nggak ada yg disimpan. Kunci sama = nggak diproses dua kali. */
export async function simpanImpor(input: { jenis: JenisImpor; baris: Record<string, string>[]; namaFile: string; kunci: string }): Promise<HasilAksiImpor> {
  return jalan(input, true);
}
