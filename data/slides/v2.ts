import type { El } from "@/lib/scene";
import { img } from "@/lib/kit";
import { R, O, X, L } from "@/lib/phone";
import { mk } from "./_h";

/**
 * Deck v2: fewer slides, one idea each, a real type scale, a real icon set (Lucide) and real
 * screenshots of the interactive demo instead of drawn mockups.
 *
 * System
 *   canvas 1920x1080 · margins 120 · 8px spacing · radius 24 (cards) / pill
 *   type   display 190-210 · stat 80-140 · title 56-64 · body 24-30 · caption 16-22
 *   color  paper / ink / deep green (brand) · mint accent (sparingly) · amber for warnings only
 */
const P = { ink: "#00171F", green: "#003459", mint: "#1B7FC4", muted: "#4B5E69", faint: "#7F909A", line: "#D5DEE4", card: "#FFFFFF", track: "#E1E8ED", amber: "#C98A1B", red: "#B4443C", softGreen: "#E3EDF5", onDark: "#CFE0EE" };
const TOTAL = 13;

const ic = (name: string, color: string, x: number, y: number, s: number): El => img(x, y, s, s, `/icons/${name}-${color}.png`);

/** Slide chrome: kicker, title, footer. */
const chrome = (n: number, kicker: string, title: string, o: { w?: number; foot?: string; dark?: boolean } = {}): El[] => {
  const dark = !!o.dark;
  return [
    X(120, 84, 900, 30, kicker, 22, { color: dark ? P.onDark : P.green, weight: 600, va: "m", lh: 1 }),
    X(120, 126, o.w ?? 1500, 210, title, 60, { color: dark ? "#FFFFFF" : P.ink, weight: 700, lh: 1.06, va: "t" }),
    X(120, 1024, 1200, 24, o.foot ?? "Dar Dev  ·  KATALIS ERP", 16, { color: dark ? P.onDark : P.faint, va: "m", lh: 1 }),
    X(1640, 1024, 160, 24, `${String(n).padStart(2, "0")} / ${TOTAL}`, 16, { color: dark ? P.onDark : P.faint, align: "r", va: "m", lh: 1 }),
  ];
};
const SRC1 = { kind: "source" as const, ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "Ikan utuh 481 kg (11 ekor); hasil olahan 62,6% (rencana 60%); ongkos kirim Rp11,08 jt (29,9%); sisa olahan 65 kg; hasil olahan per ekor 63,1; 61,3; 61,4; 63,7; 52,2; 64,4; 70,2; 63,5; 63,3; 63,3; 60,2" };
const DEMO = { kind: "illustrative" as const, ref: "Demo interaktif", claim: "Tangkapan layar diambil dari demo /demo dan /demo/desktop; semua angka contoh kecuali yang berlabel Siklus 1" };

/* ---------------------------------------------------------------- 1 cover */
export const V1 = mk(1, "Cover — KATALIS ERP", [
  img(120, 96, 420, 171, "/brand/katalis-logo-white.png"),
  X(1180, 166, 620, 30, "Penawaran aplikasi  ·  Oktober 2026", 22, { color: P.onDark, align: "r", va: "m", lh: 1 }),
  img(1000, 272, 920, 764, "/shots/dash-cover.png"),
  img(120, 495, 780, 295, "/brand/katalis-erp-wordmark.png"),
  X(120, 850, 780, 110, "Aplikasi untuk mengurus usaha perikanan,\ndari beli ikan sampai laporan keuangan.", 30, { color: P.onDark, lh: 1.35 }),
  X(120, 1000, 600, 28, "Disiapkan oleh Dar Dev untuk PT Katalis Lintas Global", 18, { color: P.onDark, va: "m", lh: 1 }),
], "Pembuka. Penawaran awal untuk dibahas bersama; harga dibahas setelah fitur disepakati.", [
  { kind: "source", ref: "Proposal hlm. 1", claim: "Klien: PT Katalis Lintas Global; usaha perikanan; dokumen 1 Oktober 2026" }, DEMO,
], "dark");

/* ---------------------------------------------------------------- 2 masalah */
const problems: [string, string][] = [["29,9%", "biaya Siklus 1 habis untuk ongkos kirim"], ["65 kg", "sisa olahan belum terjual"], ["52–70%", "hasil olahan tiap ekor, padahal rencana 60%"]];
const others: [string, string][] = [["tag", "Enam kelas mutu, harga berbeda"], ["snowflake", "Tarif gudang dingin rumit"], ["receipt-text", "Biaya kantor belum masuk laporan"], ["calendar-clock", "Jadwal dua mitra bisa bentrok"]];
export const V2 = mk(2, "Masalah", [
  X(120, 84, 900, 30, "Dari data Siklus 1", 22, { color: P.onDark, weight: 600, va: "m", lh: 1 }),
  X(120, 126, 1300, 80, "Tiga angka yang kami lihat di usaha Katalis", 60, { color: "#FFFFFF", weight: 700, lh: 1.06 }),
  ...problems.flatMap(([v, l], i): El[] => {
    const x = 120 + i * 580;
    return [L(x, 330, x + 500, 330, "#4F86AF", 2), X(x, 350, 560, 230, v, 128, { color: "#FFFFFF", weight: 700, lh: 1, va: "m" }), X(x, 600, 480, 110, l, 30, { color: P.onDark, lh: 1.3 })];
  }),
  X(120, 780, 900, 30, "Empat masalah lain yang ikut terjawab", 22, { color: P.onDark, weight: 600, va: "m", lh: 1 }),
  ...others.flatMap(([icn, t], i): El[] => {
    const x = 120 + i * 420;
    return [ic(icn, "white", x, 836, 44), X(x + 64, 826, 330, 70, t, 24, { color: "#FFFFFF", lh: 1.25, va: "m" })];
  }),
  X(120, 1024, 1200, 24, "Dar Dev  ·  KATALIS ERP  ·  Data nyata Siklus 1: 481 kg ikan, 11 ekor", 16, { color: P.onDark, va: "m", lh: 1 }),
  X(1640, 1024, 160, 24, `02 / ${TOTAL}`, 16, { color: P.onDark, align: "r", va: "m", lh: 1 }),
], "Tiga angka nyata dari Siklus 1 dan empat masalah lain yang dijawab aplikasi.", [SRC1], "dark");

