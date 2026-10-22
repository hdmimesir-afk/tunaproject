import { z } from "zod";

/* Variabel lingkungan publik. Ditulis satu per satu supaya Next.js bisa menyisipkannya ke bundle klien.
   Kunci rahasia (sb_secret_...) tidak pernah ada di sini: hanya dibaca di server lewat lib/supabase/admin.ts. */
const PublicEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
});

const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

/** true bila proyek Supabase sudah disambungkan (lihat .env.example). */
export const supabaseConfigured = PublicEnv.safeParse(raw).success;

export function publicEnv() {
  const r = PublicEnv.safeParse(raw);
  if (!r.success) throw new Error("Supabase belum disambungkan: isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local (lihat .env.example).");
  return r.data;
}
