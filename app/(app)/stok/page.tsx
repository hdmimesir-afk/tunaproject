import { redirect } from "next/navigation";

/* Stok pindah jadi Ringkasan Produksi (permintaan tim 24 Nov 2026). Tautan lama dan pintasan aplikasi tetap jalan. */
export default function StokPage() {
  redirect("/produksi");
}
