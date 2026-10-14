import { C, txt, rect, ln, chip, kpi, hbars, table, bullets, mockWindow, illustrative } from "@/lib/kit";
import type { El } from "@/lib/scene";
import { mk, std } from "./_h";

/** Right-hand explanation column shared by the four problem → solution slides. */
const side = (title: string, items: string[]): El[] => [
  txt(1320, 276, 480, 44, title, 30, { color: C.ink, va: "m", lh: 1, weight: 800 }),
  bullets(1320, 340, 480, 580, items, 24, { para: 20, lh: 1.35 }),
];
const SRC = "Data nyata Siklus 1 (3 Okt 2026) dari owner Katalis; belum diperiksa pihak lain.";

/* ---------------- 29 ONGKOS KIRIM ---------------- */
const kw = mockWindow(120, 276, 1160, 664, { title: "Contoh tampilan · Biaya kirim" });
const ki = kw.inner;
export const s29 = mk(
  29,
  "Ongkos kirim terlihat jelas",
  [
    ...std(29, "Pembelian & biaya kirim", "Ongkos kirim terlihat jelas, jadi bisa ditekan", SRC + " Peringatan hanya contoh."),
    ...kw.els,
    txt(ki.x + 24, ki.y + 14, 700, 36, "Biaya Siklus 1 (3 Oktober 2026)", 24, { color: C.navy, va: "m", lh: 1 }),
    ...kpi(ki.x + 24, ki.y + 62, 360, 112, "Ongkos kirim", "Rp11,08 jt", "29,9% dari seluruh biaya", { valSize: 32 }),
    ...kpi(ki.x + 400, ki.y + 62, 360, 112, "Per kg loin", "± Rp36.800", "ongkos kirim dibagi loin", { valSize: 32 }),
    ...kpi(ki.x + 776, ki.y + 62, 358, 112, "Bila tarif turun ke Rp29.500", "Hemat ± Rp1.840", "per kg loin (dari Rp31.000)", { valSize: 30 }),
    ...hbars(ki.x + 24, ki.y + 204, ki.w - 48, [
      { label: "Ikan utuh", value: 22126000, text: "Rp22,13 jt · 59,7%", color: C.ocean },
      { label: "Ongkos kirim", value: 11080029, text: "Rp11,08 jt · 29,9%", color: C.navy },
      { label: "Penanganan", value: 1846568, text: "Rp1,85 jt · 5,0%", color: C.faint },
      { label: "Kemasan", value: 1820085, text: "Rp1,82 jt · 4,9%", color: C.faint },
      { label: "Jasa", value: 200000, text: "Rp0,20 jt · 0,5%", color: C.faint },
    ], { rowH: 52, labelW: 240, valW: 240, size: 21, barH: 26 }),
    rect(ki.x + 24, ki.y + 490, ki.w - 48, 100, C.aqua, { r: 16 }),
    ...chip(ki.x + 44, ki.y + 510, "Contoh peringatan", { fill: C.white, color: C.ink, size: 17, h: 34 }).els,
    txt(ki.x + 44, ki.y + 550, ki.w - 90, 34, "Ongkos kirim per kg lebih tinggi dari sebelumnya.", 21, { color: C.ink, va: "m", lh: 1.1 }),
    ...side("Yang dilakukan fitur ini", [
      "Catat ongkos kirim tiap kiriman",
      "Bandingkan tarif lama dan baru",
      "Peringatan bila ongkos naik",
    ]),
  ],
  "Ongkos kirim (kargo) adalah 29,9% dari biaya Siklus 1; tim Katalis sedang menegosiasikan tarif dari Rp31.000 ke Rp29.500 per kg kotor (hemat sekitar Rp1.840 per kg loin). Ongkos kirim per kg loin dihitung 11.080.029 / 300,94 kg = sekitar Rp36.800. Peringatan hanya contoh.",
  [
    { kind: "source", ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "Biaya Rp37.072.682: ikan utuh 22.126.000 (59,7%), kargo 11.080.029 (29,9%), penanganan 1.846.568 (5,0%), kemasan 1.820.085 (4,9%), jasa 200.000 (0,5%); tarif kargo Rp29.500/kg kotor dari Rp31.000 menghemat sekitar Rp1.840 per kg loin" },
    { kind: "derived", ref: "Dihitung", claim: "Ongkos kirim per kg loin ± Rp36.800 (11.080.029 / 300,94)" },
  ],
);

