import { C, txt, rect, ell, ln, img, card, chip, badge, kpi, bars, table, section, bullets, mockWindow, illustrative } from "@/lib/kit";
import type { El } from "@/lib/scene";
import { mk, std, SRC_LINE } from "./_h";

/* ---------------- 01 COVER ---------------- */
export const s01 = mk(
  1,
  "Cover — KATALIS ERP",
  [
    txt(120, 72, 700, 56, "Dar Dev", 40, { color: C.white, weight: 800, va: "m", lh: 1 }),
    txt(120, 130, 800, 80, "Penawaran aplikasi untuk usaha perikanan Anda", 24, { color: C.aquaOnDark, lh: 1.35 }),
    img(1300, 120, 500, 200, "/brand/katalis-logo-white.png"),
    txt(1180, 350, 620, 120, "Disiapkan untuk PT Katalis Lintas Global\nOktober 2026", 26, { color: C.white, align: "r", lh: 1.5 }),
    txt(110, 590, 1700, 290, "KATALIS ERP.", 212, { color: C.white, weight: 800, lh: 1, va: "m" }),
    txt(120, 860, 1500, 60, "Kelola usaha perikanan lebih mudah dalam satu aplikasi.", 34, { color: C.aquaOnDark, weight: 500, lh: 1.2 }),
  ],
  "Pembuka. Dokumen ini penawaran awal untuk dibahas bersama; harga dibahas setelah fitur disepakati.",
  [
    { kind: "source", ref: "Proposal hlm. 1", claim: "Klien: PT Katalis Lintas Global; usaha perikanan; dokumen bertanggal 1 Oktober 2026" },
    { kind: "proposed", ref: "Brief — Slide 01", claim: "Nama produk KATALIS ERP; vendor Dar Dev (nama teks, belum ada logo)" },
  ],
  "dark",
);

/* ---------------- 02 EXECUTIVE SUMMARY ---------------- */
const values02 = [
  ["Satu dashboard", "Semua aktivitas dalam satu layar"],
  ["Lacak asal produk", "Dari pemasok sampai pembeli"],
  ["Lihat biaya produk", "Biaya dan untung tiap produk"],
  ["Keuangan lebih jelas", "Uang masuk, piutang, laba jelas"],
  ["Siap berkembang", "Tarif bisa diubah sendiri"],
];
const cards02 = [
  ["01", "Masalah yang kami lihat", "Tujuh masalah dari data Siklus 1 dan proposal."],
  ["02", "Fitur yang menjawabnya", "Tiap masalah punya fitur dan contoh tampilan."],
  ["03", "Saran kami: paket Lengkap, bertahap", "Mulai dari diskusi 2–3 minggu, lihat hasil tiap tahap."],
];
export const s02 = mk(
  2,
  "Ringkasan untuk direksi",
  [
    ...std(2, "Ringkasan untuk direksi", "Kontrol seluruh usaha perikanan dari satu dashboard", "Harga dibahas setelah fitur yang dibutuhkan disepakati."),
    txt(120, 262, 780, 200, "Lihat untung, stok, dan tagihan usaha Anda hari ini juga, tanpa menunggu laporan.", 36, { color: C.ink, weight: 700, lh: 1.3 }),
    ...section(120, 478, 780, "Yang kami temukan di data Anda"),
    txt(120, 524, 780, 230, "Ongkos kirim besar, 65 kg sisa olahan belum terjual, dan hasil tiap ekor berbeda jauh. Kami bantu menutup semuanya.", 24, { color: C.muted, lh: 1.42 }),
    ...cards02.flatMap(([n, t, d], i): El[] => {
      const y = 262 + i * 168;
      return [
        card(960, y, 840, 148),
        txt(990, y + 18, 790, 36, t, 28, { bold: true, color: C.navy, va: "m", lh: 1.1 }),
        txt(990, y + 60, 790, 80, d, 21, { color: C.muted, lh: 1.32 }),
      ];
    }),
    ...values02.flatMap(([t, d], i): El[] => {
      const w = (1680 - 4 * 22) / 5;
      const x = 120 + i * (w + 22);
      return [
        rect(x, 780, w, 160, C.navy, { r: 12 }),
        rect(x + 20, 800, 36, 4, C.aquaOnDark, { r: 2 }),
        txt(x + 20, 816, w - 40, 34, t, 22, { color: C.white, bold: true, lh: 1.1, va: "m" }),
        txt(x + 20, 856, w - 40, 76, d, 19, { color: "#CFEFE3", lh: 1.3 }),
      ];
    }),
  ],
  "Satu halaman untuk direksi: apa itu KATALIS ERP, mengapa relevan, dan apa rekomendasinya. Lima nilai bisnis adalah benang merah deck.",
  [
    { kind: "proposed", ref: "Brief — Part B", claim: "Value proposition dan lima nilai bisnis" },
    { kind: "source", ref: "Proposal hlm. 3, 17–18", claim: "Dua mitra pengambil loin dengan giliran bergantian; penutupan dan pencocokan catatan bulanan" },
    { kind: "commercial", ref: "Brief — Part E", claim: "Pengerjaan bertahap dimulai diskusi kebutuhan 2–3 minggu; harga sengaja tidak dicantumkan di deck" },
  ],
);

