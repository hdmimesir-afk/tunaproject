import type { Metadata } from "next";
import { Suspense } from "react";
import { RingkasanNiaga } from "@/components/niaga/RingkasanNiaga";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { laporanKeuanganOwner, laporanPenjualanOwner } from "@/lib/data/laporanOwner";
import { ringkasLini } from "@/lib/data/keuangan";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh, bolehSalahSatu } from "@/lib/izin";
import { isPeriodeOwner, rentangPeriode } from "@/lib/logic/laporanOwner";

export const metadata: Metadata = { title: "KATALIS ERP | Niaga" };

export default function NiagaPage(props: PageProps<"/niaga">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Uang masuk, uang keluar, kas, sama tagihan yang belum lunas" judul="Ringkasan Niaga" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <NiagaData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function NiagaData({ searchParams }: { searchParams: PageProps<"/niaga">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!bolehSalahSatu(sesi, ["penjualan.read", "keuangan.read"])) return <TanpaIzin />;
  const sp = await searchParams;
  const periode = isPeriodeOwner(sp.periode) ? sp.periode : "bulan";
  const { dari, sampai } = rentangPeriode(hariIni(), periode);
  const bacaUang = boleh(sesi, "keuangan.read");
  const bulan = hariIni().slice(0, 7);
  const [jual, uang, lini] = await Promise.all([
    boleh(sesi, "penjualan.read") ? laporanPenjualanOwner(periode) : Promise.resolve(null),
    bacaUang ? laporanKeuanganOwner(periode) : Promise.resolve(null),
    bacaUang ? Promise.all((["jual", "jasa", "titip"] as const).map(async (l) => ({ lini: l, ...(await ringkasLini(l, bulan)) }))) : Promise.resolve(null),
  ]);
  return <RingkasanNiaga periode={periode} dari={dari} sampai={sampai} jual={jual} uang={uang} lini={lini} />;
}
