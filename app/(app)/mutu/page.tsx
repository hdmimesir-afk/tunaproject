import type { Metadata } from "next";
import { Suspense } from "react";
import { MutuKelola } from "@/components/mutu/MutuKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { dokumenDari } from "@/lib/data/dokumen";
import { riwayatKoreksi } from "@/lib/data/koreksi";
import { daftarLot, gradeAktif } from "@/lib/data/mutu";
import { aturanLampiran, daftarSiklus, pemasokAktif, petaPengguna } from "@/lib/data/pembelian";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Mutu dan Penerimaan" };

export default function MutuPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ikan datang ditimbang, digrading, terus diajukan pembeliannya" judul="Mutu dan Penerimaan" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <MutuData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function MutuData() {
  const sesi = await requireSesi();
  if (!boleh(sesi, "mutu.read")) return <TanpaIzin />;
  const bolehTerima = boleh(sesi, "penerimaan.write");
  const bolehLampiran = boleh(sesi, "dokumen.read");
  const [lots, grade, aturan, pemasok, siklus, pengguna] = await Promise.all([
    daftarLot(), gradeAktif(), bolehLampiran ? aturanLampiran() : Promise.resolve([]), pemasokAktif(), daftarSiklus(), petaPengguna(),
  ]);
  const [dokumen, koreksi] = await Promise.all([
    bolehLampiran ? dokumenDari("lots", lots.map((l) => l.id)) : Promise.resolve([]),
    riwayatKoreksi(["lots"], lots.map((l) => l.id)),
  ]);
  return (
    <MutuKelola lots={lots} grade={grade} pemasok={pemasok} siklus={siklus} pengguna={pengguna} koreksi={koreksi} hariIni={hariIni()}
      bolehTerima={bolehTerima} bolehMutu={boleh(sesi, "mutu.write")} bolehAjukan={boleh(sesi, "pembelian.write")}
      bolehPemasokBaru={boleh(sesi, "master.write")}
      lampiran={bolehLampiran ? { dokumen, aturan, bolehTulis: boleh(sesi, "dokumen.write") } : null} />
  );
}
