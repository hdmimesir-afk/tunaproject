import type { Metadata } from "next";
import { Suspense } from "react";
import { MutuKelola } from "@/components/mutu/MutuKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { dokumenDari } from "@/lib/data/dokumen";
import { riwayatKoreksi } from "@/lib/data/koreksi";
import { daftarLot, gradeAktif, idGradeCong, potonganGancu } from "@/lib/data/mutu";
import { aturanLampiran, daftarSiklus, pemasokAktif, petaPengguna } from "@/lib/data/pembelian";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh, PERAN_OWNER } from "@/lib/izin";
import { MutuOwner } from "@/components/owner/MutuOwner";
import { laporanMutuOwner } from "@/lib/data/laporanOwner";
import { isPeriodeOwner } from "@/lib/logic/laporanOwner";

export const metadata: Metadata = { title: "KATALIS ERP | Tally" };

export default function MutuPage(props: PageProps<"/mutu">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ikan datang ditimbang, digrading, terus diajukan pembeliannya" judul="Tally" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <MutuData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function MutuData({ searchParams }: { searchParams: PageProps<"/mutu">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "mutu.read")) return <TanpaIzin />;
  const sp = await searchParams;
  // Owner dapet laporan ringkas; halaman kerja tim tetap bisa dibuka lewat ?lengkap=1.
  if (sesi.roleId === PERAN_OWNER && sp.lengkap !== "1") return <MutuOwner lap={await laporanMutuOwner(isPeriodeOwner(sp.periode) ? sp.periode : "7")} />;
  const bolehTerima = boleh(sesi, "penerimaan.write");
  const bolehLampiran = boleh(sesi, "dokumen.read");
  const [lots, grade, aturan, pemasok, siklus, pengguna, potonganKg, congId] = await Promise.all([
    daftarLot(), gradeAktif(), bolehLampiran ? aturanLampiran() : Promise.resolve([]), pemasokAktif(), daftarSiklus(), petaPengguna(), potonganGancu(), idGradeCong(),
  ]);
  const [dokumen, koreksi] = await Promise.all([
    bolehLampiran ? dokumenDari("lots", lots.map((l) => l.id)) : Promise.resolve([]),
    riwayatKoreksi(["lots"], lots.map((l) => l.id)),
  ]);
  return (
    <MutuKelola lots={lots} grade={grade} pemasok={pemasok} siklus={siklus} pengguna={pengguna} koreksi={koreksi} hariIni={hariIni()}
      bolehTerima={bolehTerima} bolehMutu={boleh(sesi, "mutu.write")} bolehAjukan={boleh(sesi, "pembelian.write")}
      bolehPemasokBaru={boleh(sesi, "master.write")} potonganKg={potonganKg} congId={congId}
      lampiran={bolehLampiran ? { dokumen, aturan, bolehTulis: boleh(sesi, "dokumen.write") } : null} />
  );
}
