import type { El } from "@/lib/scene";
import { img } from "@/lib/kit";
import { T } from "@/lib/darken";
import { R, O, X, L, place, darkPhone } from "@/lib/phone";
import { mk } from "./_h";

/**
 * Landing-page style slides (dark green-black, lime accent, bento cards, tag pill + big heading),
 * following the structure of the reference page: hero, how it works, for owners, impact, proof,
 * for the team, pricing, call to action, Q&A.  All content is ours.
 */
const CARD = "#1B2723";
const EDGE = "#2C3B35";

const page = (): El => X(1640, 1034, 220, 26, "00 / 00", 16, { color: T.faint, align: "r", va: "m", lh: 1 });

/** Tag pill: lime circle + label, as in the reference section markers. */
const tag = (x: number, y: number, label: string): El[] => {
  const w = 96 + label.length * 12;
  return [
    R(x, y, w, 52, CARD, { r: 26, line: EDGE, lw: 1.5 }),
    O(x + 8, y + 8, 36, 36, T.lime),
    O(x + 18, y + 18, 16, 16, undefined, { line: T.onLime, lw: 2.5 }),
    X(x + 56, y, w - 64, 52, label, 20, { weight: 600, va: "m", lh: 1 }),
  ];
};
const heading = (text: string, x = 900, y = 56, w = 960, size = 58): El => X(x, y, w, 150, text, size, { weight: 800, lh: 1.06, va: "t" });
const dot = (x: number, y: number): El[] => [O(x, y, 34, 34, T.lime), X(x, y, 34, 34, "✓", 18, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 })];
const frame = (x: number, y: number, w: number, h: number, r = 44): El => R(x, y, w, h, CARD, { r, line: EDGE, lw: 1.5 });

/* ----------------------------------------------------------------- 1 hero */
export const L1 = mk(
  1,
  "Cover — KATALIS ERP",
  [
    R(60, 40, 1800, 80, CARD, { r: 40, line: EDGE, lw: 1.5 }),
    O(80, 56, 48, 48, T.lime), X(80, 56, 48, 48, "D", 24, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 }),
    X(142, 56, 300, 48, "Dar Dev", 28, { weight: 800, va: "m", lh: 1 }),
    X(520, 40, 900, 80, "Cara Kerja      Untuk Owner      Untuk Tim      Paket      Tanya Jawab", 20, { color: T.sub, weight: 500, align: "c", va: "m", lh: 1 }),
    R(1600, 52, 240, 56, T.lime, { r: 28 }), X(1600, 52, 240, 56, "Mulai Diskusi", 20, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 }),
    img(60, 140, 1800, 800, "/art/hero.png"),
    R(1380, 170, 440, 56, "#00111A", { r: 28, line: "#3A5A4C", lw: 1.5, op: 0.8 }),
    X(1380, 170, 440, 56, "Disiapkan untuk PT Katalis Lintas Global", 18, { color: T.text, weight: 600, align: "c", va: "m", lh: 1 }),
    X(120, 340, 1200, 450, "Kelola Lebih Cerdas.\nUntung Lebih Jelas.", 100, { color: T.lime, weight: 800, lh: 1.0, va: "b" }),
    X(120, 818, 860, 100, "KATALIS ERP adalah aplikasi untuk mengurus seluruh usaha perikanan: dari beli ikan, produksi, stok, sampai laporan keuangan.", 22, { color: T.text, weight: 500, lh: 1.4 }),
    R(1110, 816, 330, 84, "#050B09", { r: 24, line: "#3A5A4C", lw: 1.5 }), X(1140, 824, 280, 68, "Saya Owner\nLihat dashboard", 20, { weight: 700, va: "m", lh: 1.3 }),
    R(1470, 816, 330, 84, "#050B09", { r: 24, line: "#3A5A4C", lw: 1.5 }), X(1500, 824, 280, 68, "Saya Tim Lapangan\nLihat aplikasi ponsel", 20, { weight: 700, va: "m", lh: 1.3 }),
    X(60, 962, 1200, 40, "Penawaran dari Dar Dev  ·  Oktober 2026  ·  Harga dibahas setelah fitur disepakati", 20, { color: T.sub, va: "m", lh: 1 }),
    page(),
  ],
  "Pembuka bergaya halaman produk. Penawaran awal untuk dibahas bersama; harga dibahas setelah fitur disepakati.",
  [
    { kind: "source", ref: "Proposal hlm. 1", claim: "Klien: PT Katalis Lintas Global; usaha perikanan; dokumen 1 Oktober 2026" },
    { kind: "proposed", ref: "Referensi gaya dari penyaji", claim: "Gambar latar adalah ilustrasi asli (bukan foto); tombol 'Saya Owner' dan 'Saya Tim Lapangan' mengarahkan ke bagian terkait" },
  ],
  "dark",
);

