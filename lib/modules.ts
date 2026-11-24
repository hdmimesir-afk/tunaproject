import type { IconName } from "@/components/ui";

/* Daftar modul versi 1, fase pengerjaannya, dan izin untuk melihatnya di menu.
   Izin modul fase berikutnya ditambahkan di migrasi fase itu; sampai saat itu hanya Owner yang melihatnya.
   Absensi dikerjakan di fase 7 (setelah sistem inti), tanpa peta pihak ketiga. */
/* izin berupa daftar artinya cukup punya salah satu (dashboard kategori kebuka kalau boleh lihat salah satu isinya).
   menu: false artinya jalurnya tetap ada (wajib masuk) tapi nggak muncul di menu, misalnya /stok yang sekarang pindah ke Produksi. */
export type Modul = { slug: string; label: string; icon: IconName; fase: number; isi: string; izin: string | string[] | null; menu?: false };

export const MODULES: Modul[] = [
  { slug: "dashboard", label: "Dashboard", icon: "grid", fase: 5, izin: null, isi: "Ringkasan owner di HP; rincian muncul saat diketuk" },
  { slug: "penerimaan", label: "Penerimaan", icon: "inbox", fase: 2, izin: ["mutu.read", "persetujuan.read", "pembelian.read"], isi: "Ringkasan ikan masuk, riwayat per tanggal, ikan utuh yang belum diolah" },
  { slug: "mutu", label: "Tally", icon: "flask", fase: 2, izin: "mutu.read", isi: "Terima ikan, timbang, grading, terus ajukan pembeliannya" },
  { slug: "persetujuan", label: "Persetujuan", icon: "check", fase: 2, izin: "persetujuan.read", isi: "Setujui pembelian, PO baru terbit di sini" },
  { slug: "pembelian", label: "Pembelian", icon: "cart", fase: 2, izin: "pembelian.read", isi: "PO yang udah terbit, bayar pemasok, nota" },
  { slug: "produksi", label: "Produksi", icon: "factory", fase: 3, izin: ["produksi.read", "stok.read"], isi: "Stok hasil produksi, titipan, yang ditahan, sama produksi yang lagi jalan" },
  { slug: "produksi/jual", label: "Jual loin", icon: "fish", fase: 3, izin: "produksi.read", isi: "Produksi ikan sendiri buat dijual" },
  { slug: "produksi/jasa", label: "Jasa proses loin", icon: "factory", fase: 3, izin: "produksi.read", isi: "Produksi ikan punya PT lain" },
  { slug: "produksi/titip", label: "Titip barang", icon: "box", fase: 4, izin: "gudang.read", isi: "Proyek titip sama barang titipan pelanggan" },
  { slug: "stok", label: "Stok", icon: "box", fase: 4, izin: "stok.read", isi: "Pindah ke Produksi", menu: false },
  { slug: "warehouse", label: "Warehouse", icon: "gudang", fase: 4, izin: ["gudang.read", "stok.read"], isi: "Ringkasan gudang dingin sama barang penunjang" },
  { slug: "gudang", label: "Gudang Dingin", icon: "snow", fase: 4, izin: "gudang.read", isi: "Ruangan, stok sendiri, tarif, jadwal ABF" },
  { slug: "penunjang", label: "Barang Penunjang", icon: "alat", fase: 4, izin: "stok.read", isi: "Es, kemasan, label, dan kebutuhan pekerja: masuk, pakai, koreksi" },
  { slug: "niaga", label: "Niaga", icon: "cash", fase: 5, izin: ["penjualan.read", "keuangan.read"], isi: "Ringkasan uang masuk, uang keluar, piutang, kas" },
  { slug: "penjualan", label: "Penjualan", icon: "truck", fase: 5, izin: "penjualan.read", isi: "Pesanan, kirim, tagihan, uang masuk" },
  { slug: "keuangan", label: "Keuangan", icon: "cash", fase: 5, izin: "keuangan.read", isi: "Buku kas, biaya per kategori, kelengkapan nota" },
  { slug: "keuangan/jual", label: "Keuangan jual loin", icon: "fish", fase: 5, izin: "keuangan.read", isi: "Biaya dan pengeluaran lini jual loin, plus pendapatannya" },
  { slug: "keuangan/jasa", label: "Keuangan jasa proses", icon: "factory", fase: 5, izin: "keuangan.read", isi: "Biaya dan pengeluaran lini jasa proses loin, plus pendapatannya" },
  { slug: "keuangan/titip", label: "Keuangan titip barang", icon: "box", fase: 5, izin: "keuangan.read", isi: "Biaya dan pengeluaran lini titip barang, plus pendapatannya" },
  { slug: "laporan", label: "Laporan", icon: "chart", fase: 5, izin: "laporan.read", isi: "Laba rugi per proyek, harga beli, CSV" },
  { slug: "siklus", label: "Rincian Proyek", icon: "list", fase: 5, izin: "siklus.read", isi: "Satu proyek dari beli ikan sampai uang masuk" },
  { slug: "asisten", label: "Asisten AI", icon: "sparkles", fase: 6, izin: "asisten.use", isi: "Tanya jawab dari data, hanya baca" },
  { slug: "absensi", label: "Absensi", icon: "clock", fase: 7, izin: "absensi.absen", isi: "Absen masuk dan pulang dengan lokasi dan foto, izin, rekap" },
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