/* ---------------- 03 UNDERSTANDING YOUR BUSINESS ---------------- */
const lines03 = [
  ["A", "Daging tuna segar", "Dua jenis: natural dan CO · giliran PT SNS", "Natural: modal Rp120.000/kg · jual Rp140.000/kg\nCO: modal Rp90.000/kg · jual Rp115.000/kg"],
  ["B", "Tuna CO beku", "Produksi dalam jumlah kecil", "modal maksimal Rp70.000/kg\njual Rp83.000–86.000/kg"],
  ["C", "Pembelian & pengolahan CV DUS", "Giliran CV DUS · jasa ditagih terpisah", "Beli ikan Rp45.000/kg, dijual ke CV DUS Rp50.000/kg\nOngkos olah per produk Rp2.500–9.400/kg"],
  ["D", "Gudang dingin pihak luar", "Rp75 per kg per hari", "Simpan lebih dari 1 hari: minimal ditagih 10 hari\nMulai hari ke-11, tambah Rp75/kg per hari"],
  ["E", "Mesin pembekuan cepat (ABF)", "Jasa pembekuan pihak luar", "Rp3.500 per kg\nPemakaian sendiri tidak ditagihkan"],
  ["F", "Alternatif: kakap merah & kerapu", "Usaha pengganti, bukan tambahan", "Memakai modal kerja yang sama\nTidak jalan bersamaan dengan usaha utama"],
];
export const s03 = mk(
  3,
  "Memahami bisnis Anda: enam jenis usaha",
  [
    ...std(3, "Memahami bisnis Anda", "Enam jenis usaha Katalis", SRC_LINE + ", hlm. 1, 5–12. Harga dan tarif adalah angka proposal, bukan transaksi nyata."),
    ...[0, 1, 2].flatMap((i) => [
      ln(660, 375 + i * 215, 770, [500, 570, 640][i], C.border, 3),
      ln(1260, 375 + i * 215, 1150, [500, 570, 640][i], C.border, 3),
    ]),
    ...lines03.flatMap(([k, t, s, d], i): El[] => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col === 0 ? 120 : 1260;
      const y = 280 + row * 215;
      const alt = k === "F";
      return [
        card(x, y, 540, 190, { line: alt ? C.faint : C.border, dash: alt }),
        ...badge(x + 20, y + 20, 40, k, alt ? C.faint : C.ocean, C.white, 20),
        txt(x + 74, y + 16, 450, 34, t, 25, { bold: true, color: C.navy, va: "m", lh: 1.1 }),
        txt(x + 74, y + 52, 450, 28, s, 19, { color: C.teal, bold: true, va: "m", lh: 1.1 }),
        txt(x + 22, y + 94, 500, 86, d, 19, { color: C.muted, lh: 1.35 }),
      ];
    }),
    rect(770, 440, 380, 260, C.navy, { r: 18 }),
    txt(790, 462, 340, 26, "PUSAT USAHA", 17, { color: C.aquaOnDark, bold: true, ls: 1.6, align: "c", va: "m" }),
    txt(790, 498, 340, 110, "PT Katalis\nLintas Global", 36, { color: C.white, bold: true, align: "c", lh: 1.15, va: "m" }),
    txt(790, 620, 340, 66, "Beli · olah · cek mutu · simpan · kirim · tagih · lapor", 17, { color: "#CFEFE3", align: "c", lh: 1.3 }),
    card(770, 280, 380, 130, { fill: C.aqua, line: "#BFE3E0" }),
    txt(790, 292, 340, 26, "MITRA PEMBELI", 16, { color: C.teal, bold: true, ls: 1.5, align: "c", va: "m" }),
    txt(790, 322, 340, 80, "PT SNS dan CV DUS\nGantian tiap hari, boleh jual ke pihak lain", 19, { color: C.navy, bold: true, align: "c", lh: 1.35, va: "m" }),
    card(770, 730, 380, 160, { fill: C.aqua, line: "#BFE3E0" }),
    txt(790, 742, 340, 26, "JAM OPERASI", 16, { color: C.teal, bold: true, ls: 1.5, align: "c", va: "m" }),
    txt(790, 772, 340, 60, "Sen–Jum 08.00–17.00", 25, { color: C.navy, bold: true, align: "c", va: "m" }),
    txt(790, 836, 340, 48, "Sabtu 08.00–12.00", 17, { color: C.muted, align: "c", lh: 1.3 }),
    ln(960, 410, 960, 440, C.border, 3),
    ln(960, 700, 960, 730, C.border, 3),
  ],
  "Tunjukkan bahwa kami membaca proposal dengan teliti. Enam jenis usaha ini bersumber dari proposal; jenis usaha F adalah alternatif yang menggantikan sebagian portofolio, bukan tambahan.",
  [
    { kind: "source", ref: "Proposal hlm. 5–9", claim: "biaya produk, harga jual, tarif jasa, dan harga beli CV DUS per jenis usaha" },
    { kind: "source", ref: "Proposal hlm. 8", claim: "Tarif gudang dingin Rp75/kg/hari, minimum 10 hari; ABF Rp3.500/kg" },
    { kind: "source", ref: "Proposal hlm. 4, 12", claim: "Kerja sama boleh melayani pihak lain; alternatif kakap/kerapu menggantikan perdagangan tuna dan DUS" },
  ],
);

