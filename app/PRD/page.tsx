import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/* Halaman PRD: dibaca dari docs/PRD.md saat build, supaya isi halaman dan dokumen selalu sama.
   Dengan Cache Components halaman ini otomatis statis karena tidak membaca data permintaan. */

export const metadata: Metadata = {
  title: "KATALIS ERP | PRD",
  description: "Product Requirements Document KATALIS ERP: acuan developer untuk membangun sistem, lengkap dengan fitur, aturan, model data, jadwal, dan daftar task.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00171F" };

// Warna sama dengan components/demo/ui.tsx (ditulis ulang karena modul itu modul klien).
const INK = "#00171F";
const MUTED = "#6C7F8A";
const TILE = "#F4F5F9";

type Block =
  | { k: "h"; level: number; text: string; id: string }
  | { k: "p"; text: string }
  | { k: "code"; text: string }
  | { k: "table"; head: string[]; rows: string[][] }
  | { k: "ul" | "ol"; items: string[] }
  | { k: "task"; items: { done: boolean; text: string }[] };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function parse(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("```")) {
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) body.push(lines[i]);
      out.push({ k: "code", text: body.join("\n") }); i++; continue;
    }
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) { out.push({ k: "h", level: h[1].length, text: h[2], id: slug(h[2]) }); i++; continue; }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      for (; i < lines.length && lines[i].startsWith("|"); i++) if (!/^\|\s*-/.test(lines[i])) rows.push(cells(lines[i]));
      out.push({ k: "table", head: rows[0], rows: rows.slice(1) }); continue;
    }
    if (/^- \[[ x]\] /.test(line)) {
      const items: { done: boolean; text: string }[] = [];
      for (; i < lines.length && /^- \[[ x]\] /.test(lines[i]); i++) items.push({ done: lines[i][3] === "x", text: lines[i].slice(6) });
      out.push({ k: "task", items }); continue;
    }
    if (/^- /.test(line) || /^\d+\. /.test(line)) {
      const ol = /^\d+\. /.test(line), re = ol ? /^\d+\. / : /^- /;
      const items: string[] = [];
      for (; i < lines.length && re.test(lines[i]); i++) items.push(lines[i].replace(re, ""));
      out.push({ k: ol ? "ol" : "ul", items }); continue;
    }
    const para: string[] = [];
    for (; i < lines.length && lines[i].trim() && !/^(#|\||- |\d+\. |```)/.test(lines[i]); i++) para.push(lines[i]);
    out.push({ k: "p", text: para.join(" ") });
  }
  return out;
}

/** Inline: `kode`, **tebal**, dan tautan http. */
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).filter(Boolean).map((t, i) => {
    if (t.startsWith("`")) return <code key={i} className="rounded-md px-1.5 py-0.5 text-[0.88em]" style={{ background: TILE, color: INK }}>{t.slice(1, -1)}</code>;
    if (t.startsWith("**")) return <strong key={i} className="font-semibold" style={{ color: INK }}>{t.slice(2, -2)}</strong>;
    if (t.startsWith("http")) return <a key={i} href={t} className="underline underline-offset-2" style={{ color: "#2D5F9A" }}>{t}</a>;
    return t;
  });
}

