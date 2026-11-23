import { describe, expect, it } from "vitest";
import { hitungBep, hitungMargin, hitungSaldo, ringkasAbsen } from "./dashboardOwner";

const p = (laba: number, tanggal: string, pendapatan = laba * 2) => ({ pendapatan, biaya: pendapatan - laba, laba, tanggal });

describe("hitungMargin", () => {
  it("total semua proyek dan persen margin", () => {
    expect(hitungMargin([p(100, "2026-11-01", 400), p(50, "2026-10-01", 100)])).toEqual({ pendapatan: 500, biaya: 350, laba: 150, marginPct: 30, jumlahProyek: 2, belumLaku: 0 });
  });
  it("proyek yg belum ada penjualan nggak narik margin jadi minus", () => {
    const r = hitungMargin([p(100, "2026-11-01", 400), { pendapatan: 0, biaya: 900, laba: -900, tanggal: "2026-11-20" }]);
    expect(r.marginPct).toBe(25);
    expect(r.jumlahProyek).toBe(1);
    expect(r.belumLaku).toBe(1);
  });
  it("belum ada pendapatan = margin kosong", () => {
    expect(hitungMargin([]).marginPct).toBeNull();
  });
});

describe("hitungBep", () => {
  it("persen balik modal dan perkiraan bulan dari laba 90 hari terakhir", () => {
    // Laba total 300 juta, 90 hari terakhir 150 juta = 50 juta per bulan. Sisa 700 juta = 14 bulan.
    const r = hitungBep(1_000_000_000, [p(150_000_000, "2026-06-01"), p(150_000_000, "2026-10-15")], "2026-11-23");
    expect(r.pct).toBe(30);
    expect(r.sisa).toBe(700_000_000);
    expect(r.perBulan).toBe(50_000_000);
    expect(r.bulanLagi).toBe(14);
    expect(r.lunas).toBe(false);
  });
  it("udah balik modal", () => {
    const r = hitungBep(100, [p(150, "2026-11-01")], "2026-11-23");
    expect(r).toMatchObject({ pct: 100, sisa: 0, lunas: true, bulanLagi: null });
  });
  it("modal belum diisi = nggak dihitung", () => {
    expect(hitungBep(0, [p(150, "2026-11-01")], "2026-11-23").pct).toBeNull();
  });
  it("rugi: persen nggak minus, perkiraan kosong", () => {
    const r = hitungBep(1000, [p(-200, "2026-11-01")], "2026-11-23");
    expect(r.pct).toBe(0);
    expect(r.bulanLagi).toBeNull();
  });
});

describe("hitungSaldo", () => {
  it("saldo awal + buku kas tanpa salah pembulatan", () => {
    expect(hitungSaldo(0.1, 0.2)).toBe(0.3);
    expect(hitungSaldo(10_000_000, -2_500_000.5)).toBe(7_499_999.5);
  });
});

describe("ringkasAbsen", () => {
  it("per orang: masuk pertama, pulang terakhir, yg gagal nggak diitung", () => {
    const r = ringkasAbsen([
      { user_id: "a", nama: "Andi", jenis: "masuk", waktu: "2026-11-23T01:05:00Z", hasil: "gagal", terlambat_menit: 0 },
      { user_id: "a", nama: "Andi", jenis: "masuk", waktu: "2026-11-23T01:10:00Z", hasil: "berhasil", terlambat_menit: 10 },
      { user_id: "b", nama: "Budi", jenis: "masuk", waktu: "2026-11-23T00:55:00Z", hasil: "berhasil", terlambat_menit: 0 },
      { user_id: "b", nama: "Budi", jenis: "pulang", waktu: "2026-11-23T10:00:00Z", hasil: "berhasil", terlambat_menit: 0 },
      { user_id: "c", nama: "Cici", jenis: "masuk", waktu: "2026-11-23T01:00:00Z", hasil: "gagal", terlambat_menit: 0 },
    ]);
    expect(r.hadir).toBe(2);
    expect(r.terlambat).toBe(1);
    expect(r.udahPulang).toBe(1);
    expect(r.orang.map((o) => o.nama)).toEqual(["Budi", "Andi"]);
  });
});