/* ---------------- 04 BUSINESS SCALE ---------------- */
const scaleRows: [string, string][] = [
  ["Daging tuna segar (PT SNS)", "Natural: modal Rp120.000, jual Rp140.000 · CO: modal Rp90.000, jual Rp115.000 per kg"],
  ["Tuna CO beku", "modal maksimal Rp70.000, jual Rp83.000–86.000 per kg"],
  ["Pembelian & pengolahan CV DUS", "Beli Rp45.000, jual ke CV DUS Rp50.000 per kg + 5 ongkos olah Rp2.500–9.400/kg"],
  ["Gudang dingin pihak luar", "Rp75/kg per hari, minimal 10 hari, mulai hari ke-11 tambah Rp75/kg per hari"],
  ["Mesin pembekuan cepat (ABF)", "Rp3.500 per kg yang dibekukan"],
];
export const s04 = mk(
  4,
  "Skala dan kompleksitas operasi",
  [
    ...std(4, "Gambaran usaha", "Enam jenis usaha, dua mitra, satu catatan bersama", SRC_LINE + ", hlm. 4–9. Kapasitas dan jam adalah perkiraan di proposal."),
    ...(() => {
      const w = (1680 - 3 * 24) / 4;
      const t: [string, string, string, string][] = [
        ["LINI USAHA", "6", "Segar, beku, DUS, simpan, pembekuan, alternatif", C.navy],
        ["MITRA PEMBELI", "2", "PT SNS dan CV DUS, giliran bergantian", C.ocean],
        ["JAM KERJA MITRA", "49 jam", "per minggu: CV DUS 27 jam + PT SNS 22 jam", C.teal],
        ["KAPASITAS PERKIRAAN", "3.000 kg", "bahan per hari kerja penuh (perkiraan, bukan hasil uji mesin)", C.amber],
      ];
      return t.flatMap(([l, v, s, a], i) => kpi(120 + i * (w + 24), 262, w, 196, l, v, s, { accent: a, valSize: 56, plain: true }));
    })(),
    card(120, 486, 560, 452),
    txt(150, 502, 500, 30, "Jam kerja tiap mitra", 24, { bold: true, color: C.navy, va: "m" }),
    ...bars(150, 552, 500, 300, [
      { label: "CV DUS (Sen, Rab, Jum)", value: 27, text: "27 jam", color: C.ocean },
      { label: "PT SNS (Sel, Kam, Sab)", value: 22, text: "22 jam", color: C.teal },
    ], { barW: 120, valSize: 22, labelSize: 18, labelH: 60 }),
    txt(150, 870, 500, 60, "Sen–Jum 08.00–17.00; Sabtu 08.00–12.00.", 18, { color: C.muted, lh: 1.35 }),
    card(704, 486, 1096, 452),
    txt(734, 502, 1040, 30, "Harga dan tarif yang harus dihitung aplikasi", 24, { bold: true, color: C.navy, va: "m" }),
    table(734, 552, [320, 716], ["Usaha", "Harga dan tarif"], scaleRows, { size: 18, rowH: 54, headH: 46, align: ["l", "l"] }),
    txt(734, 884, 1040, 48, "Tiap jenis usaha punya modal, harga, dan tarif sendiri. Ini angka dari proposal, bukan transaksi nyata.", 18, { color: C.muted, lh: 1.3 }),
  ],
  "Slide ini menunjukkan kompleksitas operasi yang harus ditangani sistem, bukan angka pendanaan. Semua angka dari proposal hlm. 4-9; kapasitas 3.000 kg dan jam operasi adalah asumsi perencanaan proposal.",
  [
    { kind: "source", ref: "Proposal hlm. 4", claim: "Giliran dan jam operasi: CV DUS 27 jam, PT SNS 22 jam per minggu; Sen–Jum 08.00–17.00, Sabtu 08.00–12.00" },
    { kind: "assumption", ref: "Proposal hlm. 4", claim: "Kapasitas nominal 3.000 kg bahan per hari penuh adalah asumsi, bukan kapasitas mesin terverifikasi" },
    { kind: "source", ref: "Proposal hlm. 5–9", claim: "biaya produk, harga jual, harga beli, tarif jasa CV DUS, CS Rp75/kg/hari dan ABF Rp3.500/kg" },
    { kind: "derived", ref: "Dihitung", claim: "49 jam per minggu = 27 + 22" },
  ],
);

