import { C, txt, rect, ell, ln, img, card, chip, badge, kpi, table, bullets, section } from "@/lib/kit";
import type { El } from "@/lib/scene";
import { mk, std } from "./_h";

/* ---------------- 22 ROADMAP ---------------- */
const x0 = 440;
const wk = (1800 - x0) / 26;
const phases: { n: string; name: string; range: string; start: number; len: number; color: string; items: string[] }[] = [
  { n: "0", name: "Diskusi", range: "2–3 minggu", start: 0, len: 2.5, color: C.faint, items: ["Wawancara tim", "Cek data yang ada", "Rancangan dan rencana"] },
  { n: "1", name: "Aplikasi dasar", range: "6–8 minggu", start: 2.5, len: 7, color: C.navy, items: ["Akun dan peran", "Pembelian, produksi, stok", "Penjualan dan laporan"] },
  { n: "2", name: "Khusus perikanan", range: "5–7 minggu", start: 8.5, len: 6, color: C.ocean, items: ["Mutu dan asal produk", "Gudang dingin dan ABF", "Jadwal produksi"] },
  { n: "3", name: "Keuangan", range: "4–6 minggu", start: 12.5, len: 5, color: C.teal, items: ["Catatan keuangan", "Biaya tiap produksi", "Laporan bulanan"] },
  { n: "4", name: "Uji & mulai pakai", range: "2–3 minggu", start: 16.5, len: 2.5, color: "#0B7F5C", items: ["Uji bersama pengguna", "Pelatihan", "Mulai dipakai"] },
];
export const s22 = mk(
  22,
  "Rencana pengerjaan",
  [
    ...std(22, "Rencana pengerjaan", "Lima tahap pengerjaan, sebagian bisa berjalan bersamaan", "Perkiraan awal, bukan janji tenggat."),
    ...Array.from({ length: 14 }, (_, i): El => txt(x0 + i * 2 * wk - 30, 258, 60, 26, String(i * 2), 16, { color: C.faint, align: "c", va: "m", lh: 1 })),
    txt(120, 258, 300, 26, "MINGGU →", 14, { color: C.faint, bold: true, ls: 1.4, va: "m" }),
    ...Array.from({ length: 14 }, (_, i): El => ln(x0 + i * 2 * wk, 290, x0 + i * 2 * wk, 296 + 6 * 54 - 6, "#E3E2DC", 1)),
    ...phases.flatMap((p, i): El[] => {
      const y = 296 + i * 54;
      return [
        txt(120, y, 310, 44, `Tahap ${p.n} · ${p.name}`, 19, { bold: true, color: C.navy, va: "m", lh: 1 }),
        rect(x0 + p.start * wk, y, p.len * wk, 44, p.color, { r: 8 }),
        txt(x0 + p.start * wk + 12, y, Math.max(p.len * wk - 16, 120), 44, p.range, 17, { color: C.white, bold: true, va: "m", lh: 1 }),
      ];
    }),
    txt(120, 296 + 5 * 54, 310, 44, "Cadangan waktu", 19, { bold: true, color: C.muted, va: "m", lh: 1 }),
    rect(x0 + 19 * wk, 296 + 5 * 54, 7 * wk, 44, undefined, { line: C.faint, lw: 2, dash: true, r: 8 }),
    txt(x0 + 19 * wk + 12, 296 + 5 * 54, 7 * wk - 20, 44, "Cadangan sampai minggu 26", 15, { color: C.muted, va: "m", lh: 1.15 }),
    ...phases.flatMap((p, i): El[] => {
      const w = (1680 - 4 * 20) / 5;
      const x = 120 + i * (w + 20);
      return [
        card(x, 650, w, 292, { r: 12 }),
        rect(x, 650, w, 6, p.color, { r: 3 }),
        txt(x + 18, 668, w - 36, 28, `TAHAP ${p.n} · ${p.range.toUpperCase()}`, 14, { color: C.teal, bold: true, ls: 1.1, va: "m", lh: 1 }),
        bullets(x + 18, 706, w - 32, 232, p.items, 20, { para: 10, lh: 1.25 }),
      ];
    }),
  ],
  "Durasi per fase dari brief: 2–3, 6–8, 5–7, 4–6, 2–3 minggu. Bila dijalankan berurutan totalnya 19–27 minggu; dengan tumpang tindih terkendali dan buffer, Lengkap ditargetkan 18–26 minggu (perkiraan awal).",
  [
    { kind: "commercial", ref: "Brief — Part F", claim: "Tahap 0: 2–3 minggu; Tahap 1: 6–8; Tahap 2: 5–7; Tahap 3: 4–6; Tahap 4: 2–3; tidak ada janji tenggat tanpa syarat" },
    { kind: "derived", ref: "Dihitung", claim: "Total berurutan 19–27 minggu; target Lengkap 18–26 minggu dengan tumpang tindih terkendali dan buffer" },
  ],
);

