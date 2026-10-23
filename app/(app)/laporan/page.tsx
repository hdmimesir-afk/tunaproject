import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { LaporanKelola } from "@/components/laporan/LaporanKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { dataLabaRugi, hargaBeli, rencanaHasil, trenSiklus } from "@/lib/data/laporan";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Laporan" };

export default function LaporanPage(props: PageProps<"/laporan">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Laba rugi per siklus, tren, dan harga beli" judul="Laporan" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <LaporanData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function LaporanData({ searchParams }: { searchParams: PageProps<"/laporan">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "laporan.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const tren = await trenSiklus();
  const dipilih = z.uuid().safeParse(typeof sp.c === "string" ? sp.c : "");
  // Tanpa pilihan: siklus terakhir yang sudah punya penjualan, bila ada.
  const awal = tren.filter((t) => t.pendapatan_total > 0).at(-1)?.cycle_id ?? tren.at(-1)?.cycle_id ?? null;
  const id = dipilih.success ? dipilih.data : awal;
  const bolehHarga = boleh(sesi, "pembelian.read");
  const [data, harga] = await Promise.all([id ? rencanaHasil().then((r) => dataLabaRugi(id, r)) : Promise.resolve(null), bolehHarga ? hargaBeli() : Promise.resolve([])]);
  return <LaporanKelola tren={tren} data={data} siklusId={id} harga={harga} bolehHarga={bolehHarga} />;
}
