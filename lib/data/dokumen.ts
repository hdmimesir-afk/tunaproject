import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Dokumen, RefDokumen } from "@/lib/types/pembelian";

/** Lampiran untuk beberapa catatan sekaligus. Klien pengguna, jadi RLS dokumen.read berlaku; pemanggil sudah memeriksa izinnya. */
export async function dokumenDari(refTabel: RefDokumen, ids: string[]): Promise<Dokumen[]> {
  if (ids.length === 0) return [];
  const sb = await createClient();
  const { data, error } = await sb.from("documents").select("*").eq("ref_tabel", refTabel).in("ref_id", ids).order("dibuat_pada", { ascending: false });
  if (error) throw new Error("Gagal memuat lampiran. Coba muat ulang halaman.");
  return (data ?? []) as Dokumen[];
}
