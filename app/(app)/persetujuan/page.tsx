import type { Metadata } from "next";
import { Suspense } from "react";
import { Antrean } from "@/components/persetujuan/Antrean";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { petaPengguna } from "@/lib/data/pembelian";
import { dataPersetujuan } from "@/lib/data/persetujuan";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Persetujuan" };

export default function PersetujuanPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Diperiksa Finance, disetujui Owner" judul="Persetujuan" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <PersetujuanData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function PersetujuanData() {
  const sesi = await requireSesi();
  if (!boleh(sesi, "persetujuan.read")) return <TanpaIzin />;
  const [data, pengguna] = await Promise.all([dataPersetujuan(), petaPengguna()]);
  return <Antrean data={data} pengguna={pengguna} bolehPeriksa={boleh(sesi, "persetujuan.periksa")} bolehSetuju={boleh(sesi, "persetujuan.setuju")} />;
}
