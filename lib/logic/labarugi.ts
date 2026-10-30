/* Laba rugi per siklus (format mengikuti contoh laporan Siklus 1 di docs/laporan). Murni tanpa I/O.
   Uang dihitung dalam sen dan berat dalam gram bulat supaya angka cocok dengan database dan contoh laporan. */

import { jumlahBaris } from "./penjualan";

export type KelompokPendapatan = "loin" | "hasil_samping" | "limbah" | "lainnya";

export type BarisPendapatan = { kelompok: KelompokPendapatan; label: string; kg: number; hargaPerKg: number };
export type BarisBiaya = { kategori: string; jumlah: number; kg?: number; hargaPerKg?: number; ikan?: boolean };

export type InputLabaRugi = {
  pendapatan: BarisPendapatan[];
  biaya: BarisBiaya[];
  /** Neraca berat siklus (jumlah semua produksi di siklus itu). */
  neraca: { masukKg: number; loinKg: number; hasilSampingKg: number; limbahKg: number | null; susutKg: number | null; belumJelasKg: number };
  rencanaHasilPct?: number;
};

const sen = (n: number) => Math.round(n * 100);
const dariSen = (s: number) => s / 100;
const pct = (bagian: number, total: number) => (total > 0 ? Math.round((bagian / total) * 1000) / 10 : 0);
const bulat = (n: number) => Math.round(n);

export type BarisLaporan = { label: string; kg: number | null; hargaPerKg: number | null; jumlah: number; persen: number };

export type LabaRugi = {
  pendapatan: BarisLaporan[];
  subtotalLoin: BarisLaporan;
  subtotalSamping: BarisLaporan;
  totalPendapatan: number;
  biaya: (BarisLaporan & { persenBiaya: number })[];
  totalBiaya: number;
  labaKotor: number;
  marginPct: number;
  /** Persen hasil olahan = loin ÷ ikan masuk. */
  hasilPct: number;
  rencanaHasilPct: number | null;
  diAtasRencana: boolean | null;
  perKgLoin: null | { hargaJualRataRata: number; biayaTotal: number; biayaIkan: number; labaPerKg: number; hargaJualMinimal: number };
  /** Ke mana berat ikan pergi (kg dan % dari ikan masuk). */
  beratKemana: { label: string; kg: number; persen: number }[];
  /** Laba bersih butuh biaya bulanan, penyusutan, dan pajak; selama datanya belum ada tampil "belum bisa dihitung". */
  labaBersih: "belum_bisa_dihitung";
  cukupData: boolean;
};

