"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bar, Btn, Card, DataList, Inner, Pill, Stat } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { DataLabaRugi } from "@/lib/data/laporan";
import { rp, tanggal } from "@/lib/format";
import { buatCsv, tampilKg } from "@/lib/logic/grid";
import { awalMinggu, hargaRataTertimbang, hitungLabaRugi, ringkasTren } from "@/lib/logic/labarugi";
import type { BarisHargaBeli, BarisLabaSiklus, DetailBaris } from "@/lib/types/keuangan";

type Props = { tren: BarisLabaSiklus[]; data: DataLabaRugi | null; siklusId: string | null; harga: BarisHargaBeli[]; bolehHarga: boolean };

const kgT = (n: number | null) => (n === null ? "" : tampilKg(Math.round(n * 1000)));
const persen = (n: number) => `${n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/* ------------------------------------------------------------ laba rugi */
function BarisKlik({ label, kg, harga, jumlah, persen: p, detail, tebal }: { label: string; kg?: number | null; harga?: number | null; jumlah: number; persen: number; detail?: DetailBaris; tebal?: boolean }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <tr className={`border-t border-[#EEF0F4] ${tebal ? "font-semibold" : ""}`} style={{ color: INK }}>
        <td className="px-3 py-2.5">
          {detail && detail.transaksi.length > 0
            ? <button type="button" className="text-left underline decoration-dotted underline-offset-4" aria-expanded={buka} onClick={() => setBuka((x) => !x)}>{label}{harga ? ` · ${rp(harga)}/kg` : ""}</button>
            : <>{label}{harga ? ` · ${rp(harga)}/kg` : ""}</>}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">{kg !== null && kg !== undefined ? kgT(kg) : ""}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">{rp(jumlah)}</td>
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: MUTED }}>{persen(p)}</td>
      </tr>
      {buka && detail && (
        <tr><td colSpan={4} className="bg-[#F8F9FC] px-3 py-2">
          <ul className="space-y-1 text-[12.5px]">
            {detail.transaksi.map((t, i) => (
              <li key={i} className="flex justify-between gap-3" style={{ color: INK }}>
                <span>{t.href ? <Link href={t.href} className="font-medium underline underline-offset-2">{t.kode}</Link> : t.kode} · {t.uraian}{t.tanggal ? ` · ${tanggal(t.tanggal)}` : ""}</span>
                <b className="tabular-nums">{rp(t.jumlah)}</b>
              </li>
            ))}
          </ul>
        </td></tr>
      )}
    </>
  );
}

