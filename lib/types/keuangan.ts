export type StatusBiaya = "draf" | "diajukan" | "disetujui" | "ditolak";

export type Biaya = {
  id: string;
  kode: string;
  category_id: string;
  kategori_nama: string;
  uraian: string;
  jumlah: number;
  tanggal: string;
  cycle_id: string | null;
  siklus_kode: string | null;
  po_id: string | null;
  po_kode: string | null;
  production_id: string | null;
  produksi_kode: string | null;
  status: StatusBiaya;
  alasan_tolak: string;
  diajukan_pada: string | null;
  diputuskan_pada: string | null;
  jml_nota: number;
  nota_wajib: boolean;
};

export type KategoriBiaya = { id: string; nama: string; nota_wajib: boolean };

export type BarisKas = {
  id: string;
  kode: string;
  tanggal: string;
  arah: "masuk" | "keluar";
  kategori_nama: string;
  uraian: string;
  jumlah: number;
  ref_tabel: string | null;
  ref_id: string | null;
  cycle_id: string | null;
  sumber: "sistem" | "impor";
};

export type Dashboard = {
  hutang_pemasok: number;
  piutang: number;
  invoice_terlambat: number;
  piutang_terlambat: number;
  kas_masuk_bulan_ini: number;
  kas_keluar_bulan_ini: number;
  persetujuan_menunggu: number;
  biaya_menunggu: number;
  koreksi_menunggu: number;
  produksi_menunggu: number;
  produksi_berjalan: number;
  lot_menunggu_mutu: number;
  stok_sendiri_kg: number;
  stok_titipan_kg: number;
  pesanan_belum_dikirim: number;
  dokumen_kurang: number;
  /** Barang penunjang yang stoknya sudah di bawah minimum atau habis. Kolom ini baru ada setelah migrasi 20261101000200. */
  barang_menipis?: number;
  barang_habis?: number;
};

export type RingkasSiklus = {
  cycle_id: string;
  kode: string;
  ref_po_pembeli: string;
  no_bongkar: string;
  status: "terbuka" | "ditutup";
  tanggal_bongkar: string | null;
  jumlah_po: number;
  nilai_beli: number;
  kg_diterima: number;
  jumlah_produksi: number;
  loin_kg: number;
  jumlah_pesanan: number;
  nilai_invoice: number;
  uang_masuk: number;
  biaya_lain: number;
};

export type BarisLabaSiklus = {
  cycle_id: string;
  kode: string;
  ref_po_pembeli: string;
  status: string;
  pendapatan_loin: number;
  pendapatan_samping: number;
  pendapatan_total: number;
  kg_loin_terjual: number;
  biaya_ikan: number;
  kg_ikan: number;
  biaya_lain: number;
  biaya_total: number;
  laba_kotor: number;
  margin_pct: number | null;
  loin_kg: number;
  /** Ikan yang benar-benar masuk produksi (kg_ikan adalah yang dipesan di PO). Ada setelah migrasi 20261101000200. */
  kg_diolah?: number;
};

export type BarisHargaBeli = { tanggal: string; supplier_id: string; supplier_nama: string; grade_kode: string; kg: number; nilai: number; jumlah_lot: number };

export type Transaksi = { kode: string; uraian: string; jumlah: number; tanggal?: string; href?: string };
export type DetailBaris = { label: string; transaksi: Transaksi[] };

export type BukuBulanan = {
  bulan: string;
  masuk: number;
  keluar: number;
  jumlah_transaksi: number;
  saldo_awal: number;
  saldo_akhir: number;
  status: "ditutup" | "terbuka";
  ditutup_pada: string | null;
  catatan: string;
  ringkasan: { tanpa_bukti?: number; jumlah_transaksi?: number } | null;
  dibuka_kali: number;
  alasan_buka: string;
  bulan_berjalan: boolean;
};