/* ---------------------------------------------------------------- 3 modul */
const modules: [string, string, string][] = [
  ["layout-dashboard", "Dashboard", "Angka utama usaha"], ["shopping-cart", "Pembelian", "Beli ikan, bayar pemasok"], ["factory", "Produksi", "Olah ikan, catat hasil"], ["shield-check", "Mutu dan asal", "Cek mutu, lacak asal"],
  ["package", "Stok", "Stok dan titipan"], ["truck", "Penjualan", "Pesanan, kirim, tagih"], ["snowflake", "Gudang dingin", "Tarif simpan otomatis"], ["wallet", "Keuangan", "Kas, biaya, tutup buku"],
  ["calendar-clock", "Jadwal", "Giliran mitra dan ABF"], ["flask-conical", "Skenario", "Coba harga naik"], ["lock", "Akses", "Siapa boleh apa"], ["chart-column", "Laporan", "Lihat dan unduh CSV"],
];
export const V3 = mk(3, "Dua belas modul", [
  ...chrome(3, "Satu aplikasi", "Dua belas modul, satu tempat", { w: 1500 }),
  ...modules.flatMap(([icn, n, d], i): El[] => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 120 + col * 426, y = 250 + row * 232, w = 402, h = 208;
    return [R(x, y, w, h, P.card, { r: 24, line: P.line, lw: 1.5 }), R(x + 28, y + 28, 60, 60, P.softGreen, { r: 18 }), ic(icn, "green", x + 42, y + 42, 32), X(x + 28, y + 108, w - 56, 36, n, 30, { color: P.ink, weight: 700, va: "m", lh: 1 }), X(x + 28, y + 152, w - 56, 30, d, 21, { color: P.muted, va: "m", lh: 1 })];
  }),
], "Daftar modul yang ada di aplikasi. Semua sudah bisa dicoba di demo.", [{ kind: "proposed", ref: "Brief — Modul 01–11", claim: "Modul: dashboard, pembelian, produksi, mutu dan asal, stok, penjualan, gudang dingin, keuangan, jadwal, skenario, akses, laporan" }]);

/* ---------------------------------------------------------------- 4 dashboard */
/* Geometry: dashboard.png is 3060x1980 with a 90px shadow pad around a 2880x1800 window. Window is fitted to x 760..1800. */
const DK = 1040 / 2880;
export const V4 = mk(4, "Dashboard Owner", [
  img(760 - 90 * DK, 270 - 90 * DK, 3060 * DK, 1980 * DK, "/shots/dashboard.png"),
  ...chrome(4, "Untuk Owner", "Satu dashboard untuk seluruh usaha", { w: 600, foot: "Dar Dev  ·  KATALIS ERP  ·  Contoh tampilan, data contoh" }),
  ...([["layout-dashboard", "Angka utama", "Total ikan, kas, piutang, stok."], ["circle-check", "Persetujuan", "Setujui atau tolak dari satu daftar."], ["bell", "Peringatan lebih awal", "Tagihan telat, mutu ditahan, bukti belum ada."]] as [string, string, string][]).flatMap(([icn, t, d], i): El[] => {
    const y = 400 + i * 130;
    return [O(120, y, 56, 56, P.softGreen), ic(icn, "green", 132, y + 12, 32), X(200, y - 2, 480, 36, t, 28, { color: P.ink, weight: 700, va: "m", lh: 1 }), X(200, y + 40, 480, 56, d, 21, { color: P.muted, lh: 1.3 })];
  }),
  L(120, 812, 680, 812, P.line, 1.5),
  O(120, 840, 56, 56, P.softGreen), ic("lock", "green", 132, 852, 32), X(200, 836, 480, 84, "Akses per peran: Owner, Pembelian, Gudang, Keuangan. Tiap orang hanya melihat tugasnya.", 20, { color: P.muted, lh: 1.4, va: "m" }),
], "Dashboard Owner: angka utama, persetujuan, dan peringatan dalam satu layar. Gambar adalah tangkapan layar demo (data contoh).", [
  { kind: "proposed", ref: "Brief — dashboard owner", claim: "Dashboard sebagai pusat kendali; akses per peran" }, DEMO,
]);

