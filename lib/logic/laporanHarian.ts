/* Teks laporan harian buat dibagikan Owner (WhatsApp dan lainnya). Fungsi murni, dites di laporanHarian.test.ts.
   Gaya bahasa santai, tanpa tanda "-" di kalimat. */
import type { LaporanHarian, Periode } from "@/lib/data/laporanHarian";

export const LABEL_PERIODE: Record<Periode, string> = { hari: "Hari ini", kemarin: "Kemarin", "7hari": "7 hari terakhir" };

const angka = (n: number, desimal = 0) => n.toLocaleString("id-ID", { minimumFractionDigits: desimal, maximumFractionDigits: desimal === 0 ? 3 : desimal });
export const kgTeks = (n: number) => `${angka(n)} kg`;
export const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
export const persenTeks = (n: number) => `${angka(n, 1)}%`;

/** Hasil olahan (loin dibagi ikan masuk) dalam persen, null kalau belum ada ikan yang diolah. */
export const hasilPersen = (loinKg: number, masukKg: number) => (masukKg > 0 ? (loinKg / masukKg) * 100 : null);

const daftarNama = (nama: string[], maks = 3) =>
  nama.length <= maks ? nama.join(", ") : `${nama.slice(0, maks).join(", ")} dan ${nama.length - maks} lainnya`;

export function teksLaporan(lap: LaporanHarian, judulTanggal: string, tindakan?: { jumlah: number; mendesak: number }): string {
  const baris: string[] = [`*Laporan KATALIS ${LABEL_PERIODE[lap.periode].toLowerCase()}*`, judulTanggal, ""];
  if (lap.ikan) {
    baris.push(lap.ikan.lot === 0
      ? "Ikan masuk: belum ada"
      : `Ikan masuk: ${kgTeks(lap.ikan.kg)} (${lap.ikan.lot} lot${lap.ikan.ekor ? `, ${lap.ikan.ekor} ekor` : ""}) dari ${daftarNama(lap.ikan.pemasok)}`);
  }
  if (lap.produksi) {
    const h = hasilPersen(lap.produksi.loinKg, lap.produksi.masukKg);
    baris.push(lap.produksi.jumlah === 0
      ? "Produksi: belum ada"
      : `Produksi: ${lap.produksi.jumlah} produksi, ${kgTeks(lap.produksi.masukKg)} diolah, loin ${kgTeks(lap.produksi.loinKg)}${h !== null ? ` (hasil ${persenTeks(h)})` : ""}`);
  }
  if (lap.stok) {
    const jenis = lap.stok.perJenis.slice(0, 3).map((j) => `${j.nama} ${kgTeks(j.kg)}`).join(", ");
    baris.push(`Stok siap jual: ${kgTeks(lap.stok.kg)}${jenis ? ` (${jenis})` : ""}`);
  }
  if (lap.jual) {
    baris.push(lap.jual.pesanan === 0
      ? "Terjual: belum ada"
      : `Terjual: ${kgTeks(lap.jual.kg)}, ${rupiah(lap.jual.nilai)} ke ${daftarNama(lap.jual.pembeli)}`);
  }
  if (lap.uang) baris.push(`Uang masuk ${rupiah(lap.uang.masuk)}, keluar ${rupiah(lap.uang.keluar)}`);
  if (tindakan && tindakan.jumlah > 0) {
    baris.push("", `Perlu keputusan: ${tindakan.jumlah} hal${tindakan.mendesak ? ` (${tindakan.mendesak} mendesak)` : ""}`);
  }
  return baris.join("\n");
}