/* ---------------- 23 PACKAGE COMPARISON ---------------- */
interface Pkg { name: string; pos: string; lead: string; items: string[]; pro?: boolean }
const pkgs: Pkg[] = [
  {
    name: "Paket Dasar", pos: "Catat pekerjaan inti", lead: "Isi paket:",
    items: ["Dashboard owner", "Pembelian dan pemasok", "Produksi dasar", "Stok dan gudang", "Penjualan dan tagihan", "Keuangan dasar"],
  },
  {
    name: "Paket Lengkap", pos: "Harian dan keuangan terhubung", lead: "Semua isi Dasar, ditambah:", pro: true,
    items: ["Produksi lengkap", "Cek mutu dan asal produk", "Gudang dingin dan pembekuan", "Jadwal produksi", "Biaya tiap produksi", "Laporan keuangan bulanan", "Laporan untuk direksi"],
  },
  {
    name: "Paket Penuh", pos: "Pengawasan lebih lengkap", lead: "Semua isi Lengkap, ditambah:",
    items: ["Coba skenario harga", "Pengingat tagihan dan jadwal", "Laporan tambahan sesuai kebutuhan"],
  },
];
export const s23 = mk(
  23,
  "Perbandingan paket",
  [
    ...std(23, "Paket komersial", "Tiga paket, mulai dari yang paling dasar", "Isi paket bisa disesuaikan. Harga dibahas setelah fitur disepakati."),
    ...pkgs.flatMap((p, i): El[] => {
      const x = 120 + i * 570;
      const y = p.pro ? 300 : 338;
      const h = p.pro ? 600 : 556;
      const off = p.pro ? 52 : 0;
      const tc = p.pro ? C.white : C.navy;
      const mc = p.pro ? "#CFEFE3" : C.muted;
      return [
        card(x, y, 540, h, { fill: p.pro ? C.navy : C.white, line: p.pro ? C.teal : C.border, lw: p.pro ? 4 : 2, r: 18 }),
        ...(p.pro ? chip(x + 24, y + 18, "PAKET YANG DISARANKAN", { fill: C.teal, color: C.white, size: 16, h: 32, w: 270 }).els : []),
        txt(x + 26, y + 22 + off, 490, 40, p.name, 32, { bold: true, color: tc, va: "m", lh: 1 }),
        txt(x + 26, y + 66 + off, 490, 52, p.pos, 19, { color: mc, italic: true, lh: 1.3 }),
        ln(x + 26, y + 128 + off, x + 514, y + 128 + off, p.pro ? "#2F8E75" : C.border, 1.5),
        txt(x + 26, y + 144 + off, 490, 30, p.lead, 20, { bold: true, color: p.pro ? C.aquaOnDark : C.teal, va: "m", lh: 1 }),
        bullets(x + 26, y + 190 + off, 490, h - 210 - off, p.items, 22, { para: 11, color: tc, lh: 1.22 }),
      ];
    }),
  ],
  "Tiga paket dibedakan hanya dari isi fitur. Tidak ada harga di slide ini; harga dibahas setelah fitur yang dibutuhkan disepakati. Paket Lengkap disarankan karena butuh pekerjaan harian dan keuangan yang terhubung.",
  [
    { kind: "proposed", ref: "Brief — Part E", claim: "Isi fitur tiap paket; harga sengaja tidak dicantumkan pada deck ini" },
    { kind: "assumption", ref: "Brief — Pricing rules", claim: "Harga perkiraan awal, tidak mengikat; peralatan dan sambungan dinilai terpisah" },
  ],
);