/* Geometry: phone-*.png is 1404x2766, 80px pad around a 1244x2606 phone. Centre phone 780px tall, sides 680px, centred on x=1280. */
const PC = 780 / 2606, PS = 680 / 2606;
export const V5 = mk(5, "Aplikasi ponsel", [
  img(820 - 80 * PS, 250 - 80 * PS, 1404 * PS, 2766 * PS, "/shots/phone-home.png"),
  img(1415 - 80 * PS, 250 - 80 * PS, 1404 * PS, 2766 * PS, "/shots/phone-modul.png"),
  img(1094 - 80 * PC, 200 - 80 * PC, 1404 * PC, 2766 * PC, "/shots/phone-approve.png"),
  ...chrome(5, "Di ponsel", "Putuskan dari mana saja", { w: 600, foot: "Dar Dev  ·  KATALIS ERP  ·  Contoh tampilan, data contoh" }),
  ...([["smartphone", "Satu ketukan", "Setujui pembelian dan biaya, langsung tercatat."], ["bell", "Peringatan langsung", "Tagihan telat dan mutu ditahan muncul di Beranda."]] as [string, string, string][]).flatMap(([icn, t, d], i): El[] => {
    const y = 400 + i * 130;
    return [O(120, y, 56, 56, P.softGreen), ic(icn, "green", 132, y + 12, 32), X(200, y - 2, 480, 36, t, 28, { color: P.ink, weight: 700, va: "m", lh: 1 }), X(200, y + 40, 440, 56, d, 21, { color: P.muted, lh: 1.3 })];
  }),
  R(120, 700, 520, 96, P.softGreen, { r: 24 }), ic("monitor", "green", 148, 728, 40), X(208, 700, 410, 96, "Coba demo interaktif:\nbuka /demo", 22, { color: P.green, weight: 600, lh: 1.3, va: "m" }),
], "Aplikasi ponsel: beranda, persetujuan, dan modul. Gambar adalah tangkapan layar demo (data contoh).", [
  { kind: "proposed", ref: "Permintaan penyaji — demo ponsel", claim: "Tampilan ponsel untuk beranda, persetujuan, dan modul" }, DEMO,
]);

/* ---------------------------------------------------------------- 6 ongkos kirim */
const costs: [string, number, string, boolean][] = [["Ikan utuh", 59.7, "Rp22,13 jt", false], ["Ongkos kirim", 29.9, "Rp11,08 jt", true], ["Penanganan", 5.0, "Rp1,85 jt", false], ["Kemasan", 4.9, "Rp1,82 jt", false], ["Jasa", 0.5, "Rp0,20 jt", false]];
export const V6 = mk(6, "Ongkos kirim", [
  ...chrome(6, "Biaya", "Hampir sepertiga biaya habis untuk ongkos kirim", { w: 800, foot: "Dar Dev  ·  KATALIS ERP  ·  Data nyata Siklus 1" }),
  X(120, 440, 800, 170, "Rp11,08 jt", 140, { color: P.green, weight: 700, lh: 1, va: "m" }),
  X(120, 620, 760, 40, "ongkos kirim Siklus 1, 29,9% dari seluruh biaya", 26, { color: P.muted, va: "m", lh: 1 }),
  R(120, 760, 780, 168, P.card, { r: 24, line: P.line, lw: 1.5 }), ic("trending-down", "green", 152, 806, 56),
  X(232, 780, 640, 128, "Bila tarif turun ke Rp29.500, hemat ±Rp1.840 per kg loin (dari Rp31.000).", 26, { color: P.ink, lh: 1.35, va: "m" }),
  X(1000, 240, 800, 30, "Biaya Siklus 1, total Rp37,08 jt", 22, { color: P.faint, weight: 600, va: "m", lh: 1 }),
  ...costs.flatMap(([l, p, v, hot], i): El[] => {
    const y = 300 + i * 126;
    return [X(1000, y, 500, 36, l, 28, { color: P.ink, weight: hot ? 700 : 500, va: "m", lh: 1 }), X(1400, y, 400, 36, `${v}  ·  ${String(p).replace(".", ",")}%`, 24, { color: P.muted, align: "r", va: "m", lh: 1 }), R(1000, y + 54, 800, 24, P.track, { r: 12 }), R(1000, y + 54, Math.max(14, 800 * (p / 60)), 24, hot ? P.amber : P.green, { r: 12 })];
  }),
], "Ongkos kirim Siklus 1 Rp11,08 juta, 29,9% dari biaya, sekitar Rp36.800 per kg loin. Bila tarif turun ke Rp29.500, hemat sekitar Rp1.840 per kg loin.", [SRC1]);