/* ------------------------------------------------------------ 2 how it works */
const steps: [string, string][] = [
  ["Beli dan terima ikan", "Ajukan pembelian, Owner setujui, ikan masuk dengan kode lot."],
  ["Cek mutu dan asal", "Lulus atau tahan. Asal dari pemasok tercatat."],
  ["Olah dan catat hasil", "Hasil olahan masuk stok, tiap ekor terlihat."],
  ["Jual dan tagih", "Kirim pesanan, tagihan terbit, pembayaran dicatat."],
  ["Tutup buku", "Biaya dan laba rapi, laporan siap diunduh."],
];
export const L2 = mk(
  2,
  "Cara kerja",
  [
    ...tag(60, 60, "Cara Kerja"),
    heading("Apa itu KATALIS ERP", 1200, 56, 660),
    X(60, 250, 640, 260, "KATALIS ERP adalah aplikasi untuk mengurus seluruh usaha perikanan Anda dengan lebih mudah. Pembelian, produksi, stok, penjualan, dan keuangan tercatat di satu tempat dan terlihat di satu dashboard.", 22, { color: T.sub, lh: 1.5 }),
    X(60, 600, 600, 200, "Cara Kerja —\nLangkah demi Langkah", 54, { weight: 800, lh: 1.08, va: "t" }),
    X(60, 830, 140, 120, "→", 78, { color: T.lime, weight: 800, va: "m", lh: 1 }),
    ...steps.flatMap(([a, b], i): El[] => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 760 + col * 370, y = 250 + row * 360;
      return [
        frame(x, y, 350, 340, 36),
        O(x + 280, y + 22, 48, 48, T.lime), X(x + 280, y + 22, 48, 48, String(i + 1), 22, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 }),
        X(x + 30, y + 40, 220, 40, `Langkah ${i + 1}`, 28, { weight: 800, va: "m", lh: 1 }),
        L(x + 30, y + 110, x + 320, y + 110),
        X(x + 30, y + 130, 292, 60, a, 22, { color: T.lime, weight: 700, lh: 1.25 }),
        X(x + 30, y + 200, 292, 120, b, 18, { color: T.sub, lh: 1.45 }),
      ];
    }),
    page(),
  ],
  "Alur kerja dari beli ikan sampai tutup buku dalam lima langkah.",
  [{ kind: "proposed", ref: "Brief — Modul 01–11", claim: "Alur kerja lima langkah mengikuti modul pembelian, mutu, produksi, penjualan, dan keuangan" }],
  "dark",
);

