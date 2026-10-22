import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { ProduksiKelola } from "@/components/produksi/ProduksiKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { petaPengguna } from "@/lib/data/pembelian";
import { batasHasil, daftarProduksi, detailProduksi, gradeProduksi, jenisHasilSamping, lotSiapProduksi } from "@/lib/data/produksi";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Produksi" };

export default function ProduksiPage(props: PageProps<"/produksi">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Dari ikan utuh jadi loin, ditimbang per potong" judul="Produksi" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <ProduksiData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function ProduksiData({ searchParams }: { searchParams: PageProps<"/produksi">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "produksi.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const id = z.uuid().safeParse(typeof sp.p === "string" ? sp.p : "");
  const bolehTulis = boleh(sesi, "produksi.write");
  const [daftar, lot, grade, samping, pengguna, batas, detail] = await Promise.all([
    daftarProduksi(),
    bolehTulis ? lotSiapProduksi() : Promise.resolve([]),
    gradeProduksi(),
    jenisHasilSamping(),
    petaPengguna(),
    batasHasil(),
    id.success ? detailProduksi(id.data) : Promise.resolve(null),
  ]);
  return (
    <ProduksiKelola
      daftar={daftar} lotSiap={lot} grade={grade} samping={samping} pengguna={pengguna} detail={detail} batas={batas}
      bolehTulis={bolehTulis} bolehPeriksa={boleh(sesi, "produksi.periksa")} bolehSetuju={boleh(sesi, "produksi.setuju")} hariIni={hariIni()}
    />
  );
}
