import type { El } from "@/lib/scene";
import { img } from "@/lib/kit";
import { R, O, X, L } from "@/lib/phone";
import { mk } from "./_h";
import { V1, V4, V5, V12, V13, V14 } from "./v2";

/**
 * Deck v3: every problem gets its own slide with the same four parts:
 *   1. the problem in one plain sentence  2. what the number means  3. a simple picture of the data
 *   4. the solution, shown on the real screen of the app.
 */
const P = { ink: "#14201B", green: "#0E5C46", mint: "#12A676", muted: "#5C6862", faint: "#8C968F", line: "#DAD9D2", card: "#FFFFFF", track: "#E6E4DC", amber: "#C98A1B", red: "#B4443C", soft: "#E4EFE9", onDark: "#CFEFE3", amberSoft: "#F6E9CF" };
const TOTAL = 14;
const ic = (name: string, color: string, x: number, y: number, s: number): El => img(x, y, s, s, `/icons/${name}-${color}.png`);

const SRC1 = { kind: "source" as const, ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "Ikan utuh 481 kg (11 ekor); hasil olahan 62,6% (rencana 60%); biaya total Rp37,08 jt; ongkos kirim Rp11,08 jt (29,9%); sisa olahan 65 kg; hasil olahan per ekor 63,1; 61,3; 61,4; 63,7; 52,2; 64,4; 70,2; 63,5; 63,3; 63,3; 60,2" };
const DEMO = { kind: "illustrative" as const, ref: "Demo interaktif", claim: "Layar adalah tangkapan dari /demo/desktop; angka contoh kecuali yang berlabel Siklus 1" };

/** One problem slide. `visual` draws the left-hand picture of the data (y 470–960). */
const problem = (o: {
  n: number; id: number; title: string; kicker: string; mean: string; visual: El[];
  module: string; icon: string; points: string[]; shot: string; shotH: number; foot: string; notes: string; sources: Parameters<typeof mk>[4];
}): ReturnType<typeof mk> => {
  const els: El[] = [
    // zone 1: the problem (warm panel on the left)
    R(0, 0, 740, 1080, "#F3EEE2"),
    R(120, 84, 232, 40, "#FFFFFF", { r: 20, line: "#E3D9C2", lw: 1.5 }), O(136, 98, 12, 12, P.amber),
    X(156, 84, 190, 40, `MASALAH ${o.n} DARI 6`, 15, { color: P.amber, weight: 700, va: "m", lh: 1, ls: 1.2 }),
    X(368, 84, 340, 40, o.kicker, 18, { color: P.muted, weight: 500, va: "m", lh: 1 }),
    X(120, 144, 590, 200, o.title, 52, { color: P.ink, weight: 700, lh: 1.08, va: "t" }),
    X(120, 352, 590, 110, o.mean, 22, { color: P.muted, lh: 1.42, va: "t" }),
    ...o.visual,
    // connector: problem -> answer
    O(716, 500, 48, 48, P.green, { line: "#FAF9F6", lw: 6 }), ic("arrow-right", "white", 726, 510, 28),
    // zone 2: the answer
    X(800, 84, 460, 40, "JAWABANNYA DI KATALIS ERP", 15, { color: P.green, weight: 700, va: "m", lh: 1, ls: 1.2 }),
    R(1262, 84, 270, 40, P.soft, { r: 20 }), ic(o.icon, "green", 1276, 92, 24), X(1308, 84, 220, 40, o.module, 18, { color: P.green, weight: 600, va: "m", lh: 1 }),
    ...o.points.flatMap((t, i): El[] => {
      const x = 800 + i * 340;
      return [O(x, 158, 40, 40, P.mint), ic("check", "white", x + 8, 166, 24), X(x + 52, 148, 262, 100, t, 24, { color: P.ink, weight: 600, lh: 1.25, va: "t" })];
    }),
    img(800, 276, 1000, Math.round(1000 * o.shotH / 1040), o.shot),
    X(120, 1024, 1300, 24, o.foot, 16, { color: P.faint, va: "m", lh: 1 }),
    X(1640, 1024, 160, 24, `${String(o.id).padStart(2, "0")} / ${TOTAL}`, 16, { color: P.faint, align: "r", va: "m", lh: 1 }),
  ];
  return mk(o.id, o.title, els, o.notes, o.sources);
};