/* ------------------------------------------------------------- 3 untuk owner */
const ownerItems: [string, string][] = [
  ["Dashboard satu layar", "Untung, stok, kas, dan tagihan terlihat sekaligus."],
  ["Persetujuan dari ponsel", "Setujui atau tolak pembelian dan biaya di mana saja."],
  ["Peringatan lebih awal", "Tagihan telat, mutu ditahan, dan jadwal bentrok langsung muncul."],
  ["Hasil tiap ekor", "Bandingkan dengan rencana, temukan yang rendah."],
  ["Laporan siap unduh", "Laba rugi, piutang, dan stok dalam satu klik."],
];
export const L3 = mk(
  3,
  "Untuk Owner",
  [
    ...tag(60, 60, "Untuk Owner"),
    heading("Apa yang Anda dapat\nsebagai Owner", 900, 56, 960),
    ...ownerItems.flatMap(([a, b], i): El[] => {
      const y = 250 + i * 142;
      return [...dot(60, y + 4), X(116, y, 640, 36, a, 26, { weight: 800, va: "m", lh: 1 }), X(116, y + 44, 640, 80, b, 19, { color: T.sub, lh: 1.4 })];
    }),
    R(880, 270, 400, 320, T.card, { r: 40 }),
    img(880, 270, 400, 320, "/art/panel.png"),
    R(900, 610, 360, 190, CARD, { r: 36, line: EDGE, lw: 1.5 }),
    X(930, 628, 300, 40, "Siklus 1", 18, { color: T.sub, va: "m", lh: 1 }),
    X(930, 664, 300, 80, "62,6%", 64, { color: T.lime, weight: 800, va: "m", lh: 1 }),
    X(930, 748, 300, 40, "hasil olahan, rencana 60%", 18, { color: T.sub, va: "m", lh: 1 }),
    ...place(darkPhone("home"), 1.08, 1370, 230),
    page(),
  ],
  "Apa yang didapat Owner: dashboard, persetujuan dari ponsel, peringatan dini, hasil tiap ekor, dan laporan.",
  [
    { kind: "proposed", ref: "Brief — Modul 01 Dashboard Owner", claim: "Lima manfaat utama untuk Owner" },
    { kind: "source", ref: "Data Siklus 1 dari owner", claim: "Hasil olahan 62,6%, rencana 60%" },
  ],
  "dark",
);

/* -------------------------------------------------------------- 6 dampak */
const impact: [string, string][] = [
  ["Ongkos kirim terkendali", "29,9% dari biaya kini terlihat dan bisa dibandingkan."],
  ["Sisa olahan terjual", "65 kg sisa olahan tercatat, bukan terbuang."],
  ["Beli ikan lebih tepat", "Hasil tiap ekor 52% sampai 70% terlihat jelas."],
  ["Tagihan tepat waktu", "Umur tagihan dan pengingat tersedia."],
  ["Keputusan lebih cepat", "Persetujuan lewat ponsel, tanpa menunggu."],
  ["Tutup buku rapi", "Catatan terkunci setelah bulan ditutup."],
];
export const L6 = mk(
  6,
  "Dampak ke usaha",
  [
    ...tag(60, 60, "Dampak"),
    heading("Dampaknya ke\nusaha Anda", 900, 56, 960),
    frame(60, 230, 740, 720, 56),
    img(60, 230, 740, 720, "/art/panel.png"),
    R(60, 230, 740, 720, "#00111A", { r: 56, op: 0.35 }),
    ...tag(92, 262, "Coba demo"),
    X(100, 340, 460, 240, "Coba aplikasinya langsung dan lihat hasilnya", 40, { weight: 800, lh: 1.1, va: "t" }),
    X(100, 590, 420, 100, "Setujui pembelian, lihat laporan, dan geser skenario harga. Data contoh.", 18, { color: T.sub, lh: 1.45 }),
    R(100, 750, 240, 64, "#050B09", { r: 22, line: "#3A5A4C", lw: 1.5 }), O(120, 770, 24, 24, T.lime), X(152, 750, 180, 64, "Buka demo", 20, { weight: 700, va: "m", lh: 1 }),
    ...place(darkPhone("approve"), 0.78, 520, 310),
    ...impact.flatMap(([a, b], i): El[] => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 880 + col * 330, y = 260 + row * 330;
      return [X(x, y, 300, 70, a, 26, { weight: 800, lh: 1.15 }), L(x, y + 90, x + 280, y + 90), X(x, y + 108, 290, 150, b, 19, { color: T.sub, lh: 1.5 })];
    }),
    page(),
  ],
  "Dampak yang bisa dirasakan: biaya terkendali, sisa terjual, beli lebih tepat, tagihan tepat waktu, keputusan cepat, dan tutup buku rapi.",
  [
    { kind: "source", ref: "Data Siklus 1 dari owner", claim: "Ongkos kirim 29,9% dari biaya; sisa olahan 65 kg; hasil tiap ekor 52,2% sampai 70,2%" },
    { kind: "proposed", ref: "Brief — manfaat fitur", claim: "Pengingat tagihan, persetujuan lewat ponsel, dan kunci periode adalah fitur yang diusulkan" },
  ],
  "dark",
);

