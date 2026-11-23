/* Pos biaya tetap (format tim finance Katalis, 23 Nov 2026): tiap pos punya kelompok dan cara bayar.
   Bulanan dicatat tiap bulan, tahunan dicatat sekali setahun di bulan bayarnya. Uang dihitung dalam sen bulat. */

export type KelompokBiaya = "tenaga_kerja" | "overhead_pabrik" | "sertifikasi_izin" | "kantor" | "keuangan";
export type CaraBayar = "bulanan" | "tahunan";

/** Urutan dan nama kelompok, sama persis dengan kategori biaya di database. */
export const KELOMPOK_BIAYA: { id: KelompokBiaya; label: string; contoh: string }[] = [
  { id: "tenaga_kerja", label: "Tenaga kerja", contoh: "gaji, lembur, BPJS" },
  { id: "overhead_pabrik", label: "Overhead pabrik", contoh: "listrik, air, es, perawatan mesin" },
  { id: "sertifikasi_izin", label: "Sertifikasi dan izin", contoh: "HACCP, SKP, izin usaha" },
  { id: "kantor", label: "Kantor", contoh: "sewa, internet, ATK" },
  { id: "keuangan", label: "Keuangan", contoh: "admin bank, bunga, asuransi" },
];
export const isKelompok = (x: unknown): x is KelompokBiaya => KELOMPOK_BIAYA.some((k) => k.id === x);
export const labelKelompok = (id: string) => KELOMPOK_BIAYA.find((k) => k.id === id)?.label ?? id;

export const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export type PosRingkas = { kelompok: string; cara_bayar: CaraBayar; bulan_bayar: number | null; jumlah: number; aktif: boolean };

/** Pos ini dicatat di bulan itu? (bulan 1..12) Bulanan tiap bulan, tahunan cuma di bulan bayarnya. */
export const jatuhTempo = (p: Pick<PosRingkas, "cara_bayar" | "bulan_bayar" | "aktif">, bulan: number) =>
  p.aktif && (p.cara_bayar === "bulanan" || p.bulan_bayar === bulan);

/** Total pos aktif: per bulan (pos bulanan aja), per tahun (bulanan x 12 + tahunan). */
export function totalPos(pos: PosRingkas[]) {
  const aktif = pos.filter((p) => p.aktif);
  const sen = (n: number) => Math.round(n * 100);
  const bulanan = aktif.filter((p) => p.cara_bayar === "bulanan").reduce((a, p) => a + sen(p.jumlah), 0);
  const tahunan = aktif.filter((p) => p.cara_bayar === "tahunan").reduce((a, p) => a + sen(p.jumlah), 0);
  return { perBulan: bulanan / 100, perTahun: (bulanan * 12 + tahunan) / 100 };
}