/* ---------------- 05 PROBLEMS -> FEATURES ---------------- */
const problems05: [string, string][] = [
  ["Ongkos kirim 29,9% dari biaya", "Catat dan bandingkan ongkos kirim"],
  ["65 kg sisa olahan terbuang", "Stok dan penjualan sisa olahan"],
  ["Hasil tiap ekor beda (52% sampai 70%)", "Lihat hasil per ekor dan ukuran"],
  ["Enam kelas mutu, harga berbeda", "Harga mengikuti kelas otomatis"],
  ["Tarif gudang dingin rumit", "Tagihan dihitung otomatis"],
  ["Biaya kantor belum masuk laporan", "Biaya usaha ikut laporan bulanan"],
  ["Jadwal dua mitra bisa bentrok", "Kalender dengan tanda bentrok"],
];
export const s05 = mk(
  5,
  "Masalah operasional dan fitur yang menutupnya",
  [
    ...std(5, "Masalah dan penyelesaian", "Masalah dan jawabannya", "Angka dari data Siklus 1 (3 Okt 2026) dari owner dan proposal Katalis 1 Oktober 2026. Belum diperiksa pihak lain."),
    txt(120, 252, 760, 34, "Masalah", 26, { color: C.navy, va: "m", lh: 1 }),
    txt(960, 252, 840, 34, "Fitur", 26, { color: C.navy, va: "m", lh: 1 }),
    ...problems05.flatMap(([p, f], i): El[] => {
      const y = 298 + i * 92;
      return [
        rect(120, y, 1680, 1.5, C.border),
        txt(120, y + 10, 790, 76, p, 30, { color: C.ink, lh: 1.2, va: "m" }),
        txt(960, y + 10, 840, 76, f, 28, { color: C.ocean, lh: 1.2, va: "m" }),
      ];
    }),
    rect(120, 298 + 7 * 92, 1680, 1.5, C.border),
  ],
  "Slide ini menjawab 'apa masalahnya dan apa fiturnya'. Masalah diambil dari data nyata Siklus 1 (kargo 29,9% dari biaya, 65 kg hasil samping dibuang, yield per ekor 52,2% sampai 70,2%, enam kelas mutu) dan dari proposal (tarif gudang dingin, jadwal dua mitra). Biaya di luar siklus disebut di web owner sebagai belum termasuk.",
  [
    { kind: "source", ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "Kargo 29,9% dari biaya; 65 kg sisa olahan belum laku dan terbuang; yield per ekor 52,2%–70,2%, ekor di atas 37 kg cenderung grade B; B-SO Rp140.000 dan C-SO Rp125.000; biaya di luar siklus produksi belum termasuk" },
    { kind: "source", ref: "Proposal hlm. 4, 8", claim: "Giliran dua mitra; tarif gudang dingin bertingkat dengan minimum 10 hari" },
    { kind: "proposed", ref: "Analisis kami", claim: "Pemetaan masalah ke fitur 02, 03, 04, 05, 06, 07, 08, 09" },
  ],
);

