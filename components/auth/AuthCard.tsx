import { INK, MUTED } from "@/components/ui/tokens";

export function AuthCard({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10" style={{ background: INK }}>
      <div className="w-full max-w-sm rounded-[28px] bg-[#F8F9FC] p-7">
        <div className="text-[13px] font-medium" style={{ color: MUTED }}>KATALIS ERP</div>
        <h1 className="mt-1 text-[24px] font-medium tracking-tight" style={{ color: INK }}>{judul}</h1>
        {children}
      </div>
    </main>
  );
}
