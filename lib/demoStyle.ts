import type { El } from "./scene";

/**
 * Restyles the example-screen area of a feature slide to match the interactive demo:
 * soft blue-grey panel, frosted cards, light tiles, black accents.  Slide chrome (title, problem/solution band,
 * footer) and green callout blocks outside the mock windows keep the deck's own green styling.
 */
const INK = "#111214";
const PANEL = "#E9EDF5";
const CARD = "#F8F9FC";
const TILE = "#EEF0F6";
const TILE2 = "#E6E9F0";

const up = (c?: string) => (c ? c.toUpperCase() : c);

export function demoStyle(els: El[], yMin = 255, yMax = 962): El[] {
  const windows = els.filter((e): e is Extract<El, { t: "rect" }> => e.t === "rect" && up(e.fill) === "#FFFFFF" && !!e.line && e.w >= 480 && e.h >= 280 && e.y >= yMin - 10 && e.y <= yMax);
  const inWin = (x: number, y: number) => windows.some((w) => x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h);
  const inRegion = (y: number, h: number) => y >= yMin && y + h <= yMax + 10;
  const isWindow = (e: El) => windows.includes(e as never);
  const texts = els.filter((e): e is Extract<El, { t: "text" }> => e.t === "text" && String(typeof e.text === "string" ? e.text : "").trim().length > 0);
  // a navy block with text on top is a callout (keeps the deck green); a navy block without text is a chart bar or marker
  const hasText = (r: { x: number; y: number; w: number; h: number }) => texts.some((t) => t.x + t.w / 2 >= r.x && t.x + t.w / 2 <= r.x + r.w && t.y + t.h / 2 >= r.y && t.y + t.h / 2 <= r.y + r.h);

  return els.map((el): El => {
    if (el.t === "line") {
      const cy = (el.y1 + el.y2) / 2;
      if (!inRegion(cy, 0)) return el;
      const c = up(el.color);
      if (c === "#DAD9D2" || c === "#E3E2DC" || c === "#ECEBE6") return { ...el, color: "#DDE0E8" };
      if (c === "#0E5C46" || c === "#12A676") return { ...el, color: INK };
      return el;
    }
    if (el.t === "rect" || el.t === "ellipse") {
      if (!inRegion(el.y, el.h)) return el;
      const f = up(el.fill);
      const inside = inWin(el.x + el.w / 2, el.y + el.h / 2);
      if (el.t === "rect" && isWindow(el)) return { ...el, fill: PANEL, line: "#FFFFFF" };
      let fill = el.fill;
      let line = el.line;
      switch (f) {
        case "#FFFFFF": fill = inside ? CARD : CARD; line = line ? "#FFFFFF" : line; break;
        case "#F4F3EF": fill = inside ? TILE : CARD; line = line ? "#FFFFFF" : line; break;
        case "#ECEBE6": fill = TILE2; break;
        case "#E3E2DC": fill = TILE2; break;
        case "#EEEDE8": fill = "#FFFFFF"; break;
        case "#DDF3EA": case "#CDEFE2": fill = "#DDF3E8"; break;
        case "#0E5C46": case "#14735A": fill = inside || !hasText(el) ? INK : el.fill; break;
        case "#12A676": fill = INK; break;
        default: break;
      }
      if (line && up(line) === "#DAD9D2") line = "#FFFFFF";
      return { ...el, fill, line };
    }
    if (el.t === "text") {
      if (!inRegion(el.y, el.h)) return el;
      const inside = inWin(el.x + el.w / 2, el.y + el.h / 2);
      const map = (c?: string) => {
        const k = up(c);
        if (k === "#0E5C46" || k === "#14735A" || k === "#12A676") return INK;
        if (k === "#0B8F63") return "#0B6B4A";
        if (k === "#2B2B2B") return INK;
        if (k === "#CFF3E5") return "#C6CCD3";
        return c;
      };
      return { ...el, color: map(el.color), text: typeof el.text === "string" ? el.text : el.text.map((r) => ({ ...r, color: map(r.color) })) };
    }
    if (el.t === "table") {
      if (!inRegion(el.y, el.h)) return el;
      const inside = inWin(el.x + el.w / 2, el.y + el.h / 2);
      return { ...el, headFill: TILE2, headColor: INK, zebra: inside ? CARD : el.zebra, rowFill: CARD, border: "#E1E4EB", color: INK };
    }
    return el;
  });
}
