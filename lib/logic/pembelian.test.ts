import { describe, expect, it } from "vitest";
import { bisaDiedit, gradeLot, ringkasBatch, selisihHarga, sisaBayar, sisaBelumDibagi } from "./pembelian";

describe("gradeLot", () => {
  const a = { kode: "A-SO" }, b = { kode: "B-SO" };
  it("beberapa grade, terberat dulu, yang nol dibuang", () => {
    expect(gradeLot({ kg: 800, qc: "lulus", grade_id: "b", grades: { ...b, nama: "" }, lot_grades: [
      { grade_id: "a", kg: 300, grades: a }, { grade_id: "b", kg: 500, grades: b }, { grade_id: "c", kg: 0, grades: { kode: "C-SO" } },
    ] })).toEqual([{ grade_id: "b", kode: "B-SO", kg: 500 }, { grade_id: "a", kode: "A-SO", kg: 300 }]);
  });
  it("lot lama tanpa rincian memakai grade utama untuk seluruh berat", () => {
    expect(gradeLot({ kg: 1200, qc: "lulus", grade_id: "a", grades: { ...a, nama: "" }, lot_grades: [] })).toEqual([{ grade_id: "a", kode: "A-SO", kg: 1200 }]);
  });
  it("lot ditahan atau menunggu tidak punya grade", () => {
    expect(gradeLot({ kg: 100, qc: "ditahan", grade_id: null, grades: null, lot_grades: [{ grade_id: "a", kg: 0, grades: a }] })).toEqual([]);
  });
});

describe("sisaBelumDibagi", () => {
  it("dihitung dalam gram supaya tidak bergeser", () => {
    expect(sisaBelumDibagi(600, [{ kg: 400.1 }, { kg: 149.2 }])).toBe(50.7);
    expect(sisaBelumDibagi(0.3, [{ kg: 0.1 }, { kg: 0.2 }])).toBe(0);
  });
});

describe("ringkasBatch", () => {
  it("menjumlah dalam sen tanpa selisih pecahan", () => {
    expect(ringkasBatch([{ jumlah: 0.1 }, { jumlah: 0.2 }])).toEqual({ jumlah: 2, total: 0.3 });
    expect(ringkasBatch([{ jumlah: 4_500_000 }, { jumlah: 1_000_000 }, { jumlah: 1_000_000 }])).toEqual({ jumlah: 3, total: 6_500_000 });
  });
  it("kosong menghasilkan nol", () => {
    expect(ringkasBatch([])).toEqual({ jumlah: 0, total: 0 });
  });
});

describe("selisihHarga", () => {
  it("menandai kenaikan harga terhadap acuan", () => {
    const r = selisihHarga(46_000, 45_000);
    expect(r?.naik).toBe(true);
    expect(r?.selisih).toBe(1000);
    expect(Math.round((r?.persen ?? 0) * 10) / 10).toBe(2.2);
  });
  it("harga turun atau sama bukan peringatan", () => {
    expect(selisihHarga(44_000, 45_000)?.naik).toBe(false);
    expect(selisihHarga(45_000, 45_000)?.sama).toBe(true);
  });
  it("tanpa acuan tidak ada perbandingan", () => {
    expect(selisihHarga(45_000, null)).toBeNull();
    expect(selisihHarga(45_000, 0)).toBeNull();
  });
});

describe("sisaBayar", () => {
  it("total dikurangi pembayaran, tidak negatif", () => {
    expect(sisaBayar(4_500_000, 1_000_000)).toBe(3_500_000);
    expect(sisaBayar(4_500_000, 4_500_000)).toBe(0);
    expect(sisaBayar(100, 150)).toBe(0);
  });
});

describe("bisaDiedit", () => {
  it("hanya draf dan perlu revisi", () => {
    expect(bisaDiedit("draf")).toBe(true);
    expect(bisaDiedit("perlu_revisi")).toBe(true);
    expect(bisaDiedit("diajukan")).toBe(false);
    expect(bisaDiedit("disetujui")).toBe(false);
  });
});
