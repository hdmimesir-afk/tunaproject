import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardOwner } from "@/components/dashboard/DashboardOwner";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { requireSesi } from "@/lib/data/auth";
import { ambilDashboard, bukuBulanan } from "@/lib/data/keuangan";
import { trenSiklus } from "@/lib/data/laporan";
import { daftarRuangan, isiGudang } from "@/lib/data/stok";
import { daftarTindakan } from "@/lib/data/tindakan";
import { laporanHarian, type Periode } from "@/lib/data/laporanHarian";
import { teksLaporan } from "@/lib/logic/laporanHarian";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Dashboard" };

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ringkasannya dulu, rinciannya tinggal diketuk" judul="Dashboard" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <DashboardData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

const WIB = { timeZone: "Asia/Jakarta" } as const;

/** Salam menurut jam Indonesia dan tanggal panjang, dihitung saat permintaan (setelah sesi dibaca). */
function salamDanTanggal() {
  const sekarang = new Date();
  const jam = Number(sekarang.toLocaleTimeString("en-GB", { ...WIB, hour: "2-digit", hourCycle: "h23" }).slice(0, 2));
  const salam = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";
  const tanggal = sekarang.toLocaleDateString("id-ID", { ...WIB, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return { salam, tanggal };
}

/** Judul tanggal laporan: satu hari ditulis panjang, 7 hari ditulis rentangnya. */
function judulRentang(dari: string, sampai: string) {
  const tgl = (s: string, o: Intl.DateTimeFormatOptions) => new Date(`${s}T12:00:00+07:00`).toLocaleDateString("id-ID", { ...WIB, ...o });
  return dari === sampai
    ? tgl(dari, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : `${tgl(dari, { day: "numeric", month: "short" })} sampai ${tgl(sampai, { day: "numeric", month: "short", year: "numeric" })}`;
}

async function DashboardData({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const sesi = await requireSesi();
  const sp = await searchParams;
  const periode: Periode = sp.periode === "kemarin" || sp.periode === "7hari" ? sp.periode : "hari";
  const izin = {
    persetujuan: boleh(sesi, "persetujuan.read"), keuangan: boleh(sesi, "keuangan.read"), penjualan: boleh(sesi, "penjualan.read"),
    pembelian: boleh(sesi, "pembelian.read"), produksi: boleh(sesi, "produksi.read"), stok: boleh(sesi, "stok.read"), mutu: boleh(sesi, "mutu.read"),
    laporan: boleh(sesi, "laporan.read"),
  };
  const [d, buku, tren, ruangan, isi, lap] = await Promise.all([
    ambilDashboard(), izin.keuangan ? bukuBulanan() : Promise.resolve([]), izin.laporan ? trenSiklus() : Promise.resolve([]),
    izin.stok ? daftarRuangan() : Promise.resolve([]), izin.stok ? isiGudang() : Promise.resolve(undefined),
    laporanHarian(periode, izin),
  ]);
  // Siklus terbaru yang sudah punya penjualan; bila belum ada, siklus terbaru apa pun.
  const tindakan = await daftarTindakan(sesi, buku);
  const siklus = tren.filter((t) => t.pendapatan_total > 0).at(-1) ?? tren.at(-1) ?? null;
  const { salam, tanggal } = salamDanTanggal();
  const namaDepan = (sesi.nama || "").trim().split(/\s+/)[0] ?? "";
  const judulTanggal = judulRentang(lap.dari, lap.sampai);
  const teks = teksLaporan(lap, judulTanggal, { jumlah: tindakan.length, mendesak: tindakan.filter((t) => t.mendesak).length });
  return <DashboardOwner d={d} izin={izin} nama={namaDepan} salam={salam} tanggal={tanggal} buku={[...buku].reverse()} siklus={siklus} tindakan={tindakan} ruangan={ruangan} isiGudang={isi}
    laporan={{ data: lap, judulTanggal, teks }} />;
}
