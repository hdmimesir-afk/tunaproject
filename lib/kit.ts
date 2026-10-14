import type { El, Run, Cell } from "./scene";

/* ---------- Design tokens ---------- */
export const C = {
  // Green brand system: deep green (navy), brand green (ocean), mid green (teal), warm off-white surfaces
  navy: "#003459", // deep green: fills, strong accents
  navy2: "#0A4D80",
  ocean: "#1B7FC4", // brand green
  teal: "#0A4D80", // mid green
  off: "#F6F9FB",
  white: "#FFFFFF",
  low: "#F1F5F8",
  cont: "#E8EEF2",
  high: "#DDE5EB",
  ink: "#00171F", // headings and body
  muted: "#4B5E69",
  faint: "#7F909A",
  border: "#D5DEE4",
  aqua: "#D6E4EF",
  ice: "#E3EDF5",
  aquaOnDark: "#CFE0EE",
  amber: "#9A6410",
  amberSoft: "#FBF1DE",
  red: "#B4443C",
  redSoft: "#F8E5E3",
};

/* ---------- Number formatting (id-ID) ---------- */
const nf = new Intl.NumberFormat("id-ID");
export const rp = (n: number) => (n < 0 ? "-Rp" : "Rp") + nf.format(Math.abs(Math.round(n)));
export const num = (n: number) => nf.format(n);
const dec = (n: number, d: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
/** Rp in millions, e.g. 475675000 -> "Rp475,7 jt" */
export const jt = (n: number, d = 1) => (n < 0 ? "-Rp" : "Rp") + dec(Math.abs(n) / 1e6, d) + " jt";
/** Rp in billions, e.g. 5007013680 -> "Rp5,01 miliar" */
export const mi = (n: number, d = 2) => "Rp" + dec(n / 1e9, d) + " miliar";
export const pct = (n: number, d = 1) => dec(n, d) + "%";

/* ---------- Primitives ---------- */
type TextOpts = Partial<Extract<El, { t: "text" }>>;

const ACR = ["ABF", "CS", "QC", "HPP", "PT", "SNS", "CV", "DUS", "ERP", "PO", "BI", "UAT", "BRD", "API", "DO"];
/** M3 labels are sentence case: turn ALL-CAPS tracked labels into sentence case, keeping acronyms. */
export const sc = (t: string) => {
  if (!/[A-Z]{3}/.test(t) || /[a-z]/.test(t)) return t;
  let r = t.charAt(0) + t.slice(1).toLowerCase();
  ACR.forEach((a) => (r = r.replace(new RegExp("\\b" + a.charAt(0) + a.slice(1).toLowerCase() + "\\b", "g"), a)));
  return r.replace(/^katalis erp/i, "Katalis ERP");
};

export const txt = (
  x: number,
  y: number,
  w: number,
  h: number,
  text: string | Run[],
  size: number,
  o: TextOpts = {},
): El => ({
  t: "text",
  x,
  y,
  w,
  h,
  text: typeof text === "string" && o.ls && o.ls > 0 ? sc(text) : text,
  size,
  color: C.ink,
  lh: 1.3,
  ...o,
});

/** M3 shape scale: small 8, medium 12, large 16, extra-large 28, full = pill. */
const shape = (r: number | undefined, w: number, h: number) => {
  if (!r) return r;
  if (r >= Math.min(w, h) / 2 - 1) return r; // pill stays pill
  return r <= 6 ? r : Math.min(28, Math.round(r * 1.6));
};
export const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill?: string,
  o: Partial<Extract<El, { t: "rect" }>> = {},
): El => ({ t: "rect", x, y, w, h, fill, ...o, r: shape(o.r, w, h) });

export const ell = (x: number, y: number, w: number, h: number, fill?: string, o: Partial<Extract<El, { t: "ellipse" }>> = {}): El => ({
  t: "ellipse",
  x,
  y,
  w,
  h,
  fill,
  ...o,
});

export const ln = (x1: number, y1: number, x2: number, y2: number, color = C.border, lw = 2, o: { dash?: boolean; arrow?: boolean } = {}): El => ({
  t: "line",
  x1,
  y1,
  x2,
  y2,
  color,
  lw,
  ...o,
});

export const img = (x: number, y: number, w: number, h: number, src: string): El => ({ t: "img", x, y, w, h, src });

/** M3 filled card: tonal surface, no outline, large corner. */
export const card = (x: number, y: number, w: number, h: number, o: { fill?: string; line?: string; r?: number; lw?: number; dash?: boolean } = {}): El =>
  rect(x, y, w, h, o.fill ?? C.low, { line: o.line, lw: o.lw ?? 1.5, r: o.r ?? 20, dash: o.dash });

