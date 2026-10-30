import type { Metadata } from "next";
import { Suspense } from "react";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { StokKelola } from "@/components/stok/StokKelola";
import { requireSesi } from "@/lib/data/auth";
import { daftarBarang, daftarRuangan, daftarUnit, gradeStok, isiGudang, koreksiMenunggu, produkAktif, produksiSiapStok, riwayatBarang } from "@/lib/data/stok";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Stok" };

export default function StokPage(props: PageProps<"/stok">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ikan fresh dan beku, penunjang kerja, dan penunjang pekerja" judul="Stok" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <StokData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function StokData({ searchParams }: { searchParams: PageProps<"/stok">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "stok.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const tab = sp.tab === "kerja" || sp.tab === "pekerja" ? sp.tab : "ikan";
  const bolehTulis = boleh(sesi, "stok.write");
  const bolehSetuju = boleh(sesi, "stok.setuju");
  const [units, isi, ruangan, koreksi, produksi, produk, grade, barang, riwayat] = await Promise.all([
    daftarUnit(),
    isiGudang(),
    daftarRuangan(),
    bolehSetuju ? koreksiMenunggu() : Promise.resolve([]),
    bolehTulis ? produksiSiapStok() : Promise.resolve([]),
    bolehTulis ? produkAktif() : Promise.resolve([]),
    bolehTulis ? gradeStok() : Promise.resolve([]),
    daftarBarang(),
    riwayatBarang(),
  ]);
  return (
    <StokKelola units={units} isi={isi} ruangan={ruangan} koreksi={koreksi} produksi={produksi} produk={produk} grade={grade} barang={barang} riwayat={riwayat}
      tabAwal={tab} bolehTulis={bolehTulis} bolehSetuju={bolehSetuju} bolehTitipan={boleh(sesi, "gudang.write")} />
  );
}
