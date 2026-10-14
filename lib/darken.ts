import type { El } from "./scene";

/**
 * Dark / lime theme pass (reference: dark landing page with lime accents and bento cards).
 * Slides are authored with a light palette; this maps every colour by role so web, PDF and PPTX
 * all render the same dark theme.  Fills that turn into the lime accent flip their on-top text to dark.
 */
export const T = {
  bg: "#111A16",
  card: "#1A2622",
  tile: "#212F2A",
  tile2: "#283833",
  tile3: "#2F4039",
  line: "#2E3E38",
  text: "#F3F6F4",
  sub: "#A9B8B2",
  faint: "#7C8C86",
  lime: "#C6F25A",
  lime2: "#B2E043",
  mint: "#7BE0B0",
  onLime: "#10201A",
  onLime2: "#2F4A3B",
  green: "#12A676",
};

const up = (c?: string) => (c ? c.toUpperCase() : c);
const lum = (c: string) => (0.299 * parseInt(c.slice(1, 3), 16) + 0.587 * parseInt(c.slice(3, 5), 16) + 0.114 * parseInt(c.slice(5, 7), 16)) / 255;
const isHex = (c?: string): c is string => !!c && /^#[0-9A-Fa-f]{6}$/.test(c);

const FILL: Record<string, string> = {
  "#FFFFFF": T.card, "#FAF9F6": T.card, "#F4F3EF": T.tile, "#ECEBE6": T.tile2, "#E3E2DC": T.tile3,
  "#DDF3EA": "#1F3B31", "#CDEFE2": "#26493B", "#FBF1DE": "#3A3220", "#F8E5E3": "#3B2523",
  "#0E5C46": T.lime, "#14735A": T.lime2,
  "#9A6410": "#E0A93F", "#B4443C": "#F0645A",
  "#EEEDE8": T.tile3, "#E6E6E2": T.tile3,
};
const TEXT: Record<string, string> = {
  "#2B2B2B": T.text, "#5A5D5B": T.sub, "#8A8D8B": T.faint,
  "#0E5C46": T.lime, "#14735A": T.lime, "#12A676": T.mint, "#0B8F63": T.mint,
  "#CFF3E5": T.sub, "#9A6410": "#F2C46D", "#B4443C": "#FF9A92", "#FFFFFF": "#FFFFFF",
  "#2C5F7C": T.mint,
};
const LINE: Record<string, string> = { "#DAD9D2": T.line, "#E3E2DC": T.line, "#0E5C46": T.lime, "#14735A": T.lime2, "#8A8D8B": T.faint, "#FFFFFF": T.line };

const mapFill = (c?: string) => {
  if (!isHex(c)) return c;
  const k = up(c)!;
  if (FILL[k]) return FILL[k];
  const l = lum(k);
  if (l > 0.93) return T.card;
  if (l > 0.85) return T.tile2;
  return c;
};
const mapText = (c?: string) => {
  if (!isHex(c)) return c;
  const k = up(c)!;
  if (TEXT[k]) return TEXT[k];
  return lum(k) < 0.4 ? T.text : c;
};
const mapLine = (c?: string) => {
  if (!isHex(c)) return c;
  const k = up(c)!;
  if (LINE[k]) return LINE[k];
  return lum(k) > 0.8 ? T.line : c;
};

const LIME_FILLS = new Set(["#0E5C46", "#14735A"]);

export function dk(els: El[]): El[] {
  const limeBoxes: { x: number; y: number; w: number; h: number; dark: string }[] = [];
  for (const el of els) {
    if ((el.t === "rect" || el.t === "ellipse") && el.fill && LIME_FILLS.has(up(el.fill)!)) {
      limeBoxes.push({ x: el.x, y: el.y, w: el.w, h: el.h, dark: up(el.fill) === "#0E5C46" ? T.onLime : T.onLime });
    }
  }
  const onLime = (x: number, y: number) => limeBoxes.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);

  return els.map((el): El => {
    switch (el.t) {
      case "rect":
      case "ellipse":
        return { ...el, fill: mapFill(el.fill), line: mapLine(el.line) };
      case "line":
        return { ...el, color: mapLine(el.color) as string };
      case "text": {
        const inside = onLime(el.x + el.w / 2, el.y + el.h / 2);
        const col = (c?: string) => {
          if (inside) {
            const k = up(c);
            if (!k || k === "#FFFFFF" || k === "#CFF3E5" || k === "#FFFFFF") return T.onLime;
            if (k === "#0E5C46" || k === "#14735A") return T.onLime;
            return c && lum(c) > 0.7 ? T.onLime2 : c;
          }
          return mapText(c);
        };
        return { ...el, color: col(el.color), text: typeof el.text === "string" ? el.text : el.text.map((r) => ({ ...r, color: col(r.color) })) };
      }
      case "table":
        return {
          ...el,
          headFill: el.headFill && LIME_FILLS.has(up(el.headFill)!) ? T.tile3 : mapFill(el.headFill),
          headColor: el.headFill && LIME_FILLS.has(up(el.headFill)!) ? T.lime : mapText(el.headColor) ?? T.text,
          zebra: mapFill(el.zebra) ?? T.tile,
          rowFill: T.card,
          border: mapLine(el.border),
          color: mapText(el.color) ?? T.text,
          rows: el.rows.map((r) => r.map((c) => (typeof c === "string" ? c : { ...c, c: mapText(c.c), f: mapFill(c.f) }))),
        };
      default:
        return el;
    }
  });
}
