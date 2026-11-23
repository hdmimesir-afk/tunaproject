import type { LaporanMutuOwner, LotOwner } from "@/lib/data/laporanOwner";
import { tanggal } from "@/lib/format";
import { kgOwner, LABEL_PERIODE } from "@/lib/logic/laporanOwner";
import { MUTED } from "@/components/ui/tokens";
import { GrafikHarian } from "./GrafikHarian";
import { AMBER, Angka, BarisBatang, BarisTautan, BIRU, DeretAngka, HIJAU, Kosong, Kotak, Lencana, persen, TabPeriode, TautanLengkap } from "./Laporan";

/* Laporan penerimaan ikan buat owner (23 Nov 2026): berapa ikan masuk, grade tuna utuhnya, dari pemasok mana,
   yg belum digrade dan yg ditahan (gugur atau bau). */

const STATUS: Record<LotOwner["qc"], string> = { menunggu: "Belum digrade", lulus: "Sudah digrade", ditahan: "Ditahan" };

export function MutuOwner({ lap }: { lap: LaporanMutuOwner }) {
  const rata = lap.jumlahLot > 0 ? lap.totalKg / lap.jumlahLot : 0;
  const perhatian = lap.daftar.filter((l) => l.qc !== "lulus");
  return (
    <div className="space-y-5" data-testid="mutu-owner">
      <TabPeriode path="/mutu" periode={lap.periode} dari={lap.dari} sampai={lap.sampai} />

      <DeretAngka>
        <Angka label="Ikan diterima" nilai={kgOwner(lap.totalKg)} ket={lap.jumlahLot > 0 ? `Rata rata ${kgOwner(rata)} per lot` : "Belum ada ikan masuk"} />
        <Angka label="Jumlah lot" nilai={String(lap.jumlahLot)} ket="Satu lot = satu kali timbang terima" />
        <Angka label="Belum digrade" nilai={String(lap.menunggu)} tone={lap.menunggu > 0 ? "warn" : "ok"} ket={lap.menunggu > 0 ? "Lot yg grade-nya belum diisi" : "Semua udah digrade"} />
        <Angka label="Ditahan" nilai={String(lap.ditahan)} tone={lap.ditahan > 0 ? "warn" : undefined} ket={lap.ditahan > 0 ? `${kgOwner(lap.ditahanKg)} gugur atau bau` : "Nggak ada ikan ditolak"} />
      </DeretAngka>

      <Kotak judul="Ikan masuk per hari">
        <GrafikHarian judul={`Ikan diterima, ${LABEL_PERIODE[lap.periode].toLowerCase()}`} seri={[{ id: "ikan", label: "Ikan", satuan: "kg", data: lap.harian, warna: BIRU }]} />
      </Kotak>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Kotak judul="Grade tuna utuh">
          {lap.grade.length === 0
            ? <Kosong>Belum ada ikan yg digrade di periode ini.</Kosong>
            : <ul className="space-y-3">{lap.grade.map((g) => <BarisBatang key={g.nama} nama={g.nama} teks={`${kgOwner(g.nilai)} · ${persen(g.pct)}`} pct={g.pct} />)}</ul>}
          <p className="mt-3 text-[12px]" style={{ color: MUTED }}>Grade ini yg nentuin harga bayar ke nelayan.</p>
        </Kotak>
        <Kotak judul="Pemasok terbesar">
          {lap.pemasok.length === 0
            ? <Kosong>Belum ada ikan masuk di periode ini.</Kosong>
            : <ul className="space-y-3">{lap.pemasok.map((p) => <BarisBatang key={p.nama} nama={p.nama} teks={`${kgOwner(p.nilai)} · ${persen(p.pct)}`} pct={p.pct} warna={BIRU} />)}</ul>}
        </Kotak>
      </div>

      {perhatian.length > 0 && (
        <Kotak judul="Perlu perhatian" kanan={<Lencana warn>{perhatian.length} lot</Lencana>}>
          <ul className="space-y-2">
            {perhatian.slice(0, 20).map((l) => (
              <BarisTautan key={l.id} href="/mutu?lengkap=1" judul={`${l.kode} · ${kgOwner(l.kg)}`} ket={`${tanggal(l.tanggal_terima)} · ${l.pemasok || "Tanpa pemasok"}`}
                kanan={<span className="font-semibold" style={{ color: AMBER }}>{STATUS[l.qc]}</span>} />
            ))}
          </ul>
        </Kotak>
      )}

      <Kotak judul="Ikan masuk di periode ini" kanan={<span className="text-[12px]" style={{ color: MUTED }}>{lap.daftar.length} lot</span>}>
        {lap.daftar.length === 0
          ? <Kosong>Belum ada ikan masuk.</Kosong>
          : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {lap.daftar.slice(0, 40).map((l) => (
                <BarisTautan key={l.id} href="/mutu?lengkap=1" judul={`${l.kode} · ${kgOwner(l.kg)}`}
                  ket={`${tanggal(l.tanggal_terima)} · ${l.pemasok || "Tanpa pemasok"}${l.proyek ? ` · ${l.proyek}` : ""}`}
                  kanan={<span className="font-semibold" style={{ color: l.qc === "lulus" ? HIJAU : AMBER }}>{l.qc === "lulus" ? (l.grade || "Digrade") : STATUS[l.qc]}</span>} />
              ))}
            </ul>
          )}
      </Kotak>

      <TautanLengkap path="/mutu" />
    </div>
  );
}
