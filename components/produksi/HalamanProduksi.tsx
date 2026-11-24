import { Suspense } from "react";
import { z } from "zod";
import { ProduksiOwner } from "@/components/owner/ProduksiOwner";
import { ProduksiKelola } from "@/components/produksi/ProduksiKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { laporanProduksiOwner } from "@/lib/data/laporanOwner";
import { petaPengguna } from "@/lib/data/pembelian";
import { batasHasil, daftarProduksi, daftarPT, detailProduksi, gradeProduksi, jenisHasilSamping, lotSiapProduksi, proyekTerbuka, ringkasGradeProduksi } from "@/lib/data/produksi";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh, PERAN_OWNER } from "@/lib/izin";
import { isPeriodeOwner } from "@/lib/logic/laporanOwner";

type Sp = Promise<Record<string, string | string[] | undefined>>;

const JUDUL = {
  jual: { judul: "Jual loin", kicker: "Ikan sendiri diolah jadi loin buat dijual, ditimbang per potong" },
  jasa: { judul: "Jasa proses loin", kicker: "Ikan punya PT lain diolah di sini, hasilnya punya PT itu" },
} as const;

/** Halaman produksi satu lini bisnis (jual atau jasa). Isinya sama kayak halaman produksi lama, cuma disaring per lini. */
export function HalamanProduksi({ lini, searchParams }: { lini: "jual" | "jasa"; searchParams: Sp }) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker={JUDUL[lini].kicker} judul={JUDUL[lini].judul} />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <ProduksiData lini={lini} searchParams={searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function ProduksiData({ lini, searchParams }: { lini: "jual" | "jasa"; searchParams: Sp }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "produksi.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const id = z.uuid().safeParse(typeof sp.p === "string" ? sp.p : "");
  // Owner: laporan produksi. Buka satu produksi (?p=) tetap pakai rincian biasa (ada tombol Setujui).
  if (sesi.roleId === PERAN_OWNER && sp.lengkap !== "1" && !id.success) {
    return <ProduksiOwner lap={await laporanProduksiOwner(isPeriodeOwner(sp.periode) ? sp.periode : "7")} />;
  }
  const bolehTulis = boleh(sesi, "produksi.write");
  const [daftar, lot, grade, samping, pengguna, batas, detail, proyek, pt] = await Promise.all([
    daftarProduksi(lini),
    bolehTulis && lini === "jual" ? lotSiapProduksi() : Promise.resolve([]),
    gradeProduksi(),
    jenisHasilSamping(),
    petaPengguna(),
    batasHasil(),
    id.success ? detailProduksi(id.data) : Promise.resolve(null),
    proyekTerbuka(),
    bolehTulis ? daftarPT() : Promise.resolve([]),
  ]);
  const ringkasGrade = await ringkasGradeProduksi(daftar.map((p) => p.id));
  return (
    <ProduksiKelola
      lini={lini} daftar={daftar} lotSiap={lot} proyek={proyek} pt={pt} koreksiAwal={sp.koreksi === "1"} ringkasGrade={ringkasGrade}
      mulaiAwal={sp.mulai === "1" && bolehTulis ? z.uuid().safeParse(typeof sp.proyek === "string" ? sp.proyek : "").data ?? "" : null}
      lotAwal={typeof sp.lot === "string" ? sp.lot.split(",").filter((x) => z.uuid().safeParse(x).success).slice(0, 50) : []}
      grade={grade} samping={samping} pengguna={pengguna} detail={detail} batas={batas}
      bolehTulis={bolehTulis} bolehPeriksa={boleh(sesi, "produksi.periksa")} bolehSetuju={boleh(sesi, "produksi.setuju")} hariIni={hariIni()}
    />
  );
}
