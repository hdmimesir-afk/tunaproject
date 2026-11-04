import type { Workbook, Worksheet } from "exceljs";

/* Laporan unduhan berformat .xlsx: judul, kepala tabel berwarna, angka asli yang bisa dijumlahkan,
   dan siap cetak (A4 mendatar, muat selebar kertas, kepala tabel berulang, nomor halaman). */

export type JenisKolom = "teks" | "kg" | "rupiah" | "persen" | "angka";
export type KolomExcel = { judul: string; jenis?: JenisKolom };
export type SelExcel = string | number | null | undefined;
export type BagianExcel = {
  judul?: string;
  ringkas?: string[];
  kolom: KolomExcel[];
  baris: SelExcel[][];
  /** Indeks baris yang ditebalkan, misalnya total. */
  tebal?: number[];
};
export type LaporanExcel = { judul: string; keterangan?: string; bagian: BagianExcel[] };

const FORMAT: Record<Exclude<JenisKolom, "teks">, string> = {
  kg: "#,##0.000",
  rupiah: "#,##0.00",
  persen: '0.0"%"',
  angka: "#,##0",
};
const INK = "FF00171F";
const GARIS = { style: "thin", color: { argb: "FFD5D8DF" } } as const;
const LEBAR_MIN = 10;
const LEBAR_MAKS = 48;

function isiSel(sel: SelExcel, jenis: JenisKolom) {
  if (sel === null || sel === undefined || sel === "") return null;
  if (jenis === "teks") return String(sel);
  const n = Number(sel);
  return Number.isFinite(n) ? n : String(sel);
}

function tulisBagian(ws: Worksheet, b: BagianExcel, tunggal: boolean, lebar: number[]) {
  if (b.judul) {
    const r = ws.addRow([b.judul]);
    r.font = { bold: true, size: 12, color: { argb: INK } };
  }
  for (const t of b.ringkas ?? []) ws.addRow([t]);
  if (b.kolom.length === 0) return;

  const kepala = ws.addRow(b.kolom.map((k) => k.judul));
  kepala.height = 22;
  kepala.eachCell((c, i) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    c.alignment = { vertical: "middle", wrapText: true, horizontal: (b.kolom[i - 1].jenis ?? "teks") === "teks" ? "left" : "right" };
    c.border = { top: GARIS, left: GARIS, bottom: GARIS, right: GARIS };
    lebar[i - 1] = Math.max(lebar[i - 1] ?? 0, String(c.value).length + 2);
  });
  if (tunggal) {
    ws.views = [{ state: "frozen", ySplit: kepala.number }];
    ws.pageSetup.printTitlesRow = `${kepala.number}:${kepala.number}`;
    if (b.baris.length > 0) ws.autoFilter = { from: { row: kepala.number, column: 1 }, to: { row: kepala.number, column: b.kolom.length } };
  }

  b.baris.forEach((isi, indeks) => {
    const r = ws.addRow(b.kolom.map((k, i) => isiSel(isi[i], k.jenis ?? "teks")));
    const tebal = b.tebal?.includes(indeks);
    b.kolom.forEach((k, i) => {
      const c = r.getCell(i + 1);
      const jenis = k.jenis ?? "teks";
      if (jenis !== "teks") c.numFmt = FORMAT[jenis];
      c.alignment = { vertical: "top", wrapText: jenis === "teks", horizontal: jenis === "teks" ? "left" : "right" };
      c.border = { top: GARIS, left: GARIS, bottom: GARIS, right: GARIS };
      if (tebal) {
        c.font = { bold: true };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F3F7" } };
      }
      const panjang = c.value === null ? 0 : jenis === "teks" ? String(c.value).length : Number(c.value).toLocaleString("id-ID", { maximumFractionDigits: 3 }).length + 3;
      lebar[i] = Math.max(lebar[i] ?? 0, panjang + 2);
    });
  });
}

/** Menyusun buku kerja. Dipisah dari unduhan supaya bisa diuji tanpa peramban. */
export async function buatBukuExcel(l: LaporanExcel): Promise<Workbook> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "KATALIS ERP";
  wb.created = new Date();
  const ws = wb.addWorksheet("Laporan", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
    headerFooter: { oddFooter: "&L&A&RHalaman &P dari &N" },
  });

  const judul = ws.addRow([l.judul]);
  judul.font = { bold: true, size: 15, color: { argb: INK } };
  judul.height = 24;
  if (l.keterangan) ws.addRow([l.keterangan]).font = { color: { argb: "FF6B7280" } };
  ws.addRow([]);

  const lebar: number[] = [];
  const tunggal = l.bagian.length === 1;
  l.bagian.forEach((b, i) => {
    if (i > 0) ws.addRow([]);
    tulisBagian(ws, b, tunggal, lebar);
  });
  lebar.forEach((n, i) => { ws.getColumn(i + 1).width = Math.min(LEBAR_MAKS, Math.max(LEBAR_MIN, n)); });
  return wb;
}

const namaAman = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-");

/** Menyusun laporan dan mengunduhnya di peramban sebagai berkas .xlsx. Pustakanya dimuat saat tombol ditekan. */
export async function unduhExcel(namaBerkas: string, laporan: LaporanExcel) {
  const wb = await buatBukuExcel(laporan);
  const data = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${namaAman(namaBerkas)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
