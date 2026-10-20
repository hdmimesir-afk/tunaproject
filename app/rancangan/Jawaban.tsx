"use client";

/* Jawaban owner di halaman Rancangan: disimpan di perangkat owner (localStorage),
   lalu dikirim sebagai satu pesan WhatsApp ke developer. Tidak ada server. */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Check, Send } from "lucide-react";
import { INK } from "@/components/demo/ui";
import { PERTANYAAN, SETUJU, WA_DEVELOPER } from "./data";

type Setuju = { v: "ya" | "ubah"; catatan?: string };
type Tanya = { pilih?: number; usulan?: boolean; teks?: string };
type State = { setuju: Record<number, Setuju>; tanya: Record<number, Tanya> };

const KEY = "katalis-rancangan-jawaban-v1";
const EMPTY: State = { setuju: {}, tanya: {} };

const Ctx = createContext<{ s: State; set: (f: (s: State) => State) => void } | null>(null);

export function JawabanProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(EMPTY);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setS({ ...EMPTY, ...JSON.parse(raw) }); } catch { /* ignore */ }
  }, []);
  const set = (f: (s: State) => State) => setS((prev) => {
    const next = f(prev);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  return <Ctx.Provider value={{ s, set }}>{children}</Ctx.Provider>;
}

const useJawaban = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useJawaban harus di dalam JawabanProvider");
  return c;
};

/** Pertanyaan yang bawaannya "Belum ada" tidak punya usulan developer: owner harus mengisi. */
export const punyaUsulan = (i: number) => !PERTANYAAN[i].bawaan.startsWith("Belum ada");
const terjawab = (a?: Tanya) => !!a && (a.pilih !== undefined || !!a.usulan || !!a.teks?.trim());