/* -------------------------------------------------- 2 ringkasan: masalah dan jawaban */
const rows: [string, string, string, string][] = [
  ["Hampir sepertiga uang keluar habis buat ongkos kirim", "Ongkos tiap kiriman dicatat dan dibandingkan", "Laporan", "wallet"],
  ["Hasil daging tiap ekor beda jauh, 52 sampai 70 kg dari 100 kg ikan", "Hasil tiap ekor dicatat dan dibandingkan dengan rencana", "Produksi", "factory"],
  ["65 kg sisa potongan ikan belum laku", "Sisa potongan tercatat, harga ikut kelas mutu", "Stok", "package"],
  ["Tagihan gudang dingin dihitung pakai tangan", "Tagihan keluar otomatis, tinggal dicek", "Gudang dingin", "snowflake"],
  ["Jadwal dua mitra bisa saling tabrak", "Bentrok ketahuan sebelum hari H", "Jadwal", "calendar-clock"],
  ["55 transaksi belum punya bukti transfer", "Daftar cek sebelum tutup buku", "Keuangan", "receipt-text"],
];
export const W2 = mk(2, "Masalah dan jawabannya", [
  X(120, 84, 900, 30, "Ringkasan", 22, { color: P.green, weight: 600, va: "m", lh: 1 }),
  X(120, 126, 1500, 80, "Enam masalah di usaha Katalis, dan jawabannya", 60, { color: P.ink, weight: 700, lh: 1.06 }),
  X(214, 246, 640, 26, "YANG TERJADI SEKARANG", 18, { color: P.red, weight: 700, va: "m", lh: 1, ls: 1.5 }),
  X(960, 246, 600, 26, "JAWABAN DI APLIKASI", 18, { color: P.green, weight: 700, va: "m", lh: 1, ls: 1.5 }),
  ...rows.flatMap(([a, b, m, icn], i): El[] => {
    const y = 290 + i * 116;
    return [
      R(120, y, 1680, 100, P.card, { r: 24, line: P.line, lw: 1.5 }),
      O(144, y + 26, 48, 48, "#F8E5E3"), X(144, y + 26, 48, 48, String(i + 1), 24, { color: P.red, weight: 700, align: "c", va: "m", lh: 1 }),
      X(214, y, 640, 100, a, 26, { color: P.ink, weight: 600, lh: 1.2, va: "m" }),
      ic("arrow-right", "mint", 884, y + 32, 36),
      X(960, y, 560, 100, b, 26, { color: P.green, weight: 700, lh: 1.2, va: "m" }),
      R(1556, y + 24, 220, 52, P.soft, { r: 26 }), ic(icn, "green", 1572, y + 34, 32), X(1612, y + 24, 160, 52, m, 20, { color: P.green, weight: 600, va: "m", lh: 1 }),
    ];
  }),
  X(120, 1024, 1300, 24, "Dar Dev  ·  KATALIS ERP  ·  Data nyata Siklus 1 dan Monitor Dana Fasilitas Bungus", 16, { color: P.faint, va: "m", lh: 1 }),
  X(1640, 1024, 160, 24, `02 / ${TOTAL}`, 16, { color: P.faint, align: "r", va: "m", lh: 1 }),
], "Enam masalah yang terlihat dari data Siklus 1 dan Monitor Dana, masing-masing dengan jawabannya di aplikasi. Slide berikutnya menjelaskan satu per satu.", [SRC1]);

