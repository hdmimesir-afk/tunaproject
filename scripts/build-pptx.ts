/**
 * Builds output/KATALIS-ERP-Proposal.pptx from the same slide scene-graph used by the web deck.
 * Text, shapes, lines, tables and diagrams are native PowerPoint objects (editable);
 * only the cover/closing background art is an image.
 * Geometry: 1920x1080 canvas px -> 13.333 x 7.5 in (144 px per inch); 1 px = 0.5 pt.
 */
import pptxgen from "pptxgenjs";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { slides } from "../data/slides";
import type { El, Run, Cell } from "../lib/scene";

const IN = (px: number) => px / 144;
const PT = (px: number) => Math.round(px * 5) / 10; // px -> pt, 0.1 precision
const hex = (c?: string) => (c ?? "#17212B").replace("#", "").toUpperCase();
const FONT = process.env.PPTX_FONT ?? "Google Sans";
const MONO = FONT;
const faceFor = (w: number): { fontFace: string; bold: boolean } => {
  if (w >= 700) return { fontFace: FONT, bold: true };
  if (w >= 600) return { fontFace: FONT + " SemiBold", bold: false };
  if (w >= 500) return { fontFace: FONT + " Medium", bold: false };
  return { fontFace: FONT, bold: false };
};

const pptx = new pptxgen();
pptx.defineLayout({ name: "KATALIS_16x9", width: 13.333, height: 7.5 });
pptx.layout = "KATALIS_16x9";
pptx.author = "Dar Dev";
pptx.company = "Dar Dev";
pptx.title = "KATALIS ERP — Penawaran dari Dar Dev";
pptx.subject = "Custom ERP Solution Proposal untuk PT Katalis Lintas Global";

function addText(s: pptxgen.Slide, el: Extract<El, { t: "text" }>) {
  const runsIn: Run[] = typeof el.text === "string" ? [{ text: el.text }] : el.text;
  const paras: Run[][] = [[]];
  runsIn.forEach((r) => {
    r.text.split("\n").forEach((part, i) => {
      if (i > 0) paras.push([]);
      if (part !== "") paras[paras.length - 1].push({ ...r, text: part });
    });
  });
  const lineSpacing = PT(el.size * (el.lh ?? 1.3));
  const out: pptxgen.TextProps[] = [];
  paras.forEach((p, pi) => {
    const runs = p.length ? p : [{ text: " " }];
    runs.forEach((r, ri) => {
      out.push({
        text: r.text,
        options: {
          ...faceFor(r.bold !== undefined ? (r.bold ? 700 : 400) : el.weight ?? (el.bold ? 700 : 400)),
          fontSize: PT(el.size),
          color: hex(r.color ?? el.color),
          italic: false,
          lineSpacing,
          paraSpaceAfter: pi < paras.length - 1 ? PT(el.para ?? 0) : 0,
          paraSpaceBefore: 0,
          align: ({ l: "left", c: "center", r: "right" } as const)[el.align ?? "l"],
          bullet: el.bullet ? { indent: PT(el.size * 0.85) } : undefined,
          breakLine: ri === runs.length - 1 && pi < paras.length - 1,
        },
      });
    });
  });
  s.addText(out, {
    x: IN(el.x),
    y: IN(el.y),
    w: IN(el.w),
    h: IN(el.h),
    margin: 0,
    valign: ({ t: "top", m: "middle", b: "bottom" } as const)[el.va ?? "t"],
    wrap: true,
    fit: "none",
  });
}

function cellOpts(c: Cell, base: { size: number; color?: string; align: "l" | "c" | "r"; bold?: boolean; fill?: string; border: string; head?: boolean; headColor?: string }) {
  const o = typeof c === "string" ? { t: c } : c;
  const align = ({ l: "left", c: "center", r: "right" } as const)[o.a ?? base.align];
  type B4 = [pptxgen.BorderProps, pptxgen.BorderProps, pptxgen.BorderProps, pptxgen.BorderProps];
  const none: pptxgen.BorderProps = { type: "none" };
  const border: B4 = base.head ? [none, none, none, none] : [none, none, { type: "solid", pt: 0.75, color: hex(base.border) }, none];
  return {
    text: o.t === "" ? " " : o.t,
    options: {
      ...faceFor(base.head || o.b ? 700 : 400),
      fontSize: PT(base.size),
      color: hex(base.head ? base.headColor : o.c ?? base.color),
      fill: { color: hex(base.head ? base.fill : o.f ?? base.fill ?? "#FFFFFF") },
      align,
      valign: "middle" as const,
      margin: [0, 14 / 144, 0, 14 / 144] as [number, number, number, number],
      border,
    },
  };
}

