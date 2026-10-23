import { describe, expect, it } from "vitest";
import { buatCsv, hasilPerEkor, hitungTotal, keGram, nomorLoinBerikut, periksaBaris, tampilKg, type BarisLoin } from "./grid";
import { hitungNeraca } from "./neraca";

const baris = (i: number, kg: string, extra: Partial<BarisLoin> = {}): BarisLoin => ({ id: `id-${i}`, noEkor: "", noLoin: String(i), gradeId: "g1", kg, ...extra });

describe("keGram", () => {
  it("menerima koma dan titik, maksimal tiga desimal", () => {
    expect(keGram("20,123")).toBe(20123);
    expect(keGram("20.123")).toBe(20123);
    expect(keGram("7")).toBe(7000);
    expect(keGram("0,5")).toBe(500);
  });
  it("menolak bukan angka, nol, negatif, dan empat desimal", () => {
    for (const x of ["", "abc", "0", "-1", "1,2345", "1,2,3", "1e3"]) expect(keGram(x)).toBeNull();
  });
});

describe("hitungTotal", () => {
  it("500 loin berdesimal tiga: total tepat tanpa pembulatan", () => {
    const semua = Array.from({ length: 500 }, (_, i) => baris(i + 1, `${10 + (i % 7)},${String((i * 37) % 1000).padStart(3, "0")}`));
    const gramLangsung = semua.reduce((a, b) => a + (keGram(b.kg) ?? 0), 0);
    const t = hitungTotal(semua);
    expect(t.jumlah).toBe(500);
    expect(t.gram).toBe(gramLangsung);
    expect(Number.isInteger(t.gram)).toBe(true);
  });
  it("0,1 + 0,2 tepat 0,3 (tidak ada pecahan biner)", () => {
    expect(hitungTotal([baris(1, "0,1"), baris(2, "0,2")]).gram).toBe(300);
  });
  it("total per grade dan per ekor", () => {
    const t = hitungTotal([baris(1, "10", { noEkor: "1" }), baris(2, "5,5", { noEkor: "1", gradeId: "g2" }), baris(3, "4", { noEkor: "2" })]);
    expect(t.perGrade.get("g1")).toEqual({ jumlah: 2, gram: 14000 });
    expect(t.perGrade.get("g2")).toEqual({ jumlah: 1, gram: 5500 });
    expect(t.perEkor.get("1")).toEqual({ jumlah: 2, gram: 15500 });
  });
  it("baris yang beratnya belum valid tidak dihitung", () => {
    expect(hitungTotal([baris(1, "10"), baris(2, "abc")]).jumlah).toBe(1);
  });
});

describe("neraca Siklus 1", () => {
  it("481 = 300,94 loin + 87 hasil samping + 65 limbah + 28,06 belum jelas", () => {
    const n = hitungNeraca({ masukKg: 481, loinKg: 300.94, hasilSampingKg: 87, limbahKg: 65, susutKg: null });
    expect(n.belumJelasKg).toBe(28.06);
    expect(n.melebihi).toBe(false);
  });
});

describe("periksaBaris", () => {
  it("baris kosong dilewati, baris benar lolos", () => {
    expect(periksaBaris([baris(1, "10"), { id: "k", noEkor: "", noLoin: "", gradeId: "", kg: "" }]).size).toBe(0);
  });
  it("baris baru dari Enter (nomor dan grade terisi, berat kosong) dilewati, tetapi baris tersimpan tanpa berat salah", () => {
    expect(periksaBaris([baris(1, "10"), baris(2, "")]).size).toBe(0);
    expect(periksaBaris([baris(1, "10"), baris(2, "", { versi: 1 })]).get("id-2")?.kg).toBeDefined();
  });
  it("nomor loin ganda ditandai di kedua baris", () => {
    const g = periksaBaris([baris(1, "10"), baris(2, "11", { noLoin: "1" })]);
    expect(g.get("id-1")?.noLoin).toBe("Nomor ganda");
    expect(g.get("id-2")?.noLoin).toBe("Nomor ganda");
  });
  it("grade dan berat wajib", () => {
    const g = periksaBaris([baris(1, "", { gradeId: "" })]);
    expect(g.get("id-1")?.gradeId).toBeDefined();
    expect(g.get("id-1")?.kg).toBeDefined();
  });
});

describe("hasilPerEkor", () => {
  it("loin dibagi berat utuh, satu desimal", () => {
    expect(hasilPerEkor(26000, 40)).toBe(65);
    expect(hasilPerEkor(26000, null)).toBeNull();
  });
});

describe("nomorLoinBerikut dan tampilan", () => {
  it("nomor terbesar ditambah satu", () => {
    expect(nomorLoinBerikut([{ noLoin: "3" }, { noLoin: "10" }, { noLoin: "" }])).toBe("11");
    expect(nomorLoinBerikut([])).toBe("1");
  });
  it("tampilan tiga desimal dengan koma", () => {
    expect(tampilKg(300940)).toBe("300,940");
  });
});

describe("buatCsv", () => {
  it("pakai titik koma dan mengutip sel yang berisi tanda khusus", () => {
    const csv = buatCsv(["No", "Catatan"], [[1, "a;b"], [2, 'bilang "ya"']]);
    expect(csv).toContain('1;"a;b"');
    expect(csv).toContain('2;"bilang ""ya"""');
  });
});
