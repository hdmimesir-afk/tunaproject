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
import { boleh, PERAN_OWNER } from "@/lib/izin";
import { AbsensiOwner } from "@/components/owner/AbsensiOwner";
import { bulanSah } from "@/lib/logic/absensi";

export const metadata: Metadata = { title: "KATALIS ERP | Absensi" };

export default function AbsensiPage(props: PageProps<"/absensi">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Absen pakai lokasi sama foto langsung, jamnya dari server" judul="Absensi" />
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
  // Owner nggak absen, tapi tetap bisa liat rekap dan nyetujuin izin.
  const bolehAbsen = boleh(sesi, "absensi.absen");
  if (!bolehAbsen && !boleh(sesi, "absensi.rekap")) return <TanpaIzin />;
  const sp = await searchParams;
  const hari = hariIni();
  const bulan = bulanSah(sp.bulan, hari.slice(0, 7));
  const tgl = z.iso.date().safeParse(typeof sp.tanggal === "string" ? sp.tanggal : "");
  const tanggalHarian = tgl.success ? tgl.data : hari;
  const bolehRekap = boleh(sesi, "absensi.rekap");
  if (sesi.roleId === PERAN_OWNER && sp.lengkap !== "1" && bolehRekap) {
    const [izinOwner, rekapOwner, hariIniOwner] = await Promise.all([daftarIzin(), rekapKehadiran(bulan), absensiHarian(hari)]);
    return <AbsensiOwner hari={hari} bulan={bulan} rekap={rekapOwner} harian={hariIniOwner} izin={izinOwner} />;
  }
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
      bolehKelola={boleh(sesi, "absensi.kelola")} bolehSetuju={boleh(sesi, "absensi.setuju")} bolehAbsen={bolehAbsen}
    />
  );
}
