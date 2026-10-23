import Link from "next/link";
import { Icon, type IconName } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { rp } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import type { Tindakan as ItemTindakan } from "@/lib/data/tindakan";
import type { BarisLabaSiklus, BukuBulanan, Dashboard } from "@/lib/types/keuangan";

type Izin = { persetujuan: boolean; keuangan: boolean; penjualan: boolean; pembelian: boolean; produksi: boolean; stok: boolean; mutu: boolean; laporan: boolean };

type Props = { d: Dashboard; izin: Izin; nama: string; salam: string; tanggal: string; buku: BukuBulanan[]; siklus: BarisLabaSiklus | null; tindakan: ItemTindakan[] };

const kgT = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;
const persen = (n: number) => `${n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const KARTU = "rounded-[26px] p-4 md:p-5";
const GAYA_KARTU = { background: "rgba(248,249,252,.82)", border: "1px solid rgba(255,255,255,.95)", boxShadow: "0 6px 24px rgba(40,50,80,.05)" } as const;

function Bagian({ judul, kanan, children, className = "" }: { judul: string; kanan?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`${KARTU} ${className}`} style={GAYA_KARTU}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[14.5px] font-medium" style={{ color: INK }}>{judul}</h2>
        {kanan}
      </div>
      {children}
    </section>
  );
}

const Selengkapnya = ({ href, label = "Selengkapnya" }: { href: string; label?: string }) => (
  <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] font-medium underline-offset-2 hover:underline" style={{ color: MUTED }}>{label}<Icon n="arrow" s={13} c={MUTED} /></Link>
);

/* ------------------------------------------------------- perlu tindakan */
const IKON_TINDAKAN: Record<ItemTindakan["icon"], IconName> = { check: "check", cash: "cash", box: "box", factory: "factory", flask: "flask", truck: "truck", calendar: "calendar" };
const TAMPIL_AWAL = 6;

function BarisTindakan({ t }: { t: ItemTindakan }) {
  return (
    <Link href={t.href} className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 transition active:scale-[0.99] hover:shadow-sm" style={{ color: INK }}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: t.mendesak ? "#FBE5E3" : "#FBF0D5" }}>
        <Icon n={IKON_TINDAKAN[t.icon]} s={17} c={t.mendesak ? "#A8322B" : "#8A5A00"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.mendesak ? "#A8322B" : "#8A5A00" }}>{t.kelompok}</span>
        <span className="block truncate text-[14px] font-medium leading-snug">{t.judul}</span>
        <span className="line-clamp-2 block text-[12.5px] leading-snug" style={{ color: MUTED }}>{t.rincian}</span>
      </span>
      <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-[12.5px] font-medium text-white" style={{ background: INK }}>{t.aksi}<Icon n="arrow" s={13} c="#fff" /></span>
    </Link>
  );
}

function Tindakan({ daftar }: { daftar: ItemTindakan[] }) {
  const mendesak = daftar.filter((t) => t.mendesak).length;
  const awal = daftar.slice(0, TAMPIL_AWAL);
  const sisa = daftar.slice(TAMPIL_AWAL);
  return (
    <Bagian judul="Perlu tindakan Anda" kanan={daftar.length > 0 ? (
      <span className="flex gap-1.5">
        {mendesak > 0 && <span className="rounded-full bg-[#FBE5E3] px-2.5 py-1 text-[11.5px] font-semibold text-[#A8322B]">{mendesak} mendesak</span>}
        <span className="rounded-full bg-[#FBF0D5] px-2.5 py-1 text-[11.5px] font-semibold text-[#8A5A00]">{daftar.length} hal</span>
      </span>
    ) : undefined}>
      {daftar.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-[#DDF3E8] px-3.5 py-3.5">
          <Icon n="check" s={20} c="#0B6B4A" />
          <div className="text-[13.5px]" style={{ color: "#0B6B4A" }}><b className="font-semibold">Semua beres.</b> Tidak ada yang menunggu keputusan atau pemeriksaan Anda.</div>
        </div>
      ) : (
        <>
          <ul className="grid gap-1.5 md:grid-cols-2">{awal.map((t) => <li key={t.id}><BarisTindakan t={t} /></li>)}</ul>
          {sisa.length > 0 && (
            <details className="group mt-2">
              <summary className="flex h-10 cursor-pointer list-none items-center justify-center rounded-full bg-white text-[13px] font-medium" style={{ color: INK }}>
                <span className="group-open:hidden">Lihat {sisa.length} lainnya</span><span className="hidden group-open:inline">Sembunyikan</span>
              </summary>
              <ul className="mt-1.5 grid gap-1.5 md:grid-cols-2">{sisa.map((t) => <li key={t.id}><BarisTindakan t={t} /></li>)}</ul>
            </details>
          )}
        </>
      )}
    </Bagian>
  );
}
/* --------------------------------------------------------------- angka */
function Angka({ href, label, nilai, catatan, tone, icon }: { href: string; label: string; nilai: string; catatan?: string; tone?: "warn" | "ok"; icon: IconName }) {
  const warna = tone === "warn" ? "#B4443C" : tone === "ok" ? "#0B6B4A" : INK;
  return (
    <Link href={href} className="group block min-w-0 rounded-[22px] bg-white p-3.5 transition active:scale-[0.98] md:p-4" style={{ boxShadow: "0 1px 2px rgba(20,24,40,.06)" }} aria-label={`${label}: ${nilai}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium md:text-[12.5px]" style={{ color: MUTED }}>{label}</span>
        <Icon n={icon} s={16} c="#9AA2AB" />
      </div>
      <div className={`mt-2 whitespace-nowrap font-medium leading-none tracking-tight tabular-nums md:text-[24px] ${nilai.length > 12 ? "text-[17px] min-[400px]:text-[19px]" : "text-[20px] min-[400px]:text-[22px]"}`} style={{ color: warna }}>{nilai}</div>
      {catatan && <div className="mt-1.5 text-[11.5px] leading-snug md:text-[12px]" style={{ color: tone === "warn" ? "#B4443C" : MUTED }}>{catatan}</div>}
    </Link>
  );
}

