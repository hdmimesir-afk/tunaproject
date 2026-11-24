import { Suspense } from "react";
import { z } from "zod";
import { KeuanganKelola } from "@/components/keuangan/KeuanganKelola";
import { LABEL_LINI_BIAYA, type LiniBiaya } from "@/lib/logic/lini";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { berkasBiaya, daftarBiaya, kategoriBiaya, ringkasLini, rujukanBiaya } from "@/lib/data/keuangan";
import { riwayatKoreksi } from "@/lib/data/koreksi";
import { petaPengguna } from "@/lib/data/pembelian";
import { proyekTerbuka } from "@/lib/data/produksi";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh } from "@/lib/izin";

type Sp = Promise<Record<string, string | string[] | undefined>>;

const KICKER: Record<LiniBiaya, string> = {
  jual: "Biaya dan pengeluaran buat jual loin (ikan sendiri), plus pendapatannya",
  jasa: "Biaya dan pengeluaran buat jasa proses loin (ikan punya PT), plus pendapatannya",
  titip: "Biaya dan pengeluaran buat titip barang (gudang dingin), plus pendapatannya",
};

/** Halaman keuangan satu lini bisnis (permintaan tim 24 Nov 2026): input biaya dan pengeluaran lini itu, plus ringkasannya. */
export function HalamanLini({ lini, searchParams }: { lini: LiniBiaya; searchParams: Sp }) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker={KICKER[lini]} judul={`Keuangan ${LABEL_LINI_BIAYA[lini]}`} />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <Data lini={lini} searchParams={searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function Data({ lini, searchParams }: { lini: LiniBiaya; searchParams: Sp }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "keuangan.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const b = z.uuid().safeParse(typeof sp.b === "string" ? sp.b : "");
  const bolehTulis = boleh(sesi, "keuangan.write");
  const hari = hariIni();
  const [biaya, kategori, proyek, rujukan, ringkas] = await Promise.all([
    daftarBiaya(), kategoriBiaya(), bolehTulis ? proyekTerbuka() : Promise.resolve([]),
    bolehTulis ? rujukanBiaya() : Promise.resolve({ po: [], produksi: [] }), ringkasLini(lini, hari.slice(0, 7)),
  ]);
  const terpilih = b.success ? biaya.find((x) => x.id === b.data) : undefined;
  const [berkas, koreksi, pengguna] = terpilih
    ? await Promise.all([berkasBiaya(terpilih.id), riwayatKoreksi(["expenses"], [terpilih.id]), petaPengguna()])
    : [[], [], {}];
  return (
    <KeuanganKelola lini={lini} ringkasLini={ringkas}
      biaya={biaya} kategori={kategori} siklus={proyek.filter((x) => x.lini_bisnis === lini).map((x) => ({ id: x.id, label: x.label }))} rujukan={rujukan}
      kas={[]} buku={[]} bolehTutup={false} detail={terpilih ? { biaya: terpilih, berkas, koreksi } : null} biayaTetap={[]} pengguna={pengguna}
      bolehTulis={bolehTulis} bolehSetuju={boleh(sesi, "biaya.setuju")} bolehDokumen={boleh(sesi, "dokumen.write")} hariIni={hari}
    />
  );
}