/* -------------------------------------------------- 3 ongkos kirim */
const waffle: El[] = [
  X(120, 484, 560, 30, "Dari tiap Rp100 yang keluar:", 22, { color: P.ink, weight: 600, va: "m", lh: 1 }),
  ...Array.from({ length: 100 }, (_, i): El => {
    const c = i % 10, r = Math.floor(i / 10);
    return R(120 + c * 52, 530 + r * 40, 44, 32, i < 30 ? P.amber : "#D3E4DB", { r: 8 });
  }),
  R(120, 948, 28, 22, P.amber, { r: 6 }), X(158, 944, 540, 30, "Rp30 habis buat ongkos kirim", 20, { color: P.ink, weight: 600, va: "m", lh: 1 }),
];
export const W3 = problem({
  n: 1, id: 3, kicker: "Ongkos kirim", title: "Hampir sepertiga uang keluar habis buat ongkos kirim",
  mean: "Biaya Siklus 1 totalnya Rp37 juta. Rp11 juta di antaranya cuma buat kirim barang. Tanpa catatan, susah tahu ongkos mana yang kemahalan.", visual: waffle,
  module: "Laporan biaya", icon: "wallet", points: ["Ongkos tiap kiriman dicatat", "Tarif lama dan baru bisa dibandingkan", "Ada tanda kalau ongkos naik"],
  shot: "/shots/screen-biaya.png", shotH: 610, foot: "Dar Dev  ·  KATALIS ERP  ·  Data nyata Siklus 1",
  notes: "Ongkos kirim Rp11,08 juta dari total biaya Siklus 1 Rp37,08 juta (29,9%). Bila tarif turun ke Rp29.500 per kg dari Rp31.000, hemat sekitar Rp1.840 per kg loin.", sources: [SRC1, DEMO],
});

/* -------------------------------------------------- 4 hasil tiap ekor */
const yv = [63.1, 61.3, 61.4, 63.7, 52.2, 64.4, 70.2, 63.5, 63.3, 63.3, 60.2];
const sx = (v: number) => 140 + ((v - 50) / 22) * 560;
const mark = (v: number, label: string, val: string, color: string, above: boolean): El[] => [
  O(sx(v) - 15, 700 - 15, 30, 30, color, { line: "#FFFFFF", lw: 4 }),
  X(sx(v) - 100, above ? 616 : 740, 200, 30, label, 19, { color: P.muted, align: "c", va: "m", lh: 1 }),
  X(sx(v) - 80, above ? 646 : 770, 160, 36, val, 30, { color, weight: 700, align: "c", va: "m", lh: 1 }),
];
const rangeVisual: El[] = [
  X(120, 484, 580, 60, "Dari 100 kg ikan, berapa kg yang jadi loin?", 22, { color: P.ink, weight: 600, lh: 1.25 }),
  R(140, 696, 560, 8, P.track, { r: 4 }),
  ...yv.map((v) => O(sx(v) - 8, 700 - 8, 16, 16, "#9CC8B4")),
  ...[50, 60, 70].flatMap((t): El[] => [L(sx(t), 816, sx(t), 828, P.faint, 2), X(sx(t) - 30, 836, 60, 24, String(t), 18, { color: P.faint, align: "c", va: "m", lh: 1 })]),
  X(120, 876, 580, 30, "kg loin dari tiap 100 kg ikan utuh", 18, { color: P.faint, va: "m", lh: 1 }),
  ...mark(52.2, "Terendah, ekor 005", "52,2", P.amber, true),
  ...mark(60, "Rencana", "60", P.ink, true),
  ...mark(62.6, "Rata-rata", "62,6", P.green, false),
  ...mark(70.2, "Tertinggi, ekor 007", "70,2", P.mint, false),
];
export const W4 = problem({
  n: 2, id: 4, kicker: "Hasil tiap ekor", title: "Dari 100 kg ikan, loin yang jadi bisa 52 kg atau 70 kg",
  mean: "Rencananya 60 kg. Rata-rata Siklus 1 sudah 62,6 kg, tapi ekor 005 cuma 52,2 kg. Tanpa catatan per ekor, sebabnya sulit dicari.", visual: rangeVisual,
  module: "Produksi", icon: "factory", points: ["Hasil tiap ekor dicatat", "Langsung dibandingkan dengan rencana", "Ekor yang hasilnya rendah ketahuan"],
  shot: "/shots/screen-produksi.png", shotH: 665, foot: "Dar Dev  ·  KATALIS ERP  ·  Data nyata Siklus 1 (11 ekor, 481 kg)",
  notes: "Hasil olahan 11 ekor Siklus 1: terendah ekor 005 (52,2%), tertinggi ekor 007 (70,2%), rata-rata 62,6%, rencana 60%.", sources: [SRC1, DEMO],
});