/* ---------------------------------------------------------------- 7 data */
const proof: [string, string, string, string][] = [
  ["Biaya", "Ongkos kirim Rp11,08 juta, 29,9% dari seluruh biaya Siklus 1.", "Data nyata Siklus 1", "Biaya"],
  ["Hasil", "Hasil olahan tiap ekor 52,2% sampai 70,2%. Rata-rata 62,6%.", "Data nyata Siklus 1", "Produksi"],
];
export const L7 = mk(
  7,
  "Dari data usaha Anda",
  [
    ...tag(60, 60, "Data Siklus 1"),
    X(60, 250, 560, 300, "Dari data\nusaha Anda", 72, { weight: 800, lh: 1.04, va: "t" }),
    X(60, 560, 520, 120, "Temuan dari Siklus 1 yang kami jadikan dasar fitur. Bukan kutipan pelanggan, melainkan angka nyata.", 20, { color: T.sub, lh: 1.5 }),
    ...proof.flatMap(([t, q, who, k], i): El[] => {
      const x = 700 + i * 590;
      return [
        frame(x, 230, 560, 520, 40),
        R(x + 30, 260, 130, 44, "#00171F", { r: 22, line: EDGE, lw: 1.5 }), X(x + 30, 260, 130, 44, k, 17, { weight: 600, align: "c", va: "m", lh: 1 }),
        X(x + 30, 320, 140, 140, "“", 110, { color: T.lime, weight: 800, va: "t", lh: 1 }),
        X(x + 30, 440, 500, 200, q, 30, { weight: 700, lh: 1.3 }),
        L(x + 30, 650, x + 530, 650),
        O(x + 30, 672, 52, 52, T.lime), X(x + 30, 672, 52, 52, t[0], 22, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 }),
        X(x + 98, 672, 400, 52, who, 20, { color: T.sub, va: "m", lh: 1 }),
      ];
    }),
    X(700, 790, 1100, 60, "Angka lain dari Siklus 1: 481 kg ikan utuh, untung Rp4,5 juta, margin 10,8%.", 22, { color: T.text, weight: 600, lh: 1.3 }),
    page(),
  ],
  "Temuan nyata dari Siklus 1 dalam format kartu kutipan. Bukan kutipan pelanggan.",
  [
    { kind: "source", ref: "Data Siklus 1 dari owner", claim: "Ongkos kirim Rp11.080.000 (29,9%); hasil olahan per ekor 52,2% sampai 70,2%, rata-rata 62,6%; ikan 481 kg; untung Rp4.503.468; margin 10,8%" },
  ],
  "dark",
);

/* ------------------------------------------------------------- 8 untuk tim */
const teamItems: [string, string][] = [
  ["Gudang", "Terima ikan, cek mutu, dan catat titipan pelanggan."],
  ["Pembelian", "Ajukan pembelian dan bandingkan harga pemasok."],
  ["Keuangan", "Catat pembayaran, ajukan biaya, dan tutup buku."],
  ["Jadwal", "Lihat giliran mitra dan hindari jadwal bentrok."],
  ["Akses jelas", "Tiap orang hanya melihat dan mengubah tugasnya."],
];
export const L8 = mk(
  8,
  "Untuk tim lapangan",
  [
    ...tag(60, 60, "Untuk Tim Lapangan"),
    heading("Apa yang didapat\ntim lapangan", 900, 56, 960),
    ...place(darkPhone("activity"), 1.0, 120, 250),
    R(500, 340, 340, 280, T.card, { r: 40 }),
    img(500, 340, 340, 280, "/art/panel.png"),
    R(500, 640, 340, 150, CARD, { r: 32, line: EDGE, lw: 1.5 }),
    X(530, 660, 280, 40, "Peran tim", 18, { color: T.sub, va: "m", lh: 1 }),
    X(530, 700, 290, 80, "4 peran dengan izin berbeda", 24, { weight: 800, lh: 1.2 }),
    ...teamItems.flatMap(([a, b], i): El[] => {
      const y = 250 + i * 142;
      return [...dot(900, y + 4), X(956, y, 880, 36, a, 26, { weight: 800, va: "m", lh: 1 }), X(956, y + 44, 880, 80, b, 19, { color: T.sub, lh: 1.4 })];
    }),
    page(),
  ],
  "Apa yang didapat tim lapangan: gudang, pembelian, keuangan, jadwal, dan akses sesuai peran.",
  [{ kind: "proposed", ref: "Brief — Modul Gudang, Pembelian, Keuangan, Jadwal, Akses", claim: "Empat peran (Owner, Pembelian, Gudang, Keuangan) dengan izin berbeda, seperti pada demo" }],
  "dark",
);

