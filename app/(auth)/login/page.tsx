import type { Metadata } from "next";
import { INK, MUTED } from "@/components/ui/tokens";

export const metadata: Metadata = { title: "KATALIS ERP | Masuk" };

/* Halaman masuk sementara. Fase 1 mengisi form login Supabase dan verifikasi MFA untuk Owner dan Finance. */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4" style={{ background: INK }}>
      <div className="w-full max-w-sm rounded-[28px] bg-[#F8F9FC] p-7">
        <div className="text-[13px] font-medium" style={{ color: MUTED }}>KATALIS ERP</div>
        <h1 className="mt-1 text-[24px] font-medium tracking-tight" style={{ color: INK }}>Masuk</h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>Form masuk dan verifikasi dua langkah dibuat di Fase 1.</p>
      </div>
    </main>
  );
}