/* -------------------------------------------------- 5 sisa olahan dan mutu */
export const W5 = problem({
  n: 3, id: 5, kicker: "Sisa potongan dan mutu", title: "65 kg sisa potongan ikan belum laku",
  mean: "Kepala, tetelan, dan potongan lain tertinggal setelah daging diambil. Harga tiap kelas mutu juga beda, jadi gampang salah patok.",
  visual: [
    X(120, 500, 600, 220, "65 kg", 170, { color: P.amber, weight: 700, lh: 1, va: "m" }),
    X(120, 730, 560, 70, "sisa potongan di stok yang belum ada pembelinya", 26, { color: P.ink, weight: 500, lh: 1.3 }),
    R(120, 850, 560, 96, P.card, { r: 24, line: P.line, lw: 1.5 }), ic("tag", "green", 148, 878, 40), X(208, 850, 450, 96, "6 kelas mutu, 6 harga berbeda", 24, { color: P.ink, weight: 600, va: "m", lh: 1.2 }),
  ],
  module: "Stok dan mutu", icon: "package", points: ["Sisa potongan tercatat di stok", "Calon pembeli bisa dicatat", "Harga otomatis ikut kelas mutu"],
  shot: "/shots/screen-stok.png", shotH: 610, foot: "Dar Dev  ·  KATALIS ERP  ·  Data nyata Siklus 1",
  notes: "Sisa olahan 65 kg dari Siklus 1 belum terjual. Enam kelas mutu dengan harga berbeda.", sources: [SRC1, DEMO],
});

/* -------------------------------------------------- 6 gudang dingin */
const tarif: [string, string][] = [["Sampai 24 jam", "Rp75/kg"], ["Sampai 10 hari", "Rp750/kg"], ["30 hari", "Rp2.250/kg"]];
export const W6 = problem({
  n: 4, id: 6, kicker: "Gudang dingin", title: "Tagihan gudang dingin dihitung pakai tangan, gampang salah",
  mean: "Tarifnya naik sesuai lama simpan: Rp75 per kg untuk sehari, Rp2.250 per kg untuk sebulan. Salah hitung sedikit, tagihan pelanggan ikut salah.",
  visual: [
    X(120, 500, 560, 30, "Tarif simpan", 20, { color: P.faint, weight: 600, va: "m", lh: 1 }),
    ...tarif.flatMap(([a, b], i): El[] => [L(120, 540 + i * 62, 680, 540 + i * 62, P.line, 1.5), X(120, 548 + i * 62, 340, 48, a, 24, { color: P.muted, va: "m", lh: 1 }), X(440, 548 + i * 62, 240, 48, b, 26, { color: P.ink, weight: 700, align: "r", va: "m", lh: 1 })]),
    R(120, 760, 560, 200, P.green, { r: 28 }),
    X(152, 782, 500, 28, "Contoh: 10.000 kg disimpan 15 hari", 20, { color: P.onDark, va: "m", lh: 1 }),
    X(152, 822, 500, 90, "Rp11.250.000", 68, { color: "#FFFFFF", weight: 700, va: "m", lh: 1 }),
    X(152, 916, 500, 28, "dihitung otomatis, tanpa kalkulator", 20, { color: P.onDark, va: "m", lh: 1 }),
  ],
  module: "Gudang dingin", icon: "snowflake", points: ["Tarif tersimpan di aplikasi", "Tagihan keluar sendiri, tinggal dicek", "Tarif bisa diubah kalau berubah"],
  shot: "/shots/screen-gudang.png", shotH: 665, foot: "Dar Dev  ·  KATALIS ERP  ·  Contoh hitungan, bukan tagihan nyata",
  notes: "Tarif dari proposal hlm. 8. Contoh: 10.000 kg disimpan 15 hari, tarif Rp1.125/kg, total Rp11.250.000 (contoh hitungan).", sources: [
    { kind: "source", ref: "Proposal hlm. 8", claim: "Tarif: sampai 24 jam Rp75/kg; sampai 10 hari minimum Rp750/kg; hari ke-11 Rp825/kg; 30 hari Rp2.250/kg" },
    { kind: "illustrative", ref: "Contoh hitungan", claim: "10.000 kg × 15 hari = Rp11.250.000 adalah contoh, bukan tagihan nyata" }, DEMO,
  ],
});

