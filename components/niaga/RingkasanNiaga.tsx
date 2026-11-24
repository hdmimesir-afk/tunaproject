import Link from "next/link";
import type { LaporanKeuanganOwner, LaporanPenjualanOwner } from "@/lib/data/laporanOwner";
import { rp, tanggal } from "@/lib/format";
import { LABEL_PERIODE, type PeriodeOwner } from "@/lib/logic/laporanOwner";
import { INK, MUTED } from "@/components/ui/tokens";
import { LABEL_LINI_BIAYA, type LiniBiaya } from "@/lib/logic/lini";
import { GrafikHarian } from "@/components/owner/GrafikHarian";
import { AMBER, Angka, BarisBatang, BarisTautan, BIRU, DeretAngka, HIJAU, Kosong, Kotak, Lencana, persen, TabPeriode } from "@/components/owner/Laporan";

/* Ringkasan Niaga (permintaan tim 24 Nov 2026): operasional keuangan. Uang masuk dan keluar, saldo kas, tagihan yang
   belum lunas, sama biaya yang nunggu persetujuan. Bagian yang izinnya nggak ada buat peran ini nggak ditampilin. */
type BarisLini = { lini: LiniBiaya; pendapatan: number; uangMasuk: number; biaya: number; piutang: number };

export function RingkasanNiaga({ periode, dari, sampai, jual, uang, lini }: {
  periode: PeriodeOwner; dari: string; sampai: string; jual: LaporanPenjualanOwner | null; uang: LaporanKeuanganOwner | null; lini: BarisLini[] | null;
}) {
  const selisih = uang ? Math.round((uang.masuk - uang.keluar) * 100) / 100 : 0;
  return (
    <div className="space-y-5" data-testid="ringkasan-niaga">
      <TabPeriode path="/niaga" periode={periode} dari={dari} sampai={sampai} />

      <DeretAngka>
        {uang && <Angka label="Uang masuk" nilai={rp(uang.masuk)} ket="Dari buku kas" />}
        {uang && <Angka label="Uang keluar" nilai={rp(uang.keluar)} ket={selisih < 0 ? `Lebih ${rp(-selisih)} dari yang masuk` : `Selisih ${rp(selisih)}`} />}
        {uang && <Angka label="Saldo kas" nilai={uang.saldo !== null ? rp(uang.saldo) : "-"} tone={uang.saldo !== null && uang.saldo < 0 ? "warn" : undefined} ket="Uang yang ada sekarang" />}
        {jual && <Angka label="Piutang" nilai={rp(jual.piutang)} tone={jual.telat > 0 ? "warn" : undefined} ket={jual.telat > 0 ? `${jual.telat} tagihan telat, ${rp(jual.telatRp)}` : "Belum ada yang telat"} />}
        {jual && !uang && <Angka label="Ditagih" nilai={rp(jual.ditagih)} ket={`${jual.jumlahPesanan} pesanan`} />}
        {jual && !uang && <Angka label="Uang diterima" nilai={rp(jual.diterima)} ket="Dari pembeli" />}
      </DeretAngka>

      {lini && (
        <Kotak judul="Per lini bisnis, bulan ini">
          <div className="overflow-x-auto" data-testid="niaga-per-lini">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="text-left text-[12px]" style={{ color: MUTED }}>
                  <th className="px-2 py-1.5 font-medium">Lini</th>
                  <th className="px-2 py-1.5 text-right font-medium">Pendapatan</th>
                  <th className="px-2 py-1.5 text-right font-medium">Biaya</th>
                  <th className="px-2 py-1.5 text-right font-medium">Selisih</th>
                  <th className="px-2 py-1.5 text-right font-medium">Piutang</th>
                </tr>
              </thead>
              <tbody>
                {lini.map((l) => {
                  const s = Math.round((l.pendapatan - l.biaya) * 100) / 100;
                  return (
                    <tr key={l.lini} className="border-t border-[#EEF0F4]" style={{ color: INK }}>
                      <td className="px-2 py-2 font-medium"><Link href={`/keuangan/${l.lini}`} className="underline-offset-2 hover:underline">{LABEL_LINI_BIAYA[l.lini]}</Link></td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{rp(l.pendapatan)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{rp(l.biaya)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums" style={{ color: s < 0 ? AMBER : HIJAU }}>{rp(s)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{rp(l.piutang)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px]" style={{ color: MUTED }}>Pendapatan = tagihan dikurangi diskon, tanpa pajak. Biaya = biaya yg udah disetujui. Biaya umum (tanpa lini) nggak masuk tabel ini.</p>
        </Kotak>
      )}

      {uang && (
        <Kotak judul="Uang per hari" kanan={<Link href="/keuangan" className="text-[12.5px] underline" style={{ color: MUTED }}>Keuangan</Link>}>
          <GrafikHarian judul={LABEL_PERIODE[periode]} seri={[
            { id: "masuk", label: "Masuk", satuan: "rp", data: uang.masukHarian, warna: HIJAU },
            { id: "keluar", label: "Keluar", satuan: "rp", data: uang.keluarHarian, warna: BIRU },
          ]} />
        </Kotak>
      )}

      {uang && uang.biayaNunggu.length > 0 && (
        <Kotak judul="Biaya nunggu persetujuan" kanan={<Lencana warn>{uang.biayaNunggu.length} biaya</Lencana>}>
          <ul className="space-y-2">
            {uang.biayaNunggu.map((b) => (
              <BarisTautan key={b.id} href={`/keuangan?b=${b.id}`} judul={`${b.kategori_nama} · ${rp(b.jumlah)}`}
                ket={`${tanggal(b.tanggal)} · ${b.uraian || b.kode}${b.jml_nota === 0 ? " · belum ada nota" : ""}`} tombol="Buka" />
            ))}
          </ul>
        </Kotak>
      )}

      {jual && (
        <Kotak judul="Tagihan belum lunas" kanan={<Link href="/penjualan" className="text-[12.5px] underline" style={{ color: MUTED }}>Penjualan</Link>}>
          {jual.belumLunas.length === 0
            ? <Kosong>Semua tagihan udah lunas.</Kosong>
            : (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {jual.belumLunas.slice(0, 12).map((t) => (
                  <BarisTautan key={t.id} href={`/penjualan?inv=${t.id}`} judul={`${t.buyer_nama} · ${rp(t.sisa)}`}
                    ket={`${t.kode} · jatuh tempo ${tanggal(t.jatuh_tempo)}`}
                    kanan={t.hari_telat > 0 ? <span className="font-semibold" style={{ color: AMBER }}>telat {t.hari_telat} hari</span> : undefined} />
                ))}
              </ul>
            )}
        </Kotak>
      )}

      {uang && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Kotak judul="Uang keluar ke mana">
            {uang.keluarPer.length === 0
              ? <Kosong>Belum ada uang keluar di periode ini.</Kosong>
              : <ul className="space-y-3">{uang.keluarPer.map((k) => <BarisBatang key={k.nama} nama={k.nama} teks={`${rp(k.nilai)} · ${persen(k.pct)}`} pct={k.pct} warna={BIRU} />)}</ul>}
          </Kotak>
          <Kotak judul="Uang masuk dari mana">
            {uang.masukPer.length === 0
              ? <Kosong>Belum ada uang masuk di periode ini.</Kosong>
              : <ul className="space-y-3">{uang.masukPer.map((k) => <BarisBatang key={k.nama} nama={k.nama} teks={`${rp(k.nilai)} · ${persen(k.pct)}`} pct={k.pct} />)}</ul>}
          </Kotak>
        </div>
      )}
    </div>
  );
}
