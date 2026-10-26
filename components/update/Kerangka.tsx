import { Icon } from "@/components/ui";
import { INK } from "@/components/ui/tokens";
import { MODULES } from "@/lib/modules";

/* Kerangka aplikasi untuk tampilan contoh di /update: salinan tampilan menu samping (laptop) dan tab bawah (HP) yang sedang live.
   Dibuat statis karena kerangka asli membaca sesi pengguna. Menu dan ikonnya diambil dari daftar modul yang sama (lib/modules.ts). */

const TAB_HP = ["dashboard", "produksi", "mutu", "penjualan"];

export function Kerangka({ aktif, kicker, judul, children }: { aktif: string; kicker: string; judul: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:flex" style={{ background: INK }}>
      <aside className="px-4 pb-0 pt-3 md:pb-3 md:pt-4 md:sticky md:top-0 md:z-20 md:flex md:h-dvh md:w-[240px] md:shrink-0 md:flex-col md:px-3 md:pt-5" style={{ background: INK }}>
        <div className="mb-2 flex items-baseline gap-2 px-2 md:mb-5 md:block">
          <div className="text-[17px] font-semibold tracking-tight text-white">KATALIS ERP</div>
          <div className="hidden text-[11.5px] text-[#8A9199] md:block">PT Katalis Lintas Global</div>
        </div>
        <nav className="hidden flex-1 space-y-0.5 overflow-y-auto md:block" aria-label="Modul">
          {MODULES.map((m) => (
            <div key={m.slug} className="flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px]"
              style={{ background: m.slug === aktif ? "#EEF0F5" : "transparent", color: m.slug === aktif ? INK : "#C6CCD3", fontWeight: m.slug === aktif ? 600 : 400 }}>
              <Icon n={m.icon} s={19} c={m.slug === aktif ? INK : "#9AA2AB"} />
              {m.label}
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-h-dvh min-w-0 flex-1 rounded-t-[28px] px-4 pb-28 pt-5 md:pb-12 md:pt-6 md:rounded-l-[32px] md:rounded-tr-none md:px-8" style={{ background: "linear-gradient(180deg,#EFF1F6 0%,#E9EDF5 60%,#DFE6F2 100%)" }}>
        <div className="mx-auto max-w-[1180px] space-y-4">
          <div>
            <div className="text-[12.5px] font-medium md:text-[13px]" style={{ color: "#6C7F8A" }}>{kicker}</div>
            <h1 className="mt-0.5 text-[24px] font-medium tracking-tight md:text-[28px]" style={{ color: INK }}>{judul}</h1>
          </div>
          {children}
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 md:hidden" style={{ background: INK }} aria-label="Modul">
        <div className="mx-auto flex max-w-[560px] items-stretch justify-around px-1">
          {TAB_HP.map((slug) => {
            const m = MODULES.find((x) => x.slug === slug);
            if (!m) return null;
            const on = slug === aktif;
            return (
              <div key={slug} className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]" style={{ color: on ? "#fff" : "#9AA2AB", fontWeight: on ? 600 : 400 }}>
                <Icon n={m.icon} s={20} c={on ? "#fff" : "#9AA2AB"} />
                <span className="max-w-full truncate">{m.label.split(" ")[0]}</span>
              </div>
            );
          })}
          <div className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]" style={{ color: TAB_HP.includes(aktif) ? "#9AA2AB" : "#fff", fontWeight: TAB_HP.includes(aktif) ? 400 : 600 }}>
            <Icon n="grid" s={20} c={TAB_HP.includes(aktif) ? "#9AA2AB" : "#fff"} />
            Menu
          </div>
        </div>
      </nav>
    </div>
  );
}