/* -------------------------------------------------- 7 jadwal */
const sched: [string, string][] = [["Senin", "CV DUS"], ["Selasa", "PT SNS"], ["Rabu", "CV DUS"], ["Kamis", "PT SNS"], ["Jumat", "CV DUS"], ["Sabtu", "PT SNS"]];
export const W7 = problem({
  n: 5, id: 7, kicker: "Jadwal", title: "Dua mitra bergantian pakai mesin, jadwal bisa saling tabrak",
  mean: "CV DUS pakai mesin Senin, Rabu, Jumat. PT SNS Selasa, Kamis, Sabtu. Pesanan ABF jam 10.00 hari Senin menabrak jadwal CV DUS.",
  visual: [
    ...sched.flatMap(([d, w], i): El[] => {
      const y = 500 + i * 74;
      return [X(120, y, 150, 56, d, 24, { color: P.ink, weight: 600, va: "m", lh: 1 }), R(270, y, 410, 56, w === "CV DUS" ? P.ink : P.green, { r: 18 }), X(294, y, 360, 56, w, 22, { color: "#FFFFFF", weight: 600, va: "m", lh: 1 })];
    }),
    R(492, 500, 188, 56, P.red, { r: 18, line: "#FFFFFF", lw: 4 }), ic("triangle-alert", "white", 508, 512, 32), X(548, 500, 130, 56, "ABF", 22, { color: "#FFFFFF", weight: 700, va: "m", lh: 1 }),
    X(120, 950, 560, 30, "Senin: pesanan ABF menabrak produksi", 20, { color: P.red, weight: 600, va: "m", lh: 1 }),
  ],
  module: "Jadwal", icon: "calendar-clock", points: ["Jadwal semua mitra dalam satu kalender", "Bentrok ketahuan sebelum hari H", "Pesanan ABF bisa dipindah ke jam kosong"],
  shot: "/shots/screen-jadwal.png", shotH: 665, foot: "Dar Dev  ·  KATALIS ERP  ·  Angka kapasitas adalah perkiraan",
  notes: "Giliran CV DUS (Senin, Rabu, Jumat) dan PT SNS (Selasa, Kamis, Sabtu) dari proposal hlm. 4. Pesanan ABF jam 10.00 adalah contoh peringatan.", sources: [
    { kind: "source", ref: "Proposal hlm. 4", claim: "Senin CV DUS, Selasa PT SNS, Rabu CV DUS, Kamis PT SNS, Jumat CV DUS, Sabtu PT SNS; 08.00–17.00, Sabtu 08.00–12.00" },
    { kind: "illustrative", ref: "Contoh peringatan", claim: "Pesanan ABF jam 10.00 hari Senin adalah contoh" }, DEMO,
  ],
});

/* -------------------------------------------------- 8 keuangan */
export const W8 = problem({
  n: 6, id: 8, kicker: "Keuangan", title: "55 transaksi belum punya bukti transfer",
  mean: "Nota sudah lengkap semua. Tapi dari 219 transaksi, baru 164 yang ada bukti transfernya. Tanpa bukti, tutup buku jadi tebak-tebakan.",
  visual: [
    X(120, 500, 560, 30, "Bukti transfer yang sudah lengkap", 22, { color: P.ink, weight: 600, va: "m", lh: 1 }),
    X(120, 536, 580, 180, "164", 140, { color: P.green, weight: 700, va: "m", lh: 1 }),
    X(410, 600, 300, 60, "dari 219", 30, { color: P.muted, va: "m", lh: 1 }),
    R(120, 730, 560, 28, P.track, { r: 14 }), R(120, 730, 560 * (164 / 219), 28, P.green, { r: 14 }),
    X(120, 776, 560, 34, "55 transaksi belum ada bukti", 24, { color: P.amber, weight: 700, va: "m", lh: 1 }),
    R(120, 850, 560, 96, P.card, { r: 24, line: P.line, lw: 1.5 }), ic("circle-check", "mint", 148, 878, 40), X(208, 850, 450, 96, "Nota: 243 dari 243 sudah lengkap", 24, { color: P.ink, weight: 600, va: "m", lh: 1.2 }),
  ],
  module: "Keuangan", icon: "receipt-text", points: ["Tiap transaksi punya nota dan bukti", "Ada daftar cek sebelum tutup buku", "Setelah ditutup, catatan terkunci"],
  shot: "/shots/screen-keuangan.png", shotH: 665, foot: "Dar Dev  ·  KATALIS ERP  ·  Data Monitor Dana Fasilitas Bungus",
  notes: "Dari Monitor Dana Fasilitas Bungus: 243 transaksi, nota lengkap 243, bukti transfer lengkap 164 dari 219 (55 belum ada, 24 tidak perlu).", sources: [
    { kind: "source", ref: "Monitor Dana Fasilitas Bungus (JURNAL, CEK DATA)", claim: "243 transaksi; nota lengkap 243; bukti transfer lengkap 164 dari 219 (55 belum ada, 24 tidak perlu)" }, DEMO,
  ],
});

