import type { Metadata } from "next";
import { Suspense } from "react";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { StokKelola } from "@/components/stok/StokKelola";
import { requireSesi } from "@/lib/data/auth";
import { daftarUnit, gradeStok, isiGudang, koreksiMenunggu, produkAktif, produksiSiapStok } from "@/lib/data/stok";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Stok" };

export default function StokPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Hasil produksi, fresh dan beku, milik sendiri dan titipan" judul="Stok" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <StokData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function StokData() {
  const sesi = await requireSesi();
  if (!boleh(sesi, "stok.read")) return <TanpaIzin />;
  const bolehTulis = boleh(sesi, "stok.write");
  const bolehSetuju = boleh(sesi, "stok.setuju");
  const [units, isi, koreksi, produksi, produk, grade] = await Promise.all([
    daftarUnit(),
    isiGudang(),
    bolehSetuju ? koreksiMenunggu() : Promise.resolve([]),
    bolehTulis ? produksiSiapStok() : Promise.resolve([]),
    bolehTulis ? produkAktif() : Promise.resolve([]),
    bolehTulis ? gradeStok() : Promise.resolve([]),
  ]);
  return (
    <StokKelola units={units} isi={isi} koreksi={koreksi} produksi={produksi} produk={produk} grade={grade}
      bolehTulis={bolehTulis} bolehSetuju={bolehSetuju} bolehTitipan={boleh(sesi, "gudang.write")} />
  );
}
