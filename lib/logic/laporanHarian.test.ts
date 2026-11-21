import { describe, expect, it } from "vitest";
import type { LaporanHarian } from "@/lib/data/laporanHarian";
import { hasilPersen, teksLaporan } from "./laporanHarian";

const dasar: LaporanHarian = {
  periode: "hari", dari: "2026-11-22", sampai: "2026-11-22",
  ikan: { kg: 1200.5, lot: 3, ekor: 40, pemasok: ["UD Samudra", "CV Mina"] },
  produksi: { jumlah: 2, masukKg: 900, loinKg: 540, sampingKg: 120, berjalan: 1, menunggu: 1, disetujui: 0 },
  stok: { kg: 1560, perJenis: [{ nama: "Loin tuna A-SO", kg: 742 }, { nama: "Toro", kg: 60 }] },
  jual: { kg: 300, nilai: 36000000, pesanan: 2, pembeli: ["PT Pasifik"] },
  uang: { masuk: 5000000, keluar: 2500000.4 },
};

describe("laporan harian", () => {
  it("hasil olahan dihitung dari loin dibagi ikan masuk", () => {
    expect(hasilPersen(540, 900)).toBe(60);
    expect(hasilPersen(10, 0)).toBeNull();
  });

  it("teks laporan lengkap dan tanpa tanda minus di kalimat", () => {
    const t = teksLaporan(dasar, "Minggu, 22 November 2026", { jumlah: 5, mendesak: 1 });
    expect(t).toContain("Ikan masuk: 1.200,5 kg (3 lot, 40 ekor) dari UD Samudra, CV Mina");
    expect(t).toContain("loin 540 kg (hasil 60,0%)");
    expect(t).toContain("Stok siap jual: 1.560 kg (Loin tuna A-SO 742 kg, Toro 60 kg)");
    expect(t).toContain("Terjual: 300 kg, Rp36.000.000 ke PT Pasifik");
    expect(t).toContain("Uang masuk Rp5.000.000, keluar Rp2.500.000");
    expect(t).toContain("Perlu keputusan: 5 hal (1 mendesak)");
    expect(t).not.toMatch(/ - /);
  });

  it("bagian yang nggak boleh dilihat nggak ikut, yang kosong bilang belum ada", () => {
    const t = teksLaporan({ ...dasar, uang: null, stok: null, ikan: { kg: 0, lot: 0, ekor: 0, pemasok: [] }, jual: { kg: 0, nilai: 0, pesanan: 0, pembeli: [] } }, "x");
    expect(t).not.toContain("Uang masuk");
    expect(t).not.toContain("Stok siap jual");
    expect(t).toContain("Ikan masuk: belum ada");
    expect(t).toContain("Terjual: belum ada");
  });
});
