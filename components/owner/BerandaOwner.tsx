import Link from "next/link";
import { Icon, type IconName } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { AbsensiOwner, AturAngka, CctvOwner, FotoTimbanganOwner, KapasitasOwner, LampiranOwner } from "@/components/dashboard/BagianOwner";
import { Bagian, Lipat, Tindakan } from "@/components/dashboard/DashboardOwner";
import { LaporanHarian } from "@/components/dashboard/LaporanHarian";
import type { DataOwner } from "@/lib/data/dashboardOwner";
import type { LaporanHarian as DataLaporan } from "@/lib/data/laporanHarian";
import type { TrenOwner } from "@/lib/data/laporanOwner";
import type { Tindakan as ItemTindakan } from "@/lib/data/tindakan";
import { rp } from "@/lib/format";
import { kgOwner } from "@/lib/logic/laporanOwner";
import type { BarisLabaSiklus, Dashboard } from "@/lib/types/keuangan";
import type { Ruangan } from "@/lib/types/stok";
import { GrafikHarian } from "./GrafikHarian";

/* Beranda owner (23 Nov 2026): dibikin kayak aplikasi laporan buat pemilik, bukan layar kerja ERP.
   Urutannya: yg perlu diputusin, kondisi uang, hari ini, tren 30 hari, laporan per bagian, gudang/absen/CCTV,
   terus rincian lainnya dilipat. Angka besar, keterangan satu baris, semua kartu bisa dipencet ke laporannya. */

type Izin = { persetujuan: boolean; keuangan: boolean; penjualan: boolean; pembelian: boolean; produksi: boolean; stok: boolean; mutu: boolean; laporan: boolean };
type Props = {
  d: Dashboard; izin: Izin; nama: string; salam: string; tanggal: string; tindakan: ItemTindakan[];
  owner: DataOwner; tren: TrenOwner; ruangan: Ruangan[]; siklus: BarisLabaSiklus | null;
  laporan?: { data: DataLaporan; judulTanggal: string; teks: string };
};

