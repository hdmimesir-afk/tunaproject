"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { INK } from "@/components/ui/tokens";
import { keluar } from "@/lib/actions/auth";
import { MODULES } from "@/lib/modules";

type Pengguna = { nama: string; peran: string };

/* Urutan modul yang paling sering dipakai di HP. Empat yang pertama (yang boleh dilihat peran ini) jadi tab bawah;
   sisanya ada di lembar Menu. */
const PRIORITAS = ["dashboard", "produksi", "mutu", "penjualan", "persetujuan", "pembelian", "stok", "keuangan", "laporan", "gudang", "siklus", "asisten", "akses", "pengaturan"];

/** Menu samping di desktop; tab bawah + lembar Menu di HP. Hanya modul yang boleh dilihat peran ini (disaring di server). */
export function Nav({ slugs, pengguna }: { slugs: string[]; pengguna?: Pengguna | null }) {
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  const on = (slug: string) => path === `/${slug}` || path.startsWith(`/${slug}/`);
  const items = MODULES.filter((m) => slugs.includes(m.slug));
  const utama = PRIORITAS.map((s) => items.find((m) => m.slug === s)).filter((m): m is (typeof items)[number] => Boolean(m)).slice(0, 4);
  const lain = items.filter((m) => !utama.includes(m));
  const aktifDiMenu = lain.some((m) => on(m.slug));

  // Lembar menu tertutup otomatis setelah pindah halaman, dan Esc menutupnya.
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: KeyboardEvent) => e.key === "Escape" && setBuka(false);
    window.addEventListener("keydown", tutup);
    return () => window.removeEventListener("keydown", tutup);
  }, [buka]);

  return (
    <>
      <nav className="hidden flex-1 space-y-0.5 overflow-y-auto md:block" aria-label="Modul">
        {items.map((m) => (
          <Link key={m.slug} href={`/${m.slug}`} className="flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] transition"
            style={{ background: on(m.slug) ? "#EEF0F5" : "transparent", color: on(m.slug) ? INK : "#C6CCD3", fontWeight: on(m.slug) ? 600 : 400 }}>
            <Icon n={m.icon} s={19} c={on(m.slug) ? INK : "#9AA2AB"} />
            {m.label}
          </Link>
        ))}
      </nav>

      {/* HP: tab bawah dengan sasaran sentuh 56px */}
      {items.length > 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 md:hidden" style={{ background: INK, paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Modul">
          <div className="mx-auto flex max-w-[560px] items-stretch justify-around px-1">
            {utama.map((m) => (
              <Link key={m.slug} href={`/${m.slug}`} onClick={() => setBuka(false)} aria-current={on(m.slug) ? "page" : undefined}
                className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]" style={{ color: on(m.slug) && !buka ? "#fff" : "#9AA2AB", fontWeight: on(m.slug) ? 600 : 400 }}>
                <Icon n={m.icon} s={20} c={on(m.slug) && !buka ? "#fff" : "#9AA2AB"} />
                <span className="max-w-full truncate">{m.label.split(" ")[0]}</span>
              </Link>
            ))}
            <button type="button" onClick={() => setBuka((x) => !x)} aria-expanded={buka} aria-controls="lembar-menu"
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]" style={{ color: buka || aktifDiMenu ? "#fff" : "#9AA2AB", fontWeight: buka || aktifDiMenu ? 600 : 400 }}>
              <Icon n="grid" s={20} c={buka || aktifDiMenu ? "#fff" : "#9AA2AB"} />
              Menu
            </button>
          </div>
        </nav>
      )}

      {/* HP: lembar Menu berisi semua modul, identitas, dan tombol Keluar */}
      {buka && (
        <div className="fixed inset-0 z-20 md:hidden" role="dialog" aria-modal="true" aria-label="Menu" id="lembar-menu">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-black/50" onClick={() => setBuka(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-[28px] bg-[#F8F9FC] px-4 pb-24 pt-4">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D5D8DF]" />
            {pengguna && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium" style={{ color: INK }}>{pengguna.nama}</div>
                  <div className="text-[12px] text-[#6B7280]">{pengguna.peran}</div>
                </div>
                <form action={keluar}><button type="submit" className="h-10 rounded-full bg-[#FBE5E3] px-4 text-[13px] font-medium text-[#A8322B]">Keluar</button></form>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {items.map((m) => (
                <Link key={m.slug} href={`/${m.slug}`} onClick={() => setBuka(false)} aria-current={on(m.slug) ? "page" : undefined}
                  className="flex min-h-12 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13.5px]" style={on(m.slug) ? { background: INK, color: "#fff", fontWeight: 600 } : { background: "#fff", color: INK }}>
                  <Icon n={m.icon} s={18} c={on(m.slug) ? "#fff" : INK} />
                  <span className="leading-tight">{m.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
