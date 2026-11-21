/* Variabel lingkungan publik. Ditulis satu per satu supaya Next.js bisa menyisipkannya ke bundle klien.
   Kunci rahasia (sb_secret_...) tidak pernah ada di sini: hanya dibaca di server lewat lib/supabase/admin.ts.
   Dicek tanpa zod karena berkas ini ikut kebawa ke browser (lewat klien Supabase); zod cukup di server. */
const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

function urlValid(v: string | undefined): v is string {
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const valid = urlValid(raw.NEXT_PUBLIC_SUPABASE_URL) && !!raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_");

/** true bila proyek Supabase sudah disambungkan (lihat .env.example). */
export const supabaseConfigured = valid;

export function publicEnv(): { NEXT_PUBLIC_SUPABASE_URL: string; NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string } {
  if (!valid) throw new Error("Supabase belum disambungkan: isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local (lihat .env.example).");
  return raw as { NEXT_PUBLIC_SUPABASE_URL: string; NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string };
}
