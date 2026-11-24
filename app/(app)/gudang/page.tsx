import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HalamanGudang } from "@/components/gudang/HalamanGudang";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { supabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "KATALIS ERP | Gudang Dingin" };

export default function GudangPage(props: PageProps<"/gudang">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ruangan ABF dan CS, stok sendiri, pindah ruangan, tarif, sama jadwal" judul="Gudang Dingin" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <GudangData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function GudangData({ searchParams }: { searchParams: PageProps<"/gudang">["searchParams"] }) {
  // Tautan lama Terima titipan (/gudang?titip=...) sekarang ada di Produksi, Titip barang.
  const sp = await searchParams;
  if (typeof sp.titip === "string") {
    redirect(`/produksi/titip?titip=${encodeURIComponent(sp.titip)}`);
  }
  return <HalamanGudang bagian="gudang" searchParams={searchParams} />;
}
