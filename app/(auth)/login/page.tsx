import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { MUTED } from "@/components/ui/tokens";
import { supabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "KATALIS ERP | Masuk" };

export default function LoginPage() {
  return (
    <AuthCard judul="Masuk">
      {supabaseConfigured ? (
        // useSearchParams membaca permintaan, jadi diletakkan di dalam Suspense.
        <Suspense fallback={<div className="mt-5 h-48" />}>
          <LoginForm />
        </Suspense>
      ) : (
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: MUTED }}>
          Database belum disambungkan. Isi <code>.env.local</code> sesuai <code>.env.example</code> untuk mencoba masuk.
        </p>
      )}
    </AuthCard>
  );
}
