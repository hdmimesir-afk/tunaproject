import type { LaporanKeuanganOwner } from "@/lib/data/laporanOwner";
import { rp, tanggal } from "@/lib/format";
import { LABEL_PERIODE } from "@/lib/logic/laporanOwner";
import type { BukuBulanan } from "@/lib/types/keuangan";
import { INK, MUTED } from "@/components/ui/tokens";
import { GrafikHarian } from "./GrafikHarian";
import { AMBER, Angka, BarisBatang, BarisTautan, BIRU, DeretAngka, HIJAU, Kosong, Kotak, Lencana, persen, TabPeriode, TautanLengkap } from "./Laporan";

/* Laporan keuangan buat owner (23 Nov 2026): uang masuk, keluar, selisihnya, saldo sekarang, uang keluar ke mana aja,
   biaya yg nunggu persetujuan, sama ringkasan per bulan. */

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const bulanTeks = (b: string) => `${NAMA_BULAN[Number(b.slice(5, 7)) - 1]} ${b.slice(0, 4)}`;

export function KeuanganOwner({ lap, buku }: { lap: LaporanKeuanganOwner; buku: BukuBulanan[] }) {
  const selisih = Math.round((lap.masuk - lap.keluar) * 100) / 100;
  const urut = [...buku].sort((a, b) => b.bulan.localeCompare(a.bulan));
  const saldo = lap.saldo;
  return (
    <div className="space-y-5" data-testid="keuangan-owner">
      <TabPeriode path="/keuangan" periode={lap.periode} dari={lap.dari} sampai={lap.sampai} />

      <DeretAngka>
        <Angka label="Uang masuk" nilai={rp(lap.masuk)} ket="Dari buku kas" />
        <Angka label="Uang keluar" nilai={rp(lap.keluar)} ket="Bayar nelayan, biaya, dll" />
        <Angka label="Selisih" nilai={rp(selisih)} tone={selisih < 0 ? "warn" : selisih > 0 ? "ok" : undefined} ket={selisih < 0 ? "Keluar lebih banyak dari masuk" : "Masuk dikurangi keluar"} />
        <Angka label="Saldo kas" nilai={saldo !== null ? rp(saldo) : "-"} tone={saldo !== null && saldo < 0 ? "warn" : undefined} ket="Uang yg ada sekarang" />
      </DeretAngka>

      {lap.biayaNunggu.length > 0 && (
        <Kotak judul="Biaya nunggu persetujuan" kanan={<Lencana warn>{lap.biayaNunggu.length} biaya</Lencana>}>
          <ul className="space-y-2">
            {lap.biayaNunggu.map((b) => (
              <BarisTautan key={b.id} href={`/keuangan?b=${b.id}`} judul={`${b.kategori_nama} · ${rp(b.jumlah)}`}
                ket={`${tanggal(b.tanggal)} · ${b.uraian || b.kode}${b.jml_nota === 0 ? " · belum ada nota" : ""}`} tombol="Periksa" />
            ))}
          </ul>
        </Kotak>
      )}

      <Kotak judul="Uang per hari">
        <GrafikHarian judul={LABEL_PERIODE[lap.periode]} seri={[
          { id: "masuk", label: "Masuk", satuan: "rp", data: lap.masukHarian, warna: HIJAU },
          { id: "keluar", label: "Keluar", satuan: "rp", data: lap.keluarHarian, warna: BIRU },
        ]} />
      </Kotak>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Kotak judul="Uang keluar ke mana">
          {lap.keluarPer.length === 0
            ? <Kosong>Belum ada uang keluar di periode ini.</Kosong>
            : <ul className="space-y-3">{lap.keluarPer.map((k) => <BarisBatang key={k.nama} nama={k.nama} teks={`${rp(k.nilai)} · ${persen(k.pct)}`} pct={k.pct} warna={BIRU} />)}</ul>}
        </Kotak>
        <Kotak judul="Uang masuk dari mana">
          {lap.masukPer.length === 0
            ? <Kosong>Belum ada uang masuk di periode ini.</Kosong>
            : <ul className="space-y-3">{lap.masukPer.map((k) => <BarisBatang key={k.nama} nama={k.nama} teks={`${rp(k.nilai)} · ${persen(k.pct)}`} pct={k.pct} />)}</ul>}
        </Kotak>
      </div>

      <Kotak judul="Per bulan">
        {urut.length === 0
          ? <Kosong>Belum ada catatan kas.</Kosong>
          : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {urut.slice(0, 6).map((b) => {
                const s = Math.round((b.masuk - b.keluar) * 100) / 100;
                return (
                  <li key={b.bulan} className="rounded-2xl bg-white px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold" style={{ color: INK }}>{bulanTeks(b.bulan)}</span>
                      <span className="text-[11.5px] font-medium" style={{ color: MUTED }}>{b.bulan_berjalan ? "Bulan berjalan" : b.status === "ditutup" ? "Udah ditutup" : "Belum ditutup"}</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-2 text-[12.5px] tabular-nums">
                      <span><span className="block" style={{ color: MUTED }}>Masuk</span><span style={{ color: INK }}>{rp(b.masuk)}</span></span>
                      <span><span className="block" style={{ color: MUTED }}>Keluar</span><span style={{ color: INK }}>{rp(b.keluar)}</span></span>
                      <span><span className="block" style={{ color: MUTED }}>Selisih</span><span className="font-semibold" style={{ color: s < 0 ? AMBER : HIJAU }}>{rp(s)}</span></span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </Kotak>

      <TautanLengkap path="/keuangan" />
    </div>
  );
}