function render(b: Block, i: number): ReactNode {
  switch (b.k) {
    case "h":
      if (b.level === 1) return null;
      if (b.level === 2) return <h2 key={i} id={b.id} className="scroll-mt-6 border-t border-[#E4E6EC] pt-8 text-[24px] font-medium tracking-tight first:border-0 first:pt-0 sm:text-[28px]" style={{ color: INK }}>{b.text}</h2>;
      return <h3 key={i} id={b.id} className="scroll-mt-6 pt-2 text-[17px] font-semibold" style={{ color: INK }}>{b.text}</h3>;
    case "p":
      return <p key={i} className="max-w-3xl text-[14.5px] leading-relaxed" style={{ color: "#33454F" }}>{inline(b.text)}</p>;
    case "code":
      return <pre key={i} className="overflow-x-auto rounded-2xl p-4 text-[13px]" style={{ background: TILE, color: INK }}>{b.text}</pre>;
    case "table":
      return (
        <div key={i} className="overflow-x-auto rounded-2xl border border-[#E4E6EC]">
          <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
            <thead><tr style={{ background: TILE }}>{b.head.map((c, j) => <th key={j} className="px-3 py-2.5 font-semibold" style={{ color: INK }}>{inline(c)}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, j) => <tr key={j} className="border-t border-[#E4E6EC] align-top">{r.map((c, k) => <td key={k} className="px-3 py-2.5 leading-snug" style={{ color: k === 0 ? INK : "#33454F" }}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "ul":
    case "ol": {
      const Tag = b.k;
      return <Tag key={i} className={`max-w-3xl space-y-1.5 pl-5 text-[14.5px] leading-relaxed ${b.k === "ol" ? "list-decimal" : "list-disc"}`} style={{ color: "#33454F" }}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</Tag>;
    }
    case "task":
      return (
        <ul key={i} className="space-y-1.5">
          {b.items.map((t, j) => (
            <li key={j} className="flex gap-2.5 text-[14px] leading-snug" style={{ color: "#33454F" }}>
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border" style={t.done ? { background: INK, borderColor: INK } : { borderColor: "#B9C2C8", background: "#fff" }} aria-hidden />
              <span>{inline(t.text)}</span>
            </li>
          ))}
        </ul>
      );
  }
}

export default function PRDPage() {
  const blocks = parse(readFileSync(join(process.cwd(), "docs", "PRD.md"), "utf8"));
  const title = blocks.find((b) => b.k === "h" && b.level === 1);
  const byline = blocks.find((b) => b.k === "p");
  const toc = blocks.filter((b): b is Extract<Block, { k: "h" }> => b.k === "h" && b.level === 2);
  // Hitung hanya task di bagian "Daftar task", bukan daftar bahan dari owner.
  const from = blocks.findIndex((b) => b.k === "h" && b.level === 2 && b.text === "Daftar task");
  const to = blocks.findIndex((b, j) => j > from && b.k === "h" && b.level === 2);
  const tasks = (from < 0 ? [] : blocks.slice(from, to < 0 ? undefined : to)).flatMap((b) => (b.k === "task" ? b.items : []));
  const body = blocks.filter((b) => b !== title && b !== byline);

  return (
    <div className="min-h-dvh" style={{ background: INK }}>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-56 shrink-0 flex-col lg:flex">
          <div className="px-2 text-[15px] font-semibold text-white">KATALIS ERP</div>
          <div className="px-2 text-[12px] text-[#8A9199]">PRD · dari Dar Dev</div>
          <nav className="mt-5 space-y-1 overflow-y-auto">
            {toc.map((h) => <a key={h.id} href={`#${h.id}`} className="block rounded-full px-3 py-2 text-[13px] text-[#C6CCD3] transition hover:bg-[#1B1D21]">{h.text}</a>)}
          </nav>
          <a href="/rancangan" className="mt-auto rounded-full px-3 py-2 text-[13px] text-[#8A9199] hover:text-white">← Rancangan untuk owner</a>
        </aside>

        <main className="min-w-0 flex-1 rounded-[28px] bg-white px-5 py-7 sm:px-10 sm:py-10">
          <div className="text-[13px]" style={{ color: MUTED }}>{byline && byline.k === "p" ? inline(byline.text) : null}</div>
          <h1 className="mt-1 text-[34px] font-medium leading-tight tracking-tight sm:text-[44px]" style={{ color: INK }}>{title && title.k === "h" ? title.text : "PRD"}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {[`${toc.length} bagian`, `${tasks.length} task`, `${tasks.filter((t) => t.done).length} selesai`].map((t) => (
              <span key={t} className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold" style={{ background: TILE, color: INK }}>{t}</span>
            ))}
          </div>
          <div className="mt-8 space-y-4">{body.map(render)}</div>
        </main>
      </div>
    </div>
  );
}
