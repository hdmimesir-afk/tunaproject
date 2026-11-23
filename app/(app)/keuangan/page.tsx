import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { KeuanganKelola } from "@/components/keuangan/KeuanganKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { berkasBiaya, bukuBulanan, bukuKas, daftarBiaya, daftarBiayaTetap, kategoriBiaya, rujukanBiaya } from "@/lib/data/keuangan";
import { riwayatKoreksi } from "@/lib/data/koreksi";
import { petaPengguna } from "@/lib/data/pembelian";
import { siklusTerbuka } from "@/lib/data/penjualan";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh, PERAN_OWNER } from "@/lib/izin";
import { KeuanganOwner } from "@/components/owner/KeuanganOwner";
import { laporanKeuanganOwner } from "@/lib/data/laporanOwner";
import { isPeriodeOwner } from "@/lib/logic/laporanOwner";

export const metadata: Metadata = { title: "KATALIS ERP | Keuangan" };

export default function KeuanganPage(props: PageProps<"/keuangan">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Catat biaya pakai nota, sama buku kas" judul="Keuangan" />
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
  if (sesi.roleId === PERAN_OWNER && sp.lengkap !== "1" && !b.success) {
    const [lap, buku] = await Promise.all([laporanKeuanganOwner(isPeriodeOwner(sp.periode) ? sp.periode : "30"), bukuBulanan()]);
    return <KeuanganOwner lap={lap} buku={buku} />;
  }
  const bolehTulis = boleh(sesi, "keuangan.write");
  const [biaya, kategori, siklus, rujukan, kas, buku, biayaTetap] = await Promise.all([
    daftarBiaya(), kategoriBiaya(), bolehTulis ? siklusTerbuka() : Promise.resolve([]),
    bolehTulis ? rujukanBiaya() : Promise.resolve({ po: [], produksi: [] }), bukuKas(), bukuBulanan(), daftarBiayaTetap(),
  ]);
  const terpilih = b.success ? biaya.find((x) => x.id === b.data) : undefined;
  const [berkas, koreksi, pengguna] = terpilih
    ? await Promise.all([berkasBiaya(terpilih.id), riwayatKoreksi(["expenses"], [terpilih.id]), petaPengguna()])
    : [[], [], {}];
  return (
    <KeuanganKelola
      biaya={biaya} kategori={kategori} siklus={siklus} rujukan={rujukan} kas={kas} buku={buku} bolehTutup={boleh(sesi, "periode.tutup")} detail={terpilih ? { biaya: terpilih, berkas, koreksi } : null} biayaTetap={biayaTetap} pengguna={pengguna}
      bolehTulis={bolehTulis} bolehSetuju={boleh(sesi, "biaya.setuju")} bolehDokumen={boleh(sesi, "dokumen.write")} hariIni={hariIni()}
    />
  );
}