/** Estimated text width in px (Inter-ish metrics, slightly conservative). */
export const tw = (s: string, size: number, bold = false) => Math.ceil(s.length * size * (bold ? 0.6 : 0.56));

/** Pill-shaped label. Returns elements and width so callers can chain them. */
export const chip = (
  x: number,
  y: number,
  text: string,
  o: { fill?: string; color?: string; size?: number; line?: string; h?: number; w?: number; bold?: boolean } = {},
): { els: El[]; w: number } => {
  text = sc(text);
  const size = o.size ?? 18;
  const h = o.h ?? size + 16;
  const w = o.w ?? tw(text, size, false) + 28;
  return {
    w,
    els: [
      rect(x, y, w, h, o.fill ?? C.aqua, { r: h / 2, line: o.line }),
      txt(x, y, w, h, text, size, { color: o.color ?? C.teal, bold: o.bold ?? true, align: "c", va: "m", lh: 1.1 }),
    ],
  };
};

export const badge = (x: number, y: number, d: number, label: string, fill = C.teal, color = C.white, size = 22): El[] => [
  ell(x, y, d, d, fill),
  txt(x, y, d, d, label, size, { color, bold: true, align: "c", va: "m", lh: 1 }),
];

/* ---------- Slide furniture ---------- */
export const header = (_kicker: string, title: string, dark = false): El[] => [
  txt(120, 36, 1680, 112, title, 54, { color: dark ? C.white : C.ink, lh: 1.1, va: "m", weight: 800 }),
];

export const footer = (n: number, total: number, note?: string, dark = false, tag?: string): El[] => {
  const els: El[] = [];
  const c = dark ? C.aquaOnDark : C.faint;
  if (note) els.push(txt(120, 964, 1680, 30, note, 18, { color: dark ? C.aquaOnDark : C.muted, lh: 1.2, va: "m" }));
  if (!dark) els.push(img(1400, 1010, 110, 44, "/brand/katalis-logo-green.png"));
  els.push(
    txt(120, 1020, 1300, 28, "Dar Dev  ·  KATALIS ERP" + (tag ? "  ·  " + tag : ""), 17, { color: c, lh: 1.1, va: "m" }),
    txt(1600, 1020, 200, 28, String(n).padStart(2, "0") + " / " + total, 17, { color: c, align: "r", lh: 1.1, va: "m" }),
  );
  return els;
};

/** Standard "illustrative data" ribbon placed on mockups. */
export const illustrative = (x: number, y: number, label = "DATA CONTOH"): El[] =>
  chip(x, y, label, { fill: C.amberSoft, color: C.amber, size: 16, h: 30 }).els;

/* ---------- Mock application window ---------- */
export interface MockOpts {
  title: string;
  nav?: string[];
  active?: number;
  sidebarW?: number;
}
export const mockWindow = (x: number, y: number, w: number, h: number, o: MockOpts): { els: El[]; inner: { x: number; y: number; w: number; h: number } } => {
  const els: El[] = [];
  const top = 40;
  els.push(rect(x, y, w, h, C.white, { line: C.border, lw: 1.5, r: 16 }));
  els.push(rect(x + 1, y + 1, w - 2, top, C.cont, { r: 16 }));
  els.push(rect(x + 1, y + 24, w - 2, top - 23, C.cont));
  els.push(txt(x + 24, y + 1, w - 48, top, o.title, 17, { color: C.muted, va: "m", lh: 1.1 }));
  let sw = 0;
  if (o.nav) {
    sw = o.sidebarW ?? 210;
    els.push(rect(x + 1, y + 1 + top, sw, h - top - 2, C.low, { r: 16 }));
    els.push(rect(x + 1 + sw - 20, y + 1 + top, 20, h - top - 2, C.low));
    els.push(rect(x + sw, y + 1 + top, 1, h - top - 2, C.border));
    els.push(txt(x + 24, y + top + 14, sw - 30, 30, "KATALIS ERP", 19, { color: C.navy, lh: 1.1, va: "m" }));
    o.nav.forEach((n, i) => {
      const yy = y + top + 64 + i * 40;
      if (i === o.active) els.push(rect(x + 12, yy - 2, sw - 24, 36, C.ice, { r: 18 }));
      els.push(txt(x + 28, yy - 2, sw - 40, 36, n, 17, { color: i === o.active ? C.navy : C.muted, va: "m", lh: 1.1 }));
    });
  }
  return { els, inner: { x: x + 1 + sw, y: y + 1 + top, w: w - 2 - sw, h: h - top - 2 } };
};

