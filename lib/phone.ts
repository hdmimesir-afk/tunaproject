import type { El } from "./scene";
import { T } from "./darken";

/** Raw rounded rect: bypasses the kit's radius scale so big landing-page radii survive. */
export const R = (x: number, y: number, w: number, h: number, fill?: string, o: { r?: number; line?: string; lw?: number; op?: number } = {}): El => ({ t: "rect", x, y, w, h, fill, ...o });
export const O = (x: number, y: number, w: number, h: number, fill?: string, o: { line?: string; lw?: number } = {}): El => ({ t: "ellipse", x, y, w, h, fill, ...o });
export const X = (x: number, y: number, w: number, h: number, text: string, size: number, o: Partial<Extract<El, { t: "text" }>> = {}): El => ({
  t: "text", x, y, w, h, text, size, color: T.text, lh: 1.3, ...o,
});
export const L = (x1: number, y1: number, x2: number, y2: number, color = T.line, lw = 1.5): El => ({ t: "line", x1, y1, x2, y2, color, lw });

/** Scale and translate a group of elements authored on a base canvas. */
export function place(els: El[], k: number, ox: number, oy: number): El[] {
  return els.map((e): El => {
    switch (e.t) {
      case "rect": return { ...e, x: ox + e.x * k, y: oy + e.y * k, w: e.w * k, h: e.h * k, r: e.r !== undefined ? e.r * k : undefined, lw: e.lw !== undefined ? Math.max(1, e.lw * k) : undefined };
      case "ellipse": return { ...e, x: ox + e.x * k, y: oy + e.y * k, w: e.w * k, h: e.h * k, lw: e.lw !== undefined ? Math.max(1, e.lw * k) : undefined };
      case "text": return { ...e, x: ox + e.x * k, y: oy + e.y * k, w: e.w * k, h: e.h * k, size: Math.max(9, e.size * k) };
      case "line": return { ...e, x1: ox + e.x1 * k, y1: oy + e.y1 * k, x2: ox + e.x2 * k, y2: oy + e.y2 * k, lw: Math.max(1, e.lw * k) };
      case "img": return { ...e, x: ox + e.x * k, y: oy + e.y * k, w: e.w * k, h: e.h * k };
      default: return e;
    }
  });
}

const PILL: Record<string, [string, string]> = {
  blue: ["#1F3A5A", "#8DB8F0"], amber: ["#3A3220", "#F2C46D"], red: ["#3B2523", "#FF9A92"], green: ["#1F3B31", "#7BE0B0"],
};
const pill = (x: number, y: number, w: number, t: string, k: keyof typeof PILL): El[] => [
  R(x, y, w, 26, PILL[k][0], { r: 13 }), X(x, y, w, 26, t, 13, { color: PILL[k][1], weight: 700, align: "c", va: "m", lh: 1 }),
];

