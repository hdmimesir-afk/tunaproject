import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { SiklusKelola } from "@/components/siklus/SiklusKelola";
import { requireSesi } from "@/lib/data/auth";
import { daftarRingkasSiklus, rantaiSiklus } from "@/lib/data/laporan";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Rincian Siklus" };

export default function SiklusPage(props: PageProps<"/siklus">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Satu siklus dari beli ikan sampai uang masuk" judul="Rincian Siklus" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <SiklusData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function SiklusData({ searchParams }: { searchParams: PageProps<"/siklus">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "siklus.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const c = z.uuid().safeParse(typeof sp.c === "string" ? sp.c : "");
  const [daftar, detail] = await Promise.all([daftarRingkasSiklus(), c.success ? rantaiSiklus(c.data) : Promise.resolve(null)]);
  return <SiklusKelola daftar={daftar} detail={detail} />;
}