/* ---------------- 30 HASIL TIAP EKOR ---------------- */
const fish: [string, number, number][] = [
  ["001", 44, 63.1], ["002", 55, 61.3], ["003", 39, 61.4], ["004", 58, 63.7], ["005", 27, 52.2], ["006", 64, 64.4],
  ["007", 23, 70.2], ["008", 34, 63.5], ["009", 59, 63.3], ["010", 42, 63.3], ["011", 36, 60.2],
];
const fw = mockWindow(120, 276, 1160, 664, { title: "Contoh tampilan · Hasil tiap ekor" });
const fi = fw.inner;
const px0 = fi.x + 90, pw = fi.w - 150, slot = pw / fish.length, base = fi.y + 480, k = 5; // 5 px per %
export const s30 = mk(
  30,
  "Hasil tiap ekor",
  [
    ...std(30, "Produksi · hasil per ekor", "Hasil tiap ekor terlihat, jadi beli ikan lebih tepat", SRC),
    ...fw.els,
    txt(fi.x + 24, fi.y + 14, 700, 36, "Hasil olahan 11 ekor ikan, Siklus 1", 24, { color: C.navy, va: "m", lh: 1 }),
    ...chip(fi.x + fi.w - 24 - 250, fi.y + 16, "Rata-rata 62,6%", { fill: C.cont, color: C.ink, size: 18, h: 36, w: 250 }).els,
    ...[0, 20, 40, 60, 80].flatMap((p): El[] => [
      ln(px0 - 10, base - p * k, px0 + pw, base - p * k, "#E1E1E1", 1.5),
      txt(fi.x + 24, base - p * k - 14, 60, 28, p + "%", 17, { color: C.faint, align: "r", va: "m", lh: 1 }),
    ]),
    ...fish.flatMap(([id, kg, y], i): El[] => {
      const bx = px0 + i * slot + (slot - 56) / 2;
      const low = y < 60;
      return [
        rect(bx, base - y * k, 56, y * k, low ? C.faint : C.ocean, { r: 6 }),
        txt(bx - 20, base - y * k - 32, 96, 28, String(y).replace(".", ",") + "%", 19, { color: C.navy, align: "c", va: "m", lh: 1 }),
        txt(bx - 20, base + 8, 96, 26, id, 17, { color: C.muted, align: "c", va: "m", lh: 1 }),
        txt(bx - 20, base + 34, 96, 26, kg + " kg", 17, { color: C.muted, align: "c", va: "m", lh: 1 }),
      ];
    }),
    ln(px0 - 10, base - 60 * k, px0 + pw, base - 60 * k, C.navy, 2.5, { dash: true }),
    ...chip(fi.x + fi.w - 24 - 250 - 280, fi.y + 16, "Garis putus: rencana 60%", { fill: C.white, color: C.ink, size: 18, h: 36, w: 270, line: C.border }).els,
    ...side("Yang bisa Anda lihat", [
      "Terendah: ekor 005, 52,2%",
      "Tertinggi: ekor 007, 70,2%",
      "Ikan di atas 37 kg cenderung mutu B",
    ]),
  ],
  "Data nyata Siklus 1: hasil olahan per ekor 63,1; 61,3; 61,4; 63,7; 52,2; 64,4; 70,2; 63,5; 63,3; 63,3; 60,2 persen untuk ikan 44, 55, 39, 58, 27, 64, 23, 34, 59, 42, 36 kg. Rencana 60%. Catatan 'ikan di atas 37 kg cenderung menghasilkan grade B' berasal dari daftar tindak lanjut tim Katalis.",
  [
    { kind: "source", ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "Hasil olahan per ekor: 001 44 kg 63,1%; 002 55 kg 61,3%; 003 39 kg 61,4%; 004 58 kg 63,7%; 005 27 kg 52,2%; 006 64 kg 64,4%; 007 23 kg 70,2%; 008 34 kg 63,5%; 009 59 kg 63,3%; 010 42 kg 63,3%; 011 36 kg 60,2%; rencana 60%; rata-rata 62,6%; ikan di atas 37 kg cenderung menghasilkan grade B" },
  ],
);

