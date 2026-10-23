import type { Metadata } from "next";
import { Suspense } from "react";
import { SesiNav } from "@/components/shell/SesiNav";
import { INK } from "@/components/ui/tokens";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/* Kerangka aplikasi. Sesi dibaca di dalam <Suspense> (Cache Components), jadi kerangka tetap statis
   dan menu muncul begitu sesi terbaca. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:flex" style={{ background: INK }}>
      <aside className="px-4 pb-1 pt-4 md:sticky md:top-0 md:z-20 md:flex md:h-dvh md:w-[240px] md:shrink-0 md:flex-col md:px-3 md:pt-5" style={{ background: INK }}>
        <div className="mb-3 px-2 md:mb-5">
          <div className="text-[17px] font-semibold tracking-tight text-white">KATALIS ERP</div>
          <div className="text-[11.5px] text-[#8A9199]">PT Katalis Lintas Global</div>
        </div>
        <Suspense fallback={<div className="h-10 md:flex-1" />}>
          <SesiNav />
        </Suspense>
      </aside>
      <main className="min-h-dvh min-w-0 flex-1 rounded-t-[28px] px-4 pb-28 pt-6 md:pb-12 md:rounded-l-[32px] md:rounded-tr-none md:px-8" style={{ background: "linear-gradient(180deg,#EFF1F6 0%,#E9EDF5 60%,#DFE6F2 100%)" }}>
        {children}
      </main>
    </div>
  );
}