/* ---------------------------------------------------------------- 7 hasil tiap ekor */
const ys = [63.1, 61.3, 61.4, 63.7, 52.2, 64.4, 70.2, 63.5, 63.3, 63.3, 60.2];
const kgs = [44, 55, 39, 58, 27, 64, 23, 34, 59, 42, 36];
const cy = (v: number) => 880 - ((v - 40) / 35) * 470;
export const V7 = mk(7, "Hasil tiap ekor", [
  ...chrome(7, "Produksi", "Hasil tiap ekor berbeda jauh", { w: 1100, foot: "Dar Dev  ·  KATALIS ERP  ·  Data nyata Siklus 1" }),
  X(1300, 76, 500, 140, "62,6%", 110, { color: P.green, weight: 700, align: "r", va: "m", lh: 1 }), X(1000, 208, 800, 32, "rata-rata  ·  garis putus = rencana 60%", 24, { color: P.muted, align: "r", va: "m", lh: 1 }),
  ...ys.flatMap((v, i): El[] => {
    const x = 120 + i * 158, y = cy(v), low = v < 55, high = v > 70;
    return [
      R(x, y, 104, 880 - y, low ? P.amber : P.green, { r: 14 }),
      X(x - 20, y - 40, 144, 32, v.toFixed(1).replace(".", ","), 26, { color: low ? P.amber : P.ink, weight: 700, align: "c", va: "m", lh: 1 }),
      X(x - 20, 896, 144, 26, String(i + 1).padStart(3, "0"), 22, { color: P.ink, weight: 600, align: "c", va: "m", lh: 1 }),
      X(x - 20, 924, 144, 24, `${kgs[i]} kg`, 18, { color: P.faint, align: "c", va: "m", lh: 1 }),
      ...(low ? [X(x - 40, y - 72, 184, 28, "Terendah", 20, { color: P.amber, weight: 600, align: "c", va: "m", lh: 1 })] : high ? [X(x - 40, y - 72, 184, 28, "Tertinggi", 20, { color: P.green, weight: 600, align: "c", va: "m", lh: 1 })] : []),
    ];
  }),
  { t: "line", x1: 120, y1: cy(60), x2: 1800, y2: cy(60), color: P.ink, lw: 2, dash: true },
], "Hasil olahan 11 ekor Siklus 1: terendah ekor 005 (52,2%), tertinggi ekor 007 (70,2%), rata-rata 62,6%, rencana 60%.", [SRC1]);

/* ---------------------------------------------------------------- 8 tagihan */
const flow: [string, string, string][] = [["file-signature", "Kontrak dan harga", "Aturan per pembeli"], ["truck", "Surat jalan", "Berat kirim aktual"], ["scale", "Berat diterima", "Dasar tagihan"], ["receipt-text", "Tagihan", "Bayar sebagian"], ["wallet", "Pembayaran", "Cocokkan uang masuk"]];
const tariff: [string, string][] = [["Sampai 24 jam", "Rp75/kg"], ["Sampai 10 hari (minimum)", "Rp750/kg"], ["Hari ke-11", "Rp825/kg"], ["30 hari", "Rp2.250/kg"], ["ABF (pembekuan cepat)", "Rp3.500/kg"]];
export const V8 = mk(8, "Penjualan dan gudang dingin", [
  ...chrome(8, "Penjualan dan gudang dingin", "Tagihan dihitung dari berat yang diterima", { foot: "Dar Dev  ·  KATALIS ERP  ·  Contoh hitungan, bukan tagihan nyata" }),
  L(210, 372, 1700, 372, P.line, 2),
  ...flow.flatMap(([icn, t, d], i): El[] => {
    const x = 120 + i * 352;
    return [O(x, 322, 100, 100, P.softGreen), ic(icn, "green", x + 28, 350, 44), X(x, 438, 330, 34, t, 26, { color: P.ink, weight: 700, va: "m", lh: 1 }), X(x, 476, 330, 28, d, 20, { color: P.muted, va: "m", lh: 1 })];
  }),
  X(120, 580, 700, 30, "Tarif gudang dingin", 22, { color: P.faint, weight: 600, va: "m", lh: 1 }),
  ...tariff.flatMap(([a, b], i): El[] => {
    const y = 630 + i * 66;
    return [L(120, y, 840, y, P.line, 1.5), X(120, y + 12, 500, 44, a, 26, { color: P.muted, va: "m", lh: 1 }), X(600, y + 12, 240, 44, b, 28, { color: P.ink, weight: 700, align: "r", va: "m", lh: 1 })];
  }),
  R(980, 580, 820, 400, P.green, { r: 32 }),
  X(1020, 616, 740, 30, "Contoh tagihan gudang dingin · Pelanggan A", 22, { color: P.onDark, va: "m", lh: 1 }),
  X(1020, 670, 740, 130, "Rp35.200.000", 100, { color: "#FFFFFF", weight: 700, lh: 1, va: "m" }),
  X(1020, 830, 700, 100, "Simpan 6.000, 8.000, dan 10.000 kg, ditambah ABF 5.000 kg.", 24, { color: P.onDark, lh: 1.35 }),
], "Alur penjualan sampai pembayaran dan contoh tagihan gudang dingin (Rp35.200.000, contoh hitungan). Rumus: berat × hari × tarif per kg, minimum 10 hari.", [
  { kind: "source", ref: "Proposal hlm. 8", claim: "Tarif: ≤24 jam Rp75/kg; ≤10 hari minimum Rp750/kg; hari ke-11 Rp825/kg; 30 hari Rp2.250/kg; ABF Rp3.500/kg" },
  { kind: "illustrative", ref: "Contoh hitungan", claim: "Tagihan Rp35.200.000 untuk Pelanggan A adalah contoh, bukan tagihan nyata" },
]);

