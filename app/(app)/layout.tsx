import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { SesiNav } from "@/components/shell/SesiNav";
import { INK } from "@/components/ui/tokens";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/* Kerangka aplikasi. Sesi dibaca di dalam <Suspense> (Cache Components), jadi kerangka tetap statis
   dan menu muncul begitu sesi terbaca. Desktop: menu samping + isi lebar. HP: bilah atas, isi satu kolom, tab bawah melayang
   (keduanya dirender oleh Nav; fallback di bawah menjaga tinggi bilah atas selama sesi dibaca). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="erp min-h-dvh md:flex" style={{ background: INK }}>
      <Suspense fallback={
        <>
          <aside className="hidden w-[248px] shrink-0 md:block" style={{ background: INK }} />
          <div className="flex h-14 items-center gap-3 px-4 md:hidden">
            <Image src="/brand/katalis-mark-white.png" alt="" width={28} height={28} priority className="h-7 w-7" />
            <div className="text-[16px] font-semibold tracking-tight text-white">KATALIS ERP</div>
          </div>
        </>
      }>
        <SesiNav />
      </Suspense>
      <main className="min-h-dvh min-w-0 flex-1 rounded-t-[28px] px-4 pb-32 pt-5 md:pb-12 md:pt-6 md:rounded-l-[32px] md:rounded-tr-none md:px-8" style={{ background: "linear-gradient(180deg,#EFF1F6 0%,#E9EDF5 60%,#DFE6F2 100%)" }}>
        {children}
      </main>
    </div>
  );
}