/* ---------------- 24 RECOMMENDED SOLUTION ---------------- */
const reasons: [string, string][] = [
  ["Dibuat untuk usaha perikanan", "Aplikasi stok biasa tidak bisa mengurus produksi, hasil olahan, tarif gudang dingin bertingkat, dan giliran mitra."],
  ["Tutup buku butuh keuangan yang terhubung", "Mencocokkan uang, stok, dan tagihan, serta menghitung biaya tiap produksi, perlu fitur keuangan yang nyambung."],
  ["Dikerjakan bertahap", "Tiap tahap dicek dan diuji dulu sebelum lanjut ke tahap berikutnya."],
  ["Bisa naik ke Penuh nanti", "Fitur skenario dan pengingat bisa ditambah ke aplikasi yang sama."],
];
const stages: [string, string, string][] = [
  ["Dasar", "Tahap 0–1", "Diskusi, data induk, pembelian, produksi, stok, penjualan"],
  ["Khusus perikanan", "Tahap 2", "Mutu, asal produk, hasil olahan, gudang dingin dan ABF, jadwal"],
  ["Keuangan dan laporan", "Tahap 3", "Akuntansi, hitungan biaya, arus uang, laporan keuangan, dan ringkasan"],
  ["Uji dan mulai pakai", "Tahap 4", "Uji bersama pengguna, cocokkan catatan, cek keamanan dan cadangan, pelatihan"],
];
export const s24 = mk(
  24,
  "Solusi yang direkomendasikan: Paket Lengkap",
  [
    ...std(24, "Solusi yang direkomendasikan", "Paket Lengkap, dibangun bertahap supaya aman", "Ini saran awal. Kita pastikan lagi setelah diskusi kebutuhan."),
    ...reasons.flatMap(([t, d], i): El[] => {
      const y = 262 + i * 116;
      return [
        txt(120, y, 800, 36, t, 26, { bold: true, color: C.navy, va: "m", lh: 1.1 }),
        txt(120, y + 40, 800, 66, d, 20, { color: C.muted, lh: 1.35 }),
      ];
    }),
    rect(120, 746, 800, 196, C.navy, { r: 14 }),
    txt(150, 762, 740, 28, "Langkah pertama yang kami sarankan", 16, { color: C.aquaOnDark, bold: true, ls: 1.6, va: "m" }),
    txt(150, 798, 740, 130, "Mulai dari diskusi kebutuhan (2–3 minggu), lalu tentukan isi paket Lengkap. Naik ke Penuh bisa dipikirkan setelah aplikasi berjalan lancar.", 24, { color: C.white, bold: true, lh: 1.35 }),
    ...stages.flatMap(([t, ph, d], i): El[] => {
      const y = 262 + i * 168;
      return [
        card(980, y, 820, 128),
        rect(980, y, 8, 128, [C.navy, C.ocean, C.teal, "#0B7F5C"][i], { r: 4 }),
        txt(1010, y + 14, 520, 36, t, 25, { bold: true, color: C.navy, va: "m", lh: 1 }),
        ...chip(1660, y + 16, ph, { fill: C.aqua, color: C.teal, size: 16, h: 30, w: 116 }).els,
        txt(1010, y + 58, 770, 62, d, 19, { color: C.muted, lh: 1.35 }),
        ...(i < 3 ? [
          ln(1390, y + 128, 1390, y + 168, C.border, 2),
          ...chip(1190, y + 134, "Cek hasil dan atur prioritas", { fill: C.ice, color: C.ocean, size: 14, h: 26, w: 400 }).els,
        ] : []),
      ];
    }),
  ],
  "Tahapan di kanan memetakan Tahap 0–4. Setiap tahap ditutup dengan tinjauan hasil sehingga cakupan dan prioritas dapat disesuaikan sebelum investasi berikutnya.",
  [
    { kind: "commercial", ref: "Brief — Slide 24", claim: "Lengkap sebagai target awal; penerapan bertahap untuk mengelola risiko" },
    { kind: "commercial", ref: "Brief — Part F", claim: "Pemetaan tahap ke Tahap 0–4" },
  ],
);

