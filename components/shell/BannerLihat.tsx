"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/* Owner bisa buka semua halaman tim buat lihat laporan lengkap, tapi nggak bisa ngisi data. Keterangan ini biar owner
   langsung paham kenapa nggak ada tombol isi. Nggak muncul di Dashboard dan Akses (di sana owner emang punya tombol). */
const TANPA_BANNER = ["/dashboard", "/akses"];
/** Halaman yg udah punya tampilan laporan khusus owner (selama nggak lagi buka rincian atau halaman lengkap). */
const LAPORAN_OWNER = ["/produksi", "/mutu", "/stok", "/penjualan", "/keuangan", "/absensi"];
/** Parameter yg berarti owner lagi buka halaman kerja tim / rincian, bukan laporannya. */
const BUKA_RINCIAN = ["lengkap", "p", "inv", "b"];

export function BannerLihat() {
  const path = usePathname();
  const cari = useSearchParams();
  if (TANPA_BANNER.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  if (LAPORAN_OWNER.includes(path) && !BUKA_RINCIAN.some((k) => cari.get(k))) return null;
  return (
    <div role="note" className="mx-auto mb-4 flex max-w-[1180px] items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug"
      style={{ background: "#E4ECF7", color: "#2B4A70" }} data-testid="banner-mode-lihat">
      <span className="mt-0.5 shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">Mode lihat</span>
      <span className="min-w-0 flex-1">Data di halaman ini diisi tim. Owner bisa lihat semuanya, dan kalau ada yg perlu disetujui tombolnya tetap ada.</span>
      {LAPORAN_OWNER.includes(path) && (
        <Link href={path} className="shrink-0 rounded-full bg-white px-3 py-1 text-[12px] font-semibold" data-testid="balik-laporan">Balik ke laporan</Link>
      )}
    </div>
  );
}
