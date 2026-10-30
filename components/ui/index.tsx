"use client";

/* Komponen tampilan dasar, disalin dari components/demo/ui.tsx di repo deck (katalis-erp-pitch)
   tanpa bagian yang terikat ke data demo. Tata letak HP dan desktop memakai breakpoint `md`. */

import { useMemo, useState } from "react";
import { cocok, KotakCari } from "./Cari";
import {
  ArrowDownLeft, ArrowUpRight, Calendar, ChartColumn, ChevronLeft, ChevronRight, CircleCheck, House, Clock, Download, Ellipsis, Factory, FileText, FlaskConical,
  LayoutGrid, List, Lock, Menu, Package, PanelLeftClose, PanelLeftOpen, Plus, Search, SendHorizontal, ShieldCheck, ShoppingCart, Snowflake, Sparkles, Truck,
  User, Wallet, X, type LucideIcon,
} from "lucide-react";
import { INK, MUTED, TILE } from "./tokens";

export { INK, MUTED, TILE, BLUE } from "./tokens";

/* ----------------------------------------------------------------- icons */
export type IconName = "grid" | "box" | "check" | "chart" | "user" | "search" | "menu" | "arrow" | "dots" | "plus" | "back" | "calendar" | "note" | "cart" | "factory" | "shield" | "snow" | "cash" | "truck" | "clock" | "flask" | "lock" | "list" | "download" | "close" | "sparkles" | "send" | "home" | "next" | "panel-close" | "panel-open" | "masuk";
const LUCIDE: Record<IconName, LucideIcon> = {
  grid: LayoutGrid, box: Package, check: CircleCheck, chart: ChartColumn, user: User, search: Search, menu: Menu, arrow: ArrowUpRight, dots: Ellipsis, plus: Plus, close: X, sparkles: Sparkles, send: SendHorizontal, back: ChevronLeft, next: ChevronRight, home: House, "panel-close": PanelLeftClose, "panel-open": PanelLeftOpen, masuk: ArrowDownLeft,
  calendar: Calendar, note: FileText, cart: ShoppingCart, factory: Factory, shield: ShieldCheck, snow: Snowflake, cash: Wallet, truck: Truck, clock: Clock, flask: FlaskConical, lock: Lock, list: List, download: Download,
};
export const Icon = ({ n, c = INK, s = 22 }: { n: IconName; c?: string; s?: number }) => {
  const L = LUCIDE[n];
  return <L size={s} color={c} strokeWidth={1.8} aria-hidden />;
};

/* -------------------------------------------------------------- pieces */
const PILL: Record<string, [string, string]> = {
  Berjalan: ["#E4EEFB", "#2D5F9A"], Ditahan: ["#FBF0D5", "#8A5A00"], Terlambat: ["#FBE5E3", "#A8322B"], Selesai: ["#DDF3E8", "#0B6B4A"], Diperiksa: ["#DDF3E8", "#0B6B4A"],
  "Jatuh tempo": ["#FBF0D5", "#8A5A00"], "Belum jatuh tempo": ["#E4EEFB", "#2D5F9A"], Lunas: ["#DDF3E8", "#0B6B4A"], Sebagian: ["#FBF0D5", "#8A5A00"],
  Diajukan: ["#FBF0D5", "#8A5A00"], "Perlu revisi": ["#FBF0D5", "#8A5A00"], Disetujui: ["#E4EEFB", "#2D5F9A"], Ditolak: ["#FBE5E3", "#A8322B"], Diterima: ["#DDF3E8", "#0B6B4A"],
  Menunggu: ["#FBF0D5", "#8A5A00"], Lulus: ["#DDF3E8", "#0B6B4A"], Draf: ["#ECEDF1", "#5A5F68"], Dikirim: ["#E4EEFB", "#2D5F9A"], Disimpan: ["#E4EEFB", "#2D5F9A"], Diambil: ["#ECEDF1", "#5A5F68"],
  Bentrok: ["#FBE5E3", "#A8322B"], Terkunci: ["#ECEDF1", "#5A5F68"], Terbuka: ["#DDF3E8", "#0B6B4A"],
  Terkirim: ["#DDF3E8", "#0B6B4A"], Dibatalkan: ["#FBE5E3", "#A8322B"],
  Aman: ["#DDF3E8", "#0B6B4A"], Cukup: ["#DDF3E8", "#0B6B4A"], Longgar: ["#DDF3E8", "#0B6B4A"], Terisi: ["#E4EEFB", "#2D5F9A"], "Hampir penuh": ["#FBF0D5", "#8A5A00"], Penuh: ["#FBE5E3", "#A8322B"], Kosong: ["#ECEDF1", "#5A5F68"], Menipis: ["#FBF0D5", "#8A5A00"], Habis: ["#FBE5E3", "#A8322B"],
  Aktif: ["#DDF3E8", "#0B6B4A"], Nonaktif: ["#ECEDF1", "#5A5F68"], "Tanpa peran": ["#FBF0D5", "#8A5A00"],
};
export const Pill = ({ t }: { t: string }) => {
  const [bg, fg] = PILL[t] ?? ["#ECEDF1", MUTED];
  return <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none" style={{ background: bg, color: fg }}>{t}</span>;
};

