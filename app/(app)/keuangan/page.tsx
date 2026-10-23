import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { KeuanganKelola } from "@/components/keuangan/KeuanganKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { berkasBiaya, bukuKas, daftarBiaya, kategoriBiaya } from "@/lib/data/keuangan";
import { siklusTerbuka } from "@/lib/data/penjualan";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Keuangan" };

export default function KeuanganPage(props: PageProps<"/keuangan">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Biaya dengan nota dan buku kas" judul="Keuangan" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <KeuanganData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function KeuanganData({ searchParams }: { searchParams: PageProps<"/keuangan">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "keuangan.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const b = z.uuid().safeParse(typeof sp.b === "string" ? sp.b : "");
  const bolehTulis = boleh(sesi, "keuangan.write");
  const [biaya, kategori, siklus, kas] = await Promise.all([daftarBiaya(), kategoriBiaya(), bolehTulis ? siklusTerbuka() : Promise.resolve([]), bukuKas()]);
  const terpilih = b.success ? biaya.find((x) => x.id === b.data) : undefined;
  const berkas = terpilih ? await berkasBiaya(terpilih.id) : [];
  return (
    <KeuanganKelola
      biaya={biaya} kategori={kategori} siklus={siklus} kas={kas} detail={terpilih ? { biaya: terpilih, berkas } : null}
      bolehTulis={bolehTulis} bolehSetuju={boleh(sesi, "biaya.setuju")} bolehDokumen={boleh(sesi, "dokumen.write")} hariIni={hariIni()}
    />
  );
}
