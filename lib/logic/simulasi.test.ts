import { describe, expect, it } from "vitest";
import { hitungLabaRugi } from "./labarugi";
import { hargaIkanImpas, hitungSimulasi, skenarioDasar, type DasarSimulasi } from "./simulasi";

// Dasar dari Siklus 1: 481 kg ikan Rp46.000/kg, hasil 300,94 kg (62,565...%), loin dijual rata-rata Rp40.670.150 ÷ 300,94.
const dasar: DasarSimulasi = {
  ikanKg: 481, hargaIkanPerKg: 46_000, hasilPct: (300.94 / 481) * 100, hargaJualLoinPerKg: 40_670_150 / 300.94,
  pendapatanSamping: 906_000, biayaLain: 11_080_029 + 1_846_568 + 1_820_085 + 200_000,
};

describe("simulasi", () => {
  it("skenario dasar sama dengan laba kotor Siklus 1 (Rp4.503.468)", () => {
    const h = hitungSimulasi(dasar, skenarioDasar(dasar));
    expect(h.loinKg).toBe(300.94);
    expect(Math.abs(h.labaKotor - 4_503_468)).toBeLessThanOrEqual(1);
    expect(h.marginPct).toBe(10.8);
    expect(h.labaPerKgLoin).toBe(14_965);
    expect(h.hargaJualMinimal).toBe(120_179);
  });

  it("cocok dengan mesin laba rugi untuk angka yang sama", () => {
    const lr = hitungLabaRugi({
      pendapatan: [{ kelompok: "loin", label: "Loin", kg: 300.94, hargaPerKg: 40_670_150 / 300.94 }, { kelompok: "hasil_samping", label: "Samping", kg: 87, hargaPerKg: 906_000 / 87 }],
      biaya: [{ kategori: "Ikan", jumlah: 22_126_000, ikan: true }, { kategori: "Lain", jumlah: dasar.biayaLain }],
      neraca: { masukKg: 481, loinKg: 300.94, hasilSampingKg: 87, limbahKg: 65, susutKg: null, belumJelasKg: 28.06 },
    });
    expect(Math.abs(lr.labaKotor - hitungSimulasi(dasar, skenarioDasar(dasar)).labaKotor)).toBeLessThanOrEqual(1);
  });

  it("harga ikan naik Rp1.000/kg menurunkan laba 481 x 1.000", () => {
    const dasarLaba = hitungSimulasi(dasar, skenarioDasar(dasar)).labaKotor;
    const naik = hitungSimulasi(dasar, { ...skenarioDasar(dasar), hargaIkanPerKg: 47_000 });
    expect(Math.round(dasarLaba - naik.labaKotor)).toBe(481_000);
  });

  it("hasil olahan naik 1 poin menambah 4,81 kg loin", () => {
    const naik = hitungSimulasi(dasar, { ...skenarioDasar(dasar), hasilPct: dasar.hasilPct + 1 });
    expect(Math.round((naik.loinKg - 300.94) * 100) / 100).toBe(4.81);
    expect(naik.labaKotor).toBeGreaterThan(4_503_468);
  });

  it("harga ikan impas: pada harga itu laba tidak negatif, satu rupiah di atasnya rugi", () => {
    const s = { hasilPct: dasar.hasilPct, hargaJualLoinPerKg: dasar.hargaJualLoinPerKg };
    const impas = hargaIkanImpas(dasar, s);
    expect(hitungSimulasi(dasar, { ...s, hargaIkanPerKg: impas }).labaKotor).toBeGreaterThanOrEqual(0);
    expect(hitungSimulasi(dasar, { ...s, hargaIkanPerKg: impas + 1 }).labaKotor).toBeLessThan(0);
  });

  it("tanpa ikan masuk tidak membagi dengan nol", () => {
    const h = hitungSimulasi({ ikanKg: 0, pendapatanSamping: 0, biayaLain: 0 }, { hargaIkanPerKg: 1, hasilPct: 60, hargaJualLoinPerKg: 1 });
    expect(h.labaPerKgLoin).toBe(0);
    expect(h.marginPct).toBe(0);
  });
});
