import Link from "next/link";
import type { LaporanMutuOwner } from "@/lib/data/laporanOwner";
import { kgOwner, LABEL_PERIODE } from "@/lib/logic/laporanOwner";
import type { POBaris } from "@/lib/types/pembelian";
import { MUTED } from "@/components/ui/tokens";
import { GrafikHarian } from "@/components/owner/GrafikHarian";
import { RiwayatTanggal, type HariTerima } from "./RiwayatTanggal";
import { Angka, BarisBatang, BIRU, DeretAngka, Kosong, Kotak, persen, TabPeriode } from "@/components/owner/Laporan";

/* Ringkasan Penerimaan (permintaan tim 24 Nov 2026): ikan masuk, riwayat penerimaan per tanggal, pembelian yang nunggu
   disetujui atau dibayar. Ikan utuh yang belum diolah ditaruh di bawahnya (dari halaman). */

type Hari = HariTerima;

/** Lot dikelompokin per tanggal terima, urut dari tanggal terlama (aturan semua daftar, 24 Nov 2026). */
export function riwayatPerTanggal(daftar: LaporanMutuOwner["daftar"]): Hari[] {
  const m = new Map<string, Hari & { gram: number }>();
  for (const l of daftar) {
    const x = m.get(l.tanggal_terima) ?? { tanggal: l.tanggal_terima, kg: 0, gram: 0, lot: 0, ekor: 0, pemasok: [], kode: [] };
    x.gram += Math.round(l.kg * 1000);
    x.lot += 1;
    x.ekor += l.ekor ?? 0;
    if (l.pemasok && !x.pemasok.includes(l.pemasok)) x.pemasok.push(l.pemasok);
    x.kode.push(l.kode);
    m.set(l.tanggal_terima, x);
  }
  return [...m.values()].map(({ gram, ...x }) => ({ ...x, kg: gram / 1000, kode: x.kode.sort() })).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export function RingkasanPenerimaan({ lap, po, hariIni }: { lap: LaporanMutuOwner; po: POBaris[] | null; hariIni: string }) {
  const hari = riwayatPerTanggal(lap.daftar);
  const hariIniData = hari.find((h) => h.tanggal === hariIni);
  const nunggu = po?.filter((p) => p.status_persetujuan === "diajukan" || p.status_persetujuan === "perlu_revisi") ?? [];
  const belumLunas = po?.filter((p) => p.status_persetujuan === "disetujui" && p.status_bayar !== "lunas") ?? [];
  const sisaBayar = belumLunas.reduce((a, p) => a + Math.round((p.total - p.total_bayar) * 100), 0) / 100;

  return (
    <div className="space-y-5" data-testid="ringkasan-penerimaan">
      <TabPeriode path="/penerimaan" periode={lap.periode} dari={lap.dari} sampai={lap.sampai} />

      <DeretAngka>
        <Angka label="Ikan masuk hari ini" nilai={kgOwner(hariIniData?.kg ?? 0)} ket={hariIniData ? `${hariIniData.lot} lot${hariIniData.ekor ? ` · ${hariIniData.ekor} ekor` : ""}` : "Belum ada ikan masuk"} />
        <Angka label={`Ikan masuk ${LABEL_PERIODE[lap.periode].toLowerCase()}`} nilai={kgOwner(lap.totalKg)} ket={`${lap.jumlahLot} lot · ${hari.length} hari terima`} />
        <Angka label="Belum digrading" nilai={String(lap.menunggu)} tone={lap.menunggu > 0 ? "warn" : "ok"} ket={lap.ditahan > 0 ? `${lap.ditahan} lot ditahan, ${kgOwner(lap.ditahanKg)}` : "Nggak ada yang ditahan"} />
        {po
          ? <Angka label="Pembelian" nilai={String(nunggu.length)} tone={nunggu.length > 0 ? "warn" : undefined} ket={`nunggu disetujui · ${belumLunas.length} PO belum lunas (Rp${sisaBayar.toLocaleString("id-ID")})`} />
          : <Angka label="Lot per hari" nilai={hari.length > 0 ? (lap.jumlahLot / hari.length).toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "0"} ket="rata rata di hari ada penerimaan" />}
      </DeretAngka>

      <Kotak judul="Ikan masuk per hari">
        <GrafikHarian judul={`Ikan diterima, ${LABEL_PERIODE[lap.periode].toLowerCase()}`} seri={[{ id: "ikan", label: "Ikan", satuan: "kg", data: lap.harian, warna: BIRU }]} />
      </Kotak>

      <Kotak judul="Riwayat penerimaan per tanggal" kanan={<Link href="/mutu" className="text-[12.5px] underline" style={{ color: MUTED }}>Tally</Link>}>
        {hari.length === 0
          ? <Kosong>Belum ada ikan masuk di periode ini.</Kosong>
          : <RiwayatTanggal hari={hari} hariIni={hariIni} />}
      </Kotak>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Kotak judul="Grade tuna utuh">
          {lap.grade.length === 0
            ? <Kosong>Belum ada ikan yg digrading di periode ini.</Kosong>
            : <ul className="space-y-3">{lap.grade.map((g) => <BarisBatang key={g.nama} nama={g.nama} teks={`${kgOwner(g.nilai)} · ${persen(g.pct)}`} pct={g.pct} />)}</ul>}
        </Kotak>
        <Kotak judul="Pemasok terbesar">
          {lap.pemasok.length === 0
            ? <Kosong>Belum ada ikan masuk di periode ini.</Kosong>
            : <ul className="space-y-3">{lap.pemasok.map((p) => <BarisBatang key={p.nama} nama={p.nama} teks={`${kgOwner(p.nilai)} · ${persen(p.pct)}`} pct={p.pct} warna={BIRU} />)}</ul>}
        </Kotak>
      </div>
    </div>
  );
}
