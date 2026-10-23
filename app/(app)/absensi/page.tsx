import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { Absensi } from "@/components/absensi/Absensi";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { absenSaya, absensiHarian, daftarIzin, lokasiKerja, rekapKehadiran } from "@/lib/data/absensi";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh } from "@/lib/izin";
import { bulanSah } from "@/lib/logic/absensi";

export const metadata: Metadata = { title: "KATALIS ERP | Absensi" };

export default function AbsensiPage(props: PageProps<"/absensi">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Lokasi dan foto langsung, waktu dari server" judul="Absensi" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <AbsensiData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function AbsensiData({ searchParams }: { searchParams: PageProps<"/absensi">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "absensi.absen")) return <TanpaIzin />;
  const sp = await searchParams;
  const hari = hariIni();
  const bulan = bulanSah(sp.bulan, hari.slice(0, 7));
  const tgl = z.iso.date().safeParse(typeof sp.tanggal === "string" ? sp.tanggal : "");
  const tanggalHarian = tgl.success ? tgl.data : hari;
  const bolehRekap = boleh(sesi, "absensi.rekap");
  const [lokasi, saya, izin, rekap, harian] = await Promise.all([
    lokasiKerja(),
    absenSaya(sesi.userId),
    daftarIzin(),
    bolehRekap ? rekapKehadiran(bulan) : Promise.resolve(null),
    bolehRekap ? absensiHarian(tanggalHarian) : Promise.resolve(null),
  ]);
  return (
    <Absensi
      userId={sesi.userId} hari={hari} bulan={bulan} tanggalHarian={tanggalHarian}
      lokasi={lokasi} saya={saya} izin={izin} rekap={rekap} harian={harian}
      bolehKelola={boleh(sesi, "absensi.kelola")} bolehSetuju={boleh(sesi, "absensi.setuju")}
    />
  );
}
