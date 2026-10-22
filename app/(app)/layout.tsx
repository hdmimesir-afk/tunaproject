import { Nav } from "@/components/shell/Nav";
import { INK } from "@/components/ui/tokens";

/* Kerangka aplikasi. Tidak membaca sesi di level ini: dengan Cache Components, pembacaan sesi
   diletakkan di komponen dalam <Suspense> supaya kerangka tetap bisa dirender statis (Fase 1). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:flex" style={{ background: INK }}>
      <aside className="sticky top-0 z-20 px-4 pb-3 pt-4 md:flex md:h-dvh md:w-[240px] md:shrink-0 md:flex-col md:px-3 md:pt-5" style={{ background: INK }}>
        <div className="mb-3 px-2 md:mb-5">
          <div className="text-[17px] font-semibold tracking-tight text-white">KATALIS ERP</div>
          <div className="text-[11.5px] text-[#8A9199]">PT Katalis Lintas Global</div>
        </div>
        <Nav />
      </aside>
      <main className="min-h-dvh min-w-0 flex-1 rounded-t-[28px] px-4 pb-12 pt-6 md:rounded-l-[32px] md:rounded-tr-none md:px-8" style={{ background: "linear-gradient(180deg,#EFF1F6 0%,#E9EDF5 60%,#DFE6F2 100%)" }}>
        {children}
      </main>
    </div>
  );
}