/* -------------------------------------------------------------- 9 paket */
const pk: { name: string; sub: string; items: string[]; hot?: boolean }[] = [
  { name: "Paket Dasar", sub: "Catat pekerjaan inti", items: ["Dashboard owner", "Pembelian dan pemasok", "Produksi dasar", "Stok dan gudang", "Penjualan dan tagihan", "Keuangan dasar"] },
  { name: "Paket Lengkap", sub: "Harian dan keuangan terhubung", hot: true, items: ["Semua isi Dasar", "Cek mutu dan asal produk", "Gudang dingin dan pembekuan", "Jadwal produksi", "Biaya tiap produksi", "Laporan keuangan bulanan"] },
  { name: "Paket Penuh", sub: "Pengawasan lebih lengkap", items: ["Semua isi Lengkap", "Coba skenario harga", "Pengingat tagihan dan jadwal", "Laporan tambahan"] },
];
export const L9 = mk(
  9,
  "Paket",
  [
    ...tag(60, 60, "Paket"),
    X(60, 250, 560, 260, "Pilih paket yang sesuai kebutuhan", 64, { color: T.lime, weight: 800, lh: 1.06, va: "t" }),
    X(60, 540, 520, 160, "Mulai dari yang dasar dan tambah fitur bertahap. Harga dibahas setelah fitur disepakati, tanpa angka yang mengikat di sini.", 20, { color: T.sub, lh: 1.5 }),
    ...pk.flatMap((p, i): El[] => {
      const x = 640 + i * 405, y = p.hot ? 150 : 220, h = p.hot ? 800 : 720, w = 385;
      return [
        R(x, y, w, h, p.hot ? "#1F3A2E" : CARD, { r: 40, line: p.hot ? T.lime : EDGE, lw: p.hot ? 3 : 1.5 }),
        ...(p.hot ? [R(x + 24, y + 22, 250, 38, T.lime, { r: 19 }), X(x + 24, y + 22, 250, 38, "Paket yang disarankan", 16, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 })] : []),
        X(x + 30, y + (p.hot ? 80 : 36), 330, 44, p.name, 30, { weight: 800, va: "m", lh: 1 }),
        X(x + 30, y + (p.hot ? 130 : 86), 330, 60, p.sub, 17, { color: T.sub, lh: 1.35 }),
        X(x + 30, y + (p.hot ? 190 : 146), 330, 70, "Harga\ndibahas", 30, { color: T.lime, weight: 800, lh: 1.05, va: "t" }),
        ...p.items.flatMap((t, j): El[] => {
          const yy = y + (p.hot ? 290 : 250) + j * 56;
          return [O(x + 30, yy + 8, 22, 22, T.lime), X(x + 30, yy + 8, 22, 22, "✓", 13, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 }), X(x + 64, yy, 300, 38, t, 18, { va: "m", lh: 1.1 })];
        }),
        R(x + 30, y + h - 82, w - 60, 56, p.hot ? T.lime : "#2A3933", { r: 28 }), X(x + 30, y + h - 82, w - 60, 56, "Diskusikan", 19, { color: p.hot ? T.onLime : T.text, weight: 800, align: "c", va: "m", lh: 1 }),
      ];
    }),
    page(),
  ],
  "Tiga paket dibedakan hanya dari isi fitur. Tidak ada harga; harga dibahas setelah fitur disepakati.",
  [
    { kind: "proposed", ref: "Brief — Part E", claim: "Isi fitur tiap paket; harga sengaja tidak dicantumkan" },
    { kind: "assumption", ref: "Brief — Pricing rules", claim: "Harga perkiraan awal, tidak mengikat, dibahas setelah fitur disepakati" },
  ],
  "dark",
);

