import type { StatusProduksi } from "@/lib/types/produksi";

export const LABEL_PRODUKSI: Record<StatusProduksi, string> = {
  berjalan: "Berjalan",
  selesai: "Menunggu QC",
  diperiksa_qc: "Menunggu Owner",
  diperiksa: "Diperiksa",
};