/* ------------------------------------------------------------ arus kas */
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const ringkas = (n: number) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function ArusKas({ buku }: { buku: BukuBulanan[] }) {
  const data = buku.slice(-6);
  const maks = Math.max(1, ...data.flatMap((b) => [b.masuk, b.keluar]));
  const W = 560, H = 200, kiri = 8, bawah = 26, atas = 14;
  const lebarGrup = (W - kiri) / data.length;
  const lebarBatang = Math.min(26, lebarGrup / 3);
  const tinggi = (n: number) => Math.max(n > 0 ? 3 : 0, (n / maks) * (H - bawah - atas));
  const ringkasan = data.map((b) => `${BULAN_PENDEK[Number(b.bulan.slice(5, 7)) - 1]}: masuk ${rp(b.masuk)}, keluar ${rp(b.keluar)}`).join("; ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Arus kas ${data.length} bulan terakhir. ${ringkasan}`} className="h-auto w-full">
        {[0.5, 1].map((f) => <line key={f} x1={kiri} x2={W} y1={H - bawah - f * (H - bawah - atas)} y2={H - bawah - f * (H - bawah - atas)} stroke="#E2E4EA" strokeDasharray="3 4" />)}
        <line x1={kiri} x2={W} y1={H - bawah} y2={H - bawah} stroke="#CBD0D9" />
        {data.map((b, i) => {
          const x0 = kiri + i * lebarGrup + lebarGrup / 2;
          return (
            <g key={b.bulan}>
              <rect x={x0 - lebarBatang - 2} y={H - bawah - tinggi(b.masuk)} width={lebarBatang} height={tinggi(b.masuk)} rx="4" fill="#0B6B4A"><title>{`Masuk ${rp(b.masuk)}`}</title></rect>
              <rect x={x0 + 2} y={H - bawah - tinggi(b.keluar)} width={lebarBatang} height={tinggi(b.keluar)} rx="4" fill={INK}><title>{`Keluar ${rp(b.keluar)}`}</title></rect>
              {b.keluar > 0 && <text x={x0 + 2 + lebarBatang / 2} y={H - bawah - tinggi(b.keluar) - 4} fontSize="10.5" textAnchor="middle" fill="#4A5560">{ringkas(b.keluar)}</text>}
              {b.masuk > 0 && <text x={x0 - lebarBatang / 2 - 2} y={H - bawah - tinggi(b.masuk) - 4} fontSize="10.5" textAnchor="middle" fill="#0B6B4A">{ringkas(b.masuk)}</text>}
              <text x={x0} y={H - 8} fontSize="11.5" textAnchor="middle" fill={MUTED}>{BULAN_PENDEK[Number(b.bulan.slice(5, 7)) - 1]}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-4 text-[12px]" style={{ color: MUTED }}>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-[#0B6B4A]" />Uang masuk</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: INK }} />Uang keluar</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- utama */
export function DashboardOwner({ d, izin, nama, salam, tanggal, buku, siklus, tindakan }: Props) {
  const selisih = d.kas_masuk_bulan_ini - d.kas_keluar_bulan_ini;
  const adaKas = buku.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px]" style={{ color: MUTED }}>{tanggal}</p>
        <p className="mt-0.5 text-[19px] font-medium tracking-tight md:text-[21px]" style={{ color: INK }}>{salam}{nama ? `, ${nama}` : ""}</p>
      </div>

      <Tindakan daftar={tindakan} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {(izin.keuangan || izin.penjualan || izin.pembelian || izin.stok) && (
            <div className="grid grid-cols-2 gap-2.5">
              {izin.keuangan && <Angka href="/keuangan" icon="cash" label="Kas bulan ini" nilai={rp(selisih)} tone={selisih < 0 ? "warn" : selisih > 0 ? "ok" : undefined}
                catatan={`Masuk ${rp(d.kas_masuk_bulan_ini)} · keluar ${rp(d.kas_keluar_bulan_ini)}`} />}
              {izin.penjualan && <Angka href="/penjualan" icon="truck" label="Piutang" nilai={rp(d.piutang)} tone={d.invoice_terlambat > 0 ? "warn" : undefined}
                catatan={d.invoice_terlambat > 0 ? `${d.invoice_terlambat} invoice terlambat (${rp(d.piutang_terlambat)})` : "Tidak ada yang terlambat"} />}
              {izin.pembelian && <Angka href="/pembelian" icon="cart" label="Utang ke pemasok" nilai={rp(d.hutang_pemasok)} catatan="PO disetujui yang belum lunas" />}
              {izin.stok && <Angka href="/stok" icon="box" label="Stok sendiri" nilai={kgT(d.stok_sendiri_kg)} catatan={`Titipan pelanggan ${kgT(d.stok_titipan_kg)}`} />}
            </div>
          )}

          {izin.keuangan && (
            <Bagian judul="Arus kas 6 bulan terakhir" kanan={<Selengkapnya href="/keuangan" label="Buku kas" />}>
              {adaKas ? <ArusKas buku={buku} /> : <p className="rounded-2xl bg-white px-4 py-6 text-center text-[13px]" style={{ color: MUTED }}>Belum ada transaksi kas. Pembayaran, biaya yang disetujui, dan impor akan muncul di sini.</p>}
            </Bagian>
          )}

          {izin.laporan && (
            <Bagian judul={siklus ? `Siklus terbaru · ${siklus.kode}` : "Siklus terbaru"} kanan={<Selengkapnya href={siklus ? `/laporan?c=${siklus.cycle_id}` : "/laporan"} label="Laporan" />}>
              {siklus ? (
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                  <Angka href={`/laporan?c=${siklus.cycle_id}`} icon="chart" label="Pendapatan" nilai={rp(siklus.pendapatan_total)} />
                  <Angka href={`/laporan?c=${siklus.cycle_id}`} icon="chart" label="Biaya" nilai={rp(siklus.biaya_total)} />
                  <Angka href={`/laporan?c=${siklus.cycle_id}`} icon="chart" label="Laba kotor" nilai={rp(siklus.laba_kotor)} tone={siklus.laba_kotor < 0 ? "warn" : siklus.pendapatan_total > 0 ? "ok" : undefined}
                    catatan={siklus.margin_pct !== null ? `Margin ${persen(Number(siklus.margin_pct))}` : undefined} />
                  <Angka href={`/laporan?c=${siklus.cycle_id}`} icon="factory" label="Hasil olahan" nilai={siklus.kg_ikan > 0 ? persen((siklus.loin_kg / siklus.kg_ikan) * 100) : "-"} catatan={`Loin ${kgT(siklus.loin_kg)} dari ${kgT(siklus.kg_ikan)}`} />
                </div>
              ) : (
                <p className="rounded-2xl bg-white px-4 py-6 text-center text-[13px]" style={{ color: MUTED }}>Belum ada siklus. Laba rugi tampil di sini setelah ada pembelian, produksi, dan penjualan.</p>
              )}
            </Bagian>
          )}
        </div>

        <div className="space-y-4">
          {(izin.keuangan || izin.pembelian) && (
            <Bagian judul="Kelengkapan dokumen" kanan={<Selengkapnya href="/keuangan" label="Periksa" />}>
              <div className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: d.dokumen_kurang > 0 ? "#FBF0D5" : "#DDF3E8" }}>
                  <Icon n={d.dokumen_kurang > 0 ? "note" : "check"} s={17} c={d.dokumen_kurang > 0 ? "#8A5A00" : "#0B6B4A"} />
                </span>
                <div className="min-w-0 text-[13px] leading-snug" style={{ color: INK }}>
                  {d.dokumen_kurang > 0 ? <><b className="text-[17px] font-semibold tabular-nums">{d.dokumen_kurang}</b> transaksi belum punya nota atau bukti</> : <>Semua transaksi punya nota atau bukti.</>}
                </div>
              </div>
            </Bagian>
          )}

          {(izin.produksi || izin.stok) && (
            <Bagian judul="Lantai produksi">
              <div className="grid grid-cols-2 gap-2.5">
                {izin.produksi && <Angka href="/produksi" icon="factory" label="Produksi berjalan" nilai={String(d.produksi_berjalan)} />}
                {izin.stok && <Angka href="/gudang" icon="snow" label="Titipan di gudang" nilai={kgT(d.stok_titipan_kg)} />}
              </div>
            </Bagian>
          )}
        </div>
      </div>
    </div>
  );
}
