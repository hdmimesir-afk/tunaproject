import type { IconName } from "@/components/ui";

/* Daftar modul versi 1 dan fase pengerjaannya (dokumen Fase Pembangunan). Absensi ditunda owner, jadi tidak ada di sini. */
export type Modul = { slug: string; label: string; icon: IconName; fase: number; isi: string };

export const MODULES: Modul[] = [
  { slug: "dashboard", label: "Dashboard", icon: "grid", fase: 5, isi: "Ringkasan owner di HP; rincian muncul saat diketuk" },
  { slug: "persetujuan", label: "Persetujuan", icon: "check", fase: 2, isi: "Antrean periksa dan setuju dengan nota di sebelah tombol" },
  { slug: "pembelian", label: "Pembelian", icon: "cart", fase: 2, isi: "PO, penerimaan ikan, bayar pemasok" },
  { slug: "mutu", label: "Mutu", icon: "flask", fase: 2, isi: "Cek mutu lot: lulus dengan kelas atau ditahan" },
  { slug: "produksi", label: "Produksi", icon: "factory", fase: 3, isi: "Grid loin per potong, komponen hasil, neraca berat" },
  { slug: "stok", label: "Stok", icon: "box", fase: 4, isi: "Unit simpan per pemilik, fresh/beku, berat masuk/keluar" },
  { slug: "gudang", label: "Gudang Dingin", icon: "snow", fase: 4, isi: "Titipan pelanggan, tarif, jadwal ABF" },
  { slug: "penjualan", label: "Penjualan", icon: "truck", fase: 5, isi: "Pesanan, kirim, tagihan, uang masuk" },
  { slug: "keuangan", label: "Keuangan", icon: "cash", fase: 5, isi: "Buku kas, biaya per kategori, kelengkapan nota" },
  { slug: "laporan", label: "Laporan", icon: "chart", fase: 5, isi: "Laba rugi per siklus, harga beli, CSV" },
  { slug: "siklus", label: "Rincian Siklus", icon: "list", fase: 5, isi: "Satu siklus dari beli ikan sampai uang masuk" },
  { slug: "asisten", label: "Asisten AI", icon: "sparkles", fase: 6, isi: "Tanya jawab dari data, hanya baca" },
  { slug: "akses", label: "Akses", icon: "shield", fase: 1, isi: "Pengguna, peran, dan izin" },
  { slug: "pengaturan", label: "Pengaturan", icon: "lock", fase: 1, isi: "Data master, tarif, target hasil" },
];

export const modul = (slug: string) => {
  const m = MODULES.find((x) => x.slug === slug);
  if (!m) throw new Error(`Modul tidak dikenal: ${slug}`);
  return m;
};
