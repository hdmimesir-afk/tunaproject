import type { Metadata } from "next";
import { Suspense } from "react";
import { HalamanGudang } from "@/components/gudang/HalamanGudang";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { supabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "KATALIS ERP | Titip barang" };

export default function TitipPage(props: PageProps<"/produksi/titip">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Barang titipan pelanggan (cumi, ikan, dll): terima, ambil, koreksi, sama tagihan jasanya" judul="Titip barang" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <HalamanGudang bagian="titip" searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}
