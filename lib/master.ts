import { z } from "zod";

/* Data master yang dikelola di halaman Pengaturan. Kolom dan validasi ditulis sekali di sini,
   dipakai form (klien) dan Server Action (server). Batasan yang sama ada di database. */

export type Kolom =
  | { k: string; label: string; jenis: "teks"; wajib?: boolean; bawaan?: string }
  | { k: string; label: string; jenis: "angka"; min: number; max: number; bawaan: number }
  | { k: string; label: string; jenis: "pilih"; opsi: { nilai: string; label: string }[]; bawaan: string };

export const MASTER = {
  suppliers: { label: "Pemasok", kolom: [
    { k: "nama", label: "Nama", jenis: "teks", wajib: true },
    { k: "kontak", label: "Kontak", jenis: "teks" },
    { k: "catatan", label: "Catatan", jenis: "teks" },
  ] },
  buyers: { label: "Pembeli dan pemilik titipan", kolom: [
    { k: "nama", label: "Nama", jenis: "teks", wajib: true },
    // 27 Nov 2026: pemilik titipan dibedain PT/perusahaan atau perorangan.
    { k: "jenis_pemilik", label: "Jenis", jenis: "pilih", bawaan: "pt", opsi: [
      { nilai: "pt", label: "PT / perusahaan" }, { nilai: "perorangan", label: "Perorangan" },
    ] },
    { k: "kontak", label: "Kontak", jenis: "teks" },
    { k: "tempo_hari", label: "Tempo bayar (hari)", jenis: "angka", min: 0, max: 365, bawaan: 14 },
  ] },
  products: { label: "Produk", kolom: [
    { k: "nama", label: "Nama", jenis: "teks", wajib: true },
    { k: "satuan", label: "Satuan", jenis: "teks", bawaan: "kg" },
  ] },
  grades: { label: "Grade", kolom: [
    { k: "kode", label: "Kode", jenis: "teks", wajib: true },
    { k: "nama", label: "Nama", jenis: "teks" },
    { k: "jenis", label: "Dipakai buat", jenis: "pilih", bawaan: "loin", opsi: [
      { nilai: "loin", label: "Loin (produksi, stok, penjualan)" }, { nilai: "utuh", label: "Tuna utuh (penerimaan, harga nelayan)" },
    ] },
    { k: "urutan", label: "Urutan", jenis: "angka", min: 0, max: 999, bawaan: 0 },
  ] },
  component_categories: { label: "Hasil samping dan limbah", kolom: [
    { k: "nama", label: "Nama", jenis: "teks", wajib: true },
    { k: "komponen", label: "Komponen", jenis: "pilih", bawaan: "hasil_samping", opsi: [
      { nilai: "hasil_samping", label: "Hasil samping" }, { nilai: "limbah", label: "Limbah" }, { nilai: "susut", label: "Susut" },
    ] },
    { k: "urutan", label: "Urutan", jenis: "angka", min: 0, max: 999, bawaan: 0 },
  ] },
  expense_categories: { label: "Kategori biaya", kolom: [
    { k: "nama", label: "Nama", jenis: "teks", wajib: true },
    { k: "urutan", label: "Urutan", jenis: "angka", min: 0, max: 999, bawaan: 0 },
  ] },
} as const satisfies Record<string, { label: string; kolom: readonly Kolom[] }>;

export type TabelMaster = keyof typeof MASTER;
export const TABEL_MASTER = Object.keys(MASTER) as TabelMaster[];
export const isTabelMaster = (t: unknown): t is TabelMaster => typeof t === "string" && t in MASTER;

/** Skema Zod untuk satu tabel master, dibangun dari daftar kolomnya. */
export function skemaMaster(tabel: TabelMaster) {
  const bentuk: Record<string, z.ZodType> = {};
  for (const c of MASTER[tabel].kolom as readonly Kolom[]) {
    if (c.jenis === "teks") {
      const s = z.string().trim().max(200, `${c.label} terlalu panjang`);
      bentuk[c.k] = c.wajib ? s.min(1, `${c.label} wajib diisi`) : s;
    } else if (c.jenis === "angka") {
      bentuk[c.k] = z.coerce.number().int(`${c.label} harus bilangan bulat`).min(c.min).max(c.max);
    } else {
      bentuk[c.k] = z.enum(c.opsi.map((o) => o.nilai) as [string, ...string[]]);
    }
  }
  return z.object(bentuk);
}

/** Pengaturan angka yang boleh diubah dari aplikasi. grup = tab tempat isiannya di Pengaturan. */
export const PENGATURAN = {
  rencana_hasil_pct: { label: "Rencana hasil olahan (%)", min: 1, max: 100, grup: "target", step: "0.1" },
  batas_hasil_min_pct: { label: "Batas bawah hasil wajar (%)", min: 0, max: 100, grup: "target", step: "0.1" },
  batas_hasil_max_pct: { label: "Batas atas hasil wajar (%)", min: 0, max: 100, grup: "target", step: "0.1" },
  potongan_gancu_kg: { label: "Potongan per tusukan gancu (kg)", min: 0, max: 5, grup: "target", step: "0.1" },
  // 25 Nov 2026: persen pajak yang keisi duluan di form penjualan (tiap transaksi tetap bisa diubah atau dimatiin).
  pajak_persen_bawaan: { label: "Pajak penjualan bawaan (%)", min: 0, max: 100, grup: "target", step: "0.01" },
  // Dashboard owner (23 Nov 2026): saldo perusahaan = saldo awal + buku kas; balik modal = laba proyek dibanding modal.
  saldo_awal_kas_rp: { label: "Saldo awal kas sebelum pakai sistem (Rp)", min: -10_000_000_000_000, max: 10_000_000_000_000, grup: "owner", step: "1" },
  modal_usaha_rp: { label: "Total modal usaha (Rp)", min: 0, max: 10_000_000_000_000, grup: "owner", step: "1" },
} as const;
export type KunciPengaturan = keyof typeof PENGATURAN;
export const isKunciPengaturan = (k: unknown): k is KunciPengaturan => typeof k === "string" && k in PENGATURAN;