function addEl(s: pptxgen.Slide, el: El) {
  switch (el.t) {
    case "rect": {
      const r = el.r ?? 0;
      const useRound = r > 0;
      const maxR = Math.min(el.w, el.h) / 2;
      s.addShape(useRound ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
        x: IN(el.x),
        y: IN(el.y),
        w: IN(el.w),
        h: IN(el.h),
        rectRadius: useRound ? IN(Math.min(r, maxR)) : undefined,
        fill: el.fill ? { color: hex(el.fill), transparency: el.op !== undefined ? Math.round((1 - el.op) * 100) : 0 } : { type: "none" },
        line: el.line ? { color: hex(el.line), width: PT(el.lw ?? 1), dashType: el.dash ? "dash" : "solid" } : { type: "none" },
      });
      break;
    }
    case "ellipse":
      s.addShape(pptx.ShapeType.ellipse, {
        x: IN(el.x),
        y: IN(el.y),
        w: IN(el.w),
        h: IN(el.h),
        fill: el.fill ? { color: hex(el.fill) } : { type: "none" },
        line: el.line ? { color: hex(el.line), width: PT(el.lw ?? 1) } : { type: "none" },
      });
      break;
    case "text":
      addText(s, el);
      break;
    case "line": {
      let { x1, y1, x2, y2 } = el;
      let flipArrow = false;
      if (x2 < x1) {
        [x1, y1, x2, y2] = [x2, y2, x1, y1];
        flipArrow = true;
      }
      const flipV = y2 < y1;
      s.addShape(pptx.ShapeType.line, {
        x: IN(x1),
        y: IN(Math.min(y1, y2)),
        w: IN(x2 - x1),
        h: IN(Math.abs(y2 - y1)),
        flipV,
        line: {
          color: hex(el.color),
          width: PT(el.lw),
          dashType: el.dash ? "dash" : "solid",
          ...(el.arrow ? (flipArrow ? { beginArrowType: "triangle" as const } : { endArrowType: "triangle" as const }) : {}),
        },
      });
      break;
    }
    case "img":
      s.addImage({ path: path.join("public", el.src), x: IN(el.x), y: IN(el.y), w: IN(el.w), h: IN(el.h) });
      break;
    case "table": {
      const rows: pptxgen.TableRow[] = [];
      const align = el.align ?? [];
      if (el.head) {
        rows.push(el.head.map((h, ci) => cellOpts(h, { size: el.size, align: align[ci] ?? "l", fill: el.headFill, headColor: el.headColor, border: el.border ?? "#DAE3EA", head: true })));
      }
      el.rows.forEach((r, ri) => {
        rows.push(
          r.map((c, ci) =>
            cellOpts(c, {
              size: el.size,
              align: align[ci] ?? "l",
              color: el.color,
              fill: el.zebra && ri % 2 === 1 ? el.zebra : el.rowFill ?? "#FFFFFF",
              border: el.border ?? "#DAE3EA",
            }),
          ),
        );
      });
      const rowH = [...(el.head ? [IN(el.headH ?? el.rowH)] : []), ...el.rows.map(() => IN(el.rowH))];
      s.addTable(rows, { x: IN(el.x), y: IN(el.y), w: IN(el.w), colW: el.cols.map(IN), rowH, autoPage: false });
      break;
    }
  }
}

mkdirSync("output", { recursive: true });
slides.forEach((sl) => {
  const s = pptx.addSlide();
  s.background = { color: sl.theme === "dark" ? "0E5C46" : "FAF9F6" };
  sl.els.forEach((el) => addEl(s, el));
  s.addNotes(`${sl.title}\n\n${sl.notes}`);
});

pptx.writeFile({ fileName: "output/KATALIS-ERP-Proposal.pptx" }).then((f) => console.log("PPTX written:", f));