type BtnProps = { children: React.ReactNode; onClick?: () => void; v?: "dark" | "light" | "danger" | "ghost"; size?: "sm" | "md"; disabled?: boolean; title?: string; full?: boolean; type?: "button" | "submit" };
export function Btn({ children, onClick, v = "dark", size = "md", disabled, title, full, type = "button" }: BtnProps) {
  const st = { dark: { background: INK, color: "#fff" }, light: { background: "#fff", color: INK, boxShadow: "0 1px 2px rgba(20,24,40,.08)" }, danger: { background: "#FBE5E3", color: "#A8322B" }, ghost: { background: "transparent", color: MUTED } }[v];
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} style={st}
      className={`${full ? "w-full" : ""} inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition hover:brightness-110 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 ${size === "sm" ? "h-10 px-4 text-[13px] md:h-8 md:px-3.5 md:text-[12.5px]" : "h-11 px-5 text-[14px]"}`}>
      {children}
    </button>
  );
}

export function Card({ title, right, children, className = "" }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[26px] p-2.5 ${className}`} style={{ background: "rgba(248,249,252,.78)", border: "1px solid rgba(255,255,255,.95)", boxShadow: "0 6px 24px rgba(40,50,80,.05)" }}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-2">
          {title && <h2 className="text-[14.5px] font-medium" style={{ color: INK }}>{title}</h2>}
          <div className="flex items-center gap-2">{right}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export const Inner = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`rounded-[20px] p-4 ${className}`} style={{ background: TILE }}>{children}</div>;

/** Angka besar yang mengecil sendiri sampai muat di lebar kartunya (container query), tidak pernah meluber atau terpotong.
    Ukuran memuncak di `mobil` px (layar kecil) dan `desktop` px (md ke atas); lantainya 11 px. */
export function AngkaMuat({ teks, mobil = 22, desktop = 26, className = "", style }: { teks: string; mobil?: number; desktop?: number; className?: string; style?: React.CSSProperties }) {
  const k = Math.max(1, teks.length * 0.62).toFixed(2);
  const vars = { "--am": `max(11px, min(${mobil}px, calc(100cqw / ${k})))`, "--ad": `max(11px, min(${desktop}px, calc(100cqw / ${k})))` } as React.CSSProperties;
  return (
    <div className="min-w-0 [container-type:inline-size]">
      <div className={`whitespace-nowrap leading-none tracking-tight tabular-nums text-[length:var(--am)] md:text-[length:var(--ad)] ${className}`} style={{ ...vars, ...style }}>{teks}</div>
    </div>
  );
}

export function Stat({ value, label, onClick, tone }: { value: string; label: string; onClick?: () => void; tone?: "warn" | "ok" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`relative block min-w-0 rounded-[20px] p-3.5 pt-4 text-left md:p-4 md:pt-5 ${onClick ? "transition active:scale-[0.96]" : ""}`} style={{ background: TILE }}>
      {onClick && <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white"><Icon n="arrow" s={14} /></span>}
      <AngkaMuat teks={value} className="font-normal" style={{ color: tone === "warn" ? "#B4443C" : tone === "ok" ? "#0B6B4A" : INK }} />
      <div className="mt-3 text-[12px] leading-snug md:mt-4 md:text-[12.5px]" style={{ color: MUTED }}>{label}</div>
    </Tag>
  );
}

export function Bar({ pct, color = INK }: { pct: number; color?: string }) {
  return <div className="h-2 rounded-full bg-white"><div className="h-2 rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }} /></div>;
}

/* --------------------------------------------------------------- forms */
export const Field = ({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) => (
  <label className="block">
    <span className="mb-1.5 block text-[12px] font-medium" style={{ color: MUTED }}>{label}</span>
    {children}
    {error ? <span className="mt-1 block text-[11.5px]" style={{ color: "#A8322B" }}>{error}</span> : hint && <span className="mt-1 block text-[11.5px]" style={{ color: MUTED }}>{hint}</span>}
  </label>
);
const inputCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none transition focus:border-[#00171F] focus:ring-3 focus:ring-[#00171F]/10";
export const TextIn = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={inputCls} />;
export const SelectIn = ({ options, ...p }: { options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={inputCls}>{options.map((o) => <option key={o}>{o}</option>)}</select>
);

/** Lembar bawah di HP, dialog di desktop. */
export function Modal({ title, onClose, children, footer, lebar }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; lebar?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center md:justify-center" style={{ background: "rgba(17,18,20,.38)" }} onClick={onClose}>
      <div className={`flex max-h-[92%] w-full flex-col rounded-t-[30px] bg-[#F8F9FC] md:rounded-[28px] md:shadow-2xl ${lebar ? "md:w-[920px]" : "md:w-[460px]"}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mx-auto mb-1 mt-3 h-1.5 w-10 rounded-full bg-[#D5D8DF] md:hidden" />
        <div className="flex items-center justify-between px-6 pb-2 pt-4">
          <h3 className="text-[18px] font-medium" style={{ color: INK }}>{title}</h3>
          <button type="button" aria-label="Tutup" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white"><Icon n="close" s={16} /></button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 md:px-6 md:pb-4">{children}</div>
        {footer && <div className="flex gap-2.5 px-6 pb-7 pt-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- data list */
export interface Col<T> { h: string; r: (row: T) => React.ReactNode; right?: boolean }
/** Tabel di desktop, kartu bertumpuk di HP. Kolom pertama menjadi judul kartu.
    Bila `cari` diberikan (fungsi yang menghasilkan teks yang bisa dicari dari satu baris), kotak pencarian tampil di atas daftar. */
export function DataList<T>({ cols, rows, actions, empty = "Belum ada data.", cari }: { cols: Col<T>[]; rows: T[]; actions?: (row: T) => React.ReactNode; empty?: string; cari?: (row: T) => string }) {
  const [q, setQ] = useState("");
  const semua = rows;
  rows = useMemo(() => (cari && q.trim() ? semua.filter((r) => cocok(cari(r), q)) : semua), [semua, cari, q]);
  if (semua.length === 0) return <Inner><div className="py-3 text-center text-[13px]" style={{ color: MUTED }}>{empty}</div></Inner>;
  const [first, ...rest] = cols;
  const kotak = cari ? <KotakCari q={q} onUbah={setQ} tampil={rows.length} total={semua.length} className="mb-2.5" /> : null;
  if (rows.length === 0) {
    return <>{kotak}<Inner><div className="py-3 text-center text-[13px]" style={{ color: MUTED }}>Tidak ada yang cocok dengan &ldquo;{q.trim()}&rdquo;.</div></Inner></>;
  }
  return (
    <>
      {kotak}
      <div className="hidden overflow-x-auto rounded-[20px] bg-white md:block">
        <table className="w-full text-[13.5px]">
          <thead><tr className="text-left text-[12px]" style={{ color: MUTED }}>{cols.map((c) => <th key={c.h} className={`px-4 py-3 font-medium ${c.right ? "text-right" : ""}`}>{c.h}</th>)}{actions && <th className="px-4 py-3 text-right font-medium">Aksi</th>}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#EEF0F4]">
                {cols.map((c) => <td key={c.h} className={`px-4 py-3 ${c.right ? "whitespace-nowrap text-right" : ""}`} style={{ color: INK }}>{c.r(r)}</td>)}
                {actions && <td className="px-4 py-2.5"><div className="flex justify-end gap-2">{actions(r)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((r, i) => {
          // Kolom "Status" naik ke samping judul; sisanya dua kolom, label kecil di atas nilainya. Nilai kosong ("-") disembunyikan.
          const status = rest.find((c) => c.h === "Status");
          const isiStatus = status ? status.r(r) : null;
          const lain = rest.filter((c) => c !== status).map((c) => ({ c, isi: c.r(r) }))
            .filter(({ isi }) => !(isi === "-" || isi === "" || isi === null || isi === undefined || isi === false));
          return (
            <div key={i} className="rounded-[18px] bg-white p-3.5" style={{ boxShadow: "0 1px 2px rgba(20,24,40,.05)" }}>
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 text-[14px] font-medium leading-snug" style={{ color: INK }}>{first.r(r)}</div>
                {isiStatus !== null && isiStatus !== undefined && isiStatus !== false && <div className="shrink-0">{isiStatus}</div>}
              </div>
              {lain.length > 0 && (
                <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#EEF0F4] pt-2.5">
                  {lain.map(({ c, isi }) => {
                    const panjang = typeof isi === "string" && isi.length > 22;
                    return (
                      <div key={c.h} className={`min-w-0 ${panjang ? "col-span-2" : ""}`}>
                        <div className="text-[11px]" style={{ color: MUTED }}>{c.h}</div>
                        <div className={`mt-px break-words text-[13px] font-medium leading-snug ${c.right ? "tabular-nums" : ""}`} style={{ color: INK }}>{isi}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {actions && <div className="mt-3 flex flex-wrap gap-2">{actions(r)}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* -------------------------------------------------------------- tiny hooks */
export function useModal<T = true>() {
  const [m, setM] = useState<T | null>(null);
  return [m, (v: T | true | null) => setM(v as T | null)] as const;
}
