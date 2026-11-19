import { describe, expect, it } from "vitest";
import { bisaDiedit, gradeLot, jatuhTempoTermin2, kodePO, lampiranKurang, lampiranWajib, namaPemegang, rincianAjukan, ringkasBatch, rencanaTermin, selisihHarga, sisaBayar, sisaBelumDibagi, tambahHariKerja } from "./pembelian";

describe("rincianAjukan (harga per grade dari grading tuna utuh)", () => {
  const lot = (grade: [string, string, number][]) => ({
    kg: grade.reduce((a, g) => a + g[2], 0), qc: "lulus" as const, grade_id: null, grades: null,
    lot_grades: grade.map(([id, kode, kg]) => ({ grade_id: id, kg, grades: { kode } })),
  });
  it("menjumlah berat per grade dari beberapa lot, total dalam sen", () => {
    const r = rincianAjukan([lot([["a", "A-SO", 200], ["b", "B-SO", 100]]), lot([["a", "A-SO", 100.5]])], { a: 50000, b: 40000.5 });
    expect(r.baris).toEqual([
      { grade_id: "a", kode: "A-SO", kg: 300.5, harga: 50000, jumlah: 15025000 },
      { grade_id: "b", kode: "B-SO", kg: 100, harga: 40000.5, jumlah: 4000050 },
    ]);
    expect(r.total).toBe(19025050);
    expect(r.kg).toBe(400.5);
    expect(r.lengkap).toBe(true);
  });
  it("belum lengkap kalau ada grade tanpa harga", () => {
    const r = rincianAjukan([lot([["a", "A-SO", 10], ["b", "B-SO", 5]])], { a: 1000 });
    expect(r.lengkap).toBe(false);
    expect(r.total).toBe(10000);
  });
  it("lot yang belum digrading nggak ikut", () => {
    expect(rincianAjukan([{ kg: 50, qc: "menunggu", grade_id: null, grades: null, lot_grades: [] }], {}).baris).toEqual([]);
  });
  it("kode PO yang belum terbit", () => {
    expect(kodePO(null)).toBe("Belum terbit");
    expect(kodePO("PO-0001")).toBe("PO-0001");
  });
});

describe("lampiranKurang", () => {
  const aturan = [
    { ref_tabel: "lots" as const, jenis: "foto_timbangan" as const, wajib: true },
    { ref_tabel: "lots" as const, jenis: "nota" as const, wajib: false },
    { ref_tabel: "purchase_orders" as const, jenis: "nota" as const, wajib: true },
  ];
  it("hanya lampiran wajib yang belum ada untuk catatan itu", () => {
    expect(lampiranKurang(aturan, "lots", "l1", [])).toEqual(["foto_timbangan"]);
    expect(lampiranKurang(aturan, "lots", "l1", [{ ref_tabel: "lots", ref_id: "l2", jenis: "foto_timbangan" }])).toEqual(["foto_timbangan"]);
    expect(lampiranKurang(aturan, "lots", "l1", [{ ref_tabel: "lots", ref_id: "l1", jenis: "foto_timbangan" }])).toEqual([]);
  });
  it("wajib atau opsional per jenis catatan", () => {
    expect(lampiranWajib(aturan, "purchase_orders", "nota")).toBe(true);
    expect(lampiranWajib(aturan, "lots", "nota")).toBe(false);
  });
});

describe("namaPemegang", () => {
  it("peran beserta nama akun, peran tanpa akun cukup namanya", () => {
    expect(namaPemegang([
      { aksi: "persetujuan.setuju", role_id: "owner", role_nama: "Owner", nama: "Budi" },
      { aksi: "persetujuan.setuju", role_id: "finance", role_nama: "Finance", nama: "" },
      { aksi: "nota.susulan", role_id: "finance", role_nama: "Finance", nama: "" },
    ], "persetujuan.setuju")).toBe("Owner (Budi), Finance");
  });
});

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

describe("termin bayar nelayan (50% + sisanya paling lambat 10 hari kerja)", () => {
  it("dibagi dua pas, sen ganjil masuk termin 2", () => {
    expect(rencanaTermin(23_200_000)).toEqual({ pertama: 11_600_000, kedua: 11_600_000 });
    expect(rencanaTermin(100.01)).toEqual({ pertama: 50.01, kedua: 50 });
    const r = rencanaTermin(19_000_000.03);
    expect(Math.round((r.pertama + r.kedua) * 100)).toBe(1_900_000_003);
  });
  it("10 hari kerja melompati Sabtu dan Minggu", () => {
    expect(tambahHariKerja("2026-11-19", 10)).toBe("2026-12-03"); // Kamis -> Kamis dua minggu kemudian
    expect(tambahHariKerja("2026-11-21", 1)).toBe("2026-11-23"); // Sabtu -> Senin
    expect(tambahHariKerja("2026-11-20", 1)).toBe("2026-11-23"); // Jumat -> Senin
  });
  it("jatuh tempo dari pembayaran pertama yang nggak batal", () => {
    expect(jatuhTempoTermin2([], 100)).toBeNull();
    expect(jatuhTempoTermin2([{ tanggal: "2026-11-19" }], 0)).toBeNull();
    expect(jatuhTempoTermin2([{ tanggal: "2026-11-17", batal: true }, { tanggal: "2026-11-19" }], 100)).toBe("2026-12-03");
  });
});
