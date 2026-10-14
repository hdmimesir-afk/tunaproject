import type { El } from "./scene";
import { R, O, X, L } from "./phone";

/** Mockups that match the interactive demo (/demo, /demo/desktop): frosted cards, soft tiles, black accents. */
export const D = {
  ink: "#111214", muted: "#7A7F87", bg: "#E9EDF5", card: "#F8F9FC", tile: "#EEF0F6", white: "#FFFFFF", edge: "#FFFFFF",
  red: "#E0524A", warnText: "#B4443C",
};

const PILL: Record<string, [string, string]> = {
  amber: ["#FBF0D5", "#8A5A00"], blue: ["#E4EEFB", "#2D5F9A"], red: ["#FBE5E3", "#A8322B"], green: ["#DDF3E8", "#0B6B4A"],
};
export const pill = (x: number, y: number, w: number, t: string, k: keyof typeof PILL, h = 28, size = 14): El[] => [
  R(x, y, w, h, PILL[k][0], { r: h / 2 }), X(x, y, w, h, t, size, { color: PILL[k][1], weight: 700, align: "c", va: "m", lh: 1 }),
];
export const glass = (x: number, y: number, w: number, h: number, r = 28): El => R(x, y, w, h, D.card, { r, line: D.edge, lw: 1.5 });
const arrowBtn = (x: number, y: number, s = 28): El[] => [O(x, y, s, s, D.white), X(x, y, s, s, "↗", s * 0.55, { color: D.ink, weight: 700, align: "c", va: "m", lh: 1 })];
export const stat = (x: number, y: number, w: number, h: number, value: string, label: string, vs: number, ls: number, warn = false, arrow = true): El[] => [
  R(x, y, w, h, D.tile, { r: 22 }),
  ...(arrow ? arrowBtn(x + w - 40, y + 10, 28) : []),
  X(x + 16, y + h * 0.3, w - 24, vs + 12, value, vs, { color: warn ? D.warnText : D.ink, weight: 500, va: "m", lh: 1 }),
  X(x + 16, y + h - ls * 2.6 - 8, w - 28, ls * 2.6, label, ls, { color: D.muted, lh: 1.25, va: "b" }),
];
export const logoMark = (x: number, y: number, s: number, dark = false): El[] => [
  { t: "img", x, y, w: s, h: s, src: dark ? "/brand/katalis-mark-white.png" : "/brand/katalis-mark-dark.png" },
];
const icon = (x: number, y: number, s: number, c: string, active = false): El[] => [R(x, y, s, s, undefined, { r: s * 0.3, line: c, lw: active ? 2.4 : 2 })];

