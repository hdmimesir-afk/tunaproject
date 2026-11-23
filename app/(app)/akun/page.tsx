import type { Metadata } from "next";
import { Suspense } from "react";
import { GantiSandiForm } from "@/components/akun/GantiSandiForm";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { Card } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { requireSesi } from "@/lib/data/auth";
import { supabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "KATALIS ERP | Akun saya" };

/* Akun saya (23 Nov 2026): semua peran bisa buka, isinya data akun sendiri sama ganti kata sandi. */
export default function AkunPage() {
  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <Judul kicker="Data akun kamu sendiri" judul="Akun saya" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <AkunData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function AkunData() {
  const sesi = await requireSesi();
  return (
    <div className="space-y-4" data-testid="akun-saya">
      <Card>
        <dl className="grid grid-cols-1 gap-3 text-[14px] sm:grid-cols-3">
          <div className="min-w-0"><dt className="text-[12px]" style={{ color: MUTED }}>Nama</dt><dd className="truncate font-medium" style={{ color: INK }}>{sesi.nama || "-"}</dd></div>
          <div className="min-w-0"><dt className="text-[12px]" style={{ color: MUTED }}>Email masuk</dt><dd className="truncate font-medium" style={{ color: INK }}>{sesi.email}</dd></div>
          <div className="min-w-0"><dt className="text-[12px]" style={{ color: MUTED }}>Peran</dt><dd className="truncate font-medium" style={{ color: INK }}>{sesi.roleNama ?? "-"}</dd></div>
        </dl>
      </Card>
      <Card title="Ganti kata sandi">
        <GantiSandiForm email={sesi.email} />
      </Card>
    </div>
  );
}