/* ---------------- 06 DASHBOARD (HERO) ---------------- */
const states06 = ["Lancar", "Perhatian", "Perlu keputusan"];
const rows06: [string, string, number][] = [
  ["Pembelian ikan", "3 penerimaan hari ini, 3.640 kg", 0],
  ["Produksi", "1 produksi berjalan, hasil olahan 62,6%", 0],
  ["Pemeriksaan mutu", "1 penerimaan ditahan", 2],
  ["Stok dan gudang", "Gudang dingin terisi 88%", 1],
  ["Penjualan", "Selisih berat kirim dan terima 20 kg", 1],
  ["Tagihan dan uang", "2 tagihan jatuh tempo, Rp402 jt", 1],
  ["Layanan pihak luar", "2 pelanggan titip, 13.000 kg", 0],
  ["Jadwal", "Besok giliran PT SNS, tidak ada bentrok", 0],
];
const w6 = mockWindow(960, 262, 840, 690, { title: "Contoh tampilan · Dashboard Owner" });
const i6 = w6.inner;
export const s06 = mk(
  6,
  "Solusi yang diusulkan: Dashboard Owner",
  [
    ...std(6, "Solusi yang diusulkan", "Owner mengontrol semua aktivitas dari satu dashboard", "Ini contoh tampilan. Isi dashboard mengikuti fitur yang dipilih."),
    txt(120, 262, 770, 150, "Semua aktivitas usaha tampil di satu layar. Anda tinggal memutuskan.", 30, { lh: 1.42 }),
    ...[
      ["Lihat", "Semua aktivitas hari ini."],
      ["Putuskan", "Persetujuan menunggu di satu tempat."],
      ["Waspada", "Peringatan sebelum jadi masalah."],
      ["Bandingkan", "Hasil nyata dibanding rencana."],
    ].flatMap(([t, d], i): El[] => {
      const y = 450 + i * 122;
      return [
        ell(120, y + 12, 14, 14, C.teal),
        txt(152, y, 700, 34, t, 28, { color: C.navy, va: "m", lh: 1 }),
        txt(152, y + 40, 700, 70, d, 21, { color: C.muted, lh: 1.35 }),
      ];
    }),
    ...w6.els,
    txt(i6.x + 24, i6.y + 14, 520, 36, "Semua aktivitas hari ini", 24, { color: C.navy, va: "m", lh: 1 }),
    ...illustrative(i6.x + i6.w - 190, i6.y + 18),
    ...rows06.flatMap(([n, d, st], i): El[] => {
      const y = i6.y + 70 + i * 70;
      const fill = st === 2 ? C.navy : st === 1 ? C.amberSoft : C.aqua;
      const col = st === 2 ? C.white : st === 1 ? C.amber : C.teal;
      return [
        rect(i6.x + 24, y, i6.w - 48, 1.5, C.border),
        txt(i6.x + 24, y + 6, 250, 60, n, 22, { color: C.navy, va: "m", lh: 1.15 }),
        txt(i6.x + 280, y + 6, 330, 60, d, 19, { color: C.muted, va: "m", lh: 1.25 }),
        ...chip(i6.x + i6.w - 24 - 190, y + 16, states06[st], { fill, color: col, size: 18, h: 40, w: 190 }).els,
      ];
    }),
    rect(i6.x + 24, i6.y + 70 + 8 * 70, i6.w - 48, 1.5, C.border),
  ],
  "Slide ini menonjolkan dashboard sebagai fitur utama: owner melihat semua aktivitas, hal yang perlu diputuskan, dan peringatan di satu layar. Angka pada contoh tampilan hanya contoh (sebagian meminjam angka contoh slide fitur lain).",
  [
    { kind: "proposed", ref: "Brief — dashboard owner", claim: "Dashboard sebagai pusat kendali: semua aktivitas, persetujuan, peringatan, dan pembandingan hasil dengan rencana" },
    { kind: "illustrative", ref: "Contoh tampilan", claim: "Seluruh angka pada tampilan adalah data contoh" },
  ],
);

