import { C, txt, rect, ell, ln, card, chip, badge, kpi, bars, hbars, lineChart, table, stepRow, bullets, section, mockWindow, illustrative, rp, jt, pct } from "@/lib/kit";
import type { El } from "@/lib/scene";
import { SRC } from "@/data/figures";
import { mk, std, SRC_LINE } from "./_h";

const NAV = ["Dashboard", "Pengadaan", "Produksi", "Mutu & Asal", "Stok", "Penjualan", "Keuangan", "Gudang Dingin", "Perencanaan", "Coba Skenario", "Admin"];

/* ---------------- 08 MODULE ECOSYSTEM ---------------- */
type Grp = "Keputusan" | "Operasi" | "Keuangan" | "Kontrol";
const grpColor: Record<Grp, string> = { Keputusan: C.navy, Operasi: C.ocean, Keuangan: C.teal, Kontrol: C.faint };
const mods: [string, string, string, Grp][] = [
  ["01", "Dashboard Owner", "Semua aktivitas, angka penting, persetujuan, dan peringatan di satu layar", "Keputusan"],
  ["02", "Pembelian & Pemasok", "Penerimaan tiap ekor, timbang, ongkos kirim, dan utang ke pemasok", "Operasi"],
  ["03", "Produksi & Pengolahan", "Hasil per ekor dan ukuran, enam kelas mutu, susut, dan biaya produksi", "Operasi"],
  ["04", "Mutu & Asal Produk", "Cek mutu, status lolos atau tidak, dan jejak asal produk", "Operasi"],
  ["05", "Stok & Gudang", "Stok loin dan sisa olahan per lokasi, lama simpan, dan barang titipan", "Operasi"],
  ["06", "Penjualan & Pengiriman", "Harga tiap kelas, pengiriman, tagihan, piutang, dan jual sisa olahan", "Operasi"],
  ["07", "Keuangan & Biaya Produk", "Biaya siklus dan biaya usaha, biaya tiap produk, dan tutup buku bulanan", "Keuangan"],
  ["08", "Gudang Dingin & Pembekuan", "Pesan tempat, tarif otomatis, dan catatan suhu", "Operasi"],
  ["09", "Jadwal & Kapasitas", "Kalender giliran mitra dan kapasitas mesin", "Operasi"],
  ["10", "Perkiraan Laba & Kas", "Coba skenario tanpa mengubah data nyata", "Keputusan"],
  ["11", "Akses & Persetujuan", "Siapa boleh apa, persetujuan, dan riwayat perubahan", "Kontrol"],
];
export const s08 = mk(
  8,
  "Ekosistem 11 fitur KATALIS ERP",
  [
    ...std(8, "Ekosistem fitur", "Sebelas fitur yang saling terhubung", "Isi tiap paket ada di slide 23. Fitur 10 hanya ada di paket Penuh."),
    ...mods.flatMap(([n, t, d, g], i): El[] => {
      const w = (1680 - 3 * 24) / 4;
      const x = 120 + (i % 4) * (w + 24);
      const y = 262 + Math.floor(i / 4) * 206;
      return [
        card(x, y, w, 188, i === 0 ? { fill: C.ice } : {}),
        rect(x, y + 20, 6, 148, grpColor[g], { r: 3 }),
        txt(x + 28, y + 16, 80, 40, n, 32, { bold: true, color: grpColor[g], va: "m", lh: 1 }),
        txt(x + 28, y + 62, w - 48, 58, t, 23, { bold: true, color: C.navy, lh: 1.18 }),
        txt(x + 28, y + 124, w - 48, 56, d, 18, { color: C.muted, lh: 1.3 }),
      ];
    }),
    ...(["Keputusan", "Operasi", "Keuangan", "Kontrol"] as Grp[]).flatMap((g, i): El[] => [
      rect(120 + i * 250, 890, 20, 20, grpColor[g], { r: 4 }),
      txt(150 + i * 250, 884, 200, 32, g, 20, { color: C.muted, va: "m", bold: true, lh: 1 }),
    ]),
  ],
  "Peta seluruh fitur. Warna menunjukkan fungsi: keputusan, operasi, keuangan, dan kontrol. Setiap fitur dibahas pada slide berikutnya.",
  [{ kind: "proposed", ref: "Brief — Part C (Fitur 01–12)", claim: "Daftar dan nama 11 fitur ERP (fitur investor dikeluarkan)" }],
);