/* ---------------- 31 SISA OLAHAN ---------------- */
const sw = mockWindow(120, 276, 1160, 664, { title: "Contoh tampilan · Sisa olahan" });
const si = sw.inner;
export const s31 = mk(
  31,
  "Sisa olahan",
  [
    ...std(31, "Stok & penjualan · sisa olahan", "Sisa olahan tidak terbuang, tapi dicarikan pembeli", SRC + " Daftar calon pembeli hanya contoh."),
    ...sw.els,
    txt(si.x + 24, si.y + 14, 700, 36, "Sisa olahan Siklus 1", 24, { color: C.navy, va: "m", lh: 1 }),
    table(si.x + 24, si.y + 62, [450, 150, 200, 310], ["Sisa olahan", "kg", "Harga/kg", "Status"], [
      ["Toro", "14,00", "30.000", "Terjual"],
      ["Kepala (+ rahang)", "63,00", "5.000", "Terjual"],
      ["Tetelan coklat", "7,00", "18.000", "Terjual"],
      ["Daging kerok", "3,00", "15.000", "Terjual"],
      [{ t: "Tulang tengah dan tetelan hitam", f: C.amberSoft }, { t: "65,00", f: C.amberSoft }, { t: "—", f: C.amberSoft }, { t: "Belum ada pembeli", f: C.amberSoft, c: C.red, b: true }],
    ], { size: 21, rowH: 62, headH: 50, align: ["l", "r", "r", "l"] }),
    rect(si.x + 24, si.y + 452, si.w - 48, 150, C.aqua, { r: 18 }),
    ...illustrative(si.x + si.w - 24 - 190, si.y + 466),
    ...["Catat masuk stok", "Cari pembeli dari daftar", "Jual dan tagih"].flatMap((t, i): El[] => [
      txt(si.x + 48 + i * 366, si.y + 480, 340, 30, String(i + 1) + ". " + t, 22, { color: C.navy, va: "m", lh: 1 }),
      txt(si.x + 48 + i * 366, si.y + 516, 340, 70, ["Tercatat dengan beratnya.", "Dari daftar calon pembeli.", "Yang belum laku diberi tanda."][i], 18, { color: C.muted, lh: 1.3 }),
    ]),
    ...side("Yang dilakukan fitur ini", [
      "Catat semua sisa olahan",
      "Tandai yang belum laku",
      "Simpan daftar calon pembeli",
    ]),
  ],
  "Data nyata Siklus 1: toro 14 kg x Rp30.000; kepala (+rahang) 63 kg x Rp5.000; tetelan coklat 7 kg x Rp18.000; daging kerok 3 kg x Rp15.000 sudah terjual. 65 kg tulang tengah dan tetelan hitam belum laku dan dibuang (tindak lanjut tim Katalis: mencari pembeli). Langkah dan daftar calon pembeli adalah usulan fitur.",
  [
    { kind: "source", ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "Toro 14 kg Rp30.000; kepala (+rahang) 63 kg Rp5.000; tetelan coklat 7 kg Rp18.000; daging kerok 3 kg Rp15.000; 65 kg hasil samping (tulang tengah dan tetelan hitam) belum laku dan dibuang" },
  ],
);

