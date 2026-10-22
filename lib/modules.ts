import type { IconName } from "@/components/ui";

/* Daftar modul versi 1, fase pengerjaannya, dan izin untuk melihatnya di menu.
   Izin modul fase berikutnya ditambahkan di migrasi fase itu; sampai saat itu hanya Owner yang melihatnya.
   Absensi ditunda owner, jadi tidak ada di sini. */
export type Modul = { slug: string; label: string; icon: IconName; fase: number; isi: string; izin: string | null };

export const MODULES: Modul[] = [
  { slug: "dashboard", label: "Dashboard", icon: "grid", fase: 5, izin: null, isi: "Ringkasan owner di HP; rincian muncul saat diketuk" },
  { slug: "persetujuan", label: "Persetujuan", icon: "check", fase: 2, izin: "persetujuan.read", isi: "Antrean periksa dan setuju dengan nota di sebelah tombol" },
  { slug: "pembelian", label: "Pembelian", icon: "cart", fase: 2, izin: "pembelian.read", isi: "PO, penerimaan ikan, bayar pemasok" },
  { slug: "mutu", label: "Mutu dan Penerimaan", icon: "flask", fase: 2, izin: "mutu.read", isi: "Terima ikan, timbang, dan cek mutu lot" },
  { slug: "produksi", label: "Produksi", icon: "factory", fase: 3, izin: "produksi.read", isi: "Grid loin per potong, komponen hasil, neraca berat" },
  { slug: "stok", label: "Stok", icon: "box", fase: 4, izin: "stok.read", isi: "Unit simpan per pemilik, fresh/beku, berat masuk/keluar" },
  { slug: "gudang", label: "Gudang Dingin", icon: "snow", fase: 4, izin: "gudang.read", isi: "Titipan pelanggan, tarif, jadwal ABF" },
  { slug: "penjualan", label: "Penjualan", icon: "truck", fase: 5, izin: "penjualan.read", isi: "Pesanan, kirim, tagihan, uang masuk" },
  { slug: "keuangan", label: "Keuangan", icon: "cash", fase: 5, izin: "keuangan.read", isi: "Buku kas, biaya per kategori, kelengkapan nota" },
  { slug: "laporan", label: "Laporan", icon: "chart", fase: 5, izin: "laporan.read", isi: "Laba rugi per siklus, harga beli, CSV" },
  { slug: "siklus", label: "Rincian Siklus", icon: "list", fase: 5, izin: "siklus.read", isi: "Satu siklus dari beli ikan sampai uang masuk" },
  { slug: "asisten", label: "Asisten AI", icon: "sparkles", fase: 6, izin: "asisten.use", isi: "Tanya jawab dari data, hanya baca" },
  { slug: "akses", label: "Akses", icon: "shield", fase: 1, izin: "akses.kelola", isi: "Pengguna, peran, dan izin" },
  { slug: "pengaturan", label: "Pengaturan", icon: "lock", fase: 1, izin: "master.read", isi: "Data master, tarif, target hasil" },
];

export const modul = (slug: string) => {
  const m = MODULES.find((x) => x.slug === slug);
  if (!m) throw new Error(`Modul tidak dikenal: ${slug}`);
  return m;
};

/** Jalur sistem ERP yang wajib masuk (dipakai proxy.ts). Halaman penawaran, rancangan, PRD, dan demo tetap publik. */
export const isJalurErp = (path: string) => MODULES.some((m) => path === `/${m.slug}` || path.startsWith(`/${m.slug}/`));