/* ---------------------------------------------------------------- 9 keuangan */
const checks: [string, string, "ok" | "warn" | "wait"][] = [
  ["Nota cocok dengan transaksi (243 dari 243)", "Cocok", "ok"], ["Bukti transfer lengkap (164 dari 219)", "Selisih", "warn"], ["Rekap bulanan cocok dengan jurnal", "Cocok", "ok"],
  ["Semua transaksi diperiksa dan disetujui", "Cocok", "ok"], ["Biaya usaha dicatat sekali", "Cocok", "ok"], ["Penyusutan, pajak, dan bunga", "Menunggu", "wait"],
];
export const V9 = mk(9, "Keuangan", [
  ...chrome(9, "Keuangan", "Tutup buku tanpa tebak-tebakan", { foot: "Dar Dev  ·  KATALIS ERP  ·  Contoh dari Monitor Dana Fasilitas Bungus" }),
  X(120, 244, 800, 30, "Tutup buku Oktober 2026", 22, { color: P.faint, weight: 600, va: "m", lh: 1 }),
  ...checks.flatMap(([t, s, k], i): El[] => {
    const y = 296 + i * 108, col = k === "ok" ? P.mint : k === "warn" ? P.amber : P.faint;
    return [L(120, y, 960, y, P.line, 1.5), ic(k === "ok" ? "circle-check" : k === "warn" ? "triangle-alert" : "clock", k === "ok" ? "mint" : k === "warn" ? "amber" : "gray", 120, y + 30, 44), X(188, y + 22, 600, 64, t, 26, { color: P.ink, lh: 1.2, va: "m" }), X(800, y + 22, 160, 64, s, 24, { color: col, weight: 700, align: "r", va: "m", lh: 1 })];
  }),
  X(1120, 296, 680, 110, "243 dari 243", 84, { color: P.ink, weight: 700, va: "m", lh: 1 }), X(1120, 410, 680, 30, "nota lengkap", 24, { color: P.muted, va: "m", lh: 1 }),
  R(1120, 456, 680, 20, P.track, { r: 10 }), R(1120, 456, 680, 20, P.green, { r: 10 }),
  X(1120, 540, 680, 110, "164 dari 219", 84, { color: P.ink, weight: 700, va: "m", lh: 1 }), X(1120, 654, 680, 30, "bukti transfer lengkap, 55 belum ada", 24, { color: P.muted, va: "m", lh: 1 }),
  R(1120, 700, 680, 20, P.track, { r: 10 }), R(1120, 700, 680 * (164 / 219), 20, P.amber, { r: 10 }),
  R(1120, 800, 680, 120, P.softGreen, { r: 24 }), ic("lock", "green", 1152, 836, 48), X(1224, 808, 548, 104, "Setelah ditutup, catatan terkunci dan tidak bisa diubah.", 24, { color: P.green, weight: 600, lh: 1.3, va: "m" }),
], "Daftar cek tutup buku dengan data dari Monitor Dana Fasilitas Bungus: nota 243 dari 243, bukti transfer 164 dari 219.", [
  { kind: "source", ref: "Monitor Dana Fasilitas Bungus (JURNAL, CEK DATA)", claim: "243 transaksi; nota lengkap 243; bukti transfer lengkap 164 dari 219 (55 belum ada, 24 tidak perlu); semua transaksi berstatus terverifikasi" },
]);