/* ---------------- 32 KELAS MUTU & HARGA ---------------- */
const cw = mockWindow(120, 276, 1160, 664, { title: "Contoh tampilan · Kelas mutu dan harga" });
const ci = cw.inner;
export const s32 = mk(
  32,
  "Kelas mutu dan harga",
  [
    ...std(32, "Mutu & penjualan · kelas dan harga", "Kelas mutu dan harganya tercatat otomatis", SRC),
    ...cw.els,
    txt(ci.x + 24, ci.y + 14, 700, 36, "Loin Siklus 1 per kelas", 24, { color: C.navy, va: "m", lh: 1 }),
    table(ci.x + 24, ci.y + 62, [130, 320, 200, 200, 260], ["Kelas", "Kulit", "kg", "Harga/kg", "Pendapatan (Rp)"], [
      ["A", "Dengan kulit", "—", "—", "—"],
      ["A", "Tanpa kulit", "—", "—", "—"],
      [{ t: "B", f: C.ice }, { t: "Dengan kulit", f: C.ice }, { t: "203,51", f: C.ice }, { t: "140.000", f: C.ice }, { t: "28.491.400", f: C.ice }],
      ["B", "Tanpa kulit", "—", "—", "—"],
      [{ t: "C", f: C.ice }, { t: "Dengan kulit", f: C.ice }, { t: "97,43", f: C.ice }, { t: "125.000", f: C.ice }, { t: "12.178.750", f: C.ice }],
      ["C", "Tanpa kulit", "—", "—", "—"],
    ], { size: 21, rowH: 56, headH: 50, align: ["l", "l", "r", "r", "r"] }),
    txt(ci.x + 24, ci.y + 466, 700, 30, "Porsi loin menurut berat", 20, { color: C.muted, va: "m", lh: 1 }),
    rect(ci.x + 24, ci.y + 504, (ci.w - 48) * 0.676, 54, C.ocean, { r: 10 }),
    rect(ci.x + 24 + (ci.w - 48) * 0.676 + 4, ci.y + 504, (ci.w - 48) * 0.324 - 4, 54, C.faint, { r: 10 }),
    txt(ci.x + 44, ci.y + 504, 500, 54, "Kelas B dengan kulit · 67,6%", 21, { color: C.white, va: "m", lh: 1 }),
    txt(ci.x + 24 + (ci.w - 48) * 0.676 + 24, ci.y + 504, 330, 54, "Kelas C · 32,4%", 21, { color: C.white, va: "m", lh: 1 }),
    txt(ci.x + 24, ci.y + 572, ci.w - 48, 34, "— = belum ada di Siklus 1", 18, { color: C.muted, va: "m", lh: 1 }),
    ...side("Yang dilakukan fitur ini", [
      "Enam kelas tersimpan sekali",
      "Pilih kelas tiap ikan",
      "Untung tiap kelas dihitung otomatis",
    ]),
  ],
  "Data nyata Siklus 1: loin B dengan kulit (B-SO) 203,51 kg x Rp140.000 = Rp28.491.400; loin C dengan kulit (C-SO) 97,43 kg x Rp125.000 = Rp12.178.750. Porsi berat: 67,6% dan 32,4% (dihitung dari 300,94 kg). Kelas lain (A, dan tanpa kulit) tidak ada di Siklus 1. Tim Katalis sudah merinci grade menjadi enam kelas (A, B, C; skin-on dan skinless).",
  [
    { kind: "source", ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "B-SO 203,51 kg x Rp140.000 = Rp28.491.400; C-SO 97,43 kg x Rp125.000 = Rp12.178.750; grade loin dirinci enam kelas (A, B, C; skin-on dan skinless)" },
    { kind: "derived", ref: "Dihitung", claim: "Porsi berat B 67,6%, C 32,4% dari 300,94 kg" },
  ],
);
