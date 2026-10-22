import { describe, expect, it } from "vitest";
import { formatKg, formatPct, hitungNeraca } from "./neraca";

/* Angka nyata Siklus 1 dari owner: 481 kg ikan, 300,94 kg loin, 87 kg hasil samping terjual,
   65 kg tulang tengah dan tetelan hitam dibuang, susut belum ditimbang. */
const siklus1 = { masukKg: 481, loinKg: 300.94, hasilSampingKg: 87, limbahKg: 65, susutKg: null };

describe("hitungNeraca", () => {
  it("Siklus 1: 28,06 kg belum jelas (5,8%) dan hasil 62,6%", () => {
    const n = hitungNeraca(siklus1);
    expect(n.belumJelasKg).toBe(28.06);
    expect(formatPct(n.belumJelasPct)).toBe("5,8");
    expect(formatPct(n.hasilPct)).toBe("62,6");
    expect(n.melebihi).toBe(false);
    expect(n.perluDiperiksa).toBe(false);
    expect(n.diAtasRencana).toBe(true);
  });

  it("susut yang belum ditimbang tetap null, bukan nol", () => {
    expect(hitungNeraca(siklus1).susutKg).toBeNull();
  });

  it("tidak menggeser angka desimal tiga digit", () => {
    const n = hitungNeraca({ masukKg: 0.3, loinKg: 0.1, hasilSampingKg: 0.1, limbahKg: 0.05, susutKg: 0.049 });
    expect(n.belumJelasKg).toBe(0.001);
  });

  it("menandai total timbangan yang melebihi ikan masuk", () => {
    expect(hitungNeraca({ ...siklus1, susutKg: 30 }).melebihi).toBe(true);
  });

  it("hasil di luar 40-80% perlu diperiksa, tidak ditolak", () => {
    const n = hitungNeraca({ masukKg: 100, loinKg: 35, hasilSampingKg: 20, limbahKg: 10, susutKg: 5 });
    expect(n.perluDiperiksa).toBe(true);
    expect(n.melebihi).toBe(false);
  });
});

describe("format", () => {
  it("memakai koma desimal Indonesia", () => {
    expect(formatKg(300.94)).toBe("300,94");
    expect(formatKg(28.06)).toBe("28,06");
  });
});
