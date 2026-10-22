/* Bentuk baris dari view dan tabel Fase 2. Angka numeric dari PostgREST datang sebagai number. */

export type StatusPO = "draf" | "diajukan" | "perlu_revisi" | "disetujui" | "ditolak";
export type StatusApv = "diajukan" | "diperiksa" | "perlu_revisi" | "disetujui" | "ditolak";
export type StatusTerima = "belum" | "sebagian" | "selesai";
export type StatusBayar = "belum" | "sebagian" | "lunas";
export type JenisDokumen = "nota" | "bukti_transfer" | "surat_jalan" | "foto_timbangan" | "lainnya";
export type RefDokumen = "purchase_orders" | "payments" | "lots";

export type POBaris = {
  id: string;
  kode: string;
  tanggal: string;
  supplier_id: string;
  supplier_nama: string;
  cycle_id: string | null;
  siklus_kode: string | null;
  kg: number;
  harga_per_kg: number;
  total: number;
  catatan: string;
  status_persetujuan: StatusPO;
  harga_acuan: number | null;
  kg_diterima: number;
  status_terima: StatusTerima;
  total_bayar: number;
  status_bayar: StatusBayar;
};

export type Pengajuan = {
  id: string;
  kode: string;
  jenis: string;
  ref_tabel: string;
  ref_id: string;
  judul: string;
  jumlah: number;
  status: StatusApv;
  diajukan_oleh: string;
  diajukan_pada: string;
  diperiksa_oleh: string | null;
  diperiksa_pada: string | null;
  catatan_periksa: string;
  disetujui_oleh: string | null;
  disetujui_pada: string | null;
  catatan_revisi: string;
  alasan_tolak: string;
  batch_id: string | null;
  po_kode: string | null;
  po_kg: number | null;
  harga_per_kg: number | null;
  harga_acuan: number | null;
  supplier_nama: string;
  jml_nota: number;
};

export type Dokumen = {
  id: string;
  ref_tabel: RefDokumen;
  ref_id: string;
  jenis: JenisDokumen;
  nama_asli: string;
  ukuran: number;
  tipe: string;
  dibuat_pada: string;
  dibuat_oleh: string | null;
};

export type LotBaris = {
  id: string;
  kode: string;
  po_id: string;
  po_kode: string;
  tanggal_terima: string;
  kg: number;
  sisa_kg: number;
  qc: "menunggu" | "lulus" | "ditahan";
  sebelum_disetujui: boolean;
  catatan: string;
  qc_catatan: string;
  grade_id: string | null;
  suppliers: { nama: string } | null;
  grades: { kode: string; nama: string } | null;
};

export type BayarBaris = {
  id: string;
  kode: string;
  po_id: string;
  jumlah: number;
  tanggal: string;
  catatan: string;
  dibuat_oleh: string | null;
};

export type POSiapTerima = {
  po_id: string;
  kode: string;
  supplier_nama: string;
  kg: number;
  kg_diterima: number;
  status_persetujuan: StatusPO;
  tanggal: string;
};

export type Pengguna = { nama: string; role: string };
export type Opsi = { id: string; label: string };