/* ---------------- 09 EXECUTIVE DASHBOARD ---------------- */
const dm = mockWindow(120, 262, 1230, 690, { title: "Contoh tampilan · Dashboard owner", nav: NAV, active: 0, sidebarW: 200 });
const di = dm.inner;
const kw = (di.w - 40 - 3 * 14) / 4;
const cc = SRC.contribMod;
export const s09 = mk(
  9,
  "Dashboard Owner",
  [
    ...std(9, "Dashboard Owner", "Satu layar untuk membaca kesehatan seluruh bisnis", "Ini contoh tampilan. Semua angka hanya contoh; grafik memakai angka skenario sedang dari proposal , bukan data nyata."),
    ...dm.els,
    txt(di.x + 20, di.y + 12, 400, 40, "Dashboard Owner", 26, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...chip(di.x + 330, di.y + 16, "Bulan ini", { fill: C.ice, color: C.navy, size: 16, h: 32, w: 100 }).els,
    ...chip(di.x + 442, di.y + 16, "Minggu", { fill: C.white, line: C.border, color: C.muted, size: 16, h: 32, bold: false, w: 90 }).els,
    ...chip(di.x + 544, di.y + 16, "Hari ini", { fill: C.white, line: C.border, color: C.muted, size: 16, h: 32, bold: false, w: 90 }).els,
    ...illustrative(di.x + di.w - 200, di.y + 16),
    ...[
      ["Uang tersedia", "Rp1,37 miliar", "pembelian ikan", C.teal],
      ["Untung setelah biaya", "Rp493,9 jt", "perkiraan bulan ini", C.ocean],
      ["Piutang pembeli", "Rp402 jt", "2 tagihan jatuh tempo", C.amber],
      ["Nilai stok", "Rp628 jt", "per produksi & lokasi", C.navy],
    ].flatMap(([l, v, s, a], i) => kpi(di.x + 20 + i * (kw + 14), di.y + 64, kw, 116, l, v, s, { accent: a, valSize: 27 })),
    // contribution chart (source figures, moderate scenario)
    card(di.x + 20, di.y + 196, 988, 250, { r: 10 }),
    txt(di.x + 36, di.y + 204, 460, 28, "Untung tiap usaha, Rp juta (skenario sedang)", 18, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...bars(di.x + 40, di.y + 236, 948, 206, [
      { label: "Natural", value: cc.naturalFresh, text: "190,7", color: C.navy },
      { label: "CV DUS", value: cc.dus, text: "149,2", color: C.ocean },
      { label: "CO segar", value: cc.coFresh, text: "59,6", color: C.ocean },
      { label: "Gudang", value: cc.coldStorage, text: "40,5", color: C.teal },
      { label: "Beku", value: cc.coFrozenSmall, text: "29,0", color: C.teal },
      { label: "ABF", value: cc.abf, text: "25,0", color: C.teal },
    ], { barW: 90, valSize: 18, labelSize: 18, labelH: 32 }),
    card(di.x + 20, di.y + 462, 560, 170, { r: 10 }),
    txt(di.x + 36, di.y + 470, 520, 28, "Peringatan harian", 18, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...[
      ["Gudang dingin hampir penuh (88%)", C.amber, C.amberSoft, "Kapasitas"],
      ["Tagihan jatuh tempo 3 hari", C.red, C.redSoft, "Piutang"],
      ["Suhu ruang pendingin di atas batas", C.red, C.redSoft, "Suhu"],
    ].flatMap(([m, c, f, tag], i): El[] => [
      rect(di.x + 36, di.y + 506 + i * 40, 522, 34, f, { r: 6 }),
      txt(di.x + 48, di.y + 506 + i * 40, 360, 34, m, 17, { va: "m", color: C.ink, lh: 1 }),
      txt(di.x + 440, di.y + 506 + i * 40, 106, 34, tag, 15, { va: "m", align: "r", color: c, bold: true, lh: 1 }),
    ]),
    card(di.x + 594, di.y + 462, 414, 170, { r: 10 }),
    txt(di.x + 610, di.y + 470, 380, 28, "Lama belum dibayar, Rp juta", 18, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...hbars(di.x + 610, di.y + 504, 384, [
      { label: "0–7 hari", value: 210, text: "210", color: C.teal },
      { label: "8–14 hari", value: 130, text: "130", color: C.ocean },
      { label: "> 14 hari", value: 62, text: "62", color: C.amber },
    ], { rowH: 40, labelW: 110, valW: 60, size: 16, barH: 18 }),
    // right panel
    ...section(1392, 262, 408, "Yang bisa Anda kontrol"),
    bullets(1392, 316, 408, 560, [
      "Semua aktivitas dalam satu layar",
      "Persetujuan yang menunggu keputusan Anda",
      "Peringatan sebelum jadi masalah",
      "Hasil nyata dibanding rencana",
      "Lihat harian, mingguan, dan bulanan",
      "Tampilan ringkas tiap peran, dengan akses terbatas",
      "Unduh laporan ke Excel dan PDF",
    ], 22, { para: 14, lh: 1.3 }),
  ],
  "Mockup ringkasan usaha. Yang bersumber dari proposal: grafik sisa setelah biaya produk per jenis usaha (skenario moderat). Angka lain adalah ilustrasi tata letak.",
  [
    { kind: "proposed", ref: "Brief — Fitur 01", claim: "Fitur ringkasan, angka penting usaha, ekspor Excel/PDF, tampilan per peran" },
    { kind: "source", ref: "Proposal hlm. 10", claim: "Kontribusi bulanan moderat per jenis usaha: Natural Rp190.666.667; CO segar Rp59.583.333; frozen Rp29.000.000; CS Rp40.500.000; ABF Rp25.000.000; DUS Rp149.175.000" },
    { kind: "source", ref: "Proposal hlm. 16", claim: "Kas pembelian ikan Rp1.367.500.000" },
    { kind: "illustrative", ref: "Mockup", claim: "Piutang, nilai stok, tren selisih jual dan biaya, peringatan, dan aging adalah data ilustratif" },
  ],
);

/* ---------------- 10 PROCUREMENT ---------------- */
const pm = mockWindow(120, 410, 1010, 530, { title: "Contoh tampilan · Penerimaan ikan" });
const pi = pm.inner;
export const s10 = mk(
  10,
  "Pembelian & Pemasok",
  [
    ...std(10, "Pembelian & Pemasok", "Dari minta beli sampai bayar pemasok, satu alur"),
    ...stepRow(120, 262, 1680, 104, [
      { title: "Permintaan", sub: "Kebutuhan bahan" },
      { title: "Pesanan beli", sub: "Harga/kg, pemasok" },
      { title: "Persetujuan", sub: "Transaksi besar" },
      { title: "Penerimaan", sub: "Timbang & jenis" },
      { title: "Mutu awal", sub: "Lolos / Ditahan" },
      { title: "Stok & utang", sub: "Tercatat otomatis" },
    ], { numbered: false, size: 23, subSize: 19, gap: 36, titleH: 36 }),
    ...pm.els,
    txt(pi.x + 20, pi.y + 12, 500, 36, "Penerimaan ikan", 24, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...illustrative(pi.x + pi.w - 190, pi.y + 14),
    table(pi.x + 20, pi.y + 62, [150, 190, 120, 140, 180, 150], ["Kode", "Pemasok", "Berat (kg)", "Harga/kg", "Nilai", "Mutu awal"], [
      [{ t: "RCV-0001" }, "[Pemasok A]", "1.520", "Rp45.000", "Rp68.400.000", { t: "Lolos", c: C.teal, b: true }],
      [{ t: "RCV-0002" }, "[Pemasok B]", "1.480", "Rp45.000", "Rp66.600.000", { t: "Lolos", c: C.teal, b: true }],
      [{ t: "RCV-0003" }, "[Pemasok A]", "640", "Rp45.500", "Rp29.120.000", { t: "Ditahan", c: C.amber, b: true }],
    ], { size: 18, rowH: 52, headH: 46, align: ["l", "l", "r", "r", "r", "l"] }),
    ...kpi(pi.x + 20, pi.y + 320, 296, 112, "Total diterima", "3.640 kg", "3 penerimaan, 2 pemasok", { valSize: 30 }),
    ...kpi(pi.x + 332, pi.y + 320, 316, 112, "Nilai pembelian", "Rp164,1 jt", "belum termasuk penanganan", { valSize: 30, accent: C.ocean }),
    ...kpi(pi.x + 664, pi.y + 320, 306, 112, "Menunggu keputusan", "1 ditahan", "perlu pemeriksaan mutu", { valSize: 30, accent: C.amber }),
    ...section(1180, 410, 620, "Ke mana data mengalir"),
    ...[
      ["Penerimaan & timbang", "Jadi bahan produksi, lengkap dengan kode penerimaan"],
      ["pesanan beli & penerimaan", "Utang ke pemasok dan catatan pembelian otomatis"],
      ["Harga per kg", "Riwayat harga pemasok dan dasar biaya produksi"],
    ].flatMap(([a, b], i): El[] => [
      card(1180, 462 + i * 106, 620, 94, { r: 10 }),
      txt(1200, 470 + i * 106, 580, 30, a, 21, { bold: true, color: C.teal, va: "m", lh: 1.1 }),
      txt(1200, 504 + i * 106, 580, 44, b, 19, { color: C.ink, lh: 1.3 }),
    ]),
    bullets(1180, 796, 620, 140, ["Daftar pemasok, riwayat harga, dan transaksi", "Lampiran dokumen dan analisis biaya beli"], 20, { para: 8, color: C.muted }),
  ],
  "Data penerimaan ikan adalah titik awal asal-usul produk dan biaya produk. Angka pada mockup ilustratif; harga Rp45.000/kg meniru asumsi pengadaan CV DUS pada proposal.",
  [
    { kind: "proposed", ref: "Brief — Fitur 02", claim: "Fitur pengadaan: pemasok, pesanan beli, persetujuan, penerimaan, timbang, hutang, asal-usul produk" },
    { kind: "source", ref: "Proposal hlm. 9", claim: "Contoh harga beli bahan Rp45.000/kg untuk kelompok produksi 3.000 kg" },
    { kind: "illustrative", ref: "Mockup", claim: "Kelompok, pemasok, berat, dan nilai adalah data ilustratif" },
  ],
);

/* ---------------- 11 PRODUCTION & YIELD (SIGNATURE A) ---------------- */
const ym = mockWindow(920, 262, 880, 560, { title: "Siklus 1 · 3 Oktober 2026 · PT Sari Nusa Sejati" });
const yi = ym.inner;
const real: [string, string, string, string][] = [
  ["Loin B-SO", "203,51", "140.000", "28.491.400"],
  ["Loin C-SO", "97,43", "125.000", "12.178.750"],
  ["Toro", "14,00", "30.000", "420.000"],
  ["Kepala (+ rahang)", "63,00", "5.000", "315.000"],
  ["Tetelan coklat", "7,00", "18.000", "126.000"],
  ["Daging kerok", "3,00", "15.000", "45.000"],
];
export const s11 = mk(
  11,
  "Modul 03 — Production & Yield Intelligence (Signature A)",
  [
    ...std(11, "Produksi · Hasil per ekor", "Dari 481 kg ikan utuh ke laba per siklus, terlihat per ekor", "Data nyata Siklus 1 (3 Okt 2026) yang dibagikan owner Katalis; belum diaudit."),
    txt(120, 262, 760, 30, "Siklus 1, data nyata", 22, { color: C.muted, va: "m", lh: 1 }),
    txt(120, 308, 760, 26, "Ikan utuh diterima · 11 ekor", 19, { color: C.muted, va: "m", lh: 1 }),
    rect(120, 338, 760, 56, C.navy, { r: 8 }),
    txt(140, 338, 700, 56, "481 kg", 28, { color: C.white, va: "m", lh: 1 }),
    txt(120, 418, 760, 26, "Loin dihasilkan · hasil olahan 62,6% (rencana 60%)", 19, { color: C.muted, va: "m", lh: 1 }),
    rect(120, 448, 760 * (300.94 / 481), 56, C.ocean, { r: 8 }),
    txt(140, 448, 400, 56, "300,94 kg", 28, { color: C.white, va: "m", lh: 1 }),
    txt(120, 528, 760, 26, "Kelas mutu loin", 19, { color: C.muted, va: "m", lh: 1 }),
    rect(120, 558, 760 * (203.51 / 481), 56, C.teal, { r: 8 }),
    txt(140, 558, 320, 56, "B-SO 203,51 kg", 22, { color: C.white, va: "m", lh: 1 }),
    rect(120 + 760 * (203.51 / 481) + 4, 558, 760 * (97.43 / 481) - 4, 56, "#7FD1B2", { r: 8 }),
    txt(120 + 760 * (203.51 / 481) + 20, 558, 300, 56, "C-SO 97,43", 19, { color: C.navy, va: "m", lh: 1 }),
    card(120, 646, 760, 146, { fill: C.aqua }),
    txt(142, 656, 716, 128, "Biaya Rp37,07 juta: ikan utuh 59,7%, ongkos kirim 29,9%, penanganan 5,0%, kemasan 4,9%, jasa 0,5%. Ikan dan ongkos kirim memakan 89,6% biaya, jadi tarif kirim paling perlu ditekan.", 19, { color: C.navy, lh: 1.4 }),
    ...ym.els,
    txt(yi.x + 20, yi.y + 12, 560, 34, "Hasil dan pendapatan siklus", 22, { color: C.navy, va: "m", lh: 1 }),
    ...[["Hasil olahan", "62,6%", "rencana 60%"], ["Biaya per kg loin", "Rp123.190", "biaya Rp37,07 jt"], ["Laba", "Rp4,5 jt", "untung 10,8%"]].flatMap(([l, v, sub], i) =>
      kpi(yi.x + 20 + i * 282, yi.y + 54, 270, 116, l, v, sub, { valSize: 30 })),
    table(yi.x + 20, yi.y + 180, [250, 130, 150, 290], ["Hasil", "kg", "Rp/kg", "Pendapatan (Rp)"], [
      ...real,
      [{ t: "Total pendapatan", f: C.cont }, { t: "387,94", f: C.cont }, { t: "", f: C.cont }, { t: "41.576.150", f: C.cont, c: C.teal }],
    ], { size: 18, rowH: 40, headH: 42, align: ["l", "r", "r", "r"] }),
    rect(120, 838, 1680, 112, C.navy, { r: 14 }),
    txt(150, 848, 600, 28, "YANG KAMI TAMBAHKAN", 16, { color: C.aquaOnDark, ls: 1.5, va: "m" }),
    ...[
      ["Hasil per ekor", "Dibanding rencana 60% dan ukuran ikan"],
      ["Struktur biaya", "Biaya kirim dan biaya usaha ikut tercatat"],
      ["Sisa olahan", "65 kg belum laku; bisa dijual lewat fitur stok dan penjualan"],
    ].flatMap(([a, b], i): El[] => [
      txt(150 + i * 540, 878, 510, 32, a, 24, { color: C.white, va: "m", lh: 1 }),
      txt(150 + i * 540, 912, 510, 30, b, 19, { color: "#CFEFE3", va: "m", lh: 1.1 }),
    ]),
  ],
  "Contoh memakai data nyata Siklus 1 yang dibagikan owner. Total 300,94 kg loin + 87 kg hasil samping (toro 14, kepala 63, tetelan coklat 7, daging kerok 3). Pendapatan Rp41.576.150, biaya Rp37.072.682, laba Rp4.503.468 (10,8%). Nilai tambah: hasil per ekor, biaya kirim, hasil samping, dan biaya usaha tersambung ke stok dan keuangan.",
  [
    { kind: "source", ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "Ikan utuh 481 kg (11 ekor); loin 300,94 kg; yield 62,6% (rencana 60%); B-SO 203,51 kg x Rp140.000; C-SO 97,43 kg x Rp125.000; toro 14 kg x Rp30.000; kepala 63 kg x Rp5.000; tetelan coklat 7 kg x Rp18.000; daging kerok 3 kg x Rp15.000; pendapatan Rp41.576.150; biaya Rp37.072.682 (ikan 22.126.000; kargo 11.080.029; handling 1.846.568; kemasan 1.820.085; jasa 200.000); laba Rp4.503.468; margin 10,8%; Rp123.190/kg loin" },
    { kind: "source", ref: "Data Siklus 1 dari owner, tindak lanjut", claim: "65 kg hasil samping (tulang tengah, tetelan hitam) belum laku dan dibuang; negosiasi tarif kargo berjalan" },
    { kind: "derived", ref: "Dihitung", claim: "Ikan + kargo = 89,6% dari biaya (59,7% + 29,9%)" },
  ],
);

/* ---------------- 12 QC & TRACEABILITY ---------------- */
const qm = mockWindow(120, 470, 780, 470, { title: "Contoh tampilan · Cek mutu" });
const qi = qm.inner;
export const s12 = mk(
  12,
  "Mutu & Asal Produk",
  [
    ...std(12, "Mutu & Asal Produk", "Lacak asal produk dari pemasok sampai pembeli"),
    ...[
      ["Pemasok", "LOT-RCV-0001", "Diterima dan ditimbang"],
      ["Produksi", "BTH-0001", "Ikan 3.000 kg → daging 1.500 kg"],
      ["Mutu", "mutu-0001", "Suhu, kelas mutu, foto, keputusan"],
      ["Gudang", "LOC-CS-01", "Stok siap kirim per lokasi"],
      ["Pembeli", "INV-0001", "Dikirim dan diterima pembeli"],
    ].flatMap(([t, id, d], i): El[] => {
      const w = 288;
      const x = 120 + i * (w + 60);
      return [
        card(x, 262, w, 170),
        rect(x, 262, w, 8, i === 2 ? C.teal : C.navy, { r: 4 }),
        txt(x + 20, 284, w - 40, 36, t, 26, { bold: true, color: C.navy, va: "m", lh: 1 }),
        txt(x + 20, 326, w - 40, 30, id, 19, { color: C.teal, bold: true, mono: true, va: "m", lh: 1 }),
        txt(x + 20, 364, w - 40, 60, d, 19, { color: C.muted, lh: 1.3 }),
        ...(i < 4 ? [ln(x + w + 6, 347, x + w + 54, 347, C.ocean, 3, { arrow: true })] : []),
      ];
    }),
    ...qm.els,
    txt(qi.x + 20, qi.y + 12, 500, 34, "Pemeriksaan produksi BTH-0001", 22, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...illustrative(qi.x + qi.w - 190, qi.y + 14),
    ...["Suhu produk tercatat", "Kelas mutu ditetapkan", "Foto terlampir", "Penampakan dan bau sesuai", "Kemasan dan label sesuai"].flatMap((t, i): El[] => [
      rect(qi.x + 22, qi.y + 70 + i * 44, 26, 26, i < 4 ? C.teal : "#FFFFFF", { r: 5, line: i < 4 ? C.teal : C.faint, lw: 2 }),
      ...(i < 4 ? [ln(qi.x + 28, qi.y + 84 + i * 44, qi.x + 33, qi.y + 89 + i * 44, C.white, 3), ln(qi.x + 33, qi.y + 89 + i * 44, qi.x + 43, qi.y + 77 + i * 44, C.white, 3)] : []),
      txt(qi.x + 62, qi.y + 66 + i * 44, 600, 34, t, 20, { va: "m", color: i < 4 ? C.ink : C.muted, lh: 1 }),
    ]),
    txt(qi.x + 22, qi.y + 300, 300, 26, "KEPUTUSAN MUTU", 15, { color: C.muted, bold: true, ls: 1.4, va: "m" }),
    ...chip(qi.x + 22, qi.y + 332, "Lolos", { fill: C.teal, color: C.white, size: 19, h: 40 }).els,
    ...chip(qi.x + 158, qi.y + 332, "Ditahan", { fill: C.ice, color: C.muted, size: 19, h: 40, bold: false }).els,
    ...chip(qi.x + 242, qi.y + 332, "Ditolak", { fill: C.ice, color: C.muted, size: 19, h: 40, bold: false }).els,
    txt(qi.x + 22, qi.y + 372, 700, 36, "Izin kirim produk: [Petugas mutu] → [Manajer Produksi]", 17, { color: C.muted, va: "m", lh: 1.2 }),
    ...section(940, 470, 860, "Laporan asal-usul produk"),
    ...[
      ["Dari pemasok ke pembeli", "Kelompok RCV-0001, RCV-0002 → BTH-0001 → mutu-0001 → INV-0001"],
      ["Dari pembeli ke pemasok", "INV-0001 → BTH-0001 → kelompok dan pemasok asal"],
      ["Kalau produk perlu ditarik", "Daftar pembeli yang terkena dan sisa stok tiap produksi"],
    ].flatMap(([a, b], i): El[] => [
      card(940, 522 + i * 92, 860, 80, { r: 10 }),
      txt(960, 528 + i * 92, 820, 28, a, 20, { bold: true, color: C.teal, va: "m", lh: 1 }),
      txt(960, 558 + i * 92, 820, 40, b, 19, { color: C.ink, lh: 1.25, mono: i < 2 }),
    ]),
    rect(940, 806, 860, 134, C.amberSoft, { r: 12 }),
    txt(962, 816, 816, 26, "PILIHAN TAMBAHAN", 15, { color: C.amber, bold: true, ls: 1.2, va: "m" }),
    txt(962, 846, 816, 90, "Dokumen syarat pembeli dan keamanan pangan bisa ditambahkan.", 18, { color: C.ink, lh: 1.32 }),
  ],
  "Tekankan lifecycle kelompok produksi. Dokumentasi regulasi dan sertifikasi bersifat opsional dan harus dikonfirmasi di diskusi kebutuhan; kami tidak menjanjikan kepatuhan hanya karena ada perangkat lunak.",
  [
    { kind: "proposed", ref: "Brief — Fitur 04", claim: "Fitur mutu, kelas mutu, status Accepted/Hold/Rejected, asal-usul produk, penarikan produk, riwayat log" },
    { kind: "source", ref: "Proposal hlm. 18", claim: "Katalis mengelola mutu; mutu ditetapkan sebelum kelompok produksi dimulai" },
    { kind: "illustrative", ref: "Mockup", claim: "ID kelompok/kelompok produksi/mutu/tagihan dan checklist adalah contoh format" },
  ],
);

/* ---------------- 13 INVENTORY & COLD CHAIN ---------------- */
const im = mockWindow(120, 262, 1070, 560, { title: "Contoh tampilan · Stok" });
const ii = im.inner;
export const s13 = mk(
  13,
  "Stok & Penyimpanan Dingin",
  [
    ...std(13, "Stok & Gudang", "Pisahkan stok sendiri dan barang titipan pelanggan", "Barang milik pelanggan tidak dihitung sebagai stok Katalis. Tampilan memakai data contoh."),
    ...im.els,
    txt(ii.x + 20, ii.y + 12, 500, 34, "Stok per lokasi dan pemilik", 22, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...illustrative(ii.x + ii.w - 190, ii.y + 14),
    table(ii.x + 20, ii.y + 62, [250, 140, 170, 170, 150], ["Produk", "Kode produksi", "Lokasi", "Pemilik", "kg"], [
      ["Daging natural segar", { t: "BTH-0001" }, "Ruang pendingin", "Katalis", "1.200"],
      ["Daging CO segar", { t: "BTH-0001" }, "Ruang pendingin", "Katalis", "300"],
      ["Tuna CO beku", { t: "BTH-0007" }, "Gudang Dingin", "Katalis", "1.000"],
      [{ t: "Titipan: pelanggan", f: C.amberSoft }, { t: "CST-0003", f: C.amberSoft }, { t: "Gudang Dingin", f: C.amberSoft }, { t: "[Pelanggan A]", f: C.amberSoft, c: C.amber, b: true }, { t: "8.000", f: C.amberSoft }],
      [{ t: "Titipan: pelanggan", f: C.amberSoft }, { t: "CST-0004", f: C.amberSoft }, { t: "ABF", f: C.amberSoft }, { t: "[Pelanggan B]", f: C.amberSoft, c: C.amber, b: true }, { t: "5.000", f: C.amberSoft }],
    ], { size: 18, rowH: 54, headH: 46, align: ["l", "l", "l", "l", "r"] }),
    ...kpi(ii.x + 20, ii.y + 390, 300, 112, "Milik Katalis", "2.500 kg", "stok milik sendiri", { valSize: 30, accent: C.teal }),
    ...kpi(ii.x + 336, ii.y + 390, 300, 112, "Titipan pelanggan", "13.000 kg", "bukan aset Katalis", { valSize: 30, accent: C.amber }),
    txt(ii.x + 660, ii.y + 396, 340, 100, "Titipan ditagih sebagai jasa, tidak menambah nilai stok.", 18, { color: C.muted, lh: 1.35, va: "m" }),
    card(1230, 262, 570, 560),
    txt(1256, 276, 520, 32, "Isi gudang dan suhu penyimpanan", 24, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...illustrative(1606, 278),
    ...[
      ["Ruang pendingin", 62, "2,1 °C", C.teal],
      ["Gudang Dingin", 88, "−20,5 °C", C.amber],
      ["ABF", 40, "−35,0 °C", C.teal],
    ].flatMap(([n, p, t, c], i): El[] => {
      const y = 340 + i * 130;
      return [
        txt(1256, y, 300, 30, n as string, 21, { bold: true, color: C.ink, va: "m", lh: 1 }),
        txt(1560, y, 214, 30, `Suhu ${t}`, 19, { color: C.muted, va: "m", align: "r", lh: 1 }),
        rect(1256, y + 42, 518, 26, "#EEEDE8", { r: 6 }),
        rect(1256, y + 42, 518 * ((p as number) / 100), 26, c as string, { r: 6 }),
        txt(1256, y + 76, 518, 28, `${p}% terisi` + ((p as number) > 85 ? " · peringatan kapasitas" : ""), 18, { color: (p as number) > 85 ? C.amber : C.muted, bold: (p as number) > 85, va: "m", lh: 1 }),
      ];
    }),
    txt(1256, 736, 518, 70, "Disesuaikan dengan alat asli.", 17, { color: C.faint, italic: true, lh: 1.3 }),
    ...[
      ["Kode pindai tiap produksi", "Label cetak, pindai saat pindah"],
      ["Hitung stok di gudang", "Selisih dicatat, koreksi perlu izin"],
      ["Susut dan rusak", "Dicatat dengan alasan"],
      ["Peringatan", "Gudang penuh atau suhu tidak sesuai"],
    ].flatMap(([a, b], i): El[] => {
      const w = (1680 - 3 * 24) / 4;
      const x = 120 + i * (w + 24);
      return [
        rect(x, 846, w, 96, C.navy, { r: 12 }),
        txt(x + 20, 856, w - 40, 32, a, 22, { color: C.white, bold: true, va: "m", lh: 1 }),
        txt(x + 20, 892, w - 40, 46, b, 17, { color: "#CFEFE3", lh: 1.28 }),
      ];
    }),
  ],
  "Pesan kunci: pemisahan kepemilikan. Barang pelanggan di gudang dingin/ABF adalah layanan, bukan persediaan Katalis. Nama ruang (Ruang pendingin, Gudang Dingin, ABF) mengacu pada proposal; kapasitas dan suhu adalah ilustrasi.",
  [
    { kind: "proposed", ref: "Brief — Fitur 05", claim: "Fitur stok, stok titipan, QR, hitung stok, penyesuaian, alert kapasitas" },
    { kind: "source", ref: "Proposal hlm. 2, 8", claim: "Pendingin room Katalis; layanan CS dan ABF untuk pihak luar; penggunaan internal bukan omzet eksternal" },
    { kind: "illustrative", ref: "Mockup", claim: "Berat stok, tingkat keterisian, dan suhu adalah data ilustratif" },
  ],
);

/* ---------------- 14 COLD STORAGE & ABF (SIGNATURE B) ---------------- */
const cm = mockWindow(760, 262, 1040, 640, { title: "Contoh tampilan · Tagihan gudang dingin" });
const ci = cm.inner;
const csRow = (label: string, kg: number, dur: string, days: number, perKg: number): [string, string, string, string, string, string] => [
  label, kg.toLocaleString("id-ID"), dur, String(days), rp(perKg), rp(kg * perKg),
];
const csRows = [
  csRow("Simpan · contoh 1", 6000, "12 jam", 1, 75),
  csRow("Simpan · contoh 2", 8000, "5 hari", 10, 750),
  csRow("Simpan · contoh 3", 10000, "15 hari", 15, 1125),
  csRow("ABF (berat beku)", 5000, "—", 1, 3500),
];
const csTotal = 6000 * 75 + 8000 * 750 + 10000 * 1125 + 5000 * 3500;
export const s14 = mk(
  14,
  "Gudang Dingin & Pembekuan",
  [
    ...std(14, "Tagihan Penyimpanan & Pembekuan", "Tagihan penyimpanan dan pembekuan dihitung otomatis", SRC_LINE + ", hlm. 8. Ini contoh hitungan, bukan tagihan nyata."),
    txt(120, 262, 600, 30, "Aturan tarif gudang dingin", 18, { color: C.teal, bold: true, ls: 1.6, va: "m" }),
    table(120, 302, [270, 150, 180], ["Lama simpan", "Hari ditagih", "Tarif/kg"], [
      ["> 1 jam s.d. 24 jam", "1", "Rp75"],
      ["> 24 jam s.d. 10 hari", "10 (minimum)", "Rp750"],
      ["11 hari", "11", "Rp825"],
      ["30 hari", "30", "Rp2.250"],
    ], { size: 19, rowH: 52, headH: 46, align: ["l", "r", "r"] }),
    rect(120, 574, 600, 84, C.amberSoft, { r: 10 }),
    txt(140, 580, 560, 72, "Mulai hari ke-11: tambah Rp75/kg per hari.", 17, { color: C.ink, lh: 1.32, va: "m" }),
    txt(120, 684, 600, 30, "ABF (pembekuan cepat) · Rp3.500/kg", 18, { color: C.teal, bold: true, ls: 1.6, va: "m" }),
    ...stepRow(120, 724, 600, 64, [
      { title: "Pemesanan" },
      { title: "Jadwal" },
      { title: "Berat beku" },
      { title: "Tagihan" },
    ], { gap: 20, size: 18, titleH: 36 }),
    txt(120, 808, 600, 90, "Tagihan dari berat beku sebenarnya.", 18, { color: C.muted, lh: 1.35 }),
    ...cm.els,
    txt(ci.x + 20, ci.y + 12, 600, 36, "Tagihan gudang dingin dan ABF · [Pelanggan A]", 22, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...illustrative(ci.x + ci.w - 190, ci.y + 14),
    table(ci.x + 20, ci.y + 62, [226, 130, 120, 134, 140, 208], ["Layanan", "Berat (kg)", "Durasi", "Hari ditagih", "Tarif/kg", "Jumlah"], csRows, { size: 18, rowH: 56, headH: 48, align: ["l", "r", "r", "r", "r", "r"] }),
    rect(ci.x + 20, ci.y + 62 + 48 + 56 * 4, 958, 60, "#EEEDE8"),
    txt(ci.x + 34, ci.y + 62 + 48 + 56 * 4, 400, 60, "Total contoh", 21, { bold: true, color: C.navy, va: "m", lh: 1 }),
    txt(ci.x + 600, ci.y + 62 + 48 + 56 * 4, 364, 60, rp(csTotal), 28, { bold: true, color: C.teal, align: "r", va: "m", lh: 1 }),
    txt(ci.x + 20, ci.y + 408, 958, 28, "Rumus: jumlah = berat × hari ditagih × tarif per kg per hari", 18, { bold: true, color: C.navy, va: "m", lh: 1 }),
    bullets(ci.x + 20, ci.y + 448, 958, 130, [
      "Contoh 2: simpan 5 hari, ditagih 10 hari.",
      "Tarif bisa diubah di pengaturan.",
      "Tarif, hari minimum, dan batas jam bisa diubah di pengaturan, tanpa membuat ulang aplikasi.",
    ], 18, { para: 8, color: C.muted }),
  ],
  "Signature Feature B. Perhitungan: 6.000 kg x 1 hari x Rp75 = Rp450.000; 8.000 kg x 10 hari x Rp75 = Rp6.000.000; 10.000 kg x 15 hari x Rp75 = Rp11.250.000; ABF 5.000 kg x Rp3.500 = Rp17.500.000. Total Rp35.200.000. Tarif sampai 1 jam belum ditetapkan di proposal.",
  [
    { kind: "source", ref: "Proposal hlm. 8", claim: "Rp75/kg/hari; >1 jam–24 jam ditagih 1 hari; >24 jam–10 hari minimum 10 hari; hari ke-11 dst +Rp75/kg/hari; hari lanjutan dihitung penuh; ABF Rp3.500/kg; tarif ≤1 jam belum ditetapkan" },
    { kind: "derived", ref: "Dihitung", claim: "Skenario tagihan: Rp450.000; Rp6.000.000; Rp11.250.000; ABF Rp17.500.000; total Rp35.200.000" },
    { kind: "proposed", ref: "Brief — Signature Feature B", claim: "Penagihan CS/ABF otomatis dengan aturan bisa diatur" },
  ],
);
