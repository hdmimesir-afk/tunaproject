import { boleh } from "@/lib/izin";
import { getSesi } from "@/lib/data/auth";
import { keluar } from "@/lib/actions/auth";
import { supabaseConfigured } from "@/lib/env";
import { MODULES } from "@/lib/modules";
import { Nav } from "./Nav";

/** Menu dan identitas pengguna. Membaca sesi, jadi selalu dirender di dalam <Suspense>. */
export async function SesiNav() {
  if (!supabaseConfigured) {
    return (
      <>
        <div className="mb-3 rounded-2xl px-3 py-2 text-[11.5px] text-[#E8C27A] md:mx-1" style={{ background: "#1B1D21" }}>Database belum disambungkan: semua menu ditampilkan.</div>
        <Nav slugs={MODULES.map((m) => m.slug)} />
      </>
    );
  }
  const sesi = await getSesi();
  const slugs = sesi ? MODULES.filter((m) => boleh(sesi, m.izin)).map((m) => m.slug) : [];
  return (
    <>
      <Nav slugs={slugs} pengguna={sesi ? { nama: sesi.nama || sesi.email, peran: sesi.roleNama ?? "" } : null} />
      {sesi && (
        <form action={keluar} className="mt-3 hidden items-center justify-between gap-2 rounded-2xl px-3 py-2.5 md:flex" style={{ background: "#1B1D21" }}>
          <div className="min-w-0">
            <div className="truncate text-[13px] text-white">{sesi.nama || sesi.email}</div>
            <div className="text-[11.5px] text-[#8A9199]">{sesi.roleNama}</div>
          </div>
          <button type="submit" className="shrink-0 rounded-full px-3 py-1.5 text-[12px] text-[#C6CCD3] hover:bg-white/10">Keluar</button>
        </form>
      )}
    </>
  );
}