/* ---------------- 25 AFTER GO-LIVE ---------------- */
export const s25 = mk(
  25,
  "Layanan setelah aplikasi dipakai",
  [
    ...std(25, "Layanan lanjutan", "Bantuan tetap ada setelah aplikasi dipakai", "Harga dan cara pembayaran dibahas setelah fitur yang dibutuhkan disepakati."),
    table(120, 262, [300, 860], ["Layanan", "Isinya"], [
      [{ t: "Perbaikan kesalahan", b: true }, "Perbaiki fitur yang tidak sesuai; gratis selama garansi."],
      [{ t: "Pemeliharaan aplikasi", b: true }, "Menjaga aplikasi tetap aman dan lancar: pembaruan keamanan, pemantauan, dan cadangan data."],
      [{ t: "Bantuan", b: true }, "Bantuan memakai aplikasi."],
      [{ t: "Perubahan kecil", b: true }, "Perubahan kecil; disetujui tertulis."],
      [{ t: "Fitur baru", b: true }, "Fitur baru; dihitung terpisah."],
    ], { size: 20, rowH: 84, headH: 48 }),
    txt(120, 756, 1160, 70, "Perubahan di luar kesepakatan disetujui tertulis dulu.", 21, { color: C.muted, lh: 1.4 }),
    card(1320, 262, 480, 560),
    txt(1348, 282, 424, 34, "Soal harga", 26, { color: C.navy, va: "m", lh: 1 }),
    txt(1348, 326, 424, 150, "Harga dibahas setelah fitur disepakati.", 21, { color: C.muted, lh: 1.4 }),
    txt(1348, 500, 424, 30, "Di luar paket", 22, { color: C.navy, va: "m", lh: 1 }),
    bullets(1348, 544, 424, 270, ["Langganan penyimpanan online", "Nama alamat web", "Layanan pihak ketiga (misalnya pesan)", "Alat tambahan: sensor, timbangan, printer", "Fitur baru dan perubahan besar"], 20, { para: 10 }),
  ],
  "Slide ini tanpa angka harga atau persentase. Isinya hanya jenis layanan setelah aplikasi dipakai. Harga dan cara pembayaran dibahas setelah fitur disepakati.",
  [
    { kind: "proposed", ref: "Brief — Layanan lanjutan", claim: "Jenis layanan setelah serah terima (perbaikan, pemeliharaan, bantuan, perubahan kecil, fitur baru); angka harga, termin, garansi, dan persentase pemeliharaan sengaja tidak dicantumkan" },
  ],
);

/* ---------------- 26 ASSUMPTIONS & DISCOVERY ---------------- */
const checklist = [
  "Jumlah fasilitas dan lokasi operasi", "Jumlah pengguna dan peran akses", "Cara mencatat sekarang", "Alat pembukuan yang dipakai", "Cara membeli ikan",
  "Cara kerja produksi", "Cara cek mutu", "Fasilitas dan peralatan gudang dingin", "Peralatan dan kapasitas ABF", "Alat pemantau suhu",
  "Timbangan digital", "Kebutuhan printer label", "Format tagihan sekarang", "Aturan akuntansi dan pajak", "Format laporan dan siapa yang menyetujui",
  "Data lama yang perlu dipindah", "Kebutuhan keamanan data", "Kebutuhan ekspor dan pelacakan asal produk", "Target kapan mulai dipakai", "Anggaran yang disetujui",
];
export const s26 = mk(
  26,
  "Hal yang perlu disepakati",
  [
    ...std(26, "Asumsi & diskusi kebutuhan", "Hal yang perlu kita bahas sebelum menentukan harga akhir", "Perkiraan di dokumen ini akan kami sesuaikan dengan jawaban Anda atas daftar ini."),
    card(120, 262, 520, 682),
    txt(146, 276, 470, 30, "Dasar perkiraan harga dan jadwal", 16, { color: C.teal, bold: true, ls: 1.4, va: "m" }),
    bullets(146, 322, 470, 610, [
      "Hanya satu lokasi usaha",
      "Jumlah pengguna dan perannya belum ditentukan",
      "Pemindahan data lama belum termasuk",
      "Sensor suhu, timbangan, dan printer label dihitung terpisah",
      "Aturan akuntansi dan pajak dicek saat penerapan",
      "Biaya online (penyimpanan, alamat web, cadangan) dan layanan pihak ketiga ditagih terpisah",
      "Harga final setelah diskusi kebutuhan dan rancangan kerja disetujui",
    ], 21, { para: 14 }),
    rect(146, 818, 468, 100, C.aqua, { r: 10 }),
    txt(164, 818, 432, 100, "Kalau dasar berubah, harga ikut berubah.", 20, { color: C.navy, bold: true, va: "m", lh: 1.35 }),
    ...checklist.flatMap((t, i): El[] => {
      const col = Math.floor(i / 10);
      const row = i % 10;
      const x = 680 + col * 570;
      const y = 262 + row * 68;
      return [
        rect(x, y, 548, 58, C.white, { r: 8, line: C.border, lw: 1.5 }),
        txt(x + 14, y, 44, 58, String(i + 1).padStart(2, "0"), 20, { color: C.teal, bold: true, mono: true, va: "m", lh: 1 }),
        txt(x + 64, y, 470, 58, t, 20, { va: "m", lh: 1.15 }),
      ];
    }),
  ],
  "Daftar ini mengikuti Part K brief. Tidak ada angka harga final yang diberikan sebelum item-item ini terjawab.",
  [
    { kind: "assumption", ref: "Brief — Part K", claim: "Dua puluh informasi untuk penawaran mengikat" },
    { kind: "assumption", ref: "Brief — Slide 26", claim: "Asumsi: satu fasilitas, pengguna belum ditetapkan, migrasi dan peralatan tidak termasuk" },
  ],
);

