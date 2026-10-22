/* Bentuk baris dari view dan tabel Fase 3. Angka numeric dari PostgREST datang sebagai number. */

export type StatusProduksi = "berjalan" | "selesai" | "diperiksa_qc" | "diperiksa";

export type ProduksiBaris = {
  id: string;
  kode: string;
  tanggal: string;
  status: StatusProduksi;
  cycle_id: string | null;
  siklus_kode: string | null;
  catatan: string;
  masuk_kg: number;
  loin_kg: number;
  jumlah_loin: number;
  samping_kg: number;
  limbah_kg: number | null;
  susut_kg: number | null;
  belum_jelas_kg: number;
  hasil_pct: number;
  belum_jelas_pct: number;
  penjelasan_selisih: string;
  selisih_diterima: boolean;
  catatan_perbaikan: string;
  selesai_oleh: string | null;
  selesai_pada: string | null;
  qc_oleh: string | null;
  qc_pada: string | null;
  owner_oleh: string | null;
  owner_pada: string | null;
  dibuat_pada: string;
};

export type AlokasiLot = { id: string; lot_id: string; lot_kode: string; kg: number };
export type ItemLoin = {
  id: string;
  no_ekor: number | null;
  no_loin: number;
  grade_id: string;
  kg: number;
  versi: number;
  batal: boolean;
  alasan_batal: string;
};
export type Ekor = { id: string; no_ekor: number; berat_utuh_kg: number };
export type KomponenSamping = { id: string; category_id: string; kg: number };
export type RiwayatLoin = { id: number; item_id: string; aksi: "tambah" | "koreksi" | "batal"; sebelum: Record<string, unknown> | null; sesudah: Record<string, unknown>; oleh: string | null; pada: string };
export type LotSiap = { id: string; kode: string; sisa_kg: number; grade_kode: string | null; supplier_nama: string };
