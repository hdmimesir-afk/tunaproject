import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buatBukuExcel } from "./excel";

async function bolakBalik(wb: ExcelJS.Workbook) {
  const data = await wb.xlsx.writeBuffer();
  const baca = new ExcelJS.Workbook();
  await baca.xlsx.load(data);
  return baca.getWorksheet("Laporan")!;
}

describe("buatBukuExcel", () => {
  const laporan = {
    judul: "Buku kas",
    keterangan: "4 Nov 2026",
    bagian: [{
      kolom: [{ judul: "Uraian" }, { judul: "Berat (kg)", jenis: "kg" as const }, { judul: "Rupiah", jenis: "rupiah" as const }],
      baris: [["=1+1", 1.5, "2500.5"], ["TOTAL", 1.5, 2500.5]],
      tebal: [1],
    }],
  };

  it("menyimpan angka sebagai angka dengan format, bukan teks", async () => {
    const ws = await bolakBalik(await buatBukuExcel(laporan));
    const r = ws.getRow(5);
    expect(r.getCell(2).value).toBe(1.5);
    expect(r.getCell(2).numFmt).toBe("#,##0.000");
    expect(r.getCell(3).value).toBe(2500.5);
  });

  it("teks yang mirip rumus tetap teks", async () => {
    const ws = await bolakBalik(await buatBukuExcel(laporan));
    expect(ws.getRow(5).getCell(1).value).toBe("=1+1");
    expect(ws.getRow(5).getCell(1).formula).toBeUndefined();
  });

  it("siap cetak: A4 mendatar, muat selebar kertas, kepala berulang dan beku", async () => {
    const ws = await bolakBalik(await buatBukuExcel(laporan));
    expect(ws.pageSetup.paperSize).toBe(9);
    expect(ws.pageSetup.orientation).toBe("landscape");
    expect(ws.pageSetup.fitToWidth).toBe(1);
    expect(ws.pageSetup.fitToHeight).toBe(0);
    expect(ws.pageSetup.printTitlesRow).toBe("4:4");
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 4 });
  });

  it("beberapa bagian ditulis berurutan tanpa pembekuan", async () => {
    const ws = await bolakBalik(await buatBukuExcel({
      judul: "Laporan",
      bagian: [
        { judul: "Satu", ringkas: ["Ringkas"], kolom: [{ judul: "A" }], baris: [["x"]] },
        { judul: "Dua", kolom: [{ judul: "B" }, { judul: "C" }], baris: [["y", "z"]] },
      ],
    }));
    const kolomA = ws.getColumn(1).values.filter(Boolean);
    expect(kolomA).toEqual(["Laporan", "Satu", "Ringkas", "A", "x", "Dua", "B", "y"]);
    expect(ws.views?.[0]?.state).not.toBe("frozen");
  });
});
