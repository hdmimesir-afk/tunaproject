"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui";
import { INK } from "@/components/ui/tokens";
import { keluar } from "@/lib/actions/auth";
import { MODULES } from "@/lib/modules";
import { GRUP } from "./grup";

type Pengguna = { nama: string; peran: string };

/* Urutan modul yang paling sering dipakai di HP. Empat yang pertama (yang boleh dilihat peran ini) jadi tab bawah;
   sisanya ada di lembar Menu. */
const PRIORITAS = ["dashboard", "produksi", "mutu", "penjualan", "persetujuan", "pembelian", "stok", "keuangan", "laporan", "gudang", "siklus", "asisten", "akses", "pengaturan"];

/* Status menu ringkas (hanya ikon) di desktop: disimpan di localStorage bila bisa, selalu juga di memori
   (mode privat bisa menolak penyimpanan). Ctrl/⌘+B membalik. */
const KUNCI_RINGKAS = "katalis.menu-ringkas";
const pendengar = new Set<() => void>();
let ringkasMemori: boolean | null = null;
function bacaRingkas() {
  if (ringkasMemori !== null) return ringkasMemori;
  try { return localStorage.getItem(KUNCI_RINGKAS) === "1"; } catch { return false; }
}
function tulisRingkas(v: boolean) {
  ringkasMemori = v;
  try { localStorage.setItem(KUNCI_RINGKAS, v ? "1" : "0"); } catch {}
  pendengar.forEach((f) => f());
}
function langgananRingkas(f: () => void) {
  pendengar.add(f);
  return () => { pendengar.delete(f); };
}

/** Menu samping di desktop (bisa diciutkan jadi ikon); tab bawah + lembar Menu di HP.
    Hanya modul yang boleh dilihat peran ini (disaring di server). */
