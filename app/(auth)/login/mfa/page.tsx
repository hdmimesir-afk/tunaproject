import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { MfaDaftar, MfaVerifikasi } from "@/components/auth/MfaForm";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "KATALIS ERP | Kode kedua" };

export default function MfaPage() {
  return (
    <AuthCard judul="Kode kedua">
      <div className="mt-4">
        <Suspense fallback={<div className="h-40" />}>
          <MfaIsi />
        </Suspense>
      </div>
    </AuthCard>
  );
}

/** Membaca sesi: ada authenticator terverifikasi → minta kode; belum ada → daftar dulu. */
async function MfaIsi() {
  if (!supabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const { data } = await supabase.auth.mfa.listFactors();
  const terverifikasi = data?.totp.find((f) => f.status === "verified");
  return terverifikasi ? <MfaVerifikasi factorId={terverifikasi.id} /> : <MfaDaftar />;
}
