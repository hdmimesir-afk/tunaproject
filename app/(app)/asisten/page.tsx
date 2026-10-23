import type { Metadata } from "next";
import { Suspense } from "react";
import { AsistenKelola } from "@/components/asisten/AsistenKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { DAFTAR_ALAT } from "@/lib/asisten/alat";
import { requireSesi } from "@/lib/data/auth";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "KATALIS ERP | Asisten AI" };

export default function AsistenPage() {
  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <Judul kicker="Tanya jawab dari data, hanya baca" judul="Asisten AI" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <AsistenData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function AsistenData() {
  const sesi = await requireSesi();
  if (!boleh(sesi, "asisten.use")) return <TanpaIzin />;
  const sb = await createClient();
  const { data } = await sb.rpc("jatah_asisten");
  const jatah = (data as { batas: number; sisa: number } | null) ?? { batas: 30, sisa: 30 };
  const alat = DAFTAR_ALAT.filter((a) => a.izin.some((i) => boleh(sesi, i))).map((a) => ({ nama: a.nama, label: a.label }));
  return <AsistenKelola alat={alat} modelAktif={Boolean(process.env.ANTHROPIC_API_KEY)} jatah={jatah} />;
}
