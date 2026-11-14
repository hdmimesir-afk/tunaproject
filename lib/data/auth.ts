import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/env";
import { boleh, parseSesi, type Sesi } from "@/lib/izin";
import { createClient } from "@/lib/supabase/server";

/* Lapisan akses data untuk identitas. Dibaca di dalam <Suspense> (Cache Components); dipanggil ulang
   di setiap Server Action supaya action memeriksa dirinya sendiri. */

/** Sesi pengguna yang sedang masuk, atau null. Satu kali per permintaan (React cache). */
export const getSesi = cache(async (): Promise<Sesi | null> => {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  const { data: raw, error } = await supabase.rpc("sesi_saya");
  if (error) return null;
  return parseSesi(raw);
});

/** Wajib masuk, aktif, dan punya peran. */
export async function requireSesi(): Promise<Sesi> {
  const s = await getSesi();
  if (!s) redirect("/login");
  if (!s.aktif || !s.roleId) redirect("/login?status=nonaktif");
  return s;
}

export class TidakBerizin extends Error {
  /** Kunci izin yang kurang, buat catatan server; nggak ditampilkan ke pengguna. */
  readonly aksi: string;
  constructor(aksi: string) {
    super("Peran ini nggak punya izin buat langkah ini. Minta Super Admin kalau memang perlu.");
    this.aksi = aksi;
  }
}

/** Wajib punya izin aksi. Database tetap menolak sendiri bila pemeriksaan ini terlewat. */
export async function requireIzin(aksi: string): Promise<Sesi> {
  const s = await requireSesi();
  if (!boleh(s, aksi)) throw new TidakBerizin(aksi);
  return s;
}
