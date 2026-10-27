import type { IconName } from "@/components/ui";

/* Kelompok modul untuk rel ikon di kiri dan remah roti di atas halaman. Urutan mengikuti alur kerja:
   beli ikan, olah, simpan, jual, lalu lihat laporannya. */
export type Grup = { id: string; label: string; icon: IconName; slugs: string[] };

export const GRUP: Grup[] = [
  { id: "beranda", label: "Beranda", icon: "grid", slugs: ["dashboard"] },
  { id: "operasi", label: "Operasi", icon: "factory", slugs: ["persetujuan", "pembelian", "mutu", "produksi"] },
  { id: "simpan", label: "Stok", icon: "box", slugs: ["stok", "gudang"] },
  { id: "niaga", label: "Niaga", icon: "truck", slugs: ["penjualan", "keuangan"] },
  { id: "laporan", label: "Laporan", icon: "chart", slugs: ["laporan", "siklus"] },
  { id: "asisten", label: "Asisten", icon: "sparkles", slugs: ["asisten"] },
  { id: "absensi", label: "Absensi", icon: "clock", slugs: ["absensi"] },
  { id: "admin", label: "Admin", icon: "shield", slugs: ["akses", "pengaturan"] },
];

export const grupDari = (slug: string) => GRUP.find((g) => g.slugs.includes(slug));