/* ---------------- 07 END-TO-END WORKFLOW ---------------- */
const flow07: [string, string[]][] = [
  ["Pengadaan", ["Pemasok & pesanan beli", "Persetujuan pembelian", "Timbang & harga/kg", "Utang ke pemasok"]],
  ["Produksi", ["Perintah & nomor produksi", "Bahan masuk, hasil olahan", "Hasil olahan & susut", "Biaya tenaga kerja & jasa"]],
  ["Mutu", ["Pemeriksaan & kelas mutu", "Suhu & foto", "Lolos / Ditahan / Ditolak", "Izin kirim"]],
  ["Penyimpanan", ["Stok per lokasi & produksi", "Milik Katalis vs titipan", "Gudang dingin dan ABF", "Catatan suhu"]],
  ["Penjualan", ["Kontrak & harga", "Giliran PT SNS / CV DUS", "Berat diterima pembeli", "Tagihan & piutang"]],
  ["Keuangan", ["Kas & bank", "Pencatatan keuangan otomatis", "Biaya tiap produksi", "Tutup buku bulanan"]],
  ["Pelaporan", ["Ringkasan untuk direksi", "Laporan harian", "Laporan keuangan", "Unduh Excel & PDF"]],
];
export const s07 = mk(
  7,
  "Alur kerja dari awal sampai akhir",
  [
    ...std(7, "Alur kerja dari awal sampai akhir", "Dari beli ikan sampai laporan, tanpa catat ulang", "Alur ini mengikuti proses di proposal ."),
    ...(() => {
      const gap = 30;
      const w = (1680 - 6 * gap) / 7;
      return flow07.flatMap(([t, items], i): El[] => {
        const x = 120 + i * (w + gap);
        const els: El[] = [
          card(x, 270, w, 430),
          rect(x, 270, w, 108, i === 6 ? C.teal : C.navy, { r: 14 }),
          txt(x + 16, 280, 44, 30, String(i + 1).padStart(2, "0"), 20, { color: C.aquaOnDark, bold: true, va: "m", lh: 1 }),
          txt(x + 16, 312, w - 28, 58, t, 23, { color: C.white, bold: true, lh: 1.1, va: "m" }),
          bullets(x + 16, 398, w - 28, 290, items, 19, { para: 14 }),
        ];
        if (i < 6) els.push(ln(x + w + 3, 316, x + w + gap - 3, 316, C.ocean, 3, { arrow: true }));
        return els;
      });
    })(),
    rect(120, 730, 1680, 196, C.navy, { r: 16 }),
    txt(160, 752, 520, 30, "PRINSIP ALUR DATA", 18, { color: C.aquaOnDark, bold: true, ls: 2, va: "m" }),
    txt(160, 792, 520, 110, "Catat sekali, dipakai di semua fitur.", 32, { color: C.white, bold: true, lh: 1.25 }),
    ...[
      ["Satu nomor produksi", "mengikuti ikan dari diterima sampai ditagih"],
      ["Satu data induk", "data pemasok, pembeli, produk, dan tarif tidak perlu diketik ulang"],
      ["Satu riwayat", "setiap perubahan tercatat: siapa, kapan, dan kenapa"],
    ].flatMap(([a, b], i): El[] => [
      rect(740 + i * 358, 770, 4, 120, C.teal, { r: 2 }),
      txt(764 + i * 358, 762, 320, 34, a, 24, { color: C.white, bold: true, va: "m", lh: 1.1 }),
      txt(764 + i * 358, 802, 320, 100, b, 20, { color: "#CFEFE3", lh: 1.35 }),
    ]),
  ],
  "Ini tulang punggung narasi. Setiap kotak memetakan satu tahap yang sudah ada di proposal; yang ditambahkan ERP adalah tautan data antar tahap.",
  [
    { kind: "source", ref: "Proposal hlm. 18", claim: "Katalis mengelola pemasok, pembelian, produksi, mutu, jadwal CS & ABF, distribusi, penagihan, dan laporan" },
    { kind: "proposed", ref: "Brief — Slide 07", claim: "Rantai Procurement → Production → mutu → Storage → Sales → Finance → Reporting" },
  ],
);