export function Nav({ slugs, pengguna, offline }: { slugs: string[]; pengguna?: Pengguna | null; offline?: boolean }) {
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState("");
  const q = cari.trim().toLowerCase();
  const ringkas = useSyncExternalStore(langgananRingkas, bacaRingkas, () => false);
  const on = (slug: string) => path === `/${slug}` || path.startsWith(`/${slug}/`);
  const items = MODULES.filter((m) => slugs.includes(m.slug));
  const utama = PRIORITAS.map((s) => items.find((m) => m.slug === s)).filter((m): m is (typeof items)[number] => Boolean(m)).slice(0, 4);
  const lain = items.filter((m) => !utama.includes(m));
  const aktifDiMenu = lain.some((m) => on(m.slug));
  const modulAktif = items.find((m) => on(m.slug));
  // Modul dikelompokkan seperti alur kerja; kelompok yang kosong untuk peran ini tidak tampil.
  const grup = GRUP.map((g) => ({ ...g, modul: g.slugs.map((s) => items.find((m) => m.slug === s)).filter((m): m is (typeof items)[number] => Boolean(m)) })).filter((g) => g.modul.length > 0);

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); tulisRingkas(!bacaRingkas()); }
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, []);

  // Lembar menu tertutup otomatis setelah pindah halaman, dan Esc menutupnya.
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: KeyboardEvent) => e.key === "Escape" && setBuka(false);
    window.addEventListener("keydown", tutup);
    return () => window.removeEventListener("keydown", tutup);
  }, [buka]);

  return (
    <>
      {/* Desktop: menu samping gelap */}
      <aside className={`hidden shrink-0 flex-col transition-[width] duration-200 md:sticky md:top-0 md:z-20 md:flex md:h-dvh ${ringkas ? "md:w-[76px]" : "md:w-[248px]"}`} style={{ background: INK }}>
        <div className={`flex items-center pb-4 pt-5 ${ringkas ? "flex-col gap-3 px-2" : "gap-2.5 px-4"}`}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" title="KATALIS ERP">
            <Image src="/brand/katalis-mark-white.png" alt="" width={34} height={34} priority className="h-[34px] w-[34px] shrink-0" />
            {!ringkas && (
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-semibold leading-tight tracking-tight text-white">KATALIS ERP</span>
                <span className="block truncate text-[11px] leading-tight text-[#8A9199]">PT Katalis Lintas Global</span>
              </span>
            )}
          </Link>
          <button type="button" onClick={() => tulisRingkas(!ringkas)} title={`${ringkas ? "Lebarkan" : "Ciutkan"} menu (Ctrl+B)`} aria-pressed={ringkas}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10 ${ringkas ? "" : "ml-auto"}`}>
            <Icon n={ringkas ? "panel-open" : "panel-close"} s={18} c="#9AA2AB" />
            <span className="sr-only">{ringkas ? "Lebarkan menu" : "Ciutkan menu"}</span>
          </button>
        </div>

        {offline && !ringkas && <div className="mx-3 mb-3 rounded-2xl px-3 py-2 text-[11.5px] text-[#E8C27A]" style={{ background: "#1B1D21" }}>Database belum disambungkan: semua menu ditampilkan.</div>}

        <nav className="erp-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3" aria-label="Modul">
          {grup.map((g, i) => (
            <div key={g.id} className={i === 0 ? "" : ringkas ? "mt-2 border-t border-white/10 pt-2" : "mt-4"}>
              {!ringkas && g.modul.length > 1 && <div className="px-3.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#6E7780]">{g.label}</div>}
              <div className="space-y-0.5">
                {g.modul.map((m) => (
                  <Link key={m.slug} href={`/${m.slug}`} title={ringkas ? m.label : undefined} aria-current={on(m.slug) ? "page" : undefined} aria-label={ringkas ? m.label : undefined}
                    className={`group flex items-center rounded-full text-[14px] transition ${ringkas ? "mx-auto h-11 w-11 justify-center" : "gap-3 px-3.5 py-2.5"} ${on(m.slug) ? "" : "hover:bg-white/[0.07]"}`}
                    style={{ background: on(m.slug) ? "#EEF0F5" : undefined, color: on(m.slug) ? INK : "#C6CCD3", fontWeight: on(m.slug) ? 600 : 400 }}>
                    <Icon n={m.icon} s={19} c={on(m.slug) ? INK : "#9AA2AB"} />
                    {!ringkas && <span className="truncate">{m.label}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {pengguna && (
          <form action={keluar} className={`m-3 rounded-2xl ${ringkas ? "flex flex-col items-center gap-2 px-1 py-2" : "flex items-center gap-2.5 px-3 py-2.5"}`} style={{ background: "#1B1D21" }}>
            <span title={ringkas ? `${pengguna.nama} · ${pengguna.peran}` : undefined} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF0F5] text-[12.5px] font-semibold" style={{ color: INK }}>{inisial(pengguna.nama)}</span>
            {!ringkas && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-white">{pengguna.nama}</div>
                <div className="truncate text-[11.5px] text-[#8A9199]">{pengguna.peran}</div>
              </div>
            )}
            <button type="submit" title="Keluar" className={`shrink-0 rounded-full text-[12px] text-[#C6CCD3] hover:bg-white/10 ${ringkas ? "px-2 py-1" : "px-3 py-1.5"}`}>Keluar</button>
          </form>
        )}
      </aside>

      {/* HP: bilah atas ala aplikasi (judul halaman + avatar), beda dengan desktop yang memakai menu samping */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 px-4 md:hidden" style={{ background: INK }}>
        <Link href="/dashboard" aria-label="Beranda" className="shrink-0"><Image src="/brand/katalis-mark-white.png" alt="" width={28} height={28} priority className="h-7 w-7" /></Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] leading-tight text-[#8A9199]">KATALIS ERP</div>
          <div className="truncate text-[16px] font-semibold leading-tight tracking-tight text-white">{modulAktif?.label ?? "Beranda"}</div>
        </div>
        {pengguna && (
          <button type="button" onClick={() => setBuka(true)} aria-label={`Akun ${pengguna.nama}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF0F5] text-[12.5px] font-semibold" style={{ color: INK }}>{inisial(pengguna.nama)}</button>
        )}
      </header>

      {/* HP: tab bawah melayang berbentuk pil, sasaran sentuh 56px */}
      {items.length > 0 && (
        <nav className="fixed inset-x-3 z-30 md:hidden" style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }} aria-label="Modul">
          <div className="mx-auto flex max-w-[520px] items-stretch justify-around rounded-[28px] px-1.5 py-1" style={{ background: INK, boxShadow: "0 10px 30px rgba(0,23,31,.35), 0 0 0 1px rgba(255,255,255,.08)" }}>
            {utama.map((m) => {
              const aktif = on(m.slug) && !buka;
              return (
                <Link key={m.slug} href={`/${m.slug}`} onClick={() => setBuka(false)} aria-current={on(m.slug) ? "page" : undefined}
                  className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]" style={{ color: aktif ? "#fff" : "#9AA2AB", fontWeight: on(m.slug) ? 600 : 400 }}>
                  <span className="flex h-7 w-12 items-center justify-center rounded-full transition" style={{ background: aktif ? "rgba(255,255,255,.14)" : "transparent" }}><Icon n={m.icon} s={20} c={aktif ? "#fff" : "#9AA2AB"} /></span>
                  <span className="max-w-full truncate">{m.label.split(" ")[0]}</span>
                </Link>
              );
            })}
            <button type="button" onClick={() => setBuka((x) => !x)} aria-expanded={buka} aria-controls="lembar-menu"
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]" style={{ color: buka || aktifDiMenu ? "#fff" : "#9AA2AB", fontWeight: buka || aktifDiMenu ? 600 : 400 }}>
              <span className="flex h-7 w-12 items-center justify-center rounded-full transition" style={{ background: buka || aktifDiMenu ? "rgba(255,255,255,.14)" : "transparent" }}><Icon n="grid" s={20} c={buka || aktifDiMenu ? "#fff" : "#9AA2AB"} /></span>
              Menu
            </button>
          </div>
        </nav>
      )}

      {/* HP: lembar Menu berisi semua modul (per kelompok), identitas, dan tombol Keluar */}
      {buka && (
        <div className="fixed inset-0 z-20 md:hidden" role="dialog" aria-modal="true" aria-label="Menu" id="lembar-menu">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-black/50" onClick={() => setBuka(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-[28px] bg-[#F8F9FC] px-4 pb-32 pt-4">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D5D8DF]" />
            {pengguna && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white" style={{ background: INK }}>{inisial(pengguna.nama)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium" style={{ color: INK }}>{pengguna.nama}</div>
                    <div className="text-[12px] text-[#6B7280]">{pengguna.peran}</div>
                  </div>
                </div>
                <form action={keluar}><button type="submit" className="h-10 rounded-full bg-[#FBE5E3] px-4 text-[13px] font-medium text-[#A8322B]">Keluar</button></form>
              </div>
            )}
            <label className="mb-4 flex h-11 items-center gap-2.5 rounded-2xl bg-white px-3.5">
              <Icon n="search" s={17} c="#8A949E" />
              <input type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari menu" aria-label="Cari menu" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#8A949E]" style={{ color: INK }} />
            </label>
            {grup.map((g) => {
              const tampil = g.modul.filter((m) => !q || m.label.toLowerCase().includes(q));
              if (tampil.length === 0) return null;
              return (
                <div key={g.id} className="mb-4">
                  {g.modul.length > 1 && <div className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A949E]">{g.label}</div>}
                  <div className="grid grid-cols-3 gap-2">
                    {tampil.map((m) => (
                      <Link key={m.slug} href={`/${m.slug}`} onClick={() => setBuka(false)} aria-current={on(m.slug) ? "page" : undefined}
                        className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl px-1.5 py-3 text-center text-[12px] leading-tight" style={on(m.slug) ? { background: INK, color: "#fff", fontWeight: 600 } : { background: "#fff", color: INK }}>
                        <Icon n={m.icon} s={22} c={on(m.slug) ? "#fff" : INK} />
                        <span>{m.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export const inisial = (nama: string) => nama.trim().split(/\s+/).slice(0, 2).map((k) => k[0]?.toUpperCase() ?? "").join("") || "?";
