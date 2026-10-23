import { describe, expect, it } from "vitest";
import { absenHari, bacaKoordinat, bulanSah, jarakMeter, jumlahHari, tampilJam, tampilJarak, ukuranFoto } from "./absensi";

describe("bacaKoordinat", () => {
  it("menerima koma atau titik dan menolak di luar rentang", () => {
    expect(bacaKoordinat("-0,9492", 90)).toBe(-0.9492);
    expect(bacaKoordinat(" 100.3543 ", 180)).toBe(100.3543);
    expect(bacaKoordinat("91", 90)).toBeNull();
    expect(bacaKoordinat("181", 180)).toBeNull();
    expect(bacaKoordinat("abc", 90)).toBeNull();
    expect(bacaKoordinat("", 90)).toBeNull();
    expect(bacaKoordinat("1,2,3", 90)).toBeNull();
  });
});

describe("jarakMeter", () => {
  it("titik yang sama berjarak nol", () => {
    expect(jarakMeter(-0.9492, 100.3543, -0.9492, 100.3543)).toBe(0);
  });
  it("0,001 derajat lintang sekitar 111 m dan 0,00027 sekitar 30 m", () => {
    expect(jarakMeter(-0.9492, 100.3543, -0.9482, 100.3543)).toBeGreaterThan(110);
    expect(jarakMeter(-0.9492, 100.3543, -0.9482, 100.3543)).toBeLessThan(112);
    expect(jarakMeter(-0.9492, 100.3543, -0.94893, 100.3543)).toBeGreaterThan(29);
    expect(jarakMeter(-0.9492, 100.3543, -0.94893, 100.3543)).toBeLessThan(31);
  });
  it("simetris", () => {
    expect(jarakMeter(1, 2, 3, 4)).toBeCloseTo(jarakMeter(3, 4, 1, 2), 6);
  });
});

describe("tampilan", () => {
  it("jarak dan jam", () => {
    expect(tampilJarak(48.4)).toBe("48 m");
    expect(tampilJarak(1500)).toBe("1,5 km");
    expect(tampilJam("08:00:00")).toBe("08.00");
  });
});

describe("absenHari", () => {
  const daftar = [
    { tanggal: "2026-10-23", jenis: "masuk", hasil: "berhasil" },
    { tanggal: "2026-10-23", jenis: "pulang", hasil: "gagal" },
    { tanggal: "2026-10-22", jenis: "pulang", hasil: "berhasil" },
  ];
  it("hanya yang berhasil pada hari itu", () => {
    const h = absenHari(daftar, "2026-10-23");
    expect(h.masuk).not.toBeNull();
    expect(h.pulang).toBeNull();
  });
});

describe("bulanSah dan jumlahHari", () => {
  it("bulan tidak sah memakai bawaan", () => {
    expect(bulanSah("2026-10", "2026-01")).toBe("2026-10");
    expect(bulanSah("2026-13", "2026-01")).toBe("2026-01");
    expect(bulanSah(undefined, "2026-01")).toBe("2026-01");
  });
  it("menghitung hari termasuk ujung", () => {
    expect(jumlahHari("2026-10-23", "2026-10-23")).toBe(1);
    expect(jumlahHari("2026-10-23", "2026-10-25")).toBe(3);
    expect(jumlahHari("2026-10-25", "2026-10-23")).toBe(0);
  });
});

describe("ukuranFoto", () => {
  it("memperkecil dengan rasio tetap dan tidak memperbesar", () => {
    expect(ukuranFoto(1920, 1080, 640)).toEqual({ lebar: 640, tinggi: 360 });
    expect(ukuranFoto(320, 240, 640)).toEqual({ lebar: 320, tinggi: 240 });
  });
});
