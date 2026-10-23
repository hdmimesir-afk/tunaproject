import { describe, expect, it } from "vitest";
import { awalMinggu, hargaRataTertimbang, hitungLabaRugi, ringkasTren, type InputLabaRugi } from "./labarugi";

/* Data nyata Siklus 1 dari docs/laporan/laporan-laba-rugi-siklus.html. */
const siklus1: InputLabaRugi = {
  pendapatan: [
    { kelompok: "loin", label: "Loin B dengan kulit (B-SO)", kg: 203.51, hargaPerKg: 140_000 },
    { kelompok: "loin", label: "Loin C dengan kulit (C-SO)", kg: 97.43, hargaPerKg: 125_000 },
    { kelompok: "hasil_samping", label: "Toro", kg: 14, hargaPerKg: 30_000 },
    { kelompok: "hasil_samping", label: "Kepala dan rahang", kg: 63, hargaPerKg: 5_000 },
    { kelompok: "hasil_samping", label: "Tetelan coklat", kg: 7, hargaPerKg: 18_000 },
    { kelompok: "hasil_samping", label: "Daging kerok", kg: 3, hargaPerKg: 15_000 },
    { kelompok: "limbah", label: "Tulang tengah dan tetelan hitam (dibuang)", kg: 65, hargaPerKg: 0 },
  ],
  biaya: [
    { kategori: "Bahan baku: ikan utuh", jumlah: 22_126_000, kg: 481, hargaPerKg: 46_000, ikan: true },
    { kategori: "Ongkos kirim (kargo)", jumlah: 11_080_029 },
    { kategori: "Penanganan", jumlah: 1_846_568 },
    { kategori: "Kemasan", jumlah: 1_820_085 },
    { kategori: "Jasa", jumlah: 200_000 },
  ],
  neraca: { masukKg: 481, loinKg: 300.94, hasilSampingKg: 87, limbahKg: 65, susutKg: null, belumJelasKg: 28.06 },
  rencanaHasilPct: 60,
};

describe("laba rugi Siklus 1 (contoh laporan)", () => {
  const r = hitungLabaRugi(siklus1);

  it("pendapatan per grade dan hasil samping", () => {
    expect(r.pendapatan[0].jumlah).toBe(28_491_400);
    expect(r.pendapatan[1].jumlah).toBe(12_178_750);
    expect(r.subtotalLoin.jumlah).toBe(40_670_150);
    expect(r.subtotalLoin.kg).toBe(300.94);
    expect(r.subtotalSamping.jumlah).toBe(906_000);
    expect(r.totalPendapatan).toBe(41_576_150);
    expect(r.pendapatan[0].persen).toBe(68.5);
    expect(r.subtotalLoin.persen).toBe(97.8);
  });

  it("limbah dicatat dengan nilai Rp0", () => {
    const limbah = r.pendapatan.find((b) => b.label.startsWith("Tulang"));
    expect(limbah?.jumlah).toBe(0);
    expect(limbah?.kg).toBe(65);
  });

  it("biaya langsung dan laba kotor", () => {
    expect(r.totalBiaya).toBe(37_072_682);
    expect(r.labaKotor).toBe(4_503_468);
    expect(r.marginPct).toBe(10.8);
    expect(r.biaya[0].persenBiaya).toBe(59.7);
    expect(r.biaya[0].persen).toBe(53.2);
  });

  it("angka per kg loin", () => {
    expect(r.perKgLoin).toEqual({ hargaJualRataRata: 135_144, biayaTotal: 123_190, biayaIkan: 73_523, labaPerKg: 14_965, hargaJualMinimal: 120_179 });
  });

  it("hasil olahan dan ke mana berat ikan pergi", () => {
    expect(r.hasilPct).toBe(62.6);
    expect(r.diAtasRencana).toBe(true);
    expect(r.beratKemana.map((b) => [b.label, b.kg, b.persen])).toEqual([
      ["Loin", 300.94, 62.6], ["Hasil samping terjual", 87, 18.1], ["Dibuang", 65, 13.5], ["Belum jelas", 28.06, 5.8],
    ]);
  });

  it("laba bersih belum bisa dihitung sampai biaya bulanan dan pajak ada", () => {
    expect(r.labaBersih).toBe("belum_bisa_dihitung");
  });
});

describe("laba rugi: kasus tepi", () => {
  it("siklus tanpa penjualan tidak membagi dengan nol", () => {
    const r = hitungLabaRugi({ pendapatan: [], biaya: [{ kategori: "Ikan", jumlah: 1_000_000, ikan: true }], neraca: { masukKg: 0, loinKg: 0, hasilSampingKg: 0, limbahKg: null, susutKg: null, belumJelasKg: 0 } });
    expect(r.perKgLoin).toBeNull();
    expect(r.marginPct).toBe(0);
    expect(r.labaKotor).toBe(-1_000_000);
    expect(r.cukupData).toBe(false);
  });
  it("rugi ditampilkan sebagai angka negatif", () => {
    const r = hitungLabaRugi({ pendapatan: [{ kelompok: "loin", label: "Loin", kg: 10, hargaPerKg: 100_000 }], biaya: [{ kategori: "Ikan", jumlah: 1_500_000, ikan: true }], neraca: { masukKg: 20, loinKg: 10, hasilSampingKg: 0, limbahKg: null, susutKg: null, belumJelasKg: 10 } });
    expect(r.labaKotor).toBe(-500_000);
    expect(r.marginPct).toBe(-50);
  });
});

describe("tren dan harga beli", () => {
  it("tren per siklus", () => {
    const t = ringkasTren([{ kode: "SIK-0001", kg_ikan: 481, loin_kg: 300.94, pendapatan_total: 41_576_150, biaya_total: 37_072_682, biaya_ikan: 22_126_000, laba_kotor: 4_503_468, margin_pct: 10.8 }]);
    expect(t[0]).toMatchObject({ hasilPct: 62.6, hargaIkanPerKg: 46_000, laba: 4_503_468 });
  });
  it("harga rata-rata tertimbang dari kg dan nilai", () => {
    // 100 kg x 45.000 + 50 kg x 47.000 = 6.850.000 untuk 150 kg
    expect(hargaRataTertimbang(150, 6_850_000)).toBe(45_667);
    expect(hargaRataTertimbang(0, 0)).toBe(0);
  });
  it("awal minggu jatuh di hari Senin", () => {
    expect(awalMinggu("2026-05-04")).toBe("2026-05-04"); // Senin
    expect(awalMinggu("2026-05-10")).toBe("2026-05-04"); // Minggu
    expect(awalMinggu("2026-05-06")).toBe("2026-05-04");
  });
});
