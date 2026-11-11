import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { Antrean } from "@/components/persetujuan/Antrean";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { pemegangTugas, petaPengguna } from "@/lib/data/pembelian";
import { dataPersetujuan } from "@/lib/data/persetujuan";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Persetujuan" };

export default function PersetujuanPage({ searchParams }: PageProps<"/persetujuan">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Dicek dulu, terus disetujui sama yang dipilih admin" judul="Persetujuan" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <PersetujuanData searchParams={searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function PersetujuanData({ searchParams }: { searchParams: PageProps<"/persetujuan">["searchParams"] }) {
  const sesi = await requireSesi();
  const { a } = await searchParams;
  const sorot = z.uuid().safeParse(Array.isArray(a) ? a[0] : a).data;
  if (!boleh(sesi, "persetujuan.read")) return <TanpaIzin />;
  const [data, pengguna, pemegang] = await Promise.all([dataPersetujuan(), petaPengguna(), pemegangTugas()]);
  return <Antrean sorot={sorot} data={data} pengguna={pengguna} pemegang={pemegang} bolehPeriksa={boleh(sesi, "persetujuan.periksa")} bolehSetuju={boleh(sesi, "persetujuan.setuju")} />;
}
