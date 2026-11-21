import type { Metadata } from "next";
import { Suspense } from "react";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { PenunjangKelola } from "@/components/stok/PenunjangKelola";
import { requireSesi } from "@/lib/data/auth";
import { daftarBarang, riwayatBarang } from "@/lib/data/stok";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Barang Penunjang" };

export default function PenunjangPage(props: PageProps<"/penunjang">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Es, kemasan, label, sama kebutuhan pekerja" judul="Barang Penunjang" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <PenunjangData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function PenunjangData({ searchParams }: { searchParams: PageProps<"/penunjang">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "stok.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const [barang, riwayat] = await Promise.all([daftarBarang(), riwayatBarang()]);
  return <PenunjangKelola barang={barang} riwayat={riwayat} bolehTulis={boleh(sesi, "stok.write")} tabAwal={sp.tab === "pekerja" ? "pekerja" : "kerja"} />;
}
