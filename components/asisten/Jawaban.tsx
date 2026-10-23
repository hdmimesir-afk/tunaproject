import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { INK, MUTED } from "@/components/ui/tokens";

/** react-markdown menyertakan `node` pada setiap komponen; tidak boleh diteruskan ke elemen DOM. */
function buang<T extends { node?: unknown }>(p: T) {
  const { node, ...sisa } = p;
  void node;
  return sisa;
}

export type TabelAsisten = { kepala: string[]; baris: string[][]; kananDari?: number };

/* Jawaban model ditampilkan sebagai markdown: tabel, daftar, dan tebal. HTML mentah tidak dirender dan gambar dilarang;
   tautan hanya ke halaman internal. Angka dalam tabel rata kanan supaya mudah dibandingkan. */
export function JawabanTeks({ teks }: { teks: string }) {
  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={["img", "script", "iframe"]}
        unwrapDisallowed
        components={{
          p: (p) => <p {...buang(p)} />,
          strong: (p) => <strong className="font-semibold" {...buang(p)} />,
          ul: (p) => <ul className="list-disc space-y-0.5 pl-5" {...buang(p)} />,
          ol: (p) => <ol className="list-decimal space-y-0.5 pl-5" {...buang(p)} />,
          h1: (p) => <h4 className="pt-1 text-[14px] font-semibold" {...buang(p)} />,
          h2: (p) => <h4 className="pt-1 text-[14px] font-semibold" {...buang(p)} />,
          h3: (p) => <h4 className="pt-1 text-[13.5px] font-semibold" {...buang(p)} />,
          a: ({ href, children }) => (href && href.startsWith("/") ? <Link href={href} className="font-medium underline underline-offset-2">{children}</Link> : <span>{children}</span>),
          table: (p) => <div className="overflow-x-auto rounded-xl border border-[#E2E4EA]"><table className="w-full min-w-[280px] text-[13px]" {...buang(p)} /></div>,
          thead: (p) => <thead className="bg-[#F1F3F8] text-left text-[12px]" style={{ color: MUTED }} {...buang(p)} />,
          th: (p) => <th className="px-3 py-2 font-medium" {...buang(p)} />,
          td: (p) => <td className="border-t border-[#EEF0F4] px-3 py-2 align-top tabular-nums" {...buang(p)} />,
          code: (p) => <code className="rounded bg-[#F1F3F8] px-1 py-0.5 text-[12.5px]" {...buang(p)} />,
        }}
      >
        {teks}
      </Markdown>
    </div>
  );
}

/** Tabel hasil alat (pertanyaan cepat). Kolom angka di kanan. */
export function TabelHasil({ t }: { t: TabelAsisten }) {
  const kanan = t.kananDari ?? t.kepala.length;
  return (
    <div className="mt-2 overflow-x-auto rounded-xl border border-[#E2E4EA]">
      <table className="w-full min-w-[280px] text-[13px]">
        <thead className="bg-[#F1F3F8] text-left text-[12px]" style={{ color: MUTED }}>
          <tr>{t.kepala.map((k, i) => <th key={k} className={`px-3 py-2 font-medium ${i >= kanan ? "text-right" : ""}`}>{k}</th>)}</tr>
        </thead>
        <tbody>
          {t.baris.map((b, i) => <tr key={i}>{b.map((c, j) => <td key={j} className={`border-t border-[#EEF0F4] px-3 py-2 align-top tabular-nums ${j >= kanan ? "text-right" : ""}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
