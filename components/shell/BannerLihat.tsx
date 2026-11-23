"use client";

import { usePathname } from "next/navigation";

/* Owner bisa buka semua halaman tim buat lihat laporan lengkap, tapi nggak bisa ngisi data. Keterangan ini biar owner
   langsung paham kenapa nggak ada tombol isi. Nggak muncul di Dashboard dan Akses (di sana owner emang punya tombol). */
const TANPA_BANNER = ["/dashboard", "/akses"];

export function BannerLihat() {
  const path = usePathname();
  if (TANPA_BANNER.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return (
    <div role="note" className="mx-auto mb-4 flex max-w-[1180px] items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug"
      style={{ background: "#E4ECF7", color: "#2B4A70" }} data-testid="banner-mode-lihat">
      <span className="mt-0.5 shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">Mode lihat</span>
      <span>Data di halaman ini diisi tim. Owner bisa lihat semuanya, dan kalau ada yg perlu disetujui tombolnya tetap ada.</span>
    </div>
  );
}