/* --------------------------------------------------------------- 10 CTA */
export const L10 = mk(
  10,
  "Coba demo",
  [
    R(60, 120, 1800, 800, T.lime, { r: 64 }),
    ...tag(110, 160, "Coba Sekarang").map((e) => e),
    X(110, 260, 920, 340, "Coba demo sekarang dan lihat sendiri hasilnya.", 80, { color: T.onLime, weight: 800, lh: 1.04, va: "t" }),
    X(110, 620, 760, 120, "Aplikasi ponsel dan desktop sudah bisa dicoba: setujui pembelian di satu sisi, dan sisi lainnya ikut berubah. Data contoh.", 22, { color: T.onLime2, weight: 500, lh: 1.45 }),
    R(110, 770, 280, 80, "#00171F", { r: 24 }), O(132, 796, 28, 28, T.lime), X(170, 770, 210, 80, "Demo ponsel", 21, { color: T.text, weight: 800, va: "m", lh: 1 }),
    R(410, 770, 300, 80, "#00171F", { r: 24 }), O(432, 796, 28, 28, T.lime), X(470, 770, 230, 80, "Demo desktop", 21, { color: T.text, weight: 800, va: "m", lh: 1 }),
    ...place(darkPhone("home"), 0.98, 1040, 290),
    ...place(darkPhone("approve"), 0.98, 1390, 190),
    page(),
  ],
  "Ajakan mencoba demo: /demo (ponsel), /demo/desktop, dan /demo/live berdampingan.",
  [{ kind: "proposed", ref: "Demo aplikasi", claim: "Demo interaktif tersedia di /demo, /demo/desktop, dan /demo/live; semua data contoh" }],
  "dark",
);

/* ---------------------------------------------------------------- 11 FAQ */
const faq: [string, string][] = [
  ["Berapa lama pengerjaannya?", "Diskusi 2–3 minggu, aplikasi dasar 6–8 minggu, lalu tahap khusus perikanan dan keuangan. Total sekitar 18–26 minggu, bertahap."],
  ["Apakah data kami aman?", "Akses dibatasi menurut peran, perubahan tercatat, buku yang sudah ditutup terkunci, dan data disalin berkala."],
  ["Apakah harus mengganti cara kerja?", "Kami mulai dari diskusi dan menyesuaikan dengan cara kerja Anda. Tarif dan aturan bisa diubah sendiri."],
  ["Berapa biayanya?", "Dibahas setelah fitur yang dibutuhkan disepakati. Paket bisa disesuaikan dan ditambah bertahap."],
];
export const L11 = mk(
  11,
  "Tanya jawab",
  [
    ...tag(60, 60, "Tanya Jawab"),
    heading("Pertanyaan yang\nsering muncul", 900, 56, 960),
    R(60, 250, 640, 640, T.card, { r: 48 }),
    img(60, 250, 640, 640, "/art/panel.png"),
    ...faq.flatMap(([q, a], i): El[] => {
      const y = 270 + i * 160;
      const open = i === 0;
      return [
        L(760, y - 12, 1860, y - 12),
        X(760, y, 980, 40, q, 28, { weight: 800, va: "m", lh: 1 }),
        X(1790, y - 4, 70, 56, open ? "−" : "+", 40, { color: T.lime, weight: 800, align: "r", va: "m", lh: 1 }),
        ...(open || true ? [X(760, y + 50, 1000, 90, a, 19, { color: T.sub, lh: 1.45 })] : []),
      ];
    }),
    L(60, 944, 1860, 944),
    O(60, 972, 44, 44, T.lime), X(60, 972, 44, 44, "D", 22, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 }),
    X(118, 972, 200, 44, "Dar Dev", 24, { weight: 800, va: "m", lh: 1 }),
    X(520, 972, 900, 44, "Cara Kerja    Untuk Owner    Untuk Tim    Paket    Tanya Jawab", 18, { color: T.sub, align: "c", va: "m", lh: 1 }),
    X(1500, 972, 360, 44, "Penawaran belum mengikat", 18, { color: T.faint, align: "r", va: "m", lh: 1 }),
    page(),
  ],
  "Pertanyaan yang sering muncul beserta jawaban singkat.",
  [
    { kind: "commercial", ref: "Brief — Part F", claim: "Durasi 2–3, 6–8, 5–7, 4–6, 2–3 minggu; target Lengkap 18–26 minggu (perkiraan)" },
    { kind: "proposed", ref: "Brief — Modul Akses", claim: "Akses per peran, riwayat perubahan, kunci periode, cadangan data" },
  ],
  "dark",
);
