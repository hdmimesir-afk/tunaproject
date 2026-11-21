import { IMPOR, teksSel, type BarisMentah, type JenisImpor } from "./imporMaster";

/* Baca dan bikin file Excel buat upload data master. Jalan di browser; exceljs baru dimuat pas dipakai. */

export const MAKS_UKURAN = 5 * 1024 * 1024;
const INK = "FF00171F";

/** Baca lembar pertama: baris pertama yg ada isinya = judul kolom, sisanya data. */
export async function bacaExcel(file: File): Promise<{ judul: string[]; rows: BarisMentah[] }> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Filenya harus .xlsx. Kalo dari Excel lama (.xls) atau CSV, simpan ulang jadi .xlsx dulu.");
  if (file.size > MAKS_UKURAN) throw new Error("Filenya kegedean, maksimal 5 MB.");
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error("Filenya nggak kebaca. Pastiin filenya Excel (.xlsx) yg nggak rusak atau dikunci password.");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Filenya nggak punya lembar (sheet).");
  let judul: string[] | null = null;
  const rows: BarisMentah[] = [];
  const lebar = ws.columnCount;
  ws.eachRow({ includeEmpty: false }, (row, no) => {
    const sel = Array.from({ length: lebar }, (_, i) => teksSel(row.getCell(i + 1).value));
    if (judul === null) {
      if (sel.some((s) => s.trim() !== "")) judul = sel;
      return;
    }
    rows.push({ no, sel });
  });
  if (!judul) throw new Error("Filenya kosong.");
  return { judul, rows };
}

/** Template: lembar data (judul kolom + satu contoh) dan lembar petunjuk. */
export async function unduhTemplate(jenis: JenisImpor) {
  const { default: ExcelJS } = await import("exceljs");
  const cfg = IMPOR[jenis];
  const wb = new ExcelJS.Workbook();
  wb.creator = "KATALIS ERP";
  const ws = wb.addWorksheet(cfg.label);
  ws.columns = cfg.kolom.map((c) => ({ header: c.judul + (c.wajib ? " (wajib)" : ""), key: c.k, width: Math.max(16, c.judul.length + 10) }));
  const kepala = ws.getRow(1);
  kepala.font = { bold: true, color: { argb: "FFFFFFFF" } };
  kepala.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  // Kolom teks (kontak dll) diformat teks biar angka 0 di depan nggak ilang.
  cfg.kolom.forEach((c, i) => {
    if (c.k !== "tempo_hari" && c.k !== "stok_minimum") ws.getColumn(i + 1).numFmt = "@";
  });
  // Contoh ditaruh di lembar Petunjuk, bukan di lembar data, biar nggak ikut ke-upload kalau lupa dihapus.
  const p = wb.addWorksheet("Petunjuk");
  p.columns = [{ header: "Kolom", key: "a", width: 24 }, { header: "Contoh", key: "c", width: 24 }, { header: "Cara isi", key: "b", width: 80 }];
  p.getRow(1).font = { bold: true };
  for (const c of cfg.kolom) p.addRow({ a: c.judul, c: c.contoh, b: c.keterangan });
  p.addRow({});
  p.addRow({ a: "Catatan", b: "Isi data mulai baris ke 2 di lembar pertama, di bawah judul kolom." });
  p.addRow({ a: "", b: "Urutan kolom boleh diubah, yg penting judulnya sama. Baris kosong dilewati." });
  p.addRow({ a: "", b: "Sebelum disimpan, sistem nampilin pratinjau dulu. Kalo ada baris yg salah, nggak ada yg disimpan." });
  const data = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `template-${cfg.label.toLowerCase().replace(/\s+/g, "-")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
