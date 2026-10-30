/* Bentuk baris Fase 4 (stok, gudang dingin, jadwal). Angka numeric dari PostgREST datang sebagai number. */

export type KondisiStok = "fresh" | "beku";

export type UnitStok = {
  id: string;
  kode: string;
  buyer_id: string | null;
  pemilik_nama: string;
  product_id: string;
  product_nama: string;
  grade_id: string | null;
  grade_kode: string | null;
  kondisi: KondisiStok;
  lokasi: string;
  /** Ruangan gudang dingin (ABF atau CS); kosong untuk data lama yang belum ditempatkan. */
  room_id: string | null;
  production_id: string | null;
  production_kode: string | null;
  kg_masuk: number;
  sisa_kg: number;
  sisa_dasar_masuk: number;
  masuk_pada: string;
  perlu_abf: boolean;
  langsung_kirim: boolean;
  status: "aktif" | "habis";
  catatan: string;
};

export type GerakStok = {
  id: string;
  unit_id: string;
  jenis: "masuk" | "keluar" | "koreksi";
  kg: number;
  kg_dasar: number;
  waktu: string;
  alasan: string;
  status: "diajukan" | "disetujui" | "ditolak";
  catatan_putusan: string;
  dibuat_oleh: string | null;
};

export type RincianTagihan = {
  transit?: boolean;
  detik?: number;
  hari_bulat?: number;
  hari_ditagih?: number;
  minimum_hari?: number;
  masa_transit_jam?: number;
  tarif_per_kg?: number;
  kg_dasar?: number;
  jumlah?: number;
  dasar_berat?: string;
  kg_timbang_keluar?: number;
  dikonfirmasi?: boolean;
};

export type Tagihan = {
  id: string;
  kode: string;
  unit_id: string;
  buyer_id: string | null;
  pemilik_nama: string;
  jenis: "simpan" | "abf" | "transit";
  kg_dasar: number;
  tarif_per_kg: number;
  hari_ditagih: number;
  jumlah: number;
  rincian: RincianTagihan;
  masuk_pada: string;
  keluar_pada: string | null;
  dibuat_pada: string;
};

export type AturanTarif = {
  id: string;
  jenis: "simpan" | "abf" | "transit";
  tarif_per_kg: number;
  masa_transit_jam: number;
  minimum_hari: number;
  dasar_berat: "masuk" | "keluar";
  berlaku_dari: string;
  dikonfirmasi: boolean;
  catatan: string;
};

export type Booking = {
  id: string;
  jenis: "produksi" | "abf";
  partner_id: string | null;
  label: string;
  mulai: string;
  selesai: string;
  kg: number | null;
  status: "aktif" | "dibatalkan";
  alasan_batal: string;
  catatan: string;
};

export type IsiGudang = { kapasitas_kg: number; isi_sendiri_kg: number; isi_titipan_kg: number };

/* ------------------------------------------------------- ruangan gudang */
export type JenisRuangan = "abf" | "cs";
export type Ruangan = {
  id: string;
  kode: string;
  nama: string;
  jenis: JenisRuangan;
  kapasitas_kg: number;
  urutan: number;
  dikonfirmasi: boolean;
  catatan: string;
  aktif: boolean;
  isi_sendiri_kg: number;
  isi_titipan_kg: number;
  isi_kg: number;
  jumlah_unit: number;
};

/* ------------------------------------------------------ stok penunjang */
export type KategoriBarang = "kerja" | "pekerja";
export type StatusBarang = "aman" | "menipis" | "habis";
export type Barang = {
  id: string;
  kode: string;
  kategori: KategoriBarang;
  nama: string;
  satuan: string;
  stok_minimum: number;
  lokasi: string;
  keterangan: string;
  aktif: boolean;
  stok: number;
  status_stok: StatusBarang;
  terakhir: string | null;
};
export type GerakBarang = {
  id: string;
  item_id: string;
  jenis: "masuk" | "keluar" | "koreksi";
  jumlah: number;
  tanggal: string;
  penerima: string;
  catatan: string;
  dibuat_pada: string;
};
export type ProduksiSiapStok = { id: string; kode: string; sisaKg: number };
