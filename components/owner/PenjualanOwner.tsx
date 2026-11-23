import type { LaporanPenjualanOwner } from "@/lib/data/laporanOwner";
import { rp, tanggal } from "@/lib/format";
import { kgOwner, LABEL_PERIODE } from "@/lib/logic/laporanOwner";
import { LABEL_TAGIHAN } from "@/lib/logic/penjualan";
import { INK, MUTED } from "@/components/ui/tokens";
import { GrafikHarian } from "./GrafikHarian";
import { AMBER, Angka, BarisBatang, BarisTautan, DeretAngka, HIJAU, Kosong, Kotak, Lencana, persen, TabPeriode, TautanLengkap } from "./Laporan";

/* Laporan penjualan buat owner (23 Nov 2026): berapa yg ditagih, berapa uang yg udah masuk, barang terkirim,
   pembeli terbesar, sama tagihan yg belum lunas (yg telat paling atas). */

export function PenjualanOwner({ lap }: { lap: LaporanPenjualanOwner }) {
  return (
    <div className="space-y-5" data-testid="penjualan-owner">
      <TabPeriode path="/penjualan" periode={lap.periode} dari={lap.dari} sampai={lap.sampai} />

      <DeretAngka>
        <Angka label="Penjualan ditagih" nilai={rp(lap.ditagih)} ket="Invoice yg terbit di periode ini" />
        <Angka label="Uang diterima" nilai={rp(lap.diterima)} tone={lap.diterima > 0 ? "ok" : undefined} ket="Pembayaran dari pembeli" />
        <Angka label="Barang terkirim" nilai={kgOwner(lap.kgTerkirim)} ket={`${lap.jumlahPesanan} pesanan · ${lap.belumDikirim} belum dikirim`} />
        <Angka label="Piutang" nilai={rp(lap.piutang)} tone={lap.telat > 0 ? "warn" : undefined}
          ket={lap.telat > 0 ? `${lap.telat} tagihan telat, ${rp(lap.telatRp)}` : "Belum ada yg telat bayar"} />
      </DeretAngka>

      <Kotak judul="Penjualan per hari">
        <GrafikHarian judul={`Ditagih, ${LABEL_PERIODE[lap.periode].toLowerCase()}`} seri={[{ id: "jual", label: "Penjualan", satuan: "rp", data: lap.harian, warna: HIJAU }]} />
      </Kotak>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Kotak judul="Pembeli terbesar">
          {lap.pembeli.length === 0
            ? <Kosong>Belum ada penjualan di periode ini.</Kosong>
            : <ul className="space-y-3">{lap.pembeli.map((p) => <BarisBatang key={p.nama} nama={p.nama} teks={`${rp(p.nilai)} · ${persen(p.pct)}`} pct={p.pct} />)}</ul>}
        </Kotak>
        <Kotak judul="Tagihan belum lunas" kanan={lap.belumLunas.length > 0 ? <Lencana warn={lap.telat > 0}>{lap.belumLunas.length} tagihan</Lencana> : undefined}>
          {lap.belumLunas.length === 0
            ? <Kosong>Semua tagihan udah lunas.</Kosong>
            : (
              <ul className="space-y-2">
                {lap.belumLunas.slice(0, 15).map((x) => (
                  <BarisTautan key={x.id} href={`/penjualan?inv=${x.id}`} judul={`${x.buyer_nama} · ${x.kode}`}
                    ket={x.status_tagihan === "terlambat" ? `Telat ${x.hari_telat} hari · jatuh tempo ${tanggal(x.jatuh_tempo)}` : `${LABEL_TAGIHAN[x.status_tagihan]} · ${tanggal(x.jatuh_tempo)}`}
                    kanan={<span className="font-semibold" style={{ color: x.status_tagihan === "terlambat" ? AMBER : INK }}>{rp(x.sisa)}</span>} />
                ))}
              </ul>
            )}
          {lap.belumLunas.length > 15 && <p className="mt-2 text-[12px]" style={{ color: MUTED }}>Dan {lap.belumLunas.length - 15} tagihan lain di halaman lengkap.</p>}
        </Kotak>
      </div>

      <TautanLengkap path="/penjualan" />
    </div>
  );
}