const HIJAU = "#0B6B4A";
const MERAH = "#B4443C";
const kgT = kgOwner;
const jumlah = (xs: { nilai: number }[]) => Math.round(xs.reduce((a, x) => a + Math.round(x.nilai * 100), 0)) / 100;
const persen = (n: number) => `${n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const GAYA = { boxShadow: "0 1px 2px rgba(20,24,40,.06)" } as const;

function Judul({ teks, kanan }: { teks: string; kanan?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-2 px-1">
      <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: INK }}>{teks}</h2>
      {kanan}
    </div>
  );
}

/** Kartu angka besar. Kalau ada href, bisa dipencet ke laporannya. */
function Kartu({ label, nilai, ket, href, tone, aksi, besar = false }: {
  label: string; nilai: string; ket?: string; href?: string; tone?: "ok" | "warn"; aksi?: React.ReactNode; besar?: boolean;
}) {
  const isi = (
    <>
      <p className="text-[12.5px] font-medium" style={{ color: MUTED }}>{label}</p>
      <p className={`mt-1 font-semibold tabular-nums tracking-tight ${besar ? "text-[26px] md:text-[28px]" : "text-[20px] md:text-[22px]"}`}
        style={{ color: tone === "warn" ? MERAH : tone === "ok" ? HIJAU : INK }}>{nilai}</p>
      {ket && <p className="mt-0.5 text-[12px] leading-snug" style={{ color: tone === "warn" ? MERAH : MUTED }}>{ket}</p>}
    </>
  );
  const kelas = "block min-w-0 rounded-[22px] bg-white p-4";
  return (
    <div className="flex min-w-0 flex-col">
      {href ? <Link href={href} className={`${kelas} flex-1 transition active:scale-[0.98]`} style={GAYA}>{isi}</Link> : <div className={`${kelas} flex-1`} style={GAYA}>{isi}</div>}
      {aksi && <div className="mt-1.5 px-1">{aksi}</div>}
    </div>
  );
}

/** Kartu laporan per bagian: ikon, nama bagian, angka utama, keterangan, panah. */
function KartuBagian({ href, icon, label, nilai, ket }: { href: string; icon: IconName; label: string; nilai: string; ket: string }) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-3 rounded-[22px] bg-white p-3.5 transition active:scale-[0.98]" style={GAYA} data-testid="kartu-bagian">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: "#EEF2F7" }}><Icon n={icon} s={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-medium" style={{ color: MUTED }}>{label}</span>
        <span className="block truncate text-[17px] font-semibold tabular-nums" style={{ color: INK }}>{nilai}</span>
        <span className="block truncate text-[12px]" style={{ color: MUTED }}>{ket}</span>
      </span>
      <Icon n="arrow" s={16} c={MUTED} />
    </Link>
  );
}

export function BerandaOwner({ d, izin, nama, salam, tanggal, tindakan, owner, tren, ruangan, siklus, laporan }: Props) {
  const { saldo, margin, bep, absensi } = owner;
  const ikan30 = jumlah(tren.ikanMasuk);
  const loin30 = jumlah(tren.loin);
  const masuk30 = jumlah(tren.uangMasuk);
  const keluar30 = jumlah(tren.uangKeluar);
  const seri = [
    { id: "ikan", label: "Ikan masuk", satuan: "kg" as const, data: tren.ikanMasuk, warna: "#2B4A70" },
    { id: "loin", label: "Loin", satuan: "kg" as const, data: tren.loin, warna: HIJAU },
    { id: "masuk", label: "Uang masuk", satuan: "rp" as const, data: tren.uangMasuk, warna: HIJAU },
    { id: "keluar", label: "Uang keluar", satuan: "rp" as const, data: tren.uangKeluar, warna: INK },
  ];
  const penunjangPerhatian = (d.barang_menipis ?? 0) + (d.barang_habis ?? 0);

  return (
    <div className="space-y-6" data-testid="beranda-owner">
      <div className="px-1">
        <p className="text-[13px]" style={{ color: MUTED }}>{tanggal}</p>
        <p className="mt-0.5 text-[22px] font-semibold tracking-tight md:text-[24px]" style={{ color: INK }}>{salam}{nama ? `, ${nama}` : ""}</p>
      </div>

      {tindakan.length > 0
        ? <Tindakan daftar={tindakan} judul="Perlu persetujuan Anda" />
        : (
          <div className="flex items-center gap-3 rounded-[22px] px-4 py-3" style={{ background: "#DDF3E8" }}>
            <Icon n="check" s={20} c={HIJAU} />
            <p className="text-[13.5px]" style={{ color: HIJAU }}><b className="font-semibold">Semua beres.</b> Nggak ada yg nunggu persetujuan Anda.</p>
          </div>
        )}

      {/* ------------------------------------------------ keuangan */}
      {(saldo || margin || izin.keuangan || izin.penjualan) && (
        <section>
          <Judul teks="Keuangan" />
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {saldo && (
              <Kartu label="Saldo perusahaan" nilai={rp(saldo.saldo)} ket="Uang yg ada sekarang" besar tone={saldo.saldo < 0 ? "warn" : undefined} href="/keuangan"
                aksi={<AturAngka kunci="saldo_awal_kas_rp" nilai={saldo.saldoAwal} judul="Saldo awal kas" label="Atur saldo awal" />} />
            )}
            {margin && (
              <Kartu label="Untung (margin)" nilai={margin.marginPct !== null ? persen(margin.marginPct) : "-"} besar href="/laporan"
                tone={margin.laba < 0 ? "warn" : margin.marginPct !== null ? "ok" : undefined}
                ket={margin.pendapatan > 0 ? `${margin.laba < 0 ? "Rugi" : "Untung"} ${rp(Math.abs(margin.laba))}` : "Muncul abis ada yg kejual"} />
            )}
            {izin.penjualan && (
              <Kartu label="Piutang" nilai={rp(d.piutang)} href="/penjualan" tone={d.invoice_terlambat > 0 ? "warn" : undefined}
                ket={d.invoice_terlambat > 0 ? `${d.invoice_terlambat} tagihan telat bayar` : "Belum dibayar pembeli, nggak ada yg telat"} />
            )}
            {izin.pembelian && <Kartu label="Utang ke nelayan" nilai={rp(d.hutang_pemasok)} href="/pembelian" ket="Pembelian yg belum lunas" />}
          </div>
          {bep && (
            <div className="mt-2.5 rounded-[22px] bg-white p-4" style={GAYA} data-testid="bep-owner">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12.5px] font-medium" style={{ color: MUTED }}>Balik modal (BEP)</p>
                <p className="text-[13px] font-semibold tabular-nums" style={{ color: bep.lunas ? HIJAU : INK }}>
                  {bep.pct === null ? "Modal belum diisi" : bep.lunas ? "Udah balik modal" : persen(bep.pct)}
                </p>
              </div>
              {bep.pct !== null && (
                <>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#EEF0F5]" role="progressbar" aria-valuenow={bep.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Persen balik modal">
                    <div className="h-full rounded-full" style={{ width: `${bep.pct}%`, background: HIJAU }} />
                  </div>
                  <p className="mt-1.5 text-[12.5px]" style={{ color: MUTED }}>
                    {bep.lunas ? `Modal ${rp(bep.modal)} udah balik.` : `Kurang ${rp(bep.sisa)} lagi dari modal ${rp(bep.modal)}.`}
                    {bep.bulanLagi !== null ? ` Kira kira ${bep.bulanLagi} bulan lagi.` : ""}
                  </p>
                </>
              )}
              <div className="mt-2"><AturAngka kunci="modal_usaha_rp" nilai={bep.modal} judul="Total modal usaha" label={bep.pct === null ? "Isi modal usaha" : "Atur modal"} /></div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------ hari ini */}
      {laporan && <LaporanHarian lap={laporan.data} judulTanggal={laporan.judulTanggal} teks={laporan.teks} />}

      {/* ------------------------------------------------ tren */}
      {seri.some((s) => s.data.length > 0) && (
        <section className="rounded-[26px] p-4 md:p-5" style={{ background: "rgba(248,249,252,.82)", border: "1px solid rgba(255,255,255,.95)" }}>
          <GrafikHarian judul="30 hari terakhir" seri={seri} />
        </section>
      )}

      {/* ------------------------------------------------ per bagian */}
      <section>
        <Judul teks="Laporan per bagian" kanan={<span className="text-[12px]" style={{ color: MUTED }}>30 hari terakhir</span>} />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {izin.mutu && <KartuBagian href="/mutu" icon="flask" label="Penerimaan ikan" nilai={kgT(ikan30)} ket="Ikan masuk dari nelayan" />}
          {izin.produksi && <KartuBagian href="/produksi" icon="factory" label="Produksi" nilai={kgT(loin30)} ket={ikan30 > 0 || loin30 > 0 ? "Loin dihasilkan" : "Belum ada produksi"} />}
          {izin.stok && <KartuBagian href="/stok" icon="box" label="Stok" nilai={kgT(d.stok_sendiri_kg)} ket={`Siap jual · titipan ${kgT(d.stok_titipan_kg)}`} />}
          {izin.penjualan && <KartuBagian href="/penjualan" icon="truck" label="Penjualan" nilai={rp(d.piutang)} ket={`Piutang · ${d.pesanan_belum_dikirim} pesanan belum dikirim`} />}
          {izin.keuangan && <KartuBagian href="/keuangan" icon="cash" label="Keuangan" nilai={rp(masuk30 - keluar30)} ket={`Masuk ${rp(masuk30)} · keluar ${rp(keluar30)}`} />}
          {absensi && <KartuBagian href="/absensi" icon="clock" label="Absensi" nilai={`${absensi.hadir} hadir`} ket={absensi.terlambat > 0 ? `${absensi.terlambat} terlambat hari ini` : "Hari ini"} />}
        </div>
      </section>

      {/* ------------------------------------------------ gudang, absen, cctv */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
        {izin.stok && <KapasitasOwner ruangan={ruangan} />}
        <AbsensiOwner absensi={absensi} />
        <CctvOwner cctv={owner.cctv} bolehAtur />
      </div>

      {/* ------------------------------------------------ rincian lainnya */}
      <Lipat aktif>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {izin.laporan && siklus && (
            <Bagian judul={`Proyek terbaru · ${siklus.kode}`}>
              <div className="grid grid-cols-2 gap-2.5">
                <Kartu label="Penjualan" nilai={rp(siklus.pendapatan_total)} href={`/laporan?c=${siklus.cycle_id}`} />
                <Kartu label="Biaya" nilai={rp(siklus.biaya_total)} href={`/laporan?c=${siklus.cycle_id}`} />
                <Kartu label="Laba kotor" nilai={rp(siklus.laba_kotor)} tone={siklus.laba_kotor < 0 ? "warn" : "ok"} href={`/laporan?c=${siklus.cycle_id}`}
                  ket={siklus.margin_pct !== null ? `Margin ${persen(Number(siklus.margin_pct))}` : undefined} />
                <Kartu label="Hasil olahan" href={`/laporan?c=${siklus.cycle_id}`}
                  nilai={(siklus.kg_diolah ?? siklus.kg_ikan) > 0 ? persen((siklus.loin_kg / (siklus.kg_diolah ?? siklus.kg_ikan)) * 100) : "-"} ket={`Loin ${kgT(siklus.loin_kg)}`} />
              </div>
            </Bagian>
          )}
          <div className="space-y-4">
            {(izin.keuangan || izin.pembelian) && (
              <Bagian judul="Kelengkapan dokumen">
                <p className="rounded-2xl bg-white px-3.5 py-3 text-[13px]" style={{ color: INK }}>
                  {d.dokumen_kurang > 0 ? <><b className="text-[17px] font-semibold tabular-nums">{d.dokumen_kurang}</b> transaksi belum ada nota atau buktinya</> : "Semua transaksi udah ada nota atau buktinya."}
                </p>
              </Bagian>
            )}
            {izin.stok && d.barang_menipis !== undefined && (
              <Bagian judul="Barang penunjang">
                <p className="rounded-2xl bg-white px-3.5 py-3 text-[13px]" style={{ color: INK }}>
                  {penunjangPerhatian > 0 ? <><b className="text-[17px] font-semibold tabular-nums">{penunjangPerhatian}</b> barang perlu diisi ulang ({d.barang_menipis} menipis, {d.barang_habis ?? 0} habis)</> : "Semua barang penunjang masih aman."}
                </p>
              </Bagian>
            )}
          </div>
          <FotoTimbanganOwner foto={owner.foto} />
          <LampiranOwner lampiran={owner.lampiran} />
        </div>
      </Lipat>
    </div>
  );
}
