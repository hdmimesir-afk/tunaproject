import type { Metadata } from "next";
import { Suspense } from "react";
import { RingkasanPenerimaan } from "@/components/penerimaan/RingkasanPenerimaan";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { PanelIkanUtuh } from "@/components/stok/StokKelola";
import { requireSesi } from "@/lib/data/auth";
import { laporanMutuOwner } from "@/lib/data/laporanOwner";
import { daftarPO } from "@/lib/data/pembelian";
import { ikanUtuh } from "@/lib/data/stok";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh, bolehSalahSatu } from "@/lib/izin";
import { isPeriodeOwner } from "@/lib/logic/laporanOwner";

export const metadata: Metadata = { title: "KATALIS ERP | Penerimaan" };

export default function PenerimaanPage(props: PageProps<"/penerimaan">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ikan masuk, riwayat per tanggal, pembelian, sama ikan utuh yang belum diolah" judul="Ringkasan Penerimaan" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <PenerimaanData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function PenerimaanData({ searchParams }: { searchParams: PageProps<"/penerimaan">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!bolehSalahSatu(sesi, ["mutu.read", "persetujuan.read", "pembelian.read"])) return <TanpaIzin />;
  const sp = await searchParams;
  const bacaLot = boleh(sesi, "mutu.read");
  const [lap, po, ikan] = await Promise.all([
    laporanMutuOwner(isPeriodeOwner(sp.periode) ? sp.periode : "7"),
    boleh(sesi, "pembelian.read") ? daftarPO() : Promise.resolve(null),
    bacaLot ? ikanUtuh() : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-5">
      <RingkasanPenerimaan lap={lap} po={po} hariIni={hariIni()} />
      {bacaLot && <PanelIkanUtuh ikan={ikan} bolehProduksi={boleh(sesi, "produksi.write")} />}
    </div>
  );
}