/* ---------------- 27 NEXT STEPS ---------------- */
const steps27: [string, string, string][] = [
  ["Sesi diskusi kebutuhan", "Kami presentasi, kita bahas prioritas.", "Daftar pertanyaan dan peserta"],
  ["Pastikan kebutuhan", "Kita lengkapi informasi dan wawancara tim.", "Kebutuhan sudah pasti"],
  ["Persetujuan rancangan kerja", "Tahap 0 (2–3 minggu): sepakati kebutuhan dan rencana.", "Rancangan kerja disetujui"],
  ["Penawaran final", "Harga dan jadwal sesuai kebutuhan.", "Penawaran dan kontrak"],
  ["Mulai dibuat", "Pembayaran awal, pengerjaan dimulai.", "Proyek berjalan"],
];
export const s27 = mk(
  27,
  "Langkah selanjutnya",
  [
    ...std(27, "Langkah selanjutnya", "Lima langkah dari diskusi hingga mulai proyek"),
    ln(160, 330, 1760, 330, C.border, 3),
    ...steps27.flatMap(([t, d, o], i): El[] => {
      const w = (1680 - 4 * 24) / 5;
      const x = 120 + i * (w + 24);
      return [
        ...badge(x, 306, 48, String(i + 1), i === 0 ? C.teal : C.navy, C.white, 22),
        card(x, 376, w, 420),
        txt(x + 22, 396, w - 44, 70, t, 26, { bold: true, color: C.navy, lh: 1.2 }),
        txt(x + 22, 480, w - 44, 170, d, 20, { color: C.muted, lh: 1.4 }),
        rect(x + 14, 660, w - 28, 120, C.aqua, { r: 10 }),
        txt(x + 28, 670, w - 56, 24, "HASIL", 14, { color: C.teal, bold: true, ls: 1.3, va: "m" }),
        txt(x + 28, 700, w - 56, 70, o, 21, { color: C.navy, bold: true, lh: 1.3 }),
      ];
    }),
    rect(120, 830, 1680, 100, C.navy, { r: 12 }),
    txt(150, 830, 1620, 100, "Langkah pertama: jadwalkan diskusi dengan direksi dan perwakilan tiap bagian.", 22, { color: C.white, bold: true, va: "m", lh: 1.35 }),
  ],
  "Pastikan peserta sesi diskusi kebutuhan mewakili fungsi operasional, produksi, mutu, gudang, penjualan, dan keuangan.",
  [{ kind: "proposed", ref: "Brief — Slide 27", claim: "Lima langkah: diskusi kebutuhan, requirements, rancangan kerja, proposal final, mulai proyek" }],
);

/* ---------------- 28 CLOSING ---------------- */
export const s28 = mk(
  28,
  "Penutup — kelola usaha lebih mudah",
  [
    txt(120, 72, 700, 56, "Dar Dev", 40, { color: C.white, weight: 800, va: "m", lh: 1 }),
    img(1360, 60, 440, 176, "/brand/katalis-logo-white.png"),
    txt(110, 280, 1700, 330, "Mari kelola usaha perikanan lebih mudah dan jelas.", 104, { color: C.white, weight: 800, lh: 1.06, va: "m" }),
    txt(120, 650, 1500, 90, "Semua aktivitas terlihat dan terkendali dari satu dashboard. Penawaran ini belum mengikat; harga dibahas setelah fitur disepakati.", 30, { color: C.aquaOnDark, weight: 500, lh: 1.25 }),
    rect(120, 780, 560, 92, C.white, { r: 46 }),
    txt(120, 780, 560, 92, "Jadwalkan diskusi kebutuhan", 28, { color: C.ocean, weight: 800, align: "c", va: "m", lh: 1 }),
  ],
  "Tutup dengan ajakan konkret: jadwalkan diskusi kebutuhan.",
  [{ kind: "proposed", ref: "Brief — Slide 28", claim: "Pesan penutup dan ajakan" }],
  "dark",
);
