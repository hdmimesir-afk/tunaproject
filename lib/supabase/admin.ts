import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { publicEnv } from "@/lib/env";

/* Klien dengan kunci rahasia (sb_secret_). Melewati RLS, jadi hanya untuk hal yang memang perlu hak admin
   Auth: mengundang pengguna. Perubahan data biasa tetap lewat klien pengguna supaya aturan database berlaku. */
export function createAdminClient() {
  const secret = z.string().startsWith("sb_secret_").safeParse(process.env.SUPABASE_SECRET_KEY);
  if (!secret.success) throw new Error("SUPABASE_SECRET_KEY belum diisi di server (lihat .env.example).");
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, secret.data, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
