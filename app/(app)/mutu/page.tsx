import type { Metadata } from "next";
import { Suspense } from "react";
import { MutuKelola } from "@/components/mutu/MutuKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { daftarLot, gradeAktif, poSiapTerima } from "@/lib/data/mutu";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Mutu dan Penerimaan" };

export default function MutuPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ikan datang, ditimbang, dicek mutunya" judul="Mutu dan Penerimaan" />
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
  const [lots, poSiap, grade] = await Promise.all([daftarLot(), bolehTerima ? poSiapTerima() : Promise.resolve([]), gradeAktif()]);
  return <MutuKelola lots={lots} poSiap={poSiap} grade={grade} bolehTerima={bolehTerima} bolehMutu={boleh(sesi, "mutu.write")} />;
}
