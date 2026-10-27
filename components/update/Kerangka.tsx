import Image from "next/image";
import { Icon } from "@/components/ui";
import { INK } from "@/components/ui/tokens";
import { GRUP } from "@/components/shell/grup";
import { MODULES } from "@/lib/modules";

/* Kerangka aplikasi untuk tampilan contoh di /update: salinan ringkas menu samping (laptop) dan bilah atas + tab melayang (HP)
   yang sedang live. Dibuat statis karena kerangka asli membaca sesi pengguna. Menu, ikon, dan pengelompokan diambil dari sumber yang sama
   (lib/modules.ts dan components/shell/grup.ts). Ukurannya sengaja kecil: bingkai perangkat di /update memperkecil layar lagi,
   jadi objek yang terlalu besar membuat layar tampak penuh sesak dan hanya sedikit isi yang terlihat. Isi halaman dipadatkan lewat kelas `kompak` (layar.css). */

const TAB_HP = ["dashboard", "produksi", "mutu", "penjualan"];
const GRUP_ADA = GRUP.map((g) => ({ ...g, modul: g.slugs.map((s) => MODULES.find((m) => m.slug === s)).filter((m): m is (typeof MODULES)[number] => Boolean(m)) })).filter((g) => g.modul.length > 0);

export function Kerangka({ aktif, kicker, judul, children }: { aktif: string; kicker: string; judul: string; children: React.ReactNode }) {
  const modulAktif = MODULES.find((m) => m.slug === aktif);
  return (
    <div className="min-h-dvh md:flex" style={{ background: INK }}>
      {/* Laptop: menu samping bergrup */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-[208px] md:shrink-0 md:flex-col" style={{ background: INK }}>
        <div className="flex items-center gap-2 px-3.5 pb-3 pt-4">
          <Image src="/brand/katalis-mark-white.png" alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold leading-tight tracking-tight text-white">KATALIS ERP</div>
            <div className="truncate text-[9.5px] leading-tight text-[#8A9199]">PT Katalis Lintas Global</div>
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-hidden px-2.5" aria-label="Modul">
          {GRUP_ADA.map((g, i) => (
            <div key={g.id} className={i === 0 ? "" : "mt-2.5"}>
              {g.modul.length > 1 && <div className="px-3 pb-1 text-[9.5px] font-medium uppercase tracking-[0.08em] text-[#6E7780]">{g.label}</div>}
              <div className="space-y-px">
                {g.modul.map((m) => {
                  const on = m.slug === aktif;
                  return (
                    <div key={m.slug} className="flex items-center gap-2.5 rounded-full px-3 py-[5px] text-[12px]"
                      style={{ background: on ? "#EEF0F5" : "transparent", color: on ? INK : "#C6CCD3", fontWeight: on ? 600 : 400 }}>
                      <Icon n={m.icon} s={15} c={on ? INK : "#9AA2AB"} />
                      <span className="truncate">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="m-2.5 flex items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: "#1B1D21" }}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF0F5] text-[10.5px] font-semibold" style={{ color: INK }}>PH</span>
          <div className="min-w-0">
            <div className="truncate text-[11px] leading-tight text-white">Pak Hilmy</div>
            <div className="truncate text-[9.5px] leading-tight text-[#8A9199]">Owner</div>
          </div>
        </div>
      </aside>

      {/* HP: bilah atas ala aplikasi */}
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2.5 px-3.5 md:hidden" style={{ background: INK }} aria-hidden="true">
        <Image src="/brand/katalis-mark-white.png" alt="" width={24} height={24} className="h-6 w-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[9.5px] leading-tight text-[#8A9199]">KATALIS ERP</div>
          <div className="truncate text-[14px] font-semibold leading-tight tracking-tight text-white">{modulAktif?.label ?? judul}</div>
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF0F5] text-[10.5px] font-semibold" style={{ color: INK }}>PH</span>
      </header>

      <main className="min-h-dvh min-w-0 flex-1 rounded-t-[22px] px-3.5 pb-24 pt-3.5 md:min-h-dvh md:rounded-l-[26px] md:rounded-tr-none md:px-6 md:pb-6 md:pt-5" style={{ background: "linear-gradient(180deg,#EFF1F6 0%,#E9EDF5 60%,#DFE6F2 100%)" }}>
        <div className="mx-auto max-w-[1180px] space-y-3">
          <div className="sr-only md:not-sr-only">
            <div className="text-[11px] font-medium" style={{ color: "#6C7F8A" }}>{kicker}</div>
            <h1 className="mt-0.5 text-[20px] font-medium tracking-tight" style={{ color: INK }}>{judul}</h1>
          </div>
          <div className="kompak">{children}</div>
        </div>
      </main>

      {/* HP: tab bawah melayang berbentuk pil */}
      <nav className="fixed inset-x-3 bottom-2.5 z-30 md:hidden" aria-hidden="true">
        <div className="mx-auto flex max-w-[360px] items-stretch justify-around rounded-[22px] px-1 py-0.5" style={{ background: INK, boxShadow: "0 8px 22px rgba(0,23,31,.35), 0 0 0 1px rgba(255,255,255,.08)" }}>
          {TAB_HP.map((slug) => {
            const m = MODULES.find((x) => x.slug === slug);
            if (!m) return null;
            const on = slug === aktif;
            return (
              <div key={slug} className="flex min-h-11 flex-1 flex-col items-center justify-center gap-px px-1 text-[9.5px]" style={{ color: on ? "#fff" : "#9AA2AB", fontWeight: on ? 600 : 400 }}>
                <span className="flex h-5 w-9 items-center justify-center rounded-full" style={{ background: on ? "rgba(255,255,255,.14)" : "transparent" }}><Icon n={m.icon} s={16} c={on ? "#fff" : "#9AA2AB"} /></span>
                <span className="max-w-full truncate">{m.label.split(" ")[0]}</span>
              </div>
            );
          })}
          <div className="flex min-h-11 flex-1 flex-col items-center justify-center gap-px px-1 text-[9.5px]" style={{ color: TAB_HP.includes(aktif) ? "#9AA2AB" : "#fff", fontWeight: TAB_HP.includes(aktif) ? 400 : 600 }}>
            <span className="flex h-5 w-9 items-center justify-center rounded-full" style={{ background: TAB_HP.includes(aktif) ? "transparent" : "rgba(255,255,255,.14)" }}><Icon n="grid" s={16} c={TAB_HP.includes(aktif) ? "#9AA2AB" : "#fff"} /></span>
            Menu
          </div>
        </div>
      </nav>
    </div>
  );
}
