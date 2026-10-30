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
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ringkasan dulu, rincian saat diketuk" judul="Dashboard" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <DashboardData />
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

async function DashboardData() {
  const sesi = await requireSesi();
  const izin = {
    persetujuan: boleh(sesi, "persetujuan.read"), keuangan: boleh(sesi, "keuangan.read"), penjualan: boleh(sesi, "penjualan.read"),
    pembelian: boleh(sesi, "pembelian.read"), produksi: boleh(sesi, "produksi.read"), stok: boleh(sesi, "stok.read"), mutu: boleh(sesi, "mutu.read"),
    laporan: boleh(sesi, "laporan.read"),
  };
  const [d, buku, tren, ruangan, isi] = await Promise.all([
    ambilDashboard(), izin.keuangan ? bukuBulanan() : Promise.resolve([]), izin.laporan ? trenSiklus() : Promise.resolve([]),
    izin.stok ? daftarRuangan() : Promise.resolve([]), izin.stok ? isiGudang() : Promise.resolve(undefined),
  ]);
  // Siklus terbaru yang sudah punya penjualan; bila belum ada, siklus terbaru apa pun.
  const tindakan = await daftarTindakan(sesi, buku);
  const siklus = tren.filter((t) => t.pendapatan_total > 0).at(-1) ?? tren.at(-1) ?? null;
  const { salam, tanggal } = salamDanTanggal();
  const namaDepan = (sesi.nama || "").trim().split(/\s+/)[0] ?? "";
  return <DashboardOwner d={d} izin={izin} nama={namaDepan} salam={salam} tanggal={tanggal} buku={[...buku].reverse()} siklus={siklus} tindakan={tindakan} ruangan={ruangan} isiGudang={isi} />;
}
