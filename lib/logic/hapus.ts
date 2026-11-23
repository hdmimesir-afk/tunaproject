/* Bagian yang bisa dihapus di Pengaturan > Hapus data. Id-nya sama dengan yang dicek fungsi database public.hapus_data. */

export type BagianHapus = "pembelian" | "produksi" | "penjualan" | "titipan" | "keuangan" | "absensi" | "penunjang" | "proyek";

export const BAGIAN_HAPUS: { id: BagianHapus; label: string; isi: string }[] = [
  { id: "pembelian", label: "Penerimaan ikan dan pembelian", isi: "Lot, grading, PO, bayar ke pemasok. Produksi yg pakai lot itu ikut kehapus." },
  { id: "produksi", label: "Produksi", isi: "Produksi, timbangan, sama stok hasil produksinya. Penjualan dari stok itu ikut kehapus, sisa lot balik lagi." },
  { id: "penjualan", label: "Penjualan", isi: "Pesanan, invoice, uang masuk. Stok yg udah terjual balik lagi ke stok." },
  { id: "titipan", label: "Titipan dan gudang", isi: "Titipan pelanggan, tagihan jasa gudang, sama jadwal ABF." },
  { id: "keuangan", label: "Keuangan", isi: "Biaya, semua buku kas (termasuk catatan bayar dan uang masuk), tutup buku." },
  { id: "absensi", label: "Absensi", isi: "Absen masuk pulang, izin sama sakit." },
  { id: "penunjang", label: "Gerakan barang penunjang", isi: "Riwayat masuk sama pakai. Daftar barangnya tetap, stoknya jadi 0." },
  { id: "proyek", label: "Proyek yg udah kosong", isi: "Proyek yg udah nggak dipakai data mana pun." },
];

export const namaBagian = (id: string) =>
  id === "semua" ? "Semua data transaksi" : id === "akun" ? "Akun pengguna" : id === "biaya" ? "Satu biaya (dari Keuangan)" : BAGIAN_HAPUS.find((b) => b.id === id)?.label ?? id;

/** Satu jenis data di pratinjau atau di log hapus. Kode dibatasi 300 per jenis. */
export type RincianHapus = { tabel: string; label: string; jumlah: number; kode: string[] };

export type LogHapus = {
  id: number;
  waktu: string;
  oleh_nama: string;
  bagian: string[];
  alasan: string;
  rincian: RincianHapus[];
  total: number;
};