/* ------------------------------------------------------------ phone (base 330x700) */
export function lightPhone(variant: "home" | "approve" | "modul"): El[] {
  const e: El[] = [];
  e.push(R(0, 0, 330, 700, "#111214", { r: 52 }));
  e.push(R(8, 8, 314, 684, D.bg, { r: 44 }));
  e.push(X(30, 22, 70, 22, "9:41", 14, { weight: 700, color: D.ink, va: "m", lh: 1 }));
  const px = 22, pw = 286;
  const tab = (active: number) => {
    e.push(R(18, 618, 294, 62, "#FFFFFF", { r: 31, line: "#FFFFFF", lw: 1 }));
    [0, 1, 2, 3, 4].forEach((i) => {
      const cx = 18 + 29 + i * 59;
      if (i === active) e.push(O(cx - 22, 626, 44, 44, D.ink));
      e.push(...icon(cx - 8, 640, 16, i === active ? "#FFFFFF" : D.ink, i === active));
    });
    if (active !== 2) e.push(O(18 + 29 + 2 * 59 + 8, 622, 18, 18, D.red), X(18 + 29 + 2 * 59 + 8, 622, 18, 18, "3", 11, { color: "#fff", weight: 800, align: "c", va: "m", lh: 1 }));
  };
  const header = (sub: string, title: string) => {
    e.push(...logoMark(px, 56, 32), X(px + 44, 54, 220, 16, sub, 11.5, { color: D.muted, va: "m", lh: 1 }), X(px + 44, 71, 220, 22, title, 17, { color: D.ink, weight: 700, va: "m", lh: 1 }));
    e.push(O(px + pw - 62, 62, 18, 18, undefined, { line: D.ink, lw: 2 }), R(px + pw - 24, 64, 22, 3, D.ink, { r: 1.5 }), R(px + pw - 24, 71, 22, 3, D.ink, { r: 1.5 }), R(px + pw - 24, 78, 22, 3, D.ink, { r: 1.5 }));
  };
  if (variant === "home") {
    header("Katalis ERP · Mode demo", "Halo, Owner");
    e.push(glass(14, 110, 302, 300, 28), X(30, 122, 240, 24, "Aktivitas Usaha Hari Ini", 14.5, { color: D.ink, weight: 600, va: "m", lh: 1 }), O(276, 122, 26, 26, D.white), X(276, 122, 26, 26, "···", 12, { color: D.ink, weight: 800, align: "c", va: "m", lh: 1 }));
    [["1.121 kg", "Total ikan diterima"], ["62,6%", "Hasil olahan, rencana 60%"], ["Rp216,1 jt", "Saldo kas"], ["3", "Perlu keputusan"]].forEach(([v, l], i) => {
      const x = 22 + (i % 2) * 146, y = 156 + Math.floor(i / 2) * 122;
      e.push(...stat(x, y, 138, 112, v, l, 22, 11.5, i === 3));
    });
    e.push(glass(14, 422, 302, 188, 28), X(30, 434, 200, 24, "Perlu Keputusan", 14.5, { color: D.ink, weight: 600, va: "m", lh: 1 }), O(240, 432, 26, 26, D.white), X(240, 432, 26, 26, "···", 12, { color: D.ink, weight: 800, align: "c", va: "m", lh: 1 }), O(272, 430, 30, 30, D.ink), X(272, 430, 30, 30, "+", 20, { color: "#fff", weight: 700, align: "c", va: "m", lh: 1 }));
    e.push(R(22, 468, 286, 132, D.tile, { r: 22 }), O(34, 478, 40, 40, "#D9902B"), X(34, 478, 40, 40, "P", 16, { color: "#fff", weight: 700, align: "c", va: "m", lh: 1 }));
    e.push(X(82, 480, 140, 20, "Beli ikan 640 kg", 14, { color: D.ink, weight: 600, va: "m", lh: 1 }), X(82, 501, 140, 18, "Tim pembelian", 11.5, { color: D.muted, va: "m", lh: 1 }), ...pill(222, 486, 78, "Pembelian", "amber", 24, 11.5));
    e.push(X(34, 530, 250, 24, "Rp29,1 jt", 18, { color: D.ink, weight: 500, va: "m", lh: 1 }), X(34, 566, 260, 18, "Diajukan 12 Okt   ·   APV-0101", 11.5, { color: D.muted, va: "m", lh: 1 }));
    tab(0);
  } else if (variant === "approve") {
    e.push(O(px, 56, 38, 38, D.white), X(px, 56, 38, 38, "‹", 24, { color: D.ink, align: "c", va: "m", lh: 1 }));
    e.push(X(px + 50, 54, 220, 16, "3 menunggu keputusan", 11.5, { color: D.muted, va: "m", lh: 1 }), X(px + 50, 71, 220, 24, "Persetujuan", 19, { color: D.ink, weight: 700, va: "m", lh: 1 }));
    e.push(glass(14, 108, 302, 430, 28), X(30, 120, 200, 24, "Pembelian", 14.5, { color: D.ink, weight: 600, va: "m", lh: 1 }), O(276, 120, 26, 26, D.white), X(276, 120, 26, 26, "···", 12, { color: D.ink, weight: 800, align: "c", va: "m", lh: 1 }));
    e.push(R(22, 154, 286, 270, D.tile, { r: 22 }), X(38, 166, 200, 16, "APV-0101", 11.5, { color: D.muted, va: "m", lh: 1 }), X(38, 186, 250, 26, "Beli ikan 640 kg", 18, { color: D.ink, weight: 600, va: "m", lh: 1 }), X(38, 218, 250, 48, "Rp29,1 jt", 38, { color: D.ink, weight: 500, va: "m", lh: 1 }));
    e.push(L(38, 278, 292, 278, "#DDE0E8", 1.2));
    [["Pemasok", "Pemasok A"], ["Harga per kg", "Rp45.500"], ["Dibanding terakhir", "+Rp1.000"]].forEach(([k, v], i) => {
      const y = 284 + i * 32;
      e.push(X(38, y, 130, 28, k, 12, { color: D.muted, va: "m", lh: 1 }), X(168, y, 124, 28, v, 12.5, { color: D.ink, weight: 600, align: "r", va: "m", lh: 1 }));
    });
    e.push(R(38, 384, 254, 30, "#FBF0D5", { r: 15 }), X(38, 384, 254, 30, "Harga naik Rp1.000/kg dari terakhir", 11.5, { color: "#8A5A00", align: "c", va: "m", lh: 1 }));
    e.push(R(22, 436, 138, 52, D.white, { r: 26 }), X(22, 436, 138, 52, "Tolak", 15, { color: D.ink, weight: 600, align: "c", va: "m", lh: 1 }));
    e.push(R(170, 436, 138, 52, D.ink, { r: 26 }), X(170, 436, 138, 52, "Setujui", 15, { color: "#fff", weight: 600, align: "c", va: "m", lh: 1 }));
    tab(2);
  } else {
    header("Semua fitur", "Modul");
    e.push(glass(14, 108, 302, 490, 28), X(30, 120, 200, 24, "Semua Modul", 14.5, { color: D.ink, weight: 600, va: "m", lh: 1 }));
    [["Pembelian", "Beli ikan dan bayar pemasok"], ["Produksi", "Olah ikan, catat hasil"], ["Mutu & Asal", "Cek mutu dan lacak asal"], ["Stok", "Stok dan koreksi"], ["Penjualan", "Pesanan, kirim, tagihan"], ["Gudang Dingin", "Titipan dan tagihan simpan"]].forEach(([a, b], i) => {
      const x = 22 + (i % 2) * 146, y = 154 + Math.floor(i / 2) * 142;
      e.push(R(x, y, 138, 132, D.tile, { r: 20 }), O(x + 14, y + 14, 38, 38, D.white), ...icon(x + 25, y + 25, 16, D.ink), X(x + 14, y + 66, 116, 20, a, 13.5, { color: D.ink, weight: 600, va: "m", lh: 1 }), X(x + 14, y + 88, 112, 36, b, 11, { color: D.muted, lh: 1.3 }));
    });
    tab(1);
  }
  e.push(R(165 - 46, 18, 92, 26, "#111214", { r: 13 }));
  return e;
}
