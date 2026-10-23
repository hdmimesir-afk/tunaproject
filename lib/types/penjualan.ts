import type { StatusTagihan } from "@/lib/logic/penjualan";

export type Pesanan = {
  id: string;
  kode: string;
  buyer_id: string;
  buyer_nama: string;
  cycle_id: string | null;
  siklus_kode: string | null;
  tanggal: string;
  tempo_hari: number;
  status: "draf" | "terkirim" | "dibatalkan";
  catatan: string;
  alasan_batal: string;
  dikirim_pada: string | null;
  jumlah_baris: number;
  kg_pesan: number;
  total_pesan: number;
  kg_final: number;
  total_final: number;
  invoice_id: string | null;
  invoice_kode: string | null;
};

export type AlokasiJual = {
  id: string;
  order_id: string;
  unit_id: string;
  unit_kode: string;
  product_nama: string;
  grade_kode: string | null;
  kelompok: string;
  kg_pesan: number;
  harga_per_kg: number;
  kg_kirim: number | null;
  kg_diterima: number | null;
  batal: boolean;
};

export type BarisInvoice = { uraian: string; kg: number; harga_per_kg: number; jumlah: number; unit?: string; dasar?: string; hari?: number };

export type Invoice = {
  id: string;
  kode: string;
  jenis: "penjualan" | "gudang_dingin";
  buyer_id: string;
  buyer_nama: string;
  order_id: string | null;
  cycle_id: string | null;
  tanggal: string;
  jatuh_tempo: string;
  total: number;
  baris: BarisInvoice[];
  catatan: string;
  status_terbit: "terbit" | "dibatalkan";
  alasan_batal: string;
  dibayar: number;
  sisa: number;
  status_tagihan: StatusTagihan;
  hari_telat: number;
};

export type PembayaranPembeli = { id: string; kode: string; invoice_id: string; jumlah: number; tanggal: string; catatan: string };
export type UnitJual = { id: string; kode: string; label: string; sisaKg: number; tersediaKg: number };
export type Pembeli = { id: string; nama: string; kontak: string; tempo_hari: number };
export type JasaBelumDitagih = { id: string; kode: string; buyer_id: string; pemilik_nama: string; jenis: string; jumlah: number; kg_dasar: number };