/* ---------------------------------------------------------------- 10 jadwal */
const days: [string, string, number, number, string][] = [["Senin", "CV DUS", 8, 17, "3.000 kg"], ["Selasa", "PT SNS", 8, 17, "3.000 kg"], ["Rabu", "CV DUS", 8, 17, "3.000 kg"], ["Kamis", "PT SNS", 8, 17, "3.000 kg"], ["Jumat", "CV DUS", 8, 17, "3.000 kg"], ["Sabtu", "PT SNS", 8, 12, "1.333 kg"]];
const hx = (h: number) => 340 + (h - 8) * 122;
export const V10 = mk(10, "Jadwal", [
  ...chrome(10, "Jadwal", "Jadwal mitra tidak lagi bentrok", { foot: "Dar Dev  ·  KATALIS ERP  ·  Angka kapasitas adalah perkiraan" }),
  ...[8, 10, 12, 14, 16].flatMap((h): El[] => [X(hx(h) - 40, 276, 80, 24, `${String(h).padStart(2, "0")}.00`, 18, { color: P.faint, align: "c", va: "m", lh: 1 }), L(hx(h), 308, hx(h), 868, P.line, 1)]),
  ...days.flatMap(([d, who, s, e, kg], i): El[] => {
    const y = 322 + i * 92;
    return [X(120, y, 200, 60, d, 28, { color: P.ink, weight: 600, va: "m", lh: 1 }), R(hx(s), y, hx(e) - hx(s), 60, who === "CV DUS" ? P.ink : P.green, { r: 16 }), X(hx(s) + 24, y, hx(e) - hx(s) - 40, 60, `${who}  ·  ${kg}`, 22, { color: "#FFFFFF", weight: 600, va: "m", lh: 1 })];
  }),
  R(hx(10), 322, 122, 60, P.red, { r: 16, line: "#FFFFFF", lw: 4 }), X(hx(10), 322, 122, 60, "ABF", 22, { color: "#FFFFFF", weight: 700, align: "c", va: "m", lh: 1 }),
  R(120, 900, 1310, 76, "#F6E4E1", { r: 24 }), ic("triangle-alert", "red", 148, 922, 32), X(204, 900, 1200, 76, "Peringatan: pesanan ABF jam 10.00 bentrok dengan produksi CV DUS pada hari Senin.", 24, { color: P.red, weight: 600, va: "m", lh: 1.2 }),
  X(1560, 300, 260, 80, "27 · 22", 64, { color: P.ink, weight: 700, va: "m", lh: 1 }), X(1560, 384, 250, 60, "jam per minggu, CV DUS dan PT SNS", 20, { color: P.muted, lh: 1.3 }),
  X(1560, 520, 260, 80, "3.000 kg", 56, { color: P.ink, weight: 700, va: "m", lh: 1 }), X(1560, 604, 250, 60, "bahan per hari penuh", 20, { color: P.muted, lh: 1.3 }),
], "Jadwal giliran CV DUS dan PT SNS Senin–Sabtu, dengan peringatan bila pesanan ABF bentrok.", [
  { kind: "source", ref: "Proposal hlm. 4", claim: "Senin CV DUS, Selasa PT SNS, Rabu CV DUS, Kamis PT SNS, Jumat CV DUS, Sabtu PT SNS; 08.00–17.00, Sabtu 08.00–12.00; 27 dan 22 jam per minggu; 3.000 kg per hari" },
  { kind: "illustrative", ref: "Contoh peringatan", claim: "Pesanan ABF jam 10.00 adalah contoh" },
]);

/* ---------------------------------------------------------------- 11 skenario */
const levels: [string, number, string, string][] = [["Rendah", 275.0, "Rp275,0 jt", "#CFE0EE"], ["Sedang", 475.7, "Rp475,7 jt", P.mint], ["Tinggi", 734.5, "Rp734,5 jt", P.green]];
const impacts: [string, string, number][] = [["Daging naik Rp1.000/kg", "−Rp11,92 jt", 11.92], ["Harga jual turun Rp5.000/kg", "−Rp59,58 jt", 59.58], ["Pemakaian mesin turun dari 75% ke 65%", "−Rp53,26 jt", 53.26], ["Sewa naik Rp5 juta", "−Rp5,00 jt", 5]];
export const V11 = mk(11, "Skenario", [
  ...chrome(11, "Skenario", "Coba skenario sebelum memutuskan", { foot: "Dar Dev  ·  KATALIS ERP  ·  Perkiraan, bukan laba nyata" }),
  X(120, 262, 600, 28, "Perkiraan laba per bulan", 22, { color: P.faint, weight: 600, va: "m", lh: 1 }),
  ...levels.flatMap(([n, v, t, c], i): El[] => {
    const h = (v / 734.5) * 470, x = 120 + i * 228, y = 900 - h;
    return [R(x, y, 168, h, c, { r: 20 }), X(x - 20, y - 46, 208, 36, t, 28, { color: P.ink, weight: 700, align: "c", va: "m", lh: 1 }), X(x - 20, 918, 208, 32, n, 24, { color: P.muted, align: "c", va: "m", lh: 1 })];
  }),
  X(860, 262, 900, 28, "Jika satu hal berubah, laba bulanan turun", 22, { color: P.faint, weight: 600, va: "m", lh: 1 }),
  ...impacts.flatMap(([t, v, n], i): El[] => {
    const y = 330 + i * 150;
    return [X(860, y, 640, 40, t, 28, { color: P.ink, weight: 500, va: "m", lh: 1 }), X(1500, y, 300, 40, v, 28, { color: P.red, weight: 700, align: "r", va: "m", lh: 1 }), R(860, y + 62, 940, 18, P.track, { r: 9 }), R(860, y + 62, Math.max(24, 940 * (n / 59.58)), 18, P.red, { r: 9 })];
  }),
], "Skenario laba bulanan (rendah, sedang, tinggi) dan dampak empat perubahan. Perkiraan, bukan laba nyata.", [
  { kind: "source", ref: "Proposal hlm. 16–17", claim: "Laba per bulan Rp275,0 jt / Rp475,7 jt / Rp734,5 jt; dampak: daging +Rp1.000/kg −Rp11,92 jt; harga jual −Rp5.000/kg −Rp59,58 jt; mesin 75%→65% −Rp53,26 jt; sewa +Rp5 jt −Rp5,00 jt" },
]);

