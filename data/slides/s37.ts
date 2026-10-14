import { C, txt, rect, ell, ln } from "@/lib/kit";
import type { El } from "@/lib/scene";
import { place } from "@/lib/phone";
import { lightPhone } from "@/lib/demoMock";
import { mk, std } from "./_h";

/** Mobile demo: three phones (Beranda, Persetujuan, Aktivitas) in the same visual language as the desktop dashboard. */
const FRAME = "#10201A";
const PANEL = "#F2F2EE";
const DEEP = "#0E5C46";
const MID = "#12A676";
const SOFT = "#BFE6D6";

const pill = (x: number, y: number, w: number, text: string, kind: "blue" | "amber" | "red" | "green"): El[] => {
  const map = { blue: ["#DDEBFB", "#2D5F9A"], amber: ["#FBEBC8", "#8A5A00"], red: ["#F9DEDC", "#A8322B"], green: ["#D7F2E3", "#0B6B4A"] } as const;
  const [bg, fg] = map[kind];
  return [rect(x, y, w, 28, bg, { r: 14 }), txt(x, y, w, 28, text, 15, { color: fg, weight: 600, align: "c", va: "m", lh: 1 })];
};

const tabBar = (sx: number, sy: number, sw: number, sh: number, active: number): El[] => {
  const els: El[] = [rect(sx + 12, sy + sh - 86, sw - 24, 72, C.white, { r: 36 })];
  const labels = ["Beranda", "Aktivitas", "Setuju", "Laporan"];
  const cw = (sw - 24) / 4;
  labels.forEach((l, i) => {
    const cx = sx + 12 + cw * i + cw / 2;
    const on = i === active;
    if (on) els.push(rect(cx - 35, sy + sh - 80, 70, 60, DEEP, { r: 30 }));
    els.push(rect(cx - 9, sy + sh - 74, 18, 18, undefined, { line: on ? C.white : C.faint, lw: 2.5, r: 5 }));
    els.push(txt(cx - 40, sy + sh - 52, 80, 24, l, 12, { color: on ? C.white : C.muted, weight: on ? 700 : 500, align: "c", va: "m", lh: 1 }));
  });
  return els;
};

const phone = (x: number, y: number, w: number, h: number, active: number, inner: (sx: number, sy: number, sw: number, sh: number) => El[]): El[] => {
  const sx = x + 10, sy = y + 10, sw = w - 20, sh = h - 20;
  return [
    rect(x, y, w, h, FRAME, { r: 50 }),
    rect(sx, sy, sw, sh, PANEL, { r: 41 }),
    txt(sx + 28, sy + 14, 80, 26, "09.41", 15, { color: C.ink, weight: 700, va: "m", lh: 1 }),
    ...inner(sx, sy, sw, sh),
    ...tabBar(sx, sy, sw, sh, active),
    rect(x + w / 2 - 48, y + 18, 96, 26, FRAME, { r: 13 }),
  ];
};

const row = (x: number, y: number, w: number, a: string, b: string, kind: "blue" | "amber" | "red" | "green", s: string): El[] => [
  rect(x, y, w, 84, C.white, { r: 22 }),
  txt(x + 18, y + 14, w - 130, 28, a, 17, { color: C.ink, weight: 700, va: "m", lh: 1 }),
  txt(x + 18, y + 46, w - 130, 24, b, 14, { color: C.muted, va: "m", lh: 1 }),
  ...pill(x + w - 108, y + 28, 92, s, kind),
];

// phones match the interactive demo (/demo): frosted cards, soft tiles, black accents
const p1 = place(lightPhone("home"), 1.0, 750, 262);
const p2 = place(lightPhone("approve"), 1.114, 1100, 214);
const p3 = place(lightPhone("modul"), 1.0, 1490, 262);

const points: [string, string][] = [
  ["Lihat", "Untung, stok, dan tagihan hari ini."],
  ["Putuskan", "Setujui pembelian dari mana saja."],
  ["Pantau", "Aktivitas dan peringatan dalam satu daftar."],
];

export const s37 = mk(
  37,
  "Tampilan ponsel",
  [
    ...[
    ...std(37, "Tampilan ponsel", "Pantau dan putuskan dari ponsel, di mana saja"),
    rect(120, 262, 188, 40, C.ice, { r: 20 }),
    txt(120, 262, 188, 40, "Mode demo", 18, { color: C.teal, weight: 700, align: "c", va: "m", lh: 1 }),
    txt(120, 330, 560, 250, "Keputusan tidak perlu menunggu sampai di kantor.", 60, { color: C.ink, weight: 800, lh: 1.08, va: "t" }),
    ...points.flatMap(([a, b], i): El[] => {
      const y = 620 + i * 112;
      return [
        ln(120, y - 12, 640, y - 12, C.border, 1.5),
        txt(120, y, 150, 34, a, 26, { color: i % 2 ? C.teal : C.ocean, weight: 800, va: "m", lh: 1 }),
        txt(120, y + 38, 520, 40, b, 22, { color: C.muted, va: "m", lh: 1.2 }),
      ];
    }),
    rect(1560, 190, 240, 40, C.ice, { r: 20 }),
    txt(1560, 190, 240, 40, "Data contoh", 18, { color: C.teal, weight: 700, align: "c", va: "m", lh: 1 }),
    ],
    ...p1,
    ...p3,
    ...p2,
  ],
  "Contoh tampilan ponsel dalam mode demo: beranda dengan angka utama, layar persetujuan, dan daftar aktivitas. Semua angka kecuali yang berasal dari Siklus 1 adalah data contoh.",
  [
    { kind: "proposed", ref: "Permintaan penyaji — mode demo ponsel", claim: "Tampilan ponsel untuk beranda, persetujuan, dan aktivitas harian" },
    { kind: "source", ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "Ikan utuh 481 kg; hasil olahan 62,6%; untung Rp4.503.468, margin 10,8%" },
    { kind: "illustrative", ref: "Contoh tampilan", claim: "Persetujuan pembelian 640 kg, aktivitas, dan isi gudang dingin adalah data contoh" },
  ],
);
