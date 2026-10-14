import { C, header, footer, rect, txt, ln } from "@/lib/kit";
import type { El, Slide, SourceRef } from "@/lib/scene";
import { TOTAL_SLIDES } from "@/data/figures";

/** Outcome-style titles for feature slides. */
const TITLE: Record<number, string> = {
  9: "Dashboard Owner: semua aktivitas usaha terkendali",
  11: "Dari 481 kg ikan sampai untung, semuanya terlihat",
  12: "Asal setiap produk bisa dilacak sampai pembeli",
  13: "Stok sendiri dan barang titipan tidak tercampur",
  14: "Tagihan gudang dingin dan pembekuan dihitung otomatis",
  15: "Pengiriman, tagihan, dan pembayaran terpantau",
  16: "Uang masuk, biaya, dan laba tercatat rapi tiap bulan",
  18: "Jadwal giliran mitra tidak bentrok",
  19: "Bisa coba skenario sebelum mengambil keputusan",
  20: "Tiap orang hanya melihat dan mengubah yang perlu",
};

/** Every feature slide shows, right under the title: the problem and the feature that solves it. */
const PS: Record<number, [string, string]> = {
  9: ["Kondisi usaha tersebar di banyak catatan.", "Satu dashboard, semua terlihat."],
  11: ["Hasil dan biaya satu siklus sulit dilihat.", "Untung tiap siklus tampil otomatis."],
  12: ["Produk bermasalah sulit dilacak.", "Setiap produksi punya kode asal."],
  13: ["Barang titipan bisa tercampur stok sendiri.", "Stok dipisah per pemilik."],
  14: ["Tarif gudang dingin rumit dihitung tangan.", "Tagihan dihitung otomatis."],
  15: ["Berat kirim dan terima bisa beda.", "Tagihan ikut berat diterima."],
  16: ["Biaya kantor belum masuk laporan.", "Biaya usaha ikut laporan bulanan."],
  18: ["Jadwal dua mitra bisa bentrok.", "Kalender memberi tanda lebih awal."],
  19: ["Dampak biaya naik baru terasa setelah terjadi.", "Coba skenario dulu."],
  20: ["Data penting bisa diubah siapa saja.", "Tiap orang hanya akses tugasnya."],
  29: ["Ongkos kirim 29,9% dari biaya.", "Dicatat, dibanding, dan diberi peringatan."],
  30: ["Hasil tiap ekor beda (52% sampai 70%).", "Dicatat per ekor dan ukuran."],
  31: ["65 kg sisa olahan terbuang.", "Dicatat dan dicarikan pembeli."],
  32: ["Enam kelas mutu, harga berbeda.", "Harga mengikuti kelas otomatis."],
};
/** Footer note: only what a reader must know (data source / example). */
const NOTE: Record<number, string> = {
  5: "Data Siklus 1 dan proposal Katalis.",
  6: "Contoh tampilan.",
  9: "Contoh tampilan.",
  11: "Data nyata Siklus 1.",
  12: "Contoh tampilan.",
  13: "Contoh tampilan.",
  14: "Contoh hitungan, bukan tagihan nyata.",
  15: "Contoh tampilan.",
  16: "Contoh tampilan.",
  18: "Angka kapasitas adalah perkiraan.",
  19: "Perkiraan, bukan laba nyata.",
  29: "Data nyata Siklus 1.",
  30: "Data nyata Siklus 1.",
  31: "Data nyata Siklus 1. Daftar pembeli hanya contoh.",
  32: "Data nyata Siklus 1.",
  23: "Harga dibahas setelah fitur disepakati.",
};

const band = (id: number): El[] => {
  const p = PS[id];
  if (!p) return [];
  return [
    rect(120, 164, 5, 84, C.ocean),
    txt(146, 160, 300, 30, "Masalah", 19, { color: C.ocean, weight: 700, va: "m", lh: 1 }),
    txt(146, 192, 790, 56, p[0], 27, { color: C.ink, weight: 500, va: "m", lh: 1.15 }),
    rect(980, 164, 5, 84, C.ocean),
    txt(1006, 160, 300, 30, "Solusi", 19, { color: C.ocean, weight: 700, va: "m", lh: 1 }),
    txt(1006, 192, 790, 56, p[1], 27, { color: C.ink, weight: 800, va: "m", lh: 1.15 }),
  ];
};

export const std = (id: number, kicker: string, title: string, _note?: string): El[] => [
  ...header(kicker, TITLE[id] ?? title),
  ...band(id),
  ...footer(id, TOTAL_SLIDES, NOTE[id], false, kicker),
];

export const mk = (
  id: number,
  title: string,
  els: El[],
  notes: string,
  sources: SourceRef[],
  theme: "light" | "dark" = "light",
): Slide => ({ id, title, theme, els, notes, sources });

export const SRC_LINE = "Sumber: proposal Katalis, 1 Oktober 2026";
export { C };