/* ---------------------------------------------------------------- 12 paket */
const groups: { t: string; items: string[] }[] = [
  { t: "Setiap hari", items: ["Dashboard owner", "Pembelian dan pemasok", "Produksi dan hasil tiap ekor", "Cek mutu dan asal produk", "Stok dan titipan", "Gudang dingin dan pembekuan", "Penjualan dan tagihan", "Jadwal produksi"] },
  { t: "Keuangan dan kendali", items: ["Biaya tiap produksi", "Tutup buku dan laporan bulanan", "Laporan untuk direksi", "Coba skenario harga", "Pengingat tagihan dan jadwal", "Akses per peran", "Aplikasi ponsel"] },
];
export const V12 = mk(12, "Paket", [
  ...chrome(12, "Paket", "Satu paket lengkap, semua sudah termasuk", { w: 1600, foot: "Dar Dev  ·  KATALIS ERP  ·  Harga dibahas setelah fitur disepakati" }),
  R(120, 250, 520, 740, P.green, { r: 32 }),
  X(152, 286, 460, 52, "Paket Lengkap", 42, { color: "#FFFFFF", weight: 700, va: "m", lh: 1 }),
  X(152, 346, 460, 70, "Semua fitur untuk mengurus usaha, dari beli ikan sampai laporan keuangan.", 22, { color: P.onDark, lh: 1.35 }),
  R(152, 452, 456, 150, "#0A4D80", { r: 24 }), ic("sparkles", "white", 180, 480, 44),
  X(240, 470, 350, 40, "Asisten AI", 32, { color: "#FFFFFF", weight: 700, va: "m", lh: 1 }),
  X(240, 514, 350, 80, "Tanya dengan kalimat biasa, jawabnya dari data usaha sendiri.", 20, { color: P.onDark, lh: 1.3 }),
  X(152, 640, 460, 90, "Harga\ndibahas bersama", 40, { color: "#FFFFFF", weight: 700, lh: 1.08 }),
  X(152, 770, 460, 80, "Estimasi selesai 1 bulan, tiap tahap diuji dulu sebelum lanjut.", 22, { color: P.onDark, lh: 1.35 }),
  ic("check", "white", 152, 900, 30), X(196, 894, 420, 44, "Demo bisa dicoba sekarang", 22, { color: "#FFFFFF", weight: 600, va: "m", lh: 1 }),
  ...groups.flatMap((g, gi): El[] => {
    const x = 700 + gi * 560;
    return [
      X(x, 262, 520, 30, g.t, 22, { color: P.green, weight: 700, va: "m", lh: 1 }), L(x, 304, x + 500, 304, P.line, 1.5),
      ...g.items.flatMap((t, j): El[] => [ic("check", "mint", x, 328 + j * 74 + 6, 30), X(x + 48, 328 + j * 74, 450, 44, t, 26, { color: P.ink, va: "m", lh: 1.1 })]),
    ];
  }),
  R(1260, 860, 540, 130, P.softGreen, { r: 24 }), ic("sparkles", "green", 1288, 892, 44),
  X(1348, 860, 430, 130, "Asisten AI: tanya \"piutang apa yang telat?\" dan dapat jawabannya.", 22, { color: P.green, weight: 600, lh: 1.3, va: "m" }),
], "Satu paket lengkap: semua fitur sudah termasuk, ditambah Asisten AI. Tidak ada harga; harga dibahas setelah fitur disepakati.", [
  { kind: "proposed", ref: "Keputusan penyaji", claim: "Penawaran satu paket (Paket Lengkap) dengan semua fitur dan Asisten AI; tidak ada paket lebih rendah" },
  { kind: "assumption", ref: "Brief — Pricing rules", claim: "Harga perkiraan awal, tidak mengikat, dibahas setelah fitur disepakati" },
  { kind: "assumption", ref: "Asisten AI", claim: "Asisten AI menjawab pertanyaan dari data di aplikasi; belum ada di demo, cakupan dibahas saat diskusi kebutuhan" },
]);

