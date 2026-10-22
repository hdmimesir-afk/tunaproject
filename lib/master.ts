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
  buyers: { label: "Pembeli", kolom: [
    { k: "nama", label: "Nama", jenis: "teks", wajib: true },
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

/** Pengaturan angka yang boleh diubah dari aplikasi. */
export const PENGATURAN = {
  rencana_hasil_pct: { label: "Rencana hasil olahan (%)", min: 1, max: 100 },
  batas_hasil_min_pct: { label: "Batas bawah hasil wajar (%)", min: 0, max: 100 },
  batas_hasil_max_pct: { label: "Batas atas hasil wajar (%)", min: 0, max: 100 },
} as const;
export type KunciPengaturan = keyof typeof PENGATURAN;
export const isKunciPengaturan = (k: unknown): k is KunciPengaturan => typeof k === "string" && k in PENGATURAN;