/* ---------- Tiles & charts ---------- */
export const kpi = (
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  sub?: string,
  o: { accent?: string; fill?: string; valSize?: number; dark?: boolean; plain?: boolean } = {},
): El[] => {
  const vs = o.valSize ?? 38;
  const dark = o.dark ?? false;
  const px = o.plain ? 0 : 22;
  const els: El[] = [];
  if (!o.plain) els.push(rect(x, y, w, h, o.fill ?? (dark ? C.navy2 : C.low), { r: 16 }));
  els.push(txt(x + px, y + 14, w - px * 2, 28, label, 18, { color: dark ? "#CFE0EE" : C.muted, lh: 1.1, va: "m" }));
  els.push(txt(x + px, y + 46, w - px * 2, vs + 18, value, vs, { color: dark ? C.white : o.accent && o.plain ? o.accent : C.navy, lh: 1.05, va: "m", weight: 800 }));
  if (sub) els.push(txt(x + px, y + 46 + vs + 10, w - px * 2, Math.max(26, h - (46 + vs + 14)), sub, 17, { color: dark ? "#BFE6D6" : C.muted, lh: 1.25, va: "t" }));
  return els;
};

export interface BarItem {
  label: string;
  value: number;
  color?: string;
  text?: string;
}
/** Vertical bar chart. */
export const bars = (
  x: number,
  y: number,
  w: number,
  h: number,
  items: BarItem[],
  o: { max?: number; color?: string; labelSize?: number; valSize?: number; barW?: number; labelH?: number; valColor?: string } = {},
): El[] => {
  const els: El[] = [];
  const labelH = o.labelH ?? 44;
  const valH = 28;
  const max = o.max ?? Math.max(...items.map((i) => i.value));
  const plotH = h - labelH - valH;
  const slot = w / items.length;
  const bw = o.barW ?? Math.min(96, slot * 0.58);
  const base = y + valH + plotH;
  els.push(ln(x, base, x + w, base, C.border, 2));
  items.forEach((it, i) => {
    const bh = Math.max(3, (it.value / max) * plotH);
    const bx = x + i * slot + (slot - bw) / 2;
    els.push(rect(bx, base - bh, bw, bh, it.color ?? o.color ?? C.ocean, { r: 4 }));
    els.push(txt(x + i * slot, base - bh - valH, slot, valH, it.text ?? String(it.value), o.valSize ?? 18, { align: "c", bold: true, color: o.valColor ?? C.navy, va: "m", lh: 1 }));
    els.push(txt(x + i * slot + 2, base + 8, slot - 4, labelH - 8, it.label, o.labelSize ?? 17, { align: "c", color: C.muted, lh: 1.15, va: "t" }));
  });
  return els;
};

/** Horizontal bar chart (label left, bar, value right). */
export const hbars = (
  x: number,
  y: number,
  w: number,
  items: BarItem[],
  o: { rowH?: number; labelW?: number; valW?: number; color?: string; max?: number; size?: number; barH?: number } = {},
): El[] => {
  const els: El[] = [];
  const rowH = o.rowH ?? 46;
  const labelW = o.labelW ?? 260;
  const valW = o.valW ?? 130;
  const size = o.size ?? 19;
  const barH = o.barH ?? 22;
  const max = o.max ?? Math.max(...items.map((i) => i.value));
  const plotW = w - labelW - valW - 16;
  items.forEach((it, i) => {
    const yy = y + i * rowH;
    els.push(txt(x, yy, labelW, rowH, it.label, size, { color: C.ink, va: "m", lh: 1.15 }));
    els.push(rect(x + labelW, yy + (rowH - barH) / 2, plotW, barH, "#E8EEF2", { r: 4 }));
    els.push(rect(x + labelW, yy + (rowH - barH) / 2, Math.max(4, (it.value / max) * plotW), barH, it.color ?? o.color ?? C.ocean, { r: 4 }));
    els.push(txt(x + labelW + plotW + 12, yy, valW, rowH, it.text ?? String(it.value), size, { bold: true, color: C.navy, va: "m", align: "r", lh: 1 }));
  });
  return els;
};

