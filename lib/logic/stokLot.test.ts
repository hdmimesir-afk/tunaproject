import { describe, expect, it } from "vitest";
import { rincianLot } from "./stokLot";

describe("rincian lot ikan utuh", () => {
  it("belum diolah: semua tersedia", () => {
    expect(rincianLot(10000, 10000, [])).toEqual({ awalKg: 10000, tersediaKg: 10000, sedangKg: 0, selesaiKg: 0, selisihKg: 0, status: "belum" });
  });

  it("produksi sebagian: 6.000 lagi diolah, 4.000 masih tersedia", () => {
    const r = rincianLot(10000, 4000, [{ kg: 6000, status: "berjalan" }]);
    expect(r).toMatchObject({ tersediaKg: 4000, sedangKg: 6000, selesaiKg: 0, selisihKg: 0, status: "sebagian" });
  });

  it("status selesai dan dicek QC masih dihitung sedang, baru selesai setelah disetujui Owner", () => {
    const r = rincianLot(10000, 1000, [
      { kg: 3000, status: "selesai" },
      { kg: 2000, status: "diperiksa_qc" },
      { kg: 4000, status: "diperiksa" },
    ]);
    expect(r).toMatchObject({ tersediaKg: 1000, sedangKg: 5000, selesaiKg: 4000, selisihKg: 0, status: "sebagian" });
  });

  it("semua lagi diolah dan semua selesai", () => {
    expect(rincianLot(500, 0, [{ kg: 500, status: "berjalan" }]).status).toBe("diolah");
    expect(rincianLot(500, 0, [{ kg: 500, status: "diperiksa" }]).status).toBe("habis");
  });

  it("pecahan gram nggak meleset", () => {
    const r = rincianLot(100.5, 0.2, [{ kg: 50.1, status: "berjalan" }, { kg: 50.2, status: "diperiksa" }]);
    expect(r).toMatchObject({ tersediaKg: 0.2, sedangKg: 50.1, selesaiKg: 50.2, selisihKg: 0 });
  });

  it("data yang nggak pas ditandai, bukan ditutupin", () => {
    expect(rincianLot(1000, 300, [{ kg: 600, status: "berjalan" }]).selisihKg).toBe(100);
  });
});