/* -------------------------------------------------- Asisten AI */
const qs = ["Tagihan mana yang telat?", "Ekor mana hasilnya paling rendah?", "Berapa saldo kas sekarang?"];
export const WAI = mk(11, "Asisten AI", [
  O(120, 76, 44, 44, P.soft), ic("sparkles", "green", 128, 84, 28), X(180, 78, 600, 40, "Asisten AI", 22, { color: P.green, weight: 600, va: "m", lh: 1 }),
  X(120, 140, 620, 170, "Tanya saja, asisten yang mencarikan jawabannya", 48, { color: P.ink, weight: 700, lh: 1.08, va: "t" }),
  X(120, 330, 580, 110, "Tidak perlu buka banyak menu. Tulis pertanyaan dengan kalimat biasa, jawabannya diambil dari data usaha sendiri.", 24, { color: P.muted, lh: 1.4, va: "t" }),
  X(120, 468, 580, 28, "CONTOH PERTANYAAN", 15, { color: P.faint, weight: 700, va: "m", lh: 1, ls: 1.2 }),
  ...qs.flatMap((q, i): El[] => {
    const y = 516 + i * 84;
    return [R(120, y, 580, 68, P.card, { r: 34, line: P.line, lw: 1.5 }), ic("message-circle", "green", 148, y + 18, 32), X(200, y, 480, 68, q, 24, { color: P.ink, weight: 500, va: "m", lh: 1 })];
  }),
  R(120, 790, 580, 96, P.soft, { r: 24 }), ic("circle-check", "green", 146, 818, 40),
  X(204, 790, 480, 96, "Jawaban bisa langsung dibuka ke modulnya, mis. Penjualan.", 22, { color: P.green, weight: 600, lh: 1.3, va: "m" }),
  // desktop: window 2880x1640 inside 3000x1760 (60px pad), visible width 880 at x 760
  img(760 - 60 * (880 / 2880), 250 - 60 * (880 / 2880), 3000 * (880 / 2880), 1760 * (880 / 2880), "/shots/screen-asisten.png"),
  // phone: 1244x2606 inside 1364x2726 (60px pad), visible height 503 -> right edge at x 1800
  img(1560 - 60 * (503 / 2606), 477 - 60 * (503 / 2606), 1364 * (503 / 2606), 2726 * (503 / 2606), "/mobile/m-asisten.png"),
  X(120, 1024, 1300, 24, "Dar Dev  ·  KATALIS ERP  ·  Contoh tampilan, jawaban dari data contoh dan Siklus 1", 16, { color: P.faint, va: "m", lh: 1 }),
  X(1640, 1024, 160, 24, `11 / ${TOTAL}`, 16, { color: P.faint, align: "r", va: "m", lh: 1 }),
], "Asisten AI menjawab pertanyaan dengan kalimat biasa, berdasarkan data di aplikasi. Di demo, jawaban disusun dari data contoh; versi sebenarnya membaca data asli usaha.", [
  { kind: "assumption", ref: "Asisten AI", claim: "Asisten AI menjawab dari data di aplikasi; di demo jawabannya disusun dari data contoh dan data Siklus 1; cakupan versi sebenarnya dibahas saat diskusi kebutuhan" },
  SRC1, DEMO,
]);

export const V3SLIDES = [V1, W2, W3, W4, W5, W6, W7, W8, V4, V5, WAI, V12, V13, V14];