/** Simple line chart with gridlines. series values share one scale. */
export const lineChart = (
  x: number,
  y: number,
  w: number,
  h: number,
  labels: string[],
  series: { color: string; values: number[]; width?: number }[],
  o: { min?: number; max?: number; grid?: number; size?: number; yFmt?: (v: number) => string; yW?: number } = {},
): El[] => {
  const els: El[] = [];
  const size = o.size ?? 16;
  const yW = o.yW ?? 56;
  const labH = 30;
  const all = series.flatMap((s) => s.values);
  const min = o.min ?? Math.min(...all);
  const max = o.max ?? Math.max(...all);
  const plotX = x + yW;
  const plotW = w - yW;
  const plotH = h - labH;
  const g = o.grid ?? 3;
  for (let i = 0; i <= g; i++) {
    const gy = y + (plotH / g) * i;
    els.push(ln(plotX, gy, plotX + plotW, gy, "#E7E6E0", 1.5));
    const v = max - ((max - min) / g) * i;
    els.push(txt(x, gy - 12, yW - 8, 24, o.yFmt ? o.yFmt(v) : String(Math.round(v)), size, { align: "r", color: C.faint, va: "m", lh: 1 }));
  }
  const step = plotW / (labels.length - 1 || 1);
  labels.forEach((l, i) => els.push(txt(plotX + i * step - 40, y + plotH + 6, 80, labH - 6, l, size, { align: "c", color: C.muted, lh: 1, va: "m" })));
  series.forEach((s) => {
    const pts = s.values.map((v, i) => [plotX + i * step, y + plotH - ((v - min) / (max - min || 1)) * plotH] as const);
    for (let i = 0; i < pts.length - 1; i++) els.push(ln(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], s.color, s.width ?? 4));
    pts.forEach((p) => els.push(ell(p[0] - 6, p[1] - 6, 12, 12, C.white, { line: s.color, lw: 3 })));
  });
  return els;
};

/** Native-table helper. */
export const table = (
  x: number,
  y: number,
  cols: number[],
  head: string[] | undefined,
  rows: Cell[][],
  o: { rowH?: number; headH?: number; size?: number; align?: ("l" | "c" | "r")[]; headFill?: string; headColor?: string; zebra?: string } = {},
): El => {
  const rowH = o.rowH ?? 48;
  const headH = head ? (o.headH ?? 48) : 0;
  const w = cols.reduce((a, b) => a + b, 0);
  return {
    t: "table",
    x,
    y,
    w,
    h: headH + rowH * rows.length,
    cols,
    rowH,
    headH,
    head,
    rows,
    size: o.size ?? 20,
    align: o.align,
    headFill: o.headFill ?? C.cont,
    headColor: o.headColor ?? C.navy,
    zebra: o.zebra ?? "#F1F5F8",
    border: C.border,
  };
};

/** Horizontal chain of step boxes joined by arrows. */
export const stepRow = (
  x: number,
  y: number,
  w: number,
  h: number,
  steps: { title: string; sub?: string }[],
  o: { gap?: number; fill?: string; color?: string; subColor?: string; size?: number; subSize?: number; line?: string; numbered?: boolean; titleH?: number } = {},
): El[] => {
  const gap = o.gap ?? 34;
  const n = steps.length;
  const bw = (w - gap * (n - 1)) / n;
  const els: El[] = [];
  steps.forEach((s, i) => {
    const bx = x + i * (bw + gap);
    els.push(rect(bx, y, bw, h, o.fill ?? C.low, { line: o.line, lw: 1.5, r: 12 }));
    if (o.numbered) els.push(...badge(bx + 14, y + 14, 34, String(i + 1), C.ocean, C.white, 18));
    const ty = o.numbered ? y + 56 : y + 14;
    els.push(txt(bx + 14, ty, bw - 28, o.titleH ?? 36, s.title, o.size ?? 22, { bold: true, color: o.color ?? C.navy, lh: 1.15, va: "t" }));
    if (s.sub) els.push(txt(bx + 14, ty + (o.titleH ?? 36) + 2, bw - 28, h - (ty - y) - (o.titleH ?? 36) - 10, s.sub, o.subSize ?? 18, { color: o.subColor ?? C.muted, lh: 1.28, va: "t" }));
    if (i < n - 1) {
      const ax = bx + bw + 4;
      els.push(ln(ax, y + h / 2, ax + gap - 8, y + h / 2, C.ocean, 3, { arrow: true }));
    }
  });
  return els;
};

/** Paragraph list with bullet dots rendered as real bullets (single text box). */
export const bullets = (x: number, y: number, w: number, h: number, items: string[], size = 24, o: TextOpts = {}): El =>
  txt(x, y, w, h, items.join("\n"), size, { bullet: true, para: Math.round(size * 0.42), lh: 1.28, va: "t", ...o });

export const section = (x: number, y: number, w: number, label: string, color = C.muted): El[] => [
  txt(x, y, w, 30, sc(label), 22, { color, lh: 1.1, va: "m" }),
];
