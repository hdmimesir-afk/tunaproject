import type { CSSProperties, ReactNode } from "react";
import type { El, Slide, Run, Cell } from "@/lib/scene";
import { W, H } from "@/lib/scene";

const vaMap = { t: "flex-start", m: "center", b: "flex-end" } as const;
const alMap = { l: "left", c: "center", r: "right" } as const;

function Paragraphs({ el }: { el: Extract<El, { t: "text" }> }) {
  const runs: Run[] = typeof el.text === "string" ? [{ text: el.text }] : el.text;
  // Split runs into paragraphs on "\n"
  const paras: Run[][] = [[]];
  runs.forEach((r) => {
    const parts = r.text.split("\n");
    parts.forEach((p, i) => {
      if (i > 0) paras.push([]);
      if (p !== "") paras[paras.length - 1].push({ ...r, text: p });
    });
  });
  return (
    <>
      {paras.map((p, i) => (
        <div
          key={i}
          style={{
            marginTop: i === 0 ? 0 : el.para ?? 0,
            position: "relative",
            paddingLeft: el.bullet ? Math.round(el.size * 0.85) : 0,
            minHeight: p.length === 0 ? el.size * (el.lh ?? 1.3) : undefined,
          }}
        >
          {el.bullet && (
            <span style={{ position: "absolute", left: 0, top: 0, color: "#176D9C" }}>•</span>
          )}
          {p.map((r, j) => (
            <span
              key={j}
              style={{
                fontWeight: r.bold === undefined ? undefined : r.bold ? 700 : 400,
                color: r.color,
                              }}
            >
              {r.text}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

function cellObj(c: Cell) {
  return typeof c === "string" ? { t: c } : c;
}

function renderEl(el: El, i: number): ReactNode {
  switch (el.t) {
    case "rect": {
      const s: CSSProperties = {
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        background: el.fill,
        borderRadius: el.r,
        boxSizing: "border-box",
        border: el.line ? `${el.lw ?? 1}px ${el.dash ? "dashed" : "solid"} ${el.line}` : undefined,
        opacity: el.op,
      };
      return <div key={i} style={s} />;
    }
    case "ellipse": {
      const s: CSSProperties = {
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        background: el.fill,
        borderRadius: "50%",
        boxSizing: "border-box",
        border: el.line ? `${el.lw ?? 1}px solid ${el.line}` : undefined,
        opacity: el.op,
      };
      return <div key={i} style={s} />;
    }
    case "text": {
      const s: CSSProperties = {
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        display: "flex",
        flexDirection: "column",
        justifyContent: vaMap[el.va ?? "t"],
        fontSize: el.size,
        lineHeight: el.lh ?? 1.3,
        color: el.color,
        fontWeight: el.weight ?? (el.bold ? 700 : 400),
        textAlign: alMap[el.align ?? "l"],
                opacity: el.op,
      };
      return (
        <div key={i} className="slide-text" style={s} data-slide-text="1">
          <Paragraphs el={el} />
        </div>
      );
    }
    case "line": {
      const pad = 20;
      const minX = Math.min(el.x1, el.x2) - pad;
      const minY = Math.min(el.y1, el.y2) - pad;
      const w = Math.abs(el.x2 - el.x1) + pad * 2;
      const h = Math.abs(el.y2 - el.y1) + pad * 2;
      const x1 = el.x1 - minX, y1 = el.y1 - minY, x2 = el.x2 - minX, y2 = el.y2 - minY;
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const hl = 14 + el.lw * 1.5, hw = 7 + el.lw;
      const bx = x2 - Math.cos(ang) * hl, by = y2 - Math.sin(ang) * hl;
      const p1 = `${bx + Math.sin(ang) * hw / 1},${by - Math.cos(ang) * hw / 1}`;
      const p2 = `${bx - Math.sin(ang) * hw / 1},${by + Math.cos(ang) * hw / 1}`;
      return (
        <svg key={i} style={{ position: "absolute", left: minX, top: minY, overflow: "visible", pointerEvents: "none" }} width={w} height={h}>
          <line x1={x1} y1={y1} x2={el.arrow ? bx : x2} y2={el.arrow ? by : y2} stroke={el.color} strokeWidth={el.lw} strokeDasharray={el.dash ? `${el.lw * 3} ${el.lw * 2}` : undefined} strokeLinecap="butt" />
          {el.arrow && <polygon points={`${x2},${y2} ${p1} ${p2}`} fill={el.color} />}
        </svg>
      );
    }
    case "img":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={el.src} alt="" style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, objectFit: el.fit ?? "cover" }} />
      );
    case "table": {
      const align = el.align ?? [];
      const row = (cells: Cell[], isHead: boolean, ri: number) => {
        const h = isHead ? el.headH ?? el.rowH : el.rowH;
        return (
          <div key={(isHead ? "h" : "r") + ri} style={{ display: "flex", height: h, background: isHead ? el.headFill : el.zebra && ri % 2 === 1 ? el.zebra : el.rowFill ?? "#fff" }}>
            {cells.map((raw, ci) => {
              const c = cellObj(raw);
              return (
                <div
                  key={ci}
                  style={{
                    width: el.cols[ci],
                    boxSizing: "border-box",
                    padding: "0 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: { l: "flex-start", c: "center", r: "flex-end" }[c.a ?? align[ci] ?? "l"],
                    textAlign: alMap[c.a ?? align[ci] ?? "l"],
                    fontSize: el.size,
                    lineHeight: 1.2,
                    fontWeight: isHead || c.b ? 700 : 400,
                    color: isHead ? el.headColor : c.c ?? el.color ?? "#00171F",
                    background: !isHead && c.f ? c.f : undefined,
                    borderBottom: isHead ? undefined : `1px solid ${el.border}`,
                  }}
                >
                  <span style={{ whiteSpace: "pre-wrap" }}>{c.t}</span>
                </div>
              );
            })}
          </div>
        );
      };
      return (
        <div key={i} style={{ position: "absolute", left: el.x, top: el.y, width: el.w }}>
          {el.head && row(el.head, true, 0)}
          {el.rows.map((r, ri) => row(r, false, ri))}
        </div>
      );
    }
  }
}

export function SlideCanvas({ slide }: { slide: Slide; animate?: boolean }) {
  return (
    <div
      data-slide-id={slide.id}
      style={{
        position: "relative",
        width: W,
        height: H,
        overflow: "hidden",
        background: slide.theme === "dark" ? "#003459" : "#F6F9FB",
        color: "#00171F",
      }}
    >
      {slide.els.map(renderEl)}
    </div>
  );
}
