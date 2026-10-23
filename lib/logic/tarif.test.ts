import { describe, expect, it } from "vitest";
import { bentrok, cariBentrok, slotKosong } from "./jadwal";
import { cekKapasitas, hitungBiayaSimpan, lamaTeks, uraikanBiaya } from "./tarif";

const aturan = { tarifPerKg: 76, tarifTransitPerKg: 10, masaTransitJam: 3, minimumHari: 10 };
const t0 = new Date("2026-01-01T00:00:00Z");
const setelah = (detik: number) => new Date(t0.getTime() + detik * 1000);
const JAM = 3600;
const HARI = 86400;

// Kasus yang sama dengan supabase/tests/005_stok.test.sql (hitung_biaya_simpan).
describe("hitungBiayaSimpan: kasus batas", () => {
  it("tepat 3 jam: masih transit", () => {
    const b = hitungBiayaSimpan(10, t0, setelah(3 * JAM), aturan);
    expect(b.transit).toBe(true);
    expect(b.jumlah).toBe(100);
    expect(b.hariDitagih).toBe(0);
  });
  it("3 jam lebih 1 detik: ditagih 1 hari", () => {
    const b = hitungBiayaSimpan(10, t0, setelah(3 * JAM + 1), aturan);
    expect(b.transit).toBe(false);
    expect(b.jumlah).toBe(760);
  });
  it("tepat 24 jam: 1 hari tanpa minimum", () => {
    expect(hitungBiayaSimpan(10, t0, setelah(HARI), aturan).hariDitagih).toBe(1);
  });
  it("24 jam lebih 1 detik: kena minimum 10 hari", () => {
    const b = hitungBiayaSimpan(10, t0, setelah(HARI + 1), aturan);
    expect(b.hariBulat).toBe(2);
    expect(b.hariDitagih).toBe(10);
    expect(b.jumlah).toBe(7600);
  });
  it("tepat 10 hari: 10 hari", () => {
    expect(hitungBiayaSimpan(10, t0, setelah(10 * HARI), aturan).jumlah).toBe(7600);
  });
  it("10 hari lebih 1 detik: hari ke-11 menambah satu hari penuh", () => {
    expect(hitungBiayaSimpan(10, t0, setelah(10 * HARI + 1), aturan).jumlah).toBe(8360);
  });
  it("keluar sebelum masuk ditolak", () => {
    expect(() => hitungBiayaSimpan(10, setelah(10), t0, aturan)).toThrow();
  });
});

describe("hitungBiayaSimpan: ambil sebagian dan berat", () => {
  it("400 kg x Rp76 x 12 hari dan 600 kg: dua pengambilan dari satu titipan", () => {
    expect(hitungBiayaSimpan(400, t0, setelah(12 * HARI), aturan).jumlah).toBe(364_800);
    expect(hitungBiayaSimpan(600, t0, setelah(12 * HARI), aturan).jumlah).toBe(547_200);
  });
  it("berat berdesimal tiga tidak bergeser", () => {
    // 123,457 kg x 76 x 10 = 93.827,32 (dibulatkan dua desimal)
    expect(hitungBiayaSimpan(123.457, t0, setelah(10 * HARI), aturan).jumlah).toBe(93_827.32);
  });
  it("input sama selalu menghasilkan tagihan sama", () => {
    const a = hitungBiayaSimpan(33.333, t0, setelah(15 * HARI + 5), aturan);
    const b = hitungBiayaSimpan(33.333, t0, setelah(15 * HARI + 5), aturan);
    expect(a).toEqual(b);
  });
});

describe("uraikanBiaya", () => {
  it("menjelaskan pembulatan, minimum, dan perkaliannya", () => {
    const baris = uraikanBiaya(hitungBiayaSimpan(10, t0, setelah(2 * HARI + 5 * JAM), aturan));
    expect(baris[0]).toContain("3 hari");
    expect(baris[1]).toContain("minimum 10 hari");
    expect(baris[2]).toContain("× 10 hari");
  });
  it("lamaTeks", () => {
    expect(lamaTeks(2 * HARI + 5 * JAM + 120)).toBe("2 hari 5 jam 2 menit");
  });
});

describe("cekKapasitas", () => {
  it("menolak bila stok sendiri + titipan + yang masuk melebihi kapasitas", () => {
    expect(cekKapasitas(17_500, 16_000, 1_500).cukup).toBe(true);
    expect(cekKapasitas(17_500, 16_000, 1_500.001).cukup).toBe(false);
    expect(cekKapasitas(17_500, 17_000, 600).sisaKg).toBe(500);
  });
});

describe("jadwal mesin tunggal", () => {
  const at = (jam: number) => new Date(Date.UTC(2026, 2, 1, jam));
  const jadwal = [
    { id: "a", mulai: at(8), selesai: at(12) },
    { id: "b", mulai: at(12), selesai: at(14) },
  ];
  it("tumpang tindih bentrok, menempel tidak", () => {
    expect(bentrok(jadwal[0], { mulai: at(10), selesai: at(13) })).toBe(true);
    expect(bentrok(jadwal[0], jadwal[1])).toBe(false);
    expect(cariBentrok(jadwal, { mulai: at(10), selesai: at(13) }).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("jam kosong pertama melompati jadwal yang berurutan", () => {
    expect(slotKosong(jadwal, 120, at(9)).getTime()).toBe(at(14).getTime());
    expect(slotKosong(jadwal, 120, at(15)).getTime()).toBe(at(15).getTime());
  });
  it("tidak menabrak jadwal berikutnya", () => {
    const j = [...jadwal, { id: "c", mulai: at(15), selesai: at(17) }];
    expect(slotKosong(j, 120, at(13)).getTime()).toBe(at(17).getTime()); // celah 14-15 hanya 1 jam
    expect(slotKosong(j, 60, at(13)).getTime()).toBe(at(14).getTime());
  });
  it("jadwal sendiri diabaikan saat dipindah", () => {
    expect(slotKosong(jadwal, 240, at(8), "a").getTime()).toBe(at(8).getTime()); // bekas tempatnya sendiri kosong
    expect(slotKosong(jadwal, 360, at(8), "a").getTime()).toBe(at(14).getTime()); // 6 jam menabrak jadwal b
  });
});
