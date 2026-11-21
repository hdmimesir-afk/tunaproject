"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { BAGIAN_HAPUS, type RincianHapus } from "@/lib/logic/hapus";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";

async function izin(): Promise<{ error: string } | null> {
  try {
    await requireIzin("data.hapus");
    return null;
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
}

const Bagian = z.array(z.enum(["semua", ...BAGIAN_HAPUS.map((b) => b.id)] as [string, ...string[]])).min(1, "Pilih minimal satu bagian.").max(10);

/** Hitung dulu apa aja yang bakal kehapus. Nggak ngubah data. */
export async function pratinjauHapus(bagian: string[]): Promise<{ rincian?: RincianHapus[]; error?: string }> {
  const tolak = await izin();
  if (tolak) return tolak;
  const p = Bagian.safeParse(bagian);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Pilihannya nggak valid." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pratinjau_hapus_data", { p_bagian: p.data });
  if (error) return { error: pesanDb(error) };
  return { rincian: (data ?? []) as RincianHapus[] };
}

const FormHapus = z.object({
  bagian: Bagian,
  alasan: z.string().trim().min(1, "Tulis alasan kenapa datanya dihapus.").max(500, "Alasannya kepanjangan, maksimal 500 huruf."),
  konfirmasi: z.string().trim(),
});

/** Hapus data per bagian. Cuma Owner (izin data.hapus), wajib alasan dan ngetik HAPUS. Tercatat di log hapus. */
export async function hapusData(input: z.input<typeof FormHapus>): Promise<{ pesan?: string; error?: string }> {
  const tolak = await izin();
  if (tolak) return tolak;
  const p = FormHapus.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Isiannya nggak valid." };
  if (p.data.konfirmasi !== "HAPUS") return { error: "Ketik HAPUS (huruf besar semua) buat konfirmasi." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("hapus_data", { p_bagian: p.data.bagian, p_alasan: p.data.alasan, p_konfirmasi: p.data.konfirmasi });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Datanya udah dihapus dan kecatat di log hapus." };
}
