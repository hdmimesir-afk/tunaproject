import Link from "next/link";
import { AngkaMuat, Icon, type IconName } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { LaporanHarian as Data, Periode } from "@/lib/data/laporanHarian";
import { hasilPersen, kgTeks, LABEL_PERIODE, persenTeks, rupiah } from "@/lib/logic/laporanHarian";
import { BagikanLaporan } from "./BagikanLaporan";

/* Laporan harian Owner: urut kayak kerja harian (ikan masuk, produksi, stok siap jual, terjual, uang).
   Tiap kotak bisa diketuk buat buka rinciannya. Tombol Bagikan nyusun teks siap kirim ke WhatsApp. */

function Kotak({ href, icon, label, nilai, rincian, tone }: { href: string; icon: IconName; label: string; nilai: string; rincian?: React.ReactNode; tone?: "warn" | "ok" }) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col rounded-[20px] bg-white p-3.5 transition active:scale-[0.98] hover:shadow-sm" style={{ boxShadow: "0 1px 2px rgba(20,24,40,.06)" }} aria-label={`${label}: ${nilai}`}>
      <span className="flex items-center justify-between gap-2 text-[12px] font-medium" style={{ color: MUTED }}>
        {label}<Icon n={icon} s={15} c="#9AA2AB" />
      </span>
      <span className="mt-1.5"><AngkaMuat teks={nilai} desktop={22} className="font-medium" style={{ color: tone === "warn" ? "#B4443C" : tone === "ok" ? "#0B6B4A" : INK }} /></span>
      {rincian && <span className="mt-1 text-[11.5px] leading-snug tabular-nums" style={{ color: MUTED }}>{rincian}</span>}
    </Link>
  );
}

export function LaporanHarian({ lap, judulTanggal, teks }: { lap: Data; judulTanggal: string; teks: string }) {
  const p = lap.produksi;
  const hasil = p ? hasilPersen(p.loinKg, p.masukKg) : null;
  const kotak = [
    lap.ikan && <Kotak key="ikan" href="/mutu" icon="flask" label="Ikan masuk" nilai={kgTeks(lap.ikan.kg)}
      rincian={lap.ikan.lot === 0 ? "Belum ada" : `${lap.ikan.lot} lot${lap.ikan.ekor ? ` · ${lap.ikan.ekor} ekor` : ""} · ${lap.ikan.pemasok.length} pemasok`} />,
    p && <Kotak key="produksi" href="/produksi" icon="factory" label="Loin hasil" nilai={kgTeks(p.loinKg)}
      rincian={p.jumlah === 0 ? "Belum ada produksi" : <>dari {kgTeks(p.masukKg)}{hasil !== null && <> · hasil <b className="font-semibold" style={{ color: INK }}>{persenTeks(hasil)}</b></>}{p.berjalan + p.menunggu > 0 && <span className="block">{[p.berjalan && `${p.berjalan} lagi jalan`, p.menunggu && `${p.menunggu} nunggu dicek`].filter(Boolean).join(" · ")}</span>}</>} />,
    lap.stok && <Kotak key="stok" href="/stok" icon="box" label="Stok siap jual" nilai={kgTeks(lap.stok.kg)}
      rincian={lap.stok.perJenis.length === 0 ? "Kosong" : lap.stok.perJenis.slice(0, 2).map((j) => `${j.nama} ${kgTeks(j.kg)}`).join(" · ")} />,
    lap.jual && <Kotak key="jual" href="/penjualan" icon="truck" label="Terjual" nilai={rupiah(lap.jual.nilai)} tone={lap.jual.nilai > 0 ? "ok" : undefined}
      rincian={lap.jual.pesanan === 0 ? "Belum ada pengiriman" : `${kgTeks(lap.jual.kg)} · ${lap.jual.pesanan} pesanan`} />,
    lap.uang && <Kotak key="uang" href="/keuangan" icon="cash" label="Uang masuk" nilai={rupiah(lap.uang.masuk)} tone={lap.uang.masuk > 0 ? "ok" : undefined}
      rincian={`Keluar ${rupiah(lap.uang.keluar)}`} />,
  ].filter(Boolean);
  if (kotak.length === 0) return null;

  return (
    <section className="rounded-[26px] p-4 md:p-5" style={{ background: "rgba(248,249,252,.82)", border: "1px solid rgba(255,255,255,.95)", boxShadow: "0 6px 24px rgba(40,50,80,.05)" }} aria-labelledby="judul-laporan-harian">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 id="judul-laporan-harian" className="text-[14.5px] font-medium" style={{ color: INK }}>Laporan {LABEL_PERIODE[lap.periode].toLowerCase()}</h2>
          <p className="text-[12px]" style={{ color: MUTED }}>{judulTanggal}</p>
        </div>
        <div className="flex items-center gap-2">
          <nav aria-label="Periode laporan" className="flex rounded-full bg-white p-1">
            {(["hari", "kemarin", "7hari"] as Periode[]).map((id) => (
              <Link key={id} href={id === "hari" ? "/dashboard" : `/dashboard?periode=${id}`} scroll={false} aria-current={lap.periode === id ? "page" : undefined}
                className="h-8 whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium leading-8" style={lap.periode === id ? { background: INK, color: "#fff" } : { color: MUTED }}>
                {id === "7hari" ? "7 hari" : LABEL_PERIODE[id]}
              </Link>
            ))}
          </nav>
          <BagikanLaporan teks={teks} />
        </div>
      </div>
      {/* Di HP (2 kolom), kotak terakhir yang sendirian dibikin selebar layar biar nggak bolong. */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {kotak.map((k, i) => (
          <div key={i} className={`grid min-w-0 ${i === kotak.length - 1 && kotak.length % 2 === 1 ? "col-span-2 md:col-span-1" : ""}`}>{k}</div>
        ))}
      </div>
    </section>
  );
}