/** Base canvas 330 x 700. Dark app screen in the same visual language as the web demo. */
export function darkPhone(variant: "home" | "approve" | "activity"): El[] {
  const e: El[] = [];
  e.push(R(0, 0, 330, 700, "#050B09", { r: 52 }));
  e.push(R(8, 8, 314, 684, "#121C18", { r: 44 }));
  e.push(X(30, 20, 80, 24, "9:41", 14, { weight: 700, va: "m", lh: 1 }));
  const px = 22, pw = 286;
  const tab = (active: number) => {
    e.push(R(18, 616, 294, 62, "#1D2A25", { r: 31, line: "#2E3E38", lw: 1 }));
    [0, 1, 2, 3, 4].forEach((i) => {
      const cx = 18 + 29 + i * 59;
      if (i === active) e.push(O(cx - 22, 623, 44, 44, T.lime));
      e.push(R(cx - 8, 637, 16, 16, undefined, { r: 5, line: i === active ? T.onLime : T.sub, lw: 2 }));
    });
  };
  if (variant === "home") {
    e.push(X(px, 58, 200, 20, "Katalis ERP · Owner", 13, { color: T.sub, va: "m", lh: 1 }), X(px, 80, 220, 32, "Halo, Owner", 24, { weight: 800, va: "m", lh: 1 }));
    e.push(O(px + pw - 42, 62, 42, 42, T.lime), X(px + pw - 42, 62, 42, 42, "O", 18, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 }));
    e.push(R(px, 126, pw, 150, T.lime, { r: 28 }));
    e.push(X(px + 20, 142, 200, 20, "Untung Siklus 1", 14, { color: T.onLime2, weight: 600, va: "m", lh: 1 }), X(px + 20, 166, 240, 52, "Rp4,5 jt", 42, { color: T.onLime, weight: 800, va: "m", lh: 1 }));
    e.push(R(px + 20, 230, 116, 26, "#10201A", { r: 13 }), X(px + 20, 230, 116, 26, "Margin 10,8%", 13, { color: T.lime, weight: 700, align: "c", va: "m", lh: 1 }));
    [["481 kg", "Ikan diterima"], ["62,6%", "Hasil olahan"]].forEach(([v, l], i) => {
      const x = px + i * 147;
      e.push(R(x, 290, 139, 96, "#1D2A25", { r: 22, line: "#2E3E38", lw: 1 }), X(x + 16, 304, 110, 40, v, 28, { weight: 800, va: "m", lh: 1 }), X(x + 16, 350, 112, 22, l, 13, { color: T.sub, va: "m", lh: 1 }));
    });
    e.push(X(px, 404, 180, 24, "Perlu keputusan", 16, { weight: 800, va: "m", lh: 1 }), O(px + pw - 28, 404, 28, 24, "#E0524A"), X(px + pw - 28, 404, 28, 24, "3", 13, { weight: 800, align: "c", va: "m", lh: 1 }));
    [["Beli ikan 640 kg", "Rp29,1 jt"], ["Koreksi stok loin", "−20 kg"]].forEach(([a, b], i) => {
      const y = 440 + i * 84;
      e.push(R(px, y, pw, 74, "#1D2A25", { r: 20, line: "#2E3E38", lw: 1 }), X(px + 18, y + 12, 170, 24, a, 15, { weight: 700, va: "m", lh: 1 }), X(px + 18, y + 40, 170, 22, b, 14, { color: T.sub, va: "m", lh: 1 }), ...pill(px + pw - 88, y + 24, 72, "Cek", "amber"));
    });
    tab(0);
  } else if (variant === "approve") {
    e.push(O(px, 54, 40, 40, "#1D2A25", { line: "#2E3E38", lw: 1 }), X(px, 54, 40, 40, "‹", 26, { align: "c", va: "m", lh: 1 }));
    e.push(X(px + 52, 52, 200, 30, "Persetujuan", 22, { weight: 800, va: "m", lh: 1 }), X(px + 52, 82, 220, 20, "2 menunggu keputusan", 13, { color: T.sub, va: "m", lh: 1 }));
    e.push(R(px, 120, pw, 340, "#1D2A25", { r: 28, line: "#2E3E38", lw: 1 }));
    e.push(...pill(px + 20, 140, 96, "Pembelian", "amber"));
    e.push(X(px + 20, 182, 250, 30, "Beli ikan 640 kg", 22, { weight: 800, va: "m", lh: 1 }), X(px + 20, 220, 250, 56, "Rp29,1 jt", 46, { color: T.lime, weight: 800, va: "m", lh: 1 }));
    e.push(L(px + 20, 292, px + pw - 20, 292));
    [["Pemasok", "Pemasok A"], ["Harga per kg", "Rp45.500"], ["Dibanding terakhir", "+Rp1.000"]].forEach(([k, v], i) => {
      const y = 304 + i * 44;
      e.push(X(px + 20, y, 140, 34, k, 14, { color: T.sub, va: "m", lh: 1 }), X(px + pw - 170, y, 150, 34, v, 15, { weight: 700, align: "r", va: "m", lh: 1, color: i === 2 ? "#F2C46D" : T.text }));
    });
    e.push(R(px, 476, pw, 58, T.lime, { r: 29 }), X(px, 476, pw, 58, "Setujui", 19, { color: T.onLime, weight: 800, align: "c", va: "m", lh: 1 }));
    e.push(R(px, 546, pw, 50, undefined, { r: 25, line: "#3A4B45", lw: 2 }), X(px, 546, pw, 50, "Tolak", 17, { weight: 700, align: "c", va: "m", lh: 1 }));
    tab(2);
  } else {
    e.push(X(px, 56, 260, 34, "Aktivitas hari ini", 22, { weight: 800, va: "m", lh: 1 }));
    [["Semua", 70, true], ["Produksi", 88, false], ["Tagihan", 78, false]].forEach(([l, w, on], i, a) => {
      const x = px + (a as [string, number, boolean][]).slice(0, i).reduce((s, c) => s + c[1] + 8, 0);
      e.push(R(x, 104, w as number, 34, on ? T.lime : "#1D2A25", { r: 17 }), X(x, 104, w as number, 34, l as string, 13, { color: on ? T.onLime : T.sub, weight: 700, align: "c", va: "m", lh: 1 }));
    });
    ([["Produksi", "481 kg · 3 Okt", "Jalan", "blue"], ["Ikan masuk", "640 kg · 10.00", "Tahan", "amber"], ["Tagihan pembeli", "Telat 6 hari", "Telat", "red"], ["Titipan masuk", "8.000 kg · 8 Okt", "Selesai", "green"]] as [string, string, string, keyof typeof PILL][]).forEach(([a, b, s, k], i) => {
      const y = 154 + i * 90;
      e.push(R(px, y, pw, 80, "#1D2A25", { r: 20, line: "#2E3E38", lw: 1 }), X(px + 18, y + 14, 170, 24, a, 15, { weight: 700, va: "m", lh: 1 }), X(px + 18, y + 44, 170, 22, b, 13, { color: T.sub, va: "m", lh: 1 }), ...pill(px + pw - 86, y + 27, 70, s, k));
    });
    e.push(R(px, 520, pw, 70, "#1D2A25", { r: 20, line: "#2E3E38", lw: 1 }), X(px + 18, y0(530), 160, 22, "Gudang dingin", 14, { color: T.sub, va: "m", lh: 1 }), X(px + pw - 98, 526, 80, 30, "89%", 22, { weight: 800, align: "r", va: "m", lh: 1 }));
    e.push(R(px + 18, 568, pw - 36, 8, "#2C3B35", { r: 4 }), R(px + 18, 568, (pw - 36) * 0.89, 8, T.lime, { r: 4 }));
    tab(1);
  }
  e.push(R(165 - 46, 18, 92, 26, "#050B09", { r: 13 }));
  return e;
}
const y0 = (n: number) => n;
