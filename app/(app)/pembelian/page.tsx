import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { PembelianKelola } from "@/components/pembelian/PembelianKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { daftarPO, daftarSiklus, detailPO, pemasokAktif, petaPengguna } from "@/lib/data/pembelian";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Pembelian" };

export default function PembelianPage(props: PageProps<"/pembelian">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Beli ikan sampai bayar pemasok" judul="Pembelian" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <PembelianData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function PembelianData({ searchParams }: { searchParams: PageProps<"/pembelian">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "pembelian.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const po = z.uuid().safeParse(typeof sp.po === "string" ? sp.po : "");
  const [daftar, pemasok, siklus, pengguna, detail] = await Promise.all([
    daftarPO(),
    pemasokAktif(),
    daftarSiklus(),
    petaPengguna(),
    po.success ? detailPO(po.data) : Promise.resolve(null),
  ]);
  return (
    <PembelianKelola
      daftar={daftar} pemasok={pemasok} siklus={siklus} pengguna={pengguna} detail={detail}
      bolehTulis={boleh(sesi, "pembelian.write")} bolehBayar={boleh(sesi, "pembayaran.write")}
      bolehDokumen={boleh(sesi, "dokumen.write")} bolehSiklusBaru={boleh(sesi, "siklus.write")} hariIni={hariIni()}
    />
  );
}
