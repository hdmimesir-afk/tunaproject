import type { Metadata } from "next";
import { Suspense } from "react";
import { GudangKelola } from "@/components/gudang/GudangKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { daftarBooking, daftarRuangan, daftarTagihan, daftarTarif, daftarUnit, gradeStok, isiGudang, mitraAktif, pelangganAktif, produkAktif } from "@/lib/data/stok";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Gudang Dingin" };

export default function GudangPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ruangan ABF dan CS, titipan pelanggan, tarif, dan jadwal" judul="Gudang Dingin" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <GudangData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function GudangData() {
  const sesi = await requireSesi();
  if (!boleh(sesi, "gudang.read")) return <TanpaIzin />;
  const bolehTulis = boleh(sesi, "gudang.write");
  const [units, isi, ruangan, tagihan, tarif, booking, mitra, pelanggan, produk, grade] = await Promise.all([
    daftarUnit(),
    isiGudang(),
    daftarRuangan(),
    daftarTagihan(),
    daftarTarif(),
    daftarBooking(),
    mitraAktif(),
    bolehTulis ? pelangganAktif() : Promise.resolve([]),
    bolehTulis ? produkAktif() : Promise.resolve([]),
    bolehTulis ? gradeStok() : Promise.resolve([]),
  ]);
  return (
    <GudangKelola titipan={units.filter((u) => u.buyer_id !== null)} isi={isi} ruangan={ruangan} tagihan={tagihan} tarif={tarif} booking={booking}
      pelanggan={pelanggan} produk={produk} grade={grade} mitra={mitra} bolehTulis={bolehTulis} bolehTarif={boleh(sesi, "pengaturan.write")} hariIni={hariIni()} />
  );
}