function Pilih({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 py-2 text-left text-[13px] font-medium shadow-sm transition active:scale-[0.97]"
      style={on ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>
      {on && <Check size={15} strokeWidth={2.4} />}{children}
    </button>
  );
}

const fieldCls = "w-full rounded-2xl border border-[#DDE1E8] bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#00171F]";

/* --------------------------------------------------------------- setuju */

export function SetujuSemua() {
  const { s, set } = useJawaban();
  const semua = SETUJU.every((_, i) => s.setuju[i]?.v === "ya");
  return (
    <Pilih on={semua} onClick={() => set((p) => ({ ...p, setuju: Object.fromEntries(SETUJU.map((_, i) => [i, { v: "ya" as const }])) }))}>
      Setuju semua
    </Pilih>
  );
}

export function SetujuPilih({ i }: { i: number }) {
  const { s, set } = useJawaban();
  const a = s.setuju[i];
  const put = (v: Setuju) => set((p) => ({ ...p, setuju: { ...p.setuju, [i]: v } }));
  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap gap-1.5">
        <Pilih on={a?.v === "ya"} onClick={() => put({ v: "ya" })}>Setuju</Pilih>
        <Pilih on={a?.v === "ubah"} onClick={() => put({ v: "ubah", catatan: a?.catatan })}>Mau diubah</Pilih>
      </div>
      {a?.v === "ubah" && (
        <textarea rows={2} className={`${fieldCls} mt-2`} placeholder="Apa yang ingin diubah?" value={a.catatan ?? ""}
          onChange={(e) => put({ v: "ubah", catatan: e.target.value })} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- tanya */

export function TanyaPilih({ i }: { i: number }) {
  const { s, set } = useJawaban();
  const q = PERTANYAAN[i];
  const a = s.tanya[i] ?? {};
  const put = (v: Tanya) => set((p) => ({ ...p, tanya: { ...p.tanya, [i]: v } }));
  return (
    <div className="mt-3 space-y-2 pl-10">
      <div className="flex flex-wrap gap-1.5">
        {q.pilih?.map((p, j) => (
          <Pilih key={p} on={a.pilih === j} onClick={() => put({ ...a, pilih: j, usulan: false })}>{String.fromCharCode(65 + j)}. {p}</Pilih>
        ))}
        {punyaUsulan(i) && <Pilih on={!!a.usulan} onClick={() => put({ ...a, usulan: !a.usulan, pilih: undefined })}>Pakai usulan developer</Pilih>}
      </div>
      <textarea rows={q.pilih ? 1 : 2} className={fieldCls} value={a.teks ?? ""}
        placeholder={q.pilih ? "Catatan tambahan (boleh kosong)" : "Tulis jawaban di sini"}
        onChange={(e) => put({ ...a, teks: e.target.value })} />
    </div>
  );
}

/* ----------------------------------------------------------------- kirim */

const pendek = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);

function pesan(s: State) {
  const out = ["*Jawaban Rancangan KATALIS ERP*", "", "*Hal yang perlu disetujui*"];
  SETUJU.forEach((x, i) => {
    const a = s.setuju[i];
    out.push(`${i + 1}. ${x.t}: ${!a ? "belum dijawab" : a.v === "ya" ? "Setuju" : `Mau diubah${a.catatan?.trim() ? ` (${a.catatan.trim()})` : ""}`}`);
  });
  out.push("", "*Pertanyaan*");
  PERTANYAAN.forEach((q, i) => {
    const a = s.tanya[i];
    const parts: string[] = [];
    if (a?.pilih !== undefined && q.pilih) parts.push(`${String.fromCharCode(65 + a.pilih)}. ${q.pilih[a.pilih]}`);
    if (a?.usulan) parts.push("Pakai usulan developer");
    if (a?.teks?.trim()) parts.push(a.teks.trim());
    out.push(`${i + 1}. ${pendek(q.t)}${q.wajib ? " [wajib]" : ""}`, `   → ${parts.length ? parts.join(" · ") : "belum dijawab"}`);
  });
  return out.join("\n");
}

export function KirimBar() {
  const { s } = useJawaban();
  const wajib = PERTANYAAN.map((q, i) => (q.wajib ? i : -1)).filter((i) => i >= 0);
  const wajibOk = wajib.filter((i) => terjawab(s.tanya[i])).length;
  const setujuOk = SETUJU.filter((_, i) => s.setuju[i]).length;
  const tanyaOk = PERTANYAAN.filter((_, i) => terjawab(s.tanya[i])).length;
  const siap = !!WA_DEVELOPER;
  const kirim = () => {
    if (!siap) return;
    const sisa = wajib.length - wajibOk;
    if (sisa > 0 && !window.confirm(`Masih ada ${sisa} pertanyaan wajib yang belum dijawab. Tetap kirim sekarang?`)) return;
    window.open(`https://wa.me/${WA_DEVELOPER}?text=${encodeURIComponent(pesan(s))}`, "_blank", "noopener");
  };
  return (
    <div className="sticky bottom-3 z-20 mx-auto w-full max-w-[1180px] px-4 sm:px-8">
      <div className="flex flex-wrap items-center gap-3 rounded-[24px] px-4 py-3 shadow-lg sm:flex-nowrap" style={{ background: INK }}>
        <div className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#C6CCD3]">
          <span className="font-semibold text-white">Wajib {wajibOk}/{wajib.length}</span> · Pertanyaan {tanyaOk}/{PERTANYAAN.length} · Persetujuan {setujuOk}/{SETUJU.length}
          <div className="text-[11.5px] text-[#8A9199]">Jawaban tersimpan di HP ini. Kirim kapan saja, lalu tekan kirim di WhatsApp.</div>
        </div>
        <button type="button" onClick={kirim} disabled={!siap}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-medium transition active:scale-[0.96] disabled:opacity-50"
          style={{ color: INK }} title={siap ? undefined : "Nomor WhatsApp developer belum diisi"}>
          <Send size={16} /> Kirim lewat WhatsApp
        </button>
      </div>
    </div>
  );
}