export function hitungLabaRugi(input: InputLabaRugi): LabaRugi {
  const pend = input.pendapatan.map((b) => ({ ...b, jumlahSen: sen(jumlahBaris(b.kg, b.hargaPerKg)) }));
  const totalPendSen = pend.reduce((a, b) => a + b.jumlahSen, 0);
  const baris = (b: (typeof pend)[number]): BarisLaporan => ({ label: b.label, kg: b.kg, hargaPerKg: b.hargaPerKg, jumlah: dariSen(b.jumlahSen), persen: pct(b.jumlahSen, totalPendSen) });
  const subtotal = (label: string, kel: KelompokPendapatan): BarisLaporan => {
    const x = pend.filter((b) => b.kelompok === kel);
    const kg = x.reduce((a, b) => a + Math.round(b.kg * 1000), 0) / 1000;
    const js = x.reduce((a, b) => a + b.jumlahSen, 0);
    return { label, kg, hargaPerKg: null, jumlah: dariSen(js), persen: pct(js, totalPendSen) };
  };

  const totalBiayaSen = input.biaya.reduce((a, b) => a + sen(b.jumlah), 0);
  const biaya = input.biaya.map((b) => ({
    label: b.kategori, kg: b.kg ?? null, hargaPerKg: b.hargaPerKg ?? null, jumlah: b.jumlah,
    persen: pct(sen(b.jumlah), totalPendSen), persenBiaya: pct(sen(b.jumlah), totalBiayaSen),
  }));
  const labaSen = totalPendSen - totalBiayaSen;

  const loinKg = input.neraca.loinKg;
  const biayaIkanSen = input.biaya.filter((b) => b.ikan).reduce((a, b) => a + sen(b.jumlah), 0);
  const sampingSen = pend.filter((b) => b.kelompok !== "loin").reduce((a, b) => a + b.jumlahSen, 0);
  const loinSen = pend.filter((b) => b.kelompok === "loin").reduce((a, b) => a + b.jumlahSen, 0);
  const perKg = (nilaiSen: number) => bulat(nilaiSen / 100 / loinKg);

  const masuk = input.neraca.masukKg;
  const terjualSampingKg = pend.filter((b) => b.kelompok === "hasil_samping").reduce((a, b) => a + Math.round(b.kg * 1000), 0) / 1000;
  const kemana: LabaRugi["beratKemana"] = [
    { label: "Loin", kg: loinKg, persen: pct(Math.round(loinKg * 1000), Math.round(masuk * 1000)) },
    { label: "Hasil samping terjual", kg: terjualSampingKg, persen: pct(Math.round(terjualSampingKg * 1000), Math.round(masuk * 1000)) },
    { label: "Dibuang", kg: input.neraca.limbahKg ?? 0, persen: pct(Math.round((input.neraca.limbahKg ?? 0) * 1000), Math.round(masuk * 1000)) },
    { label: "Belum jelas", kg: input.neraca.belumJelasKg, persen: pct(Math.round(input.neraca.belumJelasKg * 1000), Math.round(masuk * 1000)) },
  ];

  const hasilPct = pct(Math.round(loinKg * 1000), Math.round(masuk * 1000));
  const rencana = input.rencanaHasilPct ?? null;
  return {
    pendapatan: pend.map(baris),
    subtotalLoin: subtotal("Subtotal loin", "loin"),
    subtotalSamping: subtotal("Subtotal hasil samping", "hasil_samping"),
    totalPendapatan: dariSen(totalPendSen),
    biaya,
    totalBiaya: dariSen(totalBiayaSen),
    labaKotor: dariSen(labaSen),
    marginPct: pct(labaSen, totalPendSen),
    hasilPct,
    rencanaHasilPct: rencana,
    diAtasRencana: rencana === null ? null : hasilPct >= rencana,
    perKgLoin: loinKg > 0 && totalPendSen > 0
      ? {
          hargaJualRataRata: perKg(loinSen),
          biayaTotal: perKg(totalBiayaSen),
          biayaIkan: perKg(biayaIkanSen),
          labaPerKg: perKg(labaSen),
          hargaJualMinimal: perKg(totalBiayaSen - sampingSen),
        }
      : null,
    beratKemana: kemana,
    labaBersih: "belum_bisa_dihitung",
    cukupData: totalPendSen > 0 && input.biaya.length > 0,
  };
}

/** Satu baris tren antarsiklus dari v_laba_rugi_siklus. */
export type BarisTren = { kode: string; ikanKg: number; hasilPct: number; pendapatan: number; biaya: number; laba: number; marginPct: number | null; hargaIkanPerKg: number };

export function ringkasTren(baris: { kode: string; kg_ikan: number; kg_diolah?: number; loin_kg: number; pendapatan_total: number; biaya_total: number; biaya_ikan: number; laba_kotor: number; margin_pct: number | null }[]): BarisTren[] {
  return baris.map((b) => ({
    kode: b.kode,
    ikanKg: b.kg_ikan,
    // Hasil dibagi ikan yang benar-benar diolah (bila ada); kg_ikan adalah yang dipesan di PO. Harga per kg tetap memakai yang dibeli.
    hasilPct: pct(Math.round(b.loin_kg * 1000), Math.round((b.kg_diolah ?? b.kg_ikan) * 1000)),
    pendapatan: b.pendapatan_total,
    biaya: b.biaya_total,
    laba: b.laba_kotor,
    marginPct: b.margin_pct,
    hargaIkanPerKg: b.kg_ikan > 0 ? bulat(b.biaya_ikan / b.kg_ikan) : 0,
  }));
}

/** Harga beli rata-rata tertimbang dari jumlah kg dan nilai (bukan rata-rata dari rata-rata). */
export function hargaRataTertimbang(kg: number, nilai: number) {
  return kg > 0 ? bulat(nilai / kg) : 0;
}

/** Awal minggu (Senin) sebagai 'YYYY-MM-DD', untuk pengelompokan harga beli mingguan. */
export function awalMinggu(tanggal: string) {
  const d = new Date(`${tanggal}T00:00:00Z`);
  const hari = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - hari);
  return d.toISOString().slice(0, 10);
}
