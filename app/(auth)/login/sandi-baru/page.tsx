import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SandiBaruForm } from "@/components/auth/SandiBaruForm";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "KATALIS ERP | Buat kata sandi" };

export default function SandiBaruPage() {
  return (
    <AuthCard judul="Buat kata sandi">
      <Suspense fallback={<div className="mt-5 h-48" />}>
        <SandiBaruIsi />
      </Suspense>
    </AuthCard>
  );
}

/** Hanya untuk sesi yang dibuat oleh tautan undangan atau atur ulang (/auth/confirm). */
async function SandiBaruIsi() {
  if (!supabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?status=tautan");
  return <SandiBaruForm email={String(data.claims.email ?? "")} />;
}
