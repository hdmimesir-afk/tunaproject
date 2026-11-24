/* Lini bisnis buat keuangan (25 Nov 2026): jual loin, jasa proses loin, titip barang. Murni tanpa I/O. */

export type LiniBiaya = "jual" | "jasa" | "titip";

export const LABEL_LINI_BIAYA: Record<LiniBiaya, string> = { jual: "Jual loin", jasa: "Jasa proses loin", titip: "Titip barang" };

/** Lini bisnis satu invoice: ikut proyeknya; kalau tanpa proyek, jasa produksi = jasa, gudang dingin = titip, sisanya jual. */
export function liniInvoice(jenis: string, liniProyek: string | null | undefined): LiniBiaya {
  if (liniProyek === "jual" || liniProyek === "jasa" || liniProyek === "titip") return liniProyek;
  return jenis === "jasa_produksi" ? "jasa" : jenis === "gudang_dingin" ? "titip" : "jual";
}
