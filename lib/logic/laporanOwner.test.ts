import { describe, expect, it } from "vitest";
import { hariHari, jumlahPer, kgOwner, loinPerGrade, rentangPeriode, ringkasProduksi, seriHarian, totalBulat } from "./laporanOwner";

describe("rentangPeriode", () => {
  it("7 hari, 30 hari, bulan ini", () => {
    expect(rentangPeriode("2026-11-23", "7")).toEqual({ dari: "2026-11-17", sampai: "2026-11-23" });
    expect(rentangPeriode("2026-11-23", "30")).toEqual({ dari: "2026-10-25", sampai: "2026-11-23" });
    expect(rentangPeriode("2026-11-23", "bulan")).toEqual({ dari: "2026-11-01", sampai: "2026-11-23" });
  });
  it("hari-harinya lengkap", () => {
    expect(hariHari("2026-11-29", "2026-12-02")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
  });
});

describe("ringkasProduksi", () => {
  it("total dan yield tanpa salah pembulatan", () => {
    const r = ringkasProduksi([
      { tanggal: "2026-11-20", status: "diperiksa", masuk_kg: 100.1, loin_kg: 60.2, samping_kg: 10, limbah_kg: 20, susut_kg: 1 },
      { tanggal: "2026-11-21", status: "berjalan", masuk_kg: 99.9, loin_kg: 59.8, samping_kg: 0, limbah_kg: null, susut_kg: null },
    ]);
    expect(r).toMatchObject({ jumlah: 2, berjalan: 1, disetujui: 1, masukKg: 200, loinKg: 120, yieldPct: 60 });
  });
  it("belum ada ikan = yield kosong", () => {
    expect(ringkasProduksi([]).yieldPct).toBeNull();
  });
});

describe("seriHarian", () => {
  it("hari kosong tetap ada dengan 0, di luar rentang nggak ikut", () => {
    const s = seriHarian([{ t: "2026-11-21", kg: 1.5 }, { t: "2026-11-21", kg: 0.25 }, { t: "2026-11-30", kg: 9 }], "2026-11-20", "2026-11-22", (r) => r.t, (r) => r.kg);
    expect(s).toEqual([{ tanggal: "2026-11-20", nilai: 0 }, { tanggal: "2026-11-21", nilai: 1.75 }, { tanggal: "2026-11-22", nilai: 0 }]);
  });
});

describe("loinPerGrade", () => {
  it("urut grade, persen dari total", () => {
    expect(loinPerGrade([
      { kg: 30, grades: { kode: "B-SO", urutan: 2 } },
      { kg: 70, grades: { kode: "A-SO", urutan: 1 } },
    ])).toEqual([{ kode: "A-SO", kg: 70, pct: 70 }, { kode: "B-SO", kg: 30, pct: 30 }]);
  });
});

describe("jumlahPer dan totalBulat", () => {
  it("urut dari terbesar, sisanya jadi Lainnya", () => {
    const rows = [["A", 1], ["B", 5], ["C", 2], ["B", 1], ["D", 0.5], ["E", 0.25]].map(([nama, kg]) => ({ nama: nama as string, kg: kg as number }));
    const hasil = jumlahPer(rows, (r) => r.nama, (r) => r.kg, 1000, 4);
    expect(hasil.map((h) => h.nama)).toEqual(["B", "C", "A", "Lainnya"]);
    expect(hasil[0]).toEqual({ nama: "B", nilai: 6, pct: 61.5 });
    expect(hasil[3].nilai).toBe(0.75);
  });
  it("nama kosong dan nilai nol", () => {
    expect(jumlahPer([{ n: "", v: 2 }, { n: "X", v: 0 }], (r) => r.n, (r) => r.v)).toEqual([{ nama: "Tanpa nama", nilai: 2, pct: 100 }]);
  });
  it("total rupiah pas", () => {
    expect(totalBulat([{ j: 0.1 }, { j: 0.2 }], (r) => r.j, 100)).toBe(0.3);
  });
  it("format kg owner", () => {
    expect(kgOwner(2400)).toBe("2.400 kg");
    expect(kgOwner(12.5)).toBe("12,5 kg");
  });
});