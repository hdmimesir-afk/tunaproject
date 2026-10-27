import { boleh } from "@/lib/izin";
import { getSesi } from "@/lib/data/auth";
import { supabaseConfigured } from "@/lib/env";
import { MODULES } from "@/lib/modules";
import { Nav } from "./Nav";

/** Menu dan identitas pengguna. Membaca sesi, jadi selalu dirender di dalam <Suspense>. */
export async function SesiNav() {
  if (!supabaseConfigured) return <Nav slugs={MODULES.map((m) => m.slug)} offline />;
  const sesi = await getSesi();
  const slugs = sesi ? MODULES.filter((m) => boleh(sesi, m.izin)).map((m) => m.slug) : [];
  return <Nav slugs={slugs} pengguna={sesi ? { nama: sesi.nama || sesi.email, peran: sesi.roleNama ?? "" } : null} />;
}
