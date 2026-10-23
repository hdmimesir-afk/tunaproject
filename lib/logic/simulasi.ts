/* Simulasi harga ikan dan dampaknya ke laba (F23). Murni tanpa I/O.
   Asumsi (sama seperti contoh laporan Siklus 1): berat ikan masuk tetap; loin = ikan × hasil olahan; hasil samping dan
   biaya selain ikan (kargo, penanganan, kemasan, jasa) tetap sebesar angka siklus; harga jual loin rata-rata berlaku untuk semua loin. */

export type DasarSimulasi = {
  ikanKg: number;
  hargaIkanPerKg: number;
  hasilPct: number;
  hargaJualLoinPerKg: number;
  pendapatanSamping: number;
  biayaLain: number;
};

export type Skenario = { hargaIkanPerKg: number; hasilPct: number; hargaJualLoinPerKg: number };

export type HasilSimulasi = {
  loinKg: number;
  pendapatanLoin: number;
  pendapatan: number;
  biayaIkan: number;
  biayaTotal: number;
  labaKotor: number;
  marginPct: number;
  labaPerKgLoin: number;
  hargaJualMinimal: number;
};

const sen = (n: number) => Math.round(n * 100);

export function hitungSimulasi(d: Pick<DasarSimulasi, "ikanKg" | "pendapatanSamping" | "biayaLain">, s: Skenario): HasilSimulasi {
  const loinGram = Math.round(d.ikanKg * 1000 * (s.hasilPct / 100));
  const loinKg = loinGram / 1000;
  const pendLoin = Math.round(loinKg * s.hargaJualLoinPerKg * 100);
  const pend = pendLoin + sen(d.pendapatanSamping);
  const biayaIkan = Math.round(d.ikanKg * s.hargaIkanPerKg * 100);
  const biaya = biayaIkan + sen(d.biayaLain);
  const laba = pend - biaya;
  return {
    loinKg,
    pendapatanLoin: pendLoin / 100,
    pendapatan: pend / 100,
    biayaIkan: biayaIkan / 100,
    biayaTotal: biaya / 100,
    labaKotor: laba / 100,
    marginPct: pend > 0 ? Math.round((laba / pend) * 1000) / 10 : 0,
    labaPerKgLoin: loinKg > 0 ? Math.round(laba / 100 / loinKg) : 0,
    hargaJualMinimal: loinKg > 0 ? Math.round((biaya - sen(d.pendapatanSamping)) / 100 / loinKg) : 0,
  };
}

/** Skenario dasar dari angka nyata satu siklus; hasilnya harus sama dengan laba kotor siklus itu. */
export const skenarioDasar = (d: DasarSimulasi): Skenario => ({ hargaIkanPerKg: d.hargaIkanPerKg, hasilPct: d.hasilPct, hargaJualLoinPerKg: d.hargaJualLoinPerKg });

/** Harga ikan tertinggi per kg agar laba kotor tidak negatif pada hasil olahan dan harga jual tertentu. */
export function hargaIkanImpas(d: Pick<DasarSimulasi, "ikanKg" | "pendapatanSamping" | "biayaLain">, s: Pick<Skenario, "hasilPct" | "hargaJualLoinPerKg">) {
  const pend = hitungSimulasi(d, { hargaIkanPerKg: 0, ...s }).pendapatan;
  return d.ikanKg > 0 ? Math.floor((pend - d.biayaLain) / d.ikanKg) : 0;
}
