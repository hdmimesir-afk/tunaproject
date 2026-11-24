import type { IconName } from "@/components/ui";

/* Kategori menu (permintaan tim 24 Nov 2026): empat kategori besar, tiap kategori punya dashboard ringkas (slug pertama)
   terus halaman-halaman di bawahnya (dropdown). Urutan ngikut alur: terima ikan, olah, simpan, jual dan uangnya.
   Kategori yang isinya cuma satu modul tampil sebagai tautan biasa. */
export type Grup = { id: string; label: string; icon: IconName; slugs: string[] };

export const GRUP: Grup[] = [
  { id: "beranda", label: "Beranda", icon: "grid", slugs: ["dashboard"] },
  { id: "penerimaan", label: "Penerimaan", icon: "inbox", slugs: ["penerimaan", "mutu", "persetujuan", "pembelian"] },
  { id: "produksi", label: "Produksi", icon: "factory", slugs: ["produksi", "produksi/jual", "produksi/jasa", "produksi/titip"] },
  { id: "warehouse", label: "Warehouse", icon: "gudang", slugs: ["warehouse", "gudang", "penunjang"] },
  { id: "niaga", label: "Niaga", icon: "cash", slugs: ["niaga", "penjualan", "keuangan", "keuangan/jual", "keuangan/jasa", "keuangan/titip"] },
  { id: "laporan", label: "Laporan", icon: "chart", slugs: ["laporan", "siklus"] },
  { id: "asisten", label: "Asisten", icon: "sparkles", slugs: ["asisten"] },
  { id: "absensi", label: "Absensi", icon: "clock", slugs: ["absensi"] },
  { id: "admin", label: "Admin", icon: "shield", slugs: ["akses", "pengaturan"] },
];

/** Kategori yang slug pertamanya dashboard: di menu, item pertamanya ditulis "Ringkasan". */
export const KATEGORI = new Set(["penerimaan", "produksi", "warehouse", "niaga"]);

/** Slug yang paling cocok sama jalur sekarang (yang terpanjang), biar /produksi/jual nggak ikut nyalain /produksi. */
export function slugAktif(path: string, slugs: string[]) {
  return slugs.filter((s) => path === `/${s}` || path.startsWith(`/${s}/`)).sort((a, b) => b.length - a.length)[0] ?? null;
}