function LabaRugiTab({ data, tren, siklusId }: { data: DataLabaRugi | null; tren: BarisLabaSiklus[]; siklusId: string | null }) {
  const router = useRouter();
  const r = useMemo(() => (data ? hitungLabaRugi(data.input) : null), [data]);
  const detailP = (label: string) => data?.detailPendapatan.find((d) => label.startsWith(d.label));
  const detailB = (label: string) => data?.detailBiaya.find((d) => d.label === label);

  const unduh = () => {
    if (!r || !data) return;
    const isi: (string | number)[][] = [
      ...r.pendapatan.map((b) => ["Pendapatan", b.label, kgT(b.kg), b.hargaPerKg ?? "", String(b.jumlah).replace(".", ","), persen(b.persen)]),
      ["Pendapatan", "Total pendapatan", "", "", String(r.totalPendapatan).replace(".", ","), "100,0%"],
      ...r.biaya.map((b) => ["Biaya langsung", b.label, kgT(b.kg), b.hargaPerKg ?? "", String(b.jumlah).replace(".", ","), persen(b.persen)]),
      ["Biaya langsung", "Total biaya langsung", "", "", String(r.totalBiaya).replace(".", ","), ""],
      ["Hasil", "Laba kotor siklus", "", "", String(r.labaKotor).replace(".", ","), persen(r.marginPct)],
    ];
    const url = URL.createObjectURL(new Blob([buatCsv(["Bagian", "Uraian", "Berat (kg)", "Harga/kg", "Rupiah", "% pendapatan"], isi)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `laba-rugi-${data.siklus.kode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Pilih siklus" className="h-11 rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px]" value={siklusId ?? ""} onChange={(e) => router.push(`/laporan?c=${e.target.value}`)}>
          <option value="" disabled>Pilih siklus</option>
          {tren.map((t) => <option key={t.cycle_id} value={t.cycle_id}>{t.kode}{t.ref_po_pembeli ? ` · ${t.ref_po_pembeli}` : ""}</option>)}
        </select>
        {r && <Btn size="sm" v="light" onClick={unduh}>Unduh CSV</Btn>}
      </div>

      {!data || !r ? (
        <Inner><p className="py-3 text-center text-[13px]" style={{ color: MUTED }}>{tren.length === 0 ? "Belum ada siklus." : "Pilih siklus untuk melihat laba rugi."}</p></Inner>
      ) : (
        <>
          {!r.cukupData && <p className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Siklus ini belum lengkap: belum ada penjualan terkirim atau belum ada biaya. Angka akan terisi sendiri saat datanya masuk.</p>}
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <Stat value={rp(r.totalPendapatan)} label="Pendapatan" />
            <Stat value={rp(r.totalBiaya)} label="Total biaya langsung" />
            <Stat value={rp(r.labaKotor)} label={`Laba kotor siklus · margin ${persen(r.marginPct)}`} tone={r.labaKotor < 0 ? "warn" : "ok"} />
            <Stat value={persen(r.hasilPct)} label={r.rencanaHasilPct !== null ? `Hasil olahan (loin) · rencana ${r.rencanaHasilPct}% · ${r.diAtasRencana ? "di atas rencana" : "di bawah rencana"}` : "Hasil olahan (loin)"} />
          </div>

          <Card title="1. Laba rugi">
            <div className="overflow-x-auto rounded-[20px] bg-white">
              <table className="w-full min-w-[520px] text-[13.5px]">
                <thead><tr className="text-left text-[12px]" style={{ color: MUTED }}><th className="px-3 py-2.5 font-medium">Pendapatan</th><th className="px-3 py-2.5 text-right font-medium">Berat (kg)</th><th className="px-3 py-2.5 text-right font-medium">Rupiah</th><th className="px-3 py-2.5 text-right font-medium">% pendapatan</th></tr></thead>
                <tbody>
                  {r.pendapatan.filter((b) => !b.label.startsWith("Limbah")).map((b, i) => <BarisKlik key={i} label={b.label} kg={b.kg} harga={b.hargaPerKg} jumlah={b.jumlah} persen={b.persen} detail={detailP(b.label)} />)}
                  <BarisKlik label="Subtotal loin" kg={r.subtotalLoin.kg} jumlah={r.subtotalLoin.jumlah} persen={r.subtotalLoin.persen} tebal />
                  <BarisKlik label="Subtotal hasil samping" kg={r.subtotalSamping.kg} jumlah={r.subtotalSamping.jumlah} persen={r.subtotalSamping.persen} tebal />
                  {r.pendapatan.filter((b) => b.label.startsWith("Limbah")).map((b, i) => <BarisKlik key={`l${i}`} label={`${b.label} · belum ada pembeli`} kg={b.kg} jumlah={0} persen={0} />)}
                  <BarisKlik label="Total pendapatan" jumlah={r.totalPendapatan} persen={100} tebal />
                </tbody>
                <thead><tr className="text-left text-[12px]" style={{ color: MUTED }}><th className="px-3 py-2.5 pt-5 font-medium">Biaya langsung siklus</th><th /><th className="px-3 py-2.5 pt-5 text-right font-medium">Rupiah</th><th className="px-3 py-2.5 pt-5 text-right font-medium">% pendapatan</th></tr></thead>
                <tbody>
                  {r.biaya.map((b, i) => <BarisKlik key={i} label={b.label} kg={b.kg} harga={b.hargaPerKg} jumlah={b.jumlah} persen={b.persen} detail={detailB(b.label)} />)}
                  <BarisKlik label="Total biaya langsung" jumlah={r.totalBiaya} persen={r.totalPendapatan > 0 ? Math.round((r.totalBiaya / r.totalPendapatan) * 1000) / 10 : 0} tebal />
                  <BarisKlik label="Laba kotor siklus" jumlah={r.labaKotor} persen={r.marginPct} tebal />
                </tbody>
              </table>
            </div>
            <p className="px-2.5 pb-2 pt-2.5 text-[12px]" style={{ color: MUTED }}>Ketuk nama baris bergaris putus-putus untuk melihat transaksi di baliknya. Laba bersih: belum bisa dihitung sampai biaya bulanan, penyusutan, dan pajak diisi.</p>
          </Card>

          <Card title="2. Ke mana berat ikan pergi">
            <div className="space-y-3 px-2.5 pb-2.5">
              {r.beratKemana.map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex justify-between text-[13px]" style={{ color: INK }}><span>{b.label}</span><span className="tabular-nums">{kgT(b.kg)} kg · {persen(b.persen)}</span></div>
                  <Bar pct={b.persen} />
                </div>
              ))}
            </div>
          </Card>

          {r.perKgLoin && (
            <Card title="3. Angka per kg loin">
              <div className="grid grid-cols-2 gap-2.5 px-2.5 pb-2.5 md:grid-cols-5">
                <Stat value={rp(r.perKgLoin.hargaJualRataRata)} label="Harga jual rata-rata" />
                <Stat value={rp(r.perKgLoin.biayaTotal)} label="Biaya total per kg" />
                <Stat value={rp(r.perKgLoin.biayaIkan)} label="Dari ikan utuh" />
                <Stat value={rp(r.perKgLoin.labaPerKg)} label="Laba per kg" tone={r.perKgLoin.labaPerKg < 0 ? "warn" : "ok"} />
                <Stat value={rp(r.perKgLoin.hargaJualMinimal)} label="Harga jual minimal agar tidak rugi" />
              </div>
              <p className="px-2.5 pb-2 text-[12px]" style={{ color: MUTED }}>Harga minimal = (biaya − pendapatan hasil samping) ÷ kg loin.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- tren */
function TrenTab({ tren }: { tren: BarisLabaSiklus[] }) {
  const baris = ringkasTren(tren);
  const unduh = () => {
    const url = URL.createObjectURL(new Blob([buatCsv(["Siklus", "Ikan (kg)", "Hasil olahan (%)", "Harga ikan/kg", "Pendapatan", "Biaya", "Laba kotor", "Margin (%)"],
      baris.map((b) => [b.kode, kgT(b.ikanKg), String(b.hasilPct).replace(".", ","), b.hargaIkanPerKg, String(b.pendapatan).replace(".", ","), String(b.biaya).replace(".", ","), String(b.laba).replace(".", ","), b.marginPct === null ? "" : String(b.marginPct).replace(".", ",")]))], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "tren-antarsiklus.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card title="Tren antarsiklus" right={<Btn size="sm" v="light" onClick={unduh} disabled={baris.length === 0}>Unduh CSV</Btn>}>
      <DataList
        rows={baris}
        empty="Belum ada siklus."
        cols={[
          { h: "Siklus", r: (b: (typeof baris)[number]) => <span className="font-medium">{b.kode}</span> },
          { h: "Ikan", r: (b) => `${kgT(b.ikanKg)} kg`, right: true },
          { h: "Hasil olahan", r: (b) => persen(b.hasilPct), right: true },
          { h: "Harga ikan/kg", r: (b) => rp(b.hargaIkanPerKg), right: true },
          { h: "Pendapatan", r: (b) => rp(b.pendapatan), right: true },
          { h: "Biaya", r: (b) => rp(b.biaya), right: true },
          { h: "Laba kotor", r: (b) => rp(b.laba), right: true },
          { h: "Margin", r: (b) => (b.marginPct === null ? "-" : persen(b.marginPct)), right: true },
        ]}
      />
      <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>Baris baru terisi otomatis dari penjualan dan biaya yang sudah tercatat di tiap siklus.</p>
    </Card>
  );
}

/* ------------------------------------------------------------ harga beli */
function GrafikHarga({ titik }: { titik: { periode: string; harga: number }[] }) {
  if (titik.length < 2) return <p className="px-2.5 pb-2 text-[12.5px]" style={{ color: MUTED }}>Grafik muncul setelah ada minimal dua periode.</p>;
  const w = 640, h = 180, px = 44, py = 18;
  const nilai = titik.map((t) => t.harga);
  const min = Math.min(...nilai), max = Math.max(...nilai);
  const rentang = max - min || 1;
  const x = (i: number) => px + (i / (titik.length - 1)) * (w - px - 12);
  const y = (v: number) => h - py - ((v - min) / rentang) * (h - 2 * py);
  const garis = titik.map((t, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(t.harga).toFixed(1)}`).join(" ");
  return (
    <div className="px-2.5 pb-2.5">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Grafik harga beli rata-rata tertimbang per periode" className="w-full">
        <line x1={px} y1={h - py} x2={w - 8} y2={h - py} stroke="#E2E4EA" />
        <text x={4} y={y(max) + 4} fontSize="11" fill="#6B7280">{rp(max)}</text>
        <text x={4} y={y(min) + 4} fontSize="11" fill="#6B7280">{rp(min)}</text>
        <path d={garis} fill="none" stroke="#00171F" strokeWidth="2" />
        {titik.map((t, i) => <circle key={i} cx={x(i)} cy={y(t.harga)} r="3.5" fill="#00171F"><title>{`${t.periode}: ${rp(t.harga)}/kg`}</title></circle>)}
        <text x={px} y={h - 2} fontSize="11" fill="#6B7280">{titik[0].periode}</text>
        <text x={w - 8} y={h - 2} fontSize="11" fill="#6B7280" textAnchor="end">{titik[titik.length - 1].periode}</text>
      </svg>
    </div>
  );
}

function HargaTab({ harga }: { harga: BarisHargaBeli[] }) {
  const [periode, setPeriode] = useState<"hari" | "minggu">("minggu");
  const [pemasok, setPemasok] = useState("");
  const [grade, setGrade] = useState("");
  const daftarPemasok = useMemo(() => [...new Map(harga.map((x) => [x.supplier_id, x.supplier_nama])).entries()], [harga]);
  const daftarGrade = useMemo(() => [...new Set(harga.map((x) => x.grade_kode))].sort(), [harga]);
  const baris = useMemo(() => {
    const m = new Map<string, { periode: string; kg: number; nilaiSen: number; lot: number }>();
    for (const x of harga) {
      if ((pemasok && x.supplier_id !== pemasok) || (grade && x.grade_kode !== grade)) continue;
      const p = periode === "minggu" ? awalMinggu(x.tanggal) : x.tanggal;
      const a = m.get(p) ?? { periode: p, kg: 0, nilaiSen: 0, lot: 0 };
      a.kg += Math.round(Number(x.kg) * 1000);
      a.nilaiSen += Math.round(Number(x.nilai) * 100);
      a.lot += x.jumlah_lot;
      m.set(p, a);
    }
    return [...m.values()].sort((a, b) => a.periode.localeCompare(b.periode)).map((a) => ({ periode: a.periode, kg: a.kg / 1000, nilai: a.nilaiSen / 100, lot: a.lot, harga: hargaRataTertimbang(a.kg / 1000, a.nilaiSen / 100) }));
  }, [harga, periode, pemasok, grade]);
  const unduh = () => {
    const url = URL.createObjectURL(new Blob([buatCsv(["Periode", "Berat (kg)", "Nilai (Rp)", "Harga rata-rata tertimbang (Rp/kg)", "Jumlah lot"], baris.map((b) => [b.periode, kgT(b.kg), String(b.nilai).replace(".", ","), b.harga, b.lot]))], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "harga-beli.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const sel = "h-9 rounded-full border border-[#E2E4EA] bg-white px-3 text-[12.5px]";
  return (
    <Card title="Harga beli rata-rata tertimbang" right={<Btn size="sm" v="light" onClick={unduh} disabled={baris.length === 0}>Unduh CSV</Btn>}>
      <div className="flex flex-wrap gap-2 px-2.5 pb-2.5">
        <select aria-label="Periode" className={sel} value={periode} onChange={(e) => setPeriode(e.target.value as "hari" | "minggu")}><option value="minggu">Per minggu</option><option value="hari">Per hari</option></select>
        <select aria-label="Pemasok" className={sel} value={pemasok} onChange={(e) => setPemasok(e.target.value)}><option value="">Semua pemasok</option>{daftarPemasok.map(([id, nama]) => <option key={id} value={id}>{nama}</option>)}</select>
        <select aria-label="Grade" className={sel} value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">Semua grade</option>{daftarGrade.map((g) => <option key={g} value={g}>{g}</option>)}</select>
      </div>
      <GrafikHarga titik={baris.map((b) => ({ periode: b.periode, harga: b.harga }))} />
      <DataList
        rows={[...baris].reverse()}
        empty="Belum ada ikan diterima."
        cols={[
          { h: "Periode", r: (b: (typeof baris)[number]) => <span className="font-medium">{tanggal(b.periode)}</span> },
          { h: "Berat", r: (b) => `${kgT(b.kg)} kg`, right: true },
          { h: "Nilai", r: (b) => rp(b.nilai), right: true },
          { h: "Harga rata-rata", r: (b) => `${rp(b.harga)}/kg`, right: true },
          { h: "Lot", r: (b) => String(b.lot), right: true },
        ]}
      />
      <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>Harga dihitung dari nilai ÷ berat semua lot (bukan rata-rata dari rata-rata). Harga baru tidak mengubah harga PO lama.</p>
    </Card>
  );
}

/* ---------------------------------------------------------------- utama */
export function LaporanKelola({ tren, data, siklusId, harga, bolehHarga }: Props) {
  const [tab, setTab] = useState<"laba" | "tren" | "harga">("laba");
  const tabs = [["laba", "Laba rugi siklus"], ["tren", "Tren antarsiklus"], ...(bolehHarga ? [["harga", "Harga beli"]] : [])] as [typeof tab, string][];
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Jenis laporan" className="flex flex-wrap gap-2">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)}
            className="h-9 rounded-full px-4 text-[13px] font-medium" style={tab === k ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>{label}</button>
        ))}
        <Pill t={`${tren.length} siklus`} />
      </div>
      {tab === "laba" && <LabaRugiTab data={data} tren={tren} siklusId={siklusId} />}
      {tab === "tren" && <TrenTab tren={tren} />}
      {tab === "harga" && bolehHarga && <HargaTab harga={harga} />}
    </div>
  );
}