/* ---------------------------------------------------------------- 13 jadwal */
const weeks: { w: string; t: string; items: string[]; out: string }[] = [
  { w: "Minggu 1", t: "Rancang", items: ["Diskusi dan wawancara tim", "Rancangan disetujui", "Aplikasi inti mulai dibuat"], out: "Rancangan siap" },
  { w: "Minggu 2", t: "Bangun inti", items: ["Pembelian, produksi, stok", "Penjualan dan tagihan", "Mutu, gudang dingin, jadwal"], out: "Modul harian bisa dicoba" },
  { w: "Minggu 3", t: "Keuangan", items: ["Biaya dan tutup buku", "Laporan bulanan", "Asisten AI mulai dibuat"], out: "Laporan keuangan jalan" },
  { w: "Minggu 4", t: "Uji dan pakai", items: ["Asisten AI selesai", "Uji bersama pengguna", "Pelatihan dan mulai dipakai"], out: "Siap dipakai" },
];
const next: [string, string][] = [["Diskusi kebutuhan", "Presentasi dan prioritas"], ["Pastikan kebutuhan", "Lengkapi informasi"], ["Rancangan disetujui", "Kebutuhan dan rencana"], ["Penawaran final", "Harga dan jadwal"], ["Mulai dibuat", "Pembayaran awal"]];
export const V13 = mk(13, "Jadwal pengerjaan", [
  X(120, 84, 900, 30, "Rencana kerja", 22, { color: P.green, weight: 600, va: "m", lh: 1 }),
  X(120, 126, 900, 76, "Selesai dalam 1 bulan", 60, { color: P.ink, weight: 700, lh: 1.06 }),
  X(1000, 126, 800, 76, "Tahap dikerjakan bersamaan, jadi total 4 minggu.", 24, { color: P.muted, align: "r", va: "m", lh: 1.3 }),
  ...weeks.flatMap((k, i): El[] => {
    const w = 402, x = 120 + i * (w + 24), y = 250, h = 500, last = i === weeks.length - 1;
    return [
      R(x, y, w, h, last ? P.green : P.card, { r: 28, line: last ? undefined : P.line, lw: 1.5 }),
      R(x + 28, y + 28, 132, 36, last ? "#0A4D80" : P.softGreen, { r: 18 }), X(x + 28, y + 28, 132, 36, k.w, 18, { color: last ? "#FFFFFF" : P.green, weight: 700, align: "c", va: "m", lh: 1 }),
      X(x + 28, y + 84, w - 56, 44, k.t, 34, { color: last ? "#FFFFFF" : P.ink, weight: 700, va: "m", lh: 1 }),
      L(x + 28, y + 148, x + w - 28, y + 148, last ? "#2F6A94" : P.line, 1.5),
      ...k.items.flatMap((t, j): El[] => [ic("check", last ? "white" : "mint", x + 28, y + 176 + j * 74 + 4, 28), X(x + 70, y + 176 + j * 74, w - 98, 60, t, 22, { color: last ? "#FFFFFF" : P.ink, lh: 1.25, va: "t" })]),
      R(x + 20, y + h - 96, w - 40, 76, last ? "#0A4D80" : P.softGreen, { r: 20 }),
      ic("flag", last ? "white" : "green", x + 40, y + h - 96 + 22, 32), X(x + 84, y + h - 96, w - 120, 76, k.out, 21, { color: last ? "#FFFFFF" : P.green, weight: 700, lh: 1.2, va: "m" }),
    ];
  }),
  X(120, 800, 700, 28, "SEBELUM MULAI", 16, { color: P.faint, weight: 700, va: "m", lh: 1, ls: 1.2 }),
  L(120, 840, 1800, 840, P.line, 1.5),
  ...next.flatMap(([a2, b2], i): El[] => {
    const x = 120 + i * 340;
    return [O(x, 876, 48, 48, P.green), X(x, 876, 48, 48, String(i + 1), 24, { color: "#FFFFFF", weight: 700, align: "c", va: "m", lh: 1 }), X(x + 64, 870, 260, 34, a2, 22, { color: P.ink, weight: 700, va: "m", lh: 1 }), X(x + 64, 908, 260, 28, b2, 18, { color: P.muted, va: "m", lh: 1 })];
  }),
  X(120, 1024, 1300, 24, "Dar Dev  ·  KATALIS ERP  ·  Estimasi awal, jadwal pasti disepakati setelah diskusi kebutuhan", 16, { color: P.faint, va: "m", lh: 1 }),
  X(1640, 1024, 160, 24, `13 / ${TOTAL}`, 16, { color: P.faint, align: "r", va: "m", lh: 1 }),
], "Estimasi selesai dalam 1 bulan (4 minggu): enam tahap dikerjakan bersamaan, dipetakan per minggu (Asisten AI di minggu 3–4), lalu lima langkah sebelum proyek berjalan. Estimasi awal; jadwal pasti disepakati setelah diskusi kebutuhan.", [
  { kind: "commercial", ref: "Keputusan penyaji", claim: "Estimasi penyelesaian 1 bulan (4 minggu) dengan tahap dikerjakan bersamaan; menggantikan perkiraan awal proposal 18–26 minggu; bukan janji tenggat tanpa syarat" },
]);

/* ---------------------------------------------------------------- 14 penutup */
export const V14 = mk(14, "Penutup", [
  img(120, 96, 380, 155, "/brand/katalis-logo-white.png"),
  X(120, 300, 1680, 380, "Mari kelola usaha perikanan lebih mudah dan jelas.", 112, { color: "#FFFFFF", weight: 700, lh: 1.02, va: "t" }),
  X(120, 700, 1100, 100, "Semua aktivitas terlihat dan terkendali dari satu dashboard. Penawaran ini belum mengikat; harga dibahas setelah fitur disepakati.", 28, { color: P.onDark, lh: 1.4 }),
  R(120, 856, 560, 92, "#FFFFFF", { r: 46 }), X(120, 856, 560, 92, "Jadwalkan diskusi kebutuhan", 28, { color: P.green, weight: 700, align: "c", va: "m", lh: 1 }),
  X(760, 856, 700, 92, "Coba demo: /demo  ·  /demo/desktop", 24, { color: P.onDark, va: "m", lh: 1 }),
  X(120, 1024, 600, 24, "Dar Dev  ·  KATALIS ERP", 16, { color: P.onDark, va: "m", lh: 1 }), X(1640, 1024, 160, 24, `14 / ${TOTAL}`, 16, { color: P.onDark, align: "r", va: "m", lh: 1 }),
], "Tutup dengan ajakan konkret: jadwalkan diskusi kebutuhan.", [{ kind: "proposed", ref: "Brief — Slide 28", claim: "Pesan penutup dan ajakan" }], "dark");

export const V2SLIDES = [V1, V2, V3, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14];
