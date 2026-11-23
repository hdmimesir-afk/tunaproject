import Link from "next/link";
import { INK, MUTED } from "@/components/ui/tokens";
import type { LaporanProduksiOwner } from "@/lib/data/laporanOwner";
import { tanggal } from "@/lib/format";
import { kgOwner } from "@/lib/logic/laporanOwner";
import { LABEL_PERIODE } from "@/lib/logic/laporanOwner";
import { LABEL_PRODUKSI } from "@/lib/logic/produksi";
import { GrafikHarian } from "./GrafikHarian";
import { AMBER, Angka, BarisBatang, BarisTautan, DeretAngka, BIRU, GAYA, HIJAU, Kosong, Kotak, Lencana, persen, TabPeriode, TautanLengkap } from "./Laporan";

/* Laporan produksi buat owner (23 Nov 2026): bukan tabel kerja, tapi ringkasan yg gampang dibaca.
   Periode, angka besar, yg perlu disetujui, grafik loin per hari, loin per grade, ke mana ikannya, daftar produksi. */

const kgT = kgOwner;

export function ProduksiOwner({ lap }: { lap: LaporanProduksiOwner }) {
  const r = lap.ringkas;
  const target = lap.targetPct;
  const capai = r.yieldPct !== null && target !== null ? r.yieldPct >= target : null;
  const nunggu = lap.daftar.filter((p) => p.status === "selesai" || p.status === "diperiksa_qc");
  const belumJelas = Math.max(0, r.masukKg - r.loinKg - r.sampingKg - r.limbahKg - r.susutKg);
  const pctDari = (kg: number) => (r.masukKg > 0 ? (kg / r.masukKg) * 100 : 0);
  const komposisi = [
    { nama: "Loin", kg: r.loinKg, warna: HIJAU },
    { nama: "Hasil samping", kg: r.sampingKg, warna: BIRU },
    { nama: "Limbah", kg: r.limbahKg, warna: "#6B7280" },
    { nama: "Susut", kg: r.susutKg, warna: "#9AA2AB" },
    ...(belumJelas > 0.0005 ? [{ nama: "Belum jelas", kg: belumJelas, warna: AMBER }] : []),
  ].filter((k) => k.kg > 0);

  return (
    <div className="space-y-5" data-testid="produksi-owner">
      <TabPeriode path="/produksi" periode={lap.periode} dari={lap.dari} sampai={lap.sampai} />

      <DeretAngka>
        <Angka label="Loin dihasilkan" nilai={kgT(r.loinKg)} ket={r.jumlah > 0 ? "Dari semua produksi" : "Belum ada produksi"} />
        <Angka label="Ikan diolah" nilai={kgT(r.masukKg)} ket="Ikan utuh masuk produksi" />
        <Angka label="Hasil olahan" nilai={r.yieldPct !== null ? persen(r.yieldPct) : "-"} tone={capai === null ? undefined : capai ? "ok" : "warn"}
          ket={target !== null ? (capai === null ? `Target ${persen(target)}` : capai ? `Sesuai target ${persen(target)}` : `Di bawah target ${persen(target)}`) : "Loin dibagi ikan diolah"} />
        <Angka label="Jumlah produksi" nilai={String(r.jumlah)} ket={`${r.berjalan} jalan · ${r.menunggu} nunggu · ${r.disetujui} disetujui`} />
      </DeretAngka>

      {nunggu.length > 0 && (
        <Kotak judul="Perlu disetujui" kanan={<Lencana warn>{nunggu.length} produksi</Lencana>}>
          <ul className="space-y-2">
            {nunggu.map((p) => (
              <BarisTautan key={p.id} href={`/produksi?p=${p.id}`} judul={`${p.kode} · ${kgT(p.loin_kg)} loin`}
                ket={`${tanggal(p.tanggal)} · hasil ${persen(p.hasil_pct)} · ${LABEL_PRODUKSI[p.status]}`} tombol="Periksa" />
            ))}
          </ul>
        </Kotak>
      )}

      <Kotak judul="Loin per hari">
        <GrafikHarian judul={`Loin dihasilkan, ${LABEL_PERIODE[lap.periode].toLowerCase()}`} seri={[{ id: "loin", label: "Loin", satuan: "kg", data: lap.loinHarian, warna: HIJAU }]} />
      </Kotak>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Kotak judul="Loin per grade">
          {lap.grade.length === 0
            ? <Kosong>Belum ada loin yg ditimbang di periode ini.</Kosong>
            : <ul className="space-y-3">{lap.grade.map((g) => <BarisBatang key={g.kode} nama={g.kode} teks={`${kgT(g.kg)} · ${persen(g.pct)}`} pct={g.pct} />)}</ul>}
        </Kotak>
        <Kotak judul="Ke mana ikannya">
          {r.masukKg === 0
            ? <Kosong>Belum ada ikan yg diolah di periode ini.</Kosong>
            : (
              <>
                <p className="mb-3 text-[12.5px]" style={{ color: MUTED }}>Dari {kgT(r.masukKg)} ikan utuh yg diolah:</p>
                <ul className="space-y-3">{komposisi.map((k) => <BarisBatang key={k.nama} nama={k.nama} teks={`${kgT(k.kg)} · ${persen(pctDari(k.kg))}`} pct={pctDari(k.kg)} warna={k.warna} />)}</ul>
              </>
            )}
        </Kotak>
      </div>

      <Kotak judul="Produksi di periode ini" kanan={<span className="text-[12px]" style={{ color: MUTED }}>Pencet buat liat rincian</span>}>
        {lap.daftar.length === 0
          ? <Kosong>Belum ada produksi.</Kosong>
          : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {lap.daftar.slice(0, 40).map((p) => {
                const ok = target === null || p.hasil_pct >= target;
                return (
                  <li key={p.id} className="min-w-0">
                    <Link href={`/produksi?p=${p.id}`} className="block rounded-2xl bg-white px-3.5 py-3 transition active:scale-[0.99]" style={GAYA}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-semibold" style={{ color: INK }}>{p.kode}</span>
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#EEF0F5", color: "#4A5560" }}>{LABEL_PRODUKSI[p.status]}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px]" style={{ color: MUTED }}>{tanggal(p.tanggal)}{p.siklus_kode ? ` · ${[p.siklus_kode, p.proyek_nama].filter(Boolean).join(" · ")}` : ""}</p>
                      <div className="mt-2 flex items-baseline justify-between gap-2 text-[13px] tabular-nums">
                        <span style={{ color: INK }}>{kgT(p.masuk_kg)} <span style={{ color: MUTED }}>jadi</span> <b className="font-semibold">{kgT(p.loin_kg)}</b> loin</span>
                        <span className="font-semibold" style={{ color: p.loin_kg > 0 ? (ok ? HIJAU : AMBER) : MUTED }}>{p.loin_kg > 0 ? persen(p.hasil_pct) : "-"}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
      </Kotak>

      <TautanLengkap path="/produksi" />
    </div>
  );
}
