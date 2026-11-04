import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SandiBaruForm } from "@/components/auth/SandiBaruForm";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "KATALIS ERP | Buat kata sandi" };

type Cari = Promise<{ token_hash?: string; type?: string }>;

export default function SandiBaruPage({ searchParams }: { searchParams: Cari }) {
  return (
    <AuthCard judul="Buat kata sandi">
      <Suspense fallback={<div className="mt-5 h-48" />}>
        <SandiBaruIsi searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

/** Lewat tautan undangan atau atur ulang: form langsung tampil dan token dipakai saat disimpan. Tanpa token, butuh sesi yang masih berlaku. */
async function SandiBaruIsi({ searchParams }: { searchParams: Cari }) {
  if (!supabaseConfigured) redirect("/login");
  const { token_hash: tokenHash, type } = await searchParams;
  if (tokenHash && (type === "invite" || type === "recovery")) return <SandiBaruForm tokenHash={tokenHash} jenis={type} />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?status=tautan");
  return <SandiBaruForm email={String(data.claims.email ?? "")} />;
}
