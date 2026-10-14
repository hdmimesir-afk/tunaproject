import { C, txt, rect, ell, ln, card, chip, badge, kpi, bars, hbars, table, stepRow, bullets, section, mockWindow, illustrative, rp, jt, mi, pct } from "@/lib/kit";
import type { El } from "@/lib/scene";
import { SRC } from "@/data/figures";
import { mk, std, SRC_LINE } from "./_h";

/* ---------------- 15 SALES & DISTRIBUTION ---------------- */
const days: [string, string, string, string][] = [
  ["Senin", "CV DUS", "08.00–17.00", C.ocean],
  ["Selasa", "PT SNS", "08.00–17.00", C.teal],
  ["Rabu", "CV DUS", "08.00–17.00", C.ocean],
  ["Kamis", "PT SNS", "08.00–17.00", C.teal],
  ["Jumat", "CV DUS", "08.00–17.00", C.ocean],
  ["Sabtu", "PT SNS", "08.00–12.00", C.teal],
];
const sm = mockWindow(980, 396, 820, 546, { title: "Contoh tampilan · Tagihan pembeli" });
const si = sm.inner;
export const s15 = mk(
  15,
  "Penjualan & Pengiriman",
  [
    ...std(15, "Penjualan & Pengiriman", "Dari giliran sampai tagihan dibayar, satu alur"),
    ...stepRow(120, 262, 1680, 104, [
      { title: "Kontrak & harga", sub: "Aturan per pembeli" },
      { title: "Pesanan jual", sub: "Alokasi produk" },
      { title: "Surat jalan", sub: "Berat kirim aktual" },
      { title: "Berat diterima", sub: "Dasar tagihan" },
      { title: "Tagihan", sub: "Bayar sebagian" },
      { title: "Pembayaran", sub: "Cocokkan uang masuk" },
    ], { size: 23, subSize: 19, gap: 36, titleH: 36 }),
    ...section(120, 396, 820, "Giliran mengambil hasil produksi"),
    ...days.flatMap(([d, p, h, c], i): El[] => {
      const x = 120 + i * 138;
      return [
        rect(x, 446, 130, 124, c, { r: 10 }),
        txt(x, 456, 130, 30, d, 20, { color: C.white, bold: true, align: "c", va: "m", lh: 1 }),
        txt(x, 494, 130, 30, p, 21, { color: C.white, bold: true, align: "c", va: "m", lh: 1 }),
        txt(x, 530, 130, 28, h, 16, { color: "#E6F7F0", align: "c", va: "m", lh: 1 }),
      ];
    }),
    txt(120, 584, 820, 76, "Senin berikutnya kembali ke CV DUS.", 18, { color: C.muted, lh: 1.35 }),
    ...section(120, 680, 820, "Aturan yang bisa diatur", C.teal),
    bullets(120, 728, 820, 220, [
      "Kontrak, harga, dan jadwal tiap pembeli",
      "Tagihan dihitung dari berat diterima",
      "Boleh jual ke pihak lain, asal jadwal mitra tetap aman",
      "Pendapatan dihitung dari berat yang diterima dan dibayar pembeli",
    ], 20, { para: 10 }),
    ...sm.els,
    txt(si.x + 20, si.y + 12, 560, 34, "Tagihan dan piutang pembeli", 22, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...illustrative(si.x + si.w - 190, si.y + 14),
    table(si.x + 20, si.y + 62, [124, 130, 100, 120, 124, 200], ["Tagihan", "Pembeli", "Kirim kg", "Diterima kg", "Sisa hari", "Status"], [
      ["INV-0001", "[Pembeli A]", "1.200", "1.180", "20 hari", { t: "Belum jatuh tempo", c: C.teal, b: true }],
      ["INV-0002", "[Pembeli B]", "1.500", "1.500", "Hari ini", { t: "Jatuh tempo", c: C.amber, b: true }],
      ["INV-0003", "[Pembeli A]", "1.320", "1.320", "−6 hari", { t: "Terlambat", c: C.red, b: true }],
      ["INV-0004", "[Pembeli B]", "1.000", "1.000", "−2 hari", { t: "Dibayar sebagian", c: C.ocean, b: true }],
    ], { size: 16, rowH: 52, headH: 46, align: ["l", "l", "r", "r", "r", "l"] }),
    ...kpi(si.x + 20, si.y + 332, 380, 108, "Selisih berat kirim dan terima", "20 kg", "INV-0001, ditagih sesuai berat diterima", { valSize: 30, accent: C.amber }),
    ...kpi(si.x + 416, si.y + 332, 366, 108, "Perlu tindak lanjut", "2 tagihan", "pengingat ke tim keuangan", { valSize: 30, accent: C.red }),
  ],
  "Jadwal giliran PT SNS dan CV DUS diambil dari proposal hlm. 4. Buyer pada mockup diberi placeholder agar tidak menampilkan data transaksi fiktif atas nama mitra nyata.",
  [
    { kind: "source", ref: "Proposal hlm. 4", claim: "Senin CV DUS, Selasa PT SNS, Rabu CV DUS, Kamis PT SNS, Jumat CV DUS, Sabtu PT SNS; jam 08.00–17.00, Sabtu 08.00–12.00; kerja sama boleh melayani pihak lain; pemenuhan mengikuti hasil produksi" },
    { kind: "source", ref: "Proposal hlm. 11", claim: "Pendapatan dihitung dari berat yang diterima dan dibayar pembeli" },
    { kind: "proposed", ref: "Brief — Fitur 06", claim: "Fitur kontrak, DO, tagihan, piutang, aging, retur/klaim" },
    { kind: "illustrative", ref: "Mockup", claim: "Tagihan dan pembeli adalah placeholder ilustratif" },
  ],
);

/* ---------------- 16 FINANCE ---------------- */
const ladder: [string, string][] = [
  ["Total penjualan", "Penjualan sesuai berat diterima"],
  ["Untung kotor", "Penjualan dikurangi biaya produk"],
  ["Untung usaha", "Setelah biaya operasional bulanan"],
  ["Untung di laporan", "Setelah penyusutan, pajak, bunga"],
];
const fm = mockWindow(900, 262, 900, 528, { title: "Contoh tampilan · Tutup buku" });
const fi = fm.inner;
const closing: [string, string, string][] = [
  ["Nota ↔ transaksi (243 dari 243 lengkap)", "Cocok", "ok"],
  ["Bukti transfer (164 dari 219 lengkap)", "Selisih", "warn"],
  ["Rekap bulanan ↔ jurnal (243 transaksi)", "Cocok", "ok"],
  ["Semua transaksi sudah diperiksa dan disetujui", "Cocok", "ok"],
  ["Tagihan ↔ berat diterima pembeli", "Cocok", "ok"],
  ["Biaya usaha (dicatat sekali)", "Cocok", "ok"],
  ["Penyusutan, pajak, bunga, dan dana cadangan", "Menunggu", "wait"],
];
export const s16 = mk(
  16,
  "Keuangan & Biaya Produk",
  [
    ...std(16, "Keuangan & Biaya Produk", "Dari transaksi harian ke laporan keuangan yang rapi", "Aturan akuntansi dan pajak kita cocokkan dengan akuntan Anda saat penerapan. Alur mengikuti proposal hlm. 17–18."),
    ...ladder.flatMap(([t, d], i): El[] => {
      const y = 262 + i * 96;
      const last = i >= 3;
      return [
        rect(120 + i * 18, y, 740 - i * 18, 86, last ? C.aqua : C.white, { r: 10, line: last ? "#BFE3E0" : C.border, lw: 2 }),
        rect(120 + i * 18, y + 12, 5, 62, i < 2 ? C.ocean : C.teal, { r: 2 }),
        txt(146 + i * 18, y + 10, 700 - i * 18, 34, t, 23, { bold: true, color: C.navy, va: "m", lh: 1 }),
        txt(146 + i * 18, y + 48, 700 - i * 18, 30, d, 17, { color: C.muted, va: "m", lh: 1.1 }),
      ];
    }),
    rect(120, 662, 740, 128, C.navy, { r: 10 }),
    txt(146, 662, 690, 128, "Biaya tidak dihitung dua kali.", 21, { color: C.white, bold: true, va: "m", lh: 1.35 }),
    ...fm.els,
    txt(fi.x + 20, fi.y + 12, 560, 34, "Tutup buku bulanan · Oktober 2026", 22, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...illustrative(fi.x + fi.w - 250, fi.y + 14, "DATA MONITOR DANA"),
    ...closing.flatMap(([t, s, k], i): El[] => {
      const y = fi.y + 66 + i * 54;
      const fill = k === "ok" ? C.teal : k === "warn" ? C.amber : C.faint;
      return [
        rect(fi.x + 20, y, 858, 46, i % 2 ? "#F4F3EF" : C.white, { r: 6, line: C.border, lw: 1 }),
        txt(fi.x + 36, y, 600, 46, t, 19, { va: "m", lh: 1 }),
        ...chip(fi.x + 722, y + 7, s, { fill, color: C.white, size: 16, h: 32, w: 140 }).els,
      ];
    }),
    txt(fi.x + 20, fi.y + 450, 858, 40, "Periode dikunci setelah semua butir cocok dan disetujui.", 17, { color: C.muted, lh: 1.3, va: "m" }),
    ...[
      ["Tidak ada biaya dua kali", "Dicatat sekali"],
      ["Uang masuk bukan berarti laba", "Tanggal bayar dan biaya dipisah"],
      ["Periode dikunci", "Tidak bisa diubah setelah tutup buku"],
      ["Perkiraan bukan laba nyata", "Terpisah dari data nyata"],
      ["Bisa ditelusuri", "Setiap catatan ada sumbernya"],
    ].flatMap(([a, b], i): El[] => {
      const w = (1680 - 4 * 20) / 5;
      const x = 120 + i * (w + 20);
      return [
        rect(x, 812, w, 132, C.navy, { r: 12 }),
        rect(x + 18, 828, 30, 4, C.aquaOnDark, { r: 2 }),
        txt(x + 18, 840, w - 36, 56, a, 21, { color: C.white, bold: true, lh: 1.2 }),
        txt(x + 18, 898, w - 36, 40, b, 16, { color: "#CFEFE3", lh: 1.25 }),
      ];
    }),
  ],
  "Slide ini menegaskan disiplin keuangan yang disyaratkan proposal: setiap biaya dicatat sekali, kas dan pengakuan akuntansi terpisah, dan penutupan bulanan sebelum laporan final. Tangga laba adalah usulan definisi yang harus diperiksa dengan akuntan.",
  [
    { kind: "source", ref: "Proposal hlm. 17–18", claim: "Penutupan bulanan mencocokkan rekening, pembelian, hasil timbang, stok, tagihan, piutang, biaya; biaya yang sudah masuk biaya produk tidak dipotong ulang; laba disesuaikan penyusutan, pajak, pembiayaan, cadangan" },
    { kind: "proposed", ref: "Brief — Fitur 07", claim: "Fitur kas, AR/AP, GL, jurnal otomatis, biaya produk, perhitungan biaya, aset tetap, penutupan laporan, riwayat perubahan" },
    { kind: "assumption", ref: "Brief — Fitur 07", claim: "Aturan akuntansi dan pajak final diperiksa saat penerapan; definisi tangga laba adalah usulan" },
  ],
);

/* ---------------- 17 ROLE WORKFLOWS ---------------- */
const roleCards: { role: string; screen: string; items: string[] }[] = [
  { role: "Pembelian", screen: "Penerimaan ikan", items: ["Buat pesanan beli dan setujui transaksi besar", "Catat penerimaan dan hasil timbang", "Bandingkan harga per pemasok", "Pantau hutang pemasok"] },
  { role: "Produksi", screen: "Kelompok produksi hari ini", items: ["Buka perintah dan nomor produksi", "Catat bahan masuk dan daging hasil olahan", "Lihat hasil olahan dan susut", "Catat saat mesin berhenti"] },
  { role: "Pemeriksaan mutu", screen: "Daftar pemeriksaan", items: ["Isi daftar periksa", "Lampirkan suhu dan foto", "Tetapkan Lolos, Ditahan, atau Ditolak", "Beri izin kirim produk"] },
  { role: "Gudang & suhu penyimpanan", screen: "Peta stok", items: ["Pindah stok per lokasi dengan kode pindai", "Catat barang titipan masuk dan keluar", "Pantau suhu dan isi gudang", "Catat susut dan hitung stok"] },
  { role: "Penjualan", screen: "Piutang pembeli", items: ["Alokasikan produk sesuai giliran", "Terbitkan surat jalan dan tagihan", "Catat berat diterima pembeli", "Pantau jatuh tempo"] },
  { role: "Keuangan & direksi", screen: "Tutup buku bulanan", items: ["Cocokkan kas, stok, dan tagihan", "Setujui pengeluaran dan koreksi", "Tutup buku bulanan", "Pantau dashboard owner"] },
];
export const s17 = mk(
  17,
  "Alur kerja harian per peran",
  [
    ...std(17, "Alur kerja per peran", "Setiap peran hanya melihat dan mengerjakan yang relevan", "Ini usulan awal; kita sesuaikan dengan cara kerja Anda saat diskusi."),
    ...roleCards.flatMap((r, i): El[] => {
      const w = (1680 - 2 * 48) / 3;
      const x = 120 + (i % 3) * (w + 48);
      const y = 262 + Math.floor(i / 3) * 346;
      return [
        rect(x, y, w, 2, C.border),
        txt(x, y + 22, w, 36, r.role, 28, { bold: true, color: C.navy, va: "m", lh: 1 }),
        ...chip(x, y + 66, "Layar utama: " + r.screen, { fill: C.aqua, color: C.teal, size: 16, h: 32, w: Math.min(w - 52, 24 + ("Layar utama: " + r.screen).length * 10) }).els,
        bullets(x, y + 120, w - 24, 190, r.items, 21, { para: 10 }),
      ];
    }),
  ],
  "Slide pendalaman fitur: alur kerja harian per peran. Semua berasal dari fitur fitur 02-07 dan 11; urutan dan hak akses disesuaikan saat diskusi kebutuhan.",
  [
    { kind: "proposed", ref: "Brief — Fitur 02–07, 11", claim: "Alur kerja per peran diturunkan dari fitur pengadaan, produksi, mutu, stok, penjualan, keuangan, dan akses" },
    { kind: "source", ref: "Proposal hlm. 18", claim: "Katalis mengelola pemasok, pembelian, produksi, mutu, jadwal CS dan ABF, distribusi, penagihan, dan laporan" },
  ],
);

/* ---------------- 18 PRODUCTION PLANNING ---------------- */
const gx = 300, gw = 830, hp = gw / 9;
export const s18 = mk(
  18,
  "Jadwal & Kapasitas Produksi",
  [
    ...std(18, "Jadwal & Kapasitas", "Jadwal giliran mitra dan pemakaian mesin", SRC_LINE + ", hlm. 4. Kapasitas dan pemakaian adalah perkiraan, bukan hasil uji mesin."),
    ...Array.from({ length: 10 }, (_, i): El => txt(gx + i * hp - 30, 262, 60, 26, String(8 + i).padStart(2, "0") + ".00", 16, { color: C.faint, align: "c", va: "m", lh: 1 })),
    ...days.flatMap(([d], i): El[] => {
      const y = 300 + i * 74;
      return [
        rect(120, y, 1010, 62, i % 2 ? "#F4F3EF" : C.white, { r: 8, line: C.border, lw: 1 }),
        txt(140, y, 150, 62, d, 22, { bold: true, color: C.navy, va: "m", lh: 1 }),
      ];
    }),
    ...Array.from({ length: 10 }, (_, i): El => ln(gx + i * hp, 296, gx + i * hp, 300 + 6 * 74 - 8, "#DAD9D2", 1, { dash: true })),
    ...days.flatMap(([, p, , c], i): El[] => {
      const y = 300 + i * 74;
      const sat = i === 5;
      const w = (sat ? 4 : 9) * hp;
      return [
        rect(gx, y + 8, w, 46, c, { r: 8 }),
        txt(gx + 14, y + 8, w - 28, 46, sat ? `${p} · 1.333 kg` : `${p} · 3.000 kg bahan`, 18, { color: C.white, bold: true, va: "m", lh: 1 }),
      ];
    }),
    rect(120, 766, 1010, 84, C.amberSoft, { r: 10 }),
    txt(144, 766, 140, 84, "Contoh peringatan", 15, { color: C.amber, bold: true, va: "m", lh: 1.2 }),
    txt(290, 766, 820, 84, "Pesanan ABF jam 10.00 bentrok dengan produksi CV DUS.", 18, { color: C.ink, va: "m", lh: 1.32 }),
    ...[
      ["Kapasitas alat", "Mesin, gudang dingin, ABF"],
      ["Libur dan jeda", "Penyesuaian kalender"],
      ["Jam kerja & jeda", "Dicatat per hari"],
      ["Pemakaian mesin", "Rencana vs kenyataan"],
    ].flatMap(([a, b], i): El[] => {
      const x = 120 + i * 256;
      return [
        rect(x, 868, 244, 76, C.navy, { r: 10 }),
        txt(x + 16, 874, 214, 34, a, 19, { color: C.white, bold: true, va: "m", lh: 1 }),
        txt(x + 16, 908, 214, 30, b, 16, { color: "#CFEFE3", va: "m", lh: 1 }),
      ];
    }),
    card(1170, 262, 630, 682),
    txt(1196, 276, 580, 30, "Perkiraan jadwal", 16, { color: C.teal, bold: true, ls: 1.4, va: "m" }),
    ...kpi(1196, 316, 280, 108, "Jam per minggu", "27 · 22", "CV DUS · PT SNS", { valSize: 32, accent: C.ocean }),
    ...kpi(1494, 316, 280, 108, "Hari penuh", "3.000 kg", "bahan per 9 jam", { valSize: 32, accent: C.teal }),
    txt(1196, 450, 580, 30, "Bahan per bulan menurut pemakaian mesin", 18, { bold: true, color: C.navy, va: "m", lh: 1 }),
    table(1196, 490, [160, 210, 210], ["Pemakaian", "PT SNS", "CV DUS"], [
      ["50% (rendah)", "15.889 kg", "19.500 kg"],
      ["75% (sedang)", "23.833 kg", "29.250 kg"],
      ["100% (penuh)", "31.778 kg", "39.000 kg"],
    ], { size: 18, rowH: 50, headH: 46, align: ["l", "r", "r"] }),
    txt(1196, 706, 580, 220, "Angka ini perkiraan, bukan hasil uji mesin.", 18, { color: C.muted, lh: 1.4 }),
  ],
  "Kalender giliran dari proposal hlm. 4: CV DUS mendapat 27 jam dan PT SNS 22 jam per minggu. Kapasitas 3.000 kg per hari penuh dan Sabtu 1.333 kg adalah asumsi model.",
  [
    { kind: "source", ref: "Proposal hlm. 4", claim: "Rotasi Senin–Sabtu, jam operasi, CV DUS 27 jam dan PT SNS 22 jam per minggu; bahan per bulan 15.889/23.833/31.778 kg (SNS) dan 19.500/29.250/39.000 kg (DUS); kapasitas 3.000 kg per 9 jam, Sabtu 1.333 kg" },
    { kind: "assumption", ref: "Proposal hlm. 4", claim: "Kapasitas kg dan persentase pemakaian merupakan asumsi, bukan kuota atau konfirmasi kemampuan mesin" },
    { kind: "proposed", ref: "Brief — Fitur 09 (Planning)", claim: "Fitur penjadwalan, kapasitas, waktu berhenti, kalender, peringatan konflik" },
  ],
);

/* ---------------- 19 PROFIT & CASH SIMULATION ---------------- */
const cyc = ["Beli ikan", "Stok bahan", "Proses", "Jual", "Piutang pembeli", "Kas masuk", "Beli berikutnya"];
const wcb = SRC.wc.needs;
const base19 = 868, maxV = 2400, hpx = 330 / maxV;
export const s19 = mk(
  19,
  "Perkiraan Laba & Kas",
  [
    ...std(19, "Perkiraan Laba & Kebutuhan Uang", "Coba skenario laba dan kebutuhan uang tanpa mengubah data nyata", SRC_LINE + ", hlm. 10, 16–17. Ini perkiraan, bukan laba nyata. Fitur 10 ada di paket Penuh."),
    ...cyc.flatMap((t, i): El[] => {
      const gap = 36;
      const w = (1680 - 6 * gap) / 7;
      const x = 120 + i * (w + gap);
      return [
        rect(x, 262, w, 70, i === 0 || i === 6 ? C.navy : C.white, { r: 10, line: C.border, lw: 2 }),
        txt(x + 8, 262, w - 16, 70, t, 20, { bold: true, color: i === 0 || i === 6 ? C.white : C.navy, align: "c", va: "m", lh: 1.15 }),
        ...(i < 6 ? [ln(x + w + 4, 297, x + w + gap - 4, 297, C.ocean, 3, { arrow: true })] : []),
      ];
    }),
    txt(120, 342, 1680, 34, "Makin lama uang tertahan, makin banyak uang yang dibutuhkan.", 19, { color: C.muted, lh: 1.3, va: "m" }),
    // column 1: scenarios
    card(120, 394, 520, 550),
    txt(144, 406, 480, 30, "Perkiraan laba per bulan", 21, { bold: true, color: C.navy, va: "m", lh: 1 }),
    ...bars(144, 450, 472, 330, [
      { label: "Rendah", value: SRC.monthlyProfit.pess, text: jt(SRC.monthlyProfit.pess), color: "#7FD1B2" },
      { label: "Sedang", value: SRC.monthlyProfit.mod, text: jt(SRC.monthlyProfit.mod), color: C.ocean },
      { label: "Tinggi", value: SRC.monthlyProfit.opt, text: jt(SRC.monthlyProfit.opt), color: C.navy },
    ], { barW: 90, valSize: 18, labelSize: 18 }),
    ...chip(144, 800, "PERKIRAAN, BUKAN LABA NYATA", { fill: C.amberSoft, color: C.amber, size: 15 }).els,
    txt(144, 846, 472, 90, "", 17, { color: C.muted, lh: 1.35 }),
    // column 2: sensitivity
    card(664, 394, 520, 550),
    txt(688, 406, 480, 30, "Jika biaya naik atau harga turun", 21, { bold: true, color: C.navy, va: "m", lh: 1 }),
    txt(688, 438, 480, 26, "Laba turun berapa per bulan jika satu hal berubah", 16, { color: C.muted, va: "m", lh: 1 }),
    ...SRC.sens.flatMap((s, i): El[] => {
      const y = 484 + i * 110;
      const w = 472 * (s.drop / 60_000_000);
      return [
        txt(688, y, 330, 52, s.label, 18, { color: C.ink, lh: 1.25 }),
        txt(1018, y, 142, 52, "−" + jt(s.drop, 2), 19, { bold: true, color: C.navy, va: "m", align: "r", lh: 1 }),
        rect(688, y + 58, 472, 22, "#EEEDE8", { r: 4 }),
        rect(688, y + 58, Math.max(6, w), 22, i === 1 || i === 2 ? C.red : C.amber, { r: 4 }),
      ];
    }),
    // column 3: working capital
    card(1208, 394, 592, 550),
    txt(1232, 406, 550, 30, "Uang yang dibutuhkan vs uang tersedia (Rp juta)", 21, { bold: true, color: C.navy, va: "m", lh: 1 }),
    txt(1232, 438, 550, 26, "Tergantung berapa lama uang tertahan di stok dan tagihan", 16, { color: C.muted, va: "m", lh: 1 }),
    ln(1232, base19, 1776, base19, C.border, 2),
    ...wcb.flatMap((w, i): El[] => {
      const bh = (w.need / 1e6) * hpx;
      const x = 1262 + i * 170;
      const over = w.need > SRC.wc.poolNow;
      return [
        rect(x, base19 - bh, 110, bh, over ? C.red : C.teal, { r: 4 }),
        txt(x - 20, base19 - bh - 30, 150, 28, (w.need / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }), 18, { bold: true, color: C.navy, align: "c", va: "m", lh: 1 }),
        txt(x - 20, base19 + 6, 150, 26, `${w.days} hari`, 17, { color: C.muted, align: "c", va: "m", lh: 1 }),
      ];
    }),
    ln(1232, base19 - (SRC.wc.poolNow / 1e6) * hpx, 1776, base19 - (SRC.wc.poolNow / 1e6) * hpx, C.navy, 2.5, { dash: true }),
    txt(1232, 470, 550, 24, "Garis putus = uang tersedia sekarang (1.367,5)", 16, { bold: true, color: C.navy, va: "m", lh: 1 }),
    txt(1232, 908, 550, 30, "Lebih/kurang dari uang tersedia: +456,4 · −205,3 · −866,9", 15, { color: C.muted, va: "m", lh: 1 }),
  ],
  "Signature Feature D. Semua angka dari proposal hlm. 10 dan 16–17. Waktu 7/14/21 hari adalah ilustrasi, bukan tenor kontrak. Selisih negatif berarti perlu tambahan dana atau percepatan penerimaan.",
  [
    { kind: "source", ref: "Proposal hlm. 1, 10", claim: "Perkiraan laba per bulan Rp275.005.556 / Rp475.675.000 / Rp734.532.223" },
    { kind: "source", ref: "Proposal hlm. 17", claim: "Sensitivitas: biaya produk +Rp1.000/kg −Rp11.916.667; harga −Rp5.000/kg −Rp59.583.333; kapasitas 75→65% −Rp53.256.667; sewa +Rp5 juta −Rp5.000.000" },
    { kind: "source", ref: "Proposal hlm. 16–17", claim: "Pool kas Rp1.367.500.000, Rp1.867.500.000 setelah komitmen Katalis; kebutuhan kas 7/14/21 hari Rp911.145.833 / Rp1.572.791.667 / Rp2.234.437.500" },
    { kind: "proposed", ref: "Brief — Simulator, Fitur utama", claim: "Simulator skenario dan visual siklus modal kerja; tersedia pada paket Penuh" },
  ],
);

/* ---------------- 20 SECURITY & GOVERNANCE ---------------- */
const L = { t: "Lihat", c: C.muted };
const K = { t: "Kelola", c: C.teal, b: true, f: C.aqua };
const S = { t: "Setuju", c: C.ocean, b: true, f: C.ice };
const N = { t: "–", c: C.faint };
const roles: [string, ...({ t: string; c?: string; b?: boolean; f?: string })[]][] = [
  ["Super Admin", K, K, K, K, K, K, K, K],
  ["Direksi", L, S, L, L, L, S, S, S],
  ["Keuangan", L, L, N, N, L, L, K, K],
  ["Pembelian", N, K, N, N, L, N, N, N],
  ["Produksi", L, N, K, L, L, N, N, N],
  ["Gudang", N, N, L, N, K, L, N, N],
  ["Pemeriksaan mutu", N, N, L, K, L, N, N, N],
  ["Penjualan", L, N, N, N, L, K, N, N],
];
export const s20 = mk(
  20,
  "Keamanan, Kontrol, dan Tata Kelola",
  [
    ...std(20, "Akses & Persetujuan", "Atur siapa yang boleh melihat, mengubah, dan menyetujui data", "Ini usulan awal. Pengaturan akhir kita sepakati bersama."),
    table(120, 262, [200, 132, 96, 120, 96, 96, 96, 132], ["Peran", "Dashboard", "Beli", "Produksi", "Mutu", "Stok", "Jual", "Keuangan"], roles.map((r) => r.slice(0, 8)) as never, { size: 17, rowH: 50, headH: 50, align: ["l", "c", "c", "c", "c", "c", "c", "c"] }),
    txt(120, 736, 1000, 28, "Kelola = tambah dan ubah · Setuju = beri izin · Lihat = hanya membaca", 16, { color: C.muted, va: "m", lh: 1 }),
    ...section(1160, 262, 640, "Pengaman bawaan"),
    ...[
      ["Persetujuan berjenjang", "Untuk transaksi besar dan koreksi"],
      ["Riwayat perubahan", "Siapa mengubah apa, dan kapan"],
      ["Kunci periode", "Catatan dikunci setelah tutup buku"],
      ["Cadangan data", "Disalin berkala"],
      ["Data milik Anda", "Milik Katalis, bisa diunduh"],
      ["Akses aman", "Akun sendiri, izin terbatas"],
    ].flatMap(([a, b], i): El[] => [
      rect(1160, 314 + i * 70, 5, 56, C.teal, { r: 2 }),
      txt(1184, 312 + i * 70, 616, 30, a, 21, { bold: true, color: C.navy, va: "m", lh: 1 }),
      txt(1184, 344 + i * 70, 616, 28, b, 17, { color: C.muted, va: "m", lh: 1 }),
    ]),
    txt(120, 776, 800, 24, "YANG JADI AMAN", 16, { color: C.teal, bold: true, ls: 1.4, va: "m" }),
    ...[
      ["Data penting tidak diubah sembarang orang", "Hanya yang berwenang."],
      ["Setiap perubahan bisa dilihat", "Tercatat siapa dan kapan."],
      ["Catatan tutup buku tetap utuh", "Setelah dikunci, tidak bisa diubah."],
    ].flatMap(([a, b], i): El[] => {
      const w = (1680 - 2 * 24) / 3;
      const x = 120 + i * (w + 24);
      return [
        rect(x, 808, w, 136, C.navy, { r: 12 }),
        txt(x + 22, 822, w - 44, 56, a, 23, { color: C.white, bold: true, va: "m", lh: 1.2 }),
        txt(x + 22, 884, w - 44, 56, b, 19, { color: "#CFEFE3", lh: 1.3 }),
      ];
    }),
  ],
  "Pembagian peran adalah usulan awal dan bisa diubah per orang. Pesan utama: data penting hanya bisa diubah oleh yang berwenang, dan setiap perubahan tercatat.",
  [
    { kind: "proposed", ref: "Brief — Admin", claim: "Peran: Super Admin, Director, Finance, Procurement, Production, Warehouse, mutu, Sales; persetujuan, riwayat log, penguncian setelah close, salinan data dan recovery" },
    { kind: "proposed", ref: "Brief — Part G", claim: "Arsitektur: Next.js, React, TypeScript, Tailwind; backend TypeScript; PostgreSQL (Supabase opsional); object storage privat; server online hosting, monitoring, salinan data; RBAC, least privilege, riwayat perubahan, koneksi terenkripsi, penguncian catatan" },
    { kind: "assumption", ref: "Brief", claim: "Matriks hak akses dan pilihan teknologi adalah usulan awal; pilihan final bergantung kebutuhan dan batasan non-fungsional; tidak ada klaim sertifikasi atau jaminan keamanan" },
  ],
);

/* ---------------- 21 EXPECTED BUSINESS VALUE ---------------- */
const val: [string, string, string][] = [
  ["Kerja lebih ringan", "Data dicatat sekali dan dipakai di semua fitur, jadi lebih sedikit catat ulang dan cocokkan manual.", "Lama tutup buku · jumlah data yang diketik dua kali"],
  ["Data lebih akurat", "Berat, harga, dan stok berasal dari hasil timbang yang tercatat di tiap produksi.", "Selisih catatan dan stok di gudang · selisih berat kirim dan terima"],
  ["Asal produk jelas", "Jejak tiap produksi dari pemasok sampai pembeli, siap dipakai kalau ada masalah mutu atau produk perlu ditarik.", "Waktu untuk melacak satu produksi"],
  ["Keuangan terkendali", "Biaya dicatat sekali, uang keluar dan pencatatan biaya dibedakan, dan periode dikunci setelah tutup buku.", "Selisih saat mencocokkan catatan · lama tagihan belum dibayar"],
  ["Laporan lebih cepat", "Laporan harian dan keuangan diambil dari data yang sudah tercatat dan disetujui.", "Waktu menyiapkan laporan bulanan"],
  ["Keputusan lebih mudah", "Ringkasan, skenario, dan peringatan uang membantu merencanakan.", "Seberapa sering hasil nyata dibandingkan rencana"],
];
export const s21 = mk(
  21,
  "Manfaat bisnis yang diharapkan",
  [
    ...std(21, "Manfaat bisnis", "Enam area manfaat yang akan kita ukur bersama", "Kami tidak menjanjikan angka peningkatan. Kondisi awal dan target kita ukur bersama saat diskusi."),
    ...val.flatMap(([t, d, m], i): El[] => {
      const w = (1680 - 2 * 24) / 3;
      const x = 120 + (i % 3) * (w + 24);
      const y = 262 + Math.floor(i / 3) * 346;
      return [
        rect(x, y, w, 2, C.border),
        txt(x, y + 22, w, 40, t, 28, { bold: true, color: C.navy, va: "m", lh: 1.1 }),
        txt(x, y + 76, w - 24, 130, d, 21, { color: C.muted, lh: 1.38 }),
        rect(x, y + 216, w - 24, 90, C.aqua, { r: 16 }),
        txt(x + 18, y + 224, w - 60, 24, "Yang akan diukur", 17, { color: C.teal, va: "m" }),
        txt(x + 18, y + 252, w - 60, 50, m, 19, { color: C.navy, bold: true, lh: 1.25 }),
      ];
    }),
  ],
  "Manfaat dinyatakan sebagai potensi dan indikator yang akan diukur, tanpa angka perbaikan yang dijanjikan.",
  [
    { kind: "proposed", ref: "Brief — Slide 21", claim: "Enam area manfaat; tanpa angka peningkatan kinerja" },
  ],
);
