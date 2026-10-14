"use client";

import { createContext, useContext, useState } from "react";
import { act, can, type Action, type Result, type Role } from "@/lib/demo/store";
import { ArrowUpRight, Calendar, ChartColumn, ChevronLeft, CircleCheck, Clock, Download, Ellipsis, Factory, FileText, FlaskConical, LayoutGrid, List, Lock, Menu, Sparkles, SendHorizontal, Package, Plus, Search, ShieldCheck, ShoppingCart, Snowflake, Truck, User, Wallet, X, type LucideIcon } from "lucide-react";

export const INK = "#00171F";
export const MUTED = "#6C7F8A";
export const GREEN = "#1B7FC4";
export const TILE = "#F4F5F9";

/* ------------------------------------------------------------ contexts */
export interface Ctx { compact: boolean; role: Role; setRole: (r: Role) => void; notify: (m: string, ok?: boolean) => void; go: (m: string) => void }
export const DemoCtx = createContext<Ctx>({ compact: true, role: "Owner", setRole: () => {}, notify: () => {}, go: () => {} });
export const useDemo = () => useContext(DemoCtx);

/** Run a store action as the current role, show the result as a toast and follow navigation hints. */
export function useRun() {
  const { role, notify, go } = useDemo();
  return (a: Action): Result => {
    const r = act(role, a);
    notify(r.msg, r.ok);
    if (r.ok && r.go) go(r.go);
    return r;
  };
}
export function useCan() {
  const { role } = useDemo();
  return (a: string) => can(role, a);
}

/* ----------------------------------------------------------------- icons */
export type IconName = "grid" | "box" | "check" | "chart" | "user" | "search" | "menu" | "arrow" | "dots" | "plus" | "back" | "calendar" | "note" | "cart" | "factory" | "shield" | "snow" | "cash" | "truck" | "clock" | "flask" | "lock" | "list" | "download" | "close" | "sparkles" | "send";
const LUCIDE: Record<IconName, LucideIcon> = {
  grid: LayoutGrid, box: Package, check: CircleCheck, chart: ChartColumn, user: User, search: Search, menu: Menu, arrow: ArrowUpRight, dots: Ellipsis, plus: Plus, close: X, sparkles: Sparkles, send: SendHorizontal, back: ChevronLeft,
  calendar: Calendar, note: FileText, cart: ShoppingCart, factory: Factory, shield: ShieldCheck, snow: Snowflake, cash: Wallet, truck: Truck, clock: Clock, flask: FlaskConical, lock: Lock, list: List, download: Download,
};
export const Icon = ({ n, c = INK, s = 22 }: { n: IconName; c?: string; s?: number }) => {
  const L = LUCIDE[n];
  return <L size={s} color={c} strokeWidth={1.8} aria-hidden />;
};

/* -------------------------------------------------------------- pieces */
const PILL: Record<string, [string, string]> = {
  Berjalan: ["#E4EEFB", "#2D5F9A"], Ditahan: ["#FBF0D5", "#8A5A00"], Terlambat: ["#FBE5E3", "#A8322B"], Selesai: ["#DDF3E8", "#0B6B4A"],
  "Jatuh tempo": ["#FBF0D5", "#8A5A00"], "Belum jatuh tempo": ["#E4EEFB", "#2D5F9A"], Lunas: ["#DDF3E8", "#0B6B4A"], Dibayar: ["#DDF3E8", "#0B6B4A"],
  Pembelian: ["#FBF0D5", "#8A5A00"], Gudang: ["#E4EEFB", "#2D5F9A"], Keuangan: ["#DDF3E8", "#0B6B4A"],
  "Menunggu persetujuan": ["#FBF0D5", "#8A5A00"], Disetujui: ["#E4EEFB", "#2D5F9A"], Ditolak: ["#FBE5E3", "#A8322B"], Diterima: ["#DDF3E8", "#0B6B4A"],
  Menunggu: ["#FBF0D5", "#8A5A00"], Lulus: ["#DDF3E8", "#0B6B4A"], Draf: ["#ECEDF1", "#5A5F68"], Dikirim: ["#E4EEFB", "#2D5F9A"], Disimpan: ["#E4EEFB", "#2D5F9A"], Diambil: ["#ECEDF1", "#5A5F68"],
  Bentrok: ["#FBE5E3", "#A8322B"], Terpasang: ["#E4EEFB", "#2D5F9A"], Finalisasi: ["#FBF0D5", "#8A5A00"], Aman: ["#DDF3E8", "#0B6B4A"], Produksi: ["#E4EEFB", "#2D5F9A"], ABF: ["#F0E6FA", "#6B3FA0"], Terkunci: ["#ECEDF1", "#5A5F68"], Terbuka: ["#DDF3E8", "#0B6B4A"],
};
export const Pill = ({ t }: { t: string }) => {
  const [bg, fg] = PILL[t] ?? ["#ECEDF1", MUTED];
  return <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none" style={{ background: bg, color: fg }}>{t}</span>;
};

export function Btn({ children, onClick, v = "dark", size = "md", disabled, title, full }: { children: React.ReactNode; onClick?: () => void; v?: "dark" | "light" | "danger" | "ghost"; size?: "sm" | "md"; disabled?: boolean; title?: string; full?: boolean }) {
  const st = { dark: { background: INK, color: "#fff" }, light: { background: "#fff", color: INK, boxShadow: "0 1px 2px rgba(20,24,40,.08)" }, danger: { background: "#FBE5E3", color: "#A8322B" }, ghost: { background: "transparent", color: MUTED } }[v];
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} style={st}
      className={`${full ? "w-full" : ""} inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 ${size === "sm" ? "h-8 px-3.5 text-[12.5px]" : "h-11 px-5 text-[14px]"}`}>
      {children}
    </button>
  );
}

/** Button gated by the current role: disabled with an explanation when the role lacks permission. */
export function GBtn({ perm, children, ...p }: { perm: string; children: React.ReactNode; onClick?: () => void; v?: "dark" | "light" | "danger" | "ghost"; size?: "sm" | "md"; disabled?: boolean; full?: boolean }) {
  const ok = useCan()(perm);
  return <Btn {...p} disabled={p.disabled || !ok} title={ok ? undefined : "Peran ini tidak punya izin untuk ini"}>{children}</Btn>;
}

export function Card({ title, right, children, className = "" }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[26px] p-2.5 ${className}`} style={{ background: "rgba(248,249,252,.78)", border: "1px solid rgba(255,255,255,.95)", boxShadow: "0 6px 24px rgba(40,50,80,.05)" }}>
      {title && (
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-2">
          <h2 className="text-[14.5px] font-medium" style={{ color: INK }}>{title}</h2>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export const Inner = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`rounded-[20px] p-4 ${className}`} style={{ background: TILE }}>{children}</div>;

export function Stat({ value, label, onClick, tone }: { value: string; label: string; onClick?: () => void; tone?: "warn" | "ok" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`relative block rounded-[20px] p-4 pt-5 text-left ${onClick ? "transition active:scale-[0.96]" : ""}`} style={{ background: TILE }}>
      {onClick && <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white"><Icon n="arrow" s={14} /></span>}
      <div className="text-[26px] font-normal leading-none tracking-tight" style={{ color: tone === "warn" ? "#B4443C" : tone === "ok" ? "#0B6B4A" : INK }}>{value}</div>
      <div className="mt-4 text-[12.5px] leading-snug" style={{ color: MUTED }}>{label}</div>
    </Tag>
  );
}

export function Bar({ pct, color = INK }: { pct: number; color?: string }) {
  return <div className="h-2 rounded-full bg-white"><div className="h-2 rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }} /></div>;
}

/* --------------------------------------------------------------- forms */
export const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block">
    <span className="mb-1.5 block text-[12px] font-medium" style={{ color: MUTED }}>{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11.5px]" style={{ color: MUTED }}>{hint}</span>}
  </label>
);
const inputCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]";
export const TextIn = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={inputCls} />;
export const NumIn = ({ value, onChange, ...p }: { value: number; onChange: (n: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) => (
  <input {...p} type="number" inputMode="decimal" value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))} className={inputCls} />
);
export const SelectIn = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>{options.map((o) => <option key={o}>{o}</option>)}</select>
);

/** Dialog on desktop, bottom sheet on mobile. */
export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const { compact } = useDemo();
  return (
    <div className={`absolute inset-0 z-40 flex ${compact ? "items-end" : "items-center justify-center"}`} style={{ background: "rgba(17,18,20,.38)", animation: "fadeIn .2s" }} onClick={onClose}>
      <div className={`flex max-h-[88%] flex-col bg-[#F8F9FC] ${compact ? "w-full rounded-t-[30px]" : "w-[460px] rounded-[28px] shadow-2xl"}`} style={{ animation: compact ? "sheetUp .3s cubic-bezier(.2,.8,.2,1)" : "rise .25s" }} onClick={(e) => e.stopPropagation()}>
        {compact && <div className="mx-auto mb-1 mt-3 h-1.5 w-10 rounded-full bg-[#D5D8DF]" />}
        <div className="flex items-center justify-between px-6 pb-2 pt-4">
          <h3 className="text-[18px] font-medium" style={{ color: INK }}>{title}</h3>
          <button type="button" aria-label="Tutup" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white"><Icon n="close" s={16} /></button>
        </div>
        <div className="no-scrollbar space-y-4 overflow-y-auto px-6 pb-4 pt-2">{children}</div>
        {footer && <div className="flex gap-2.5 px-6 pb-7 pt-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- data list */
export interface Col<T> { h: string; r: (row: T) => React.ReactNode; right?: boolean; w?: string }
/** Table on desktop, stacked cards on mobile. First column is the card title. */
export function DataList<T>({ cols, rows, actions, empty = "Belum ada data.", onRow }: { cols: Col<T>[]; rows: T[]; actions?: (row: T) => React.ReactNode; empty?: string; onRow?: (row: T) => void }) {
  const { compact } = useDemo();
  if (rows.length === 0) return <Inner><div className="py-3 text-center text-[13px]" style={{ color: MUTED }}>{empty}</div></Inner>;
  if (!compact) {
    return (
      <div className="overflow-x-auto rounded-[20px] bg-white">
        <table className="w-full text-[13.5px]">
          <thead><tr className="text-left text-[12px]" style={{ color: MUTED }}>{cols.map((c) => <th key={c.h} className={`px-4 py-3 font-medium ${c.right ? "text-right" : ""}`}>{c.h}</th>)}{actions && <th className="px-4 py-3 text-right font-medium">Aksi</th>}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} onClick={onRow ? () => onRow(r) : undefined} className={`border-t border-[#EEF0F4] ${onRow ? "cursor-pointer hover:bg-[#F7F8FB]" : ""}`}>
                {cols.map((c, ci) => <td key={c.h} className={`px-4 py-3 ${c.right ? "whitespace-nowrap text-right" : ""} ${ci === 0 ? "min-w-[150px]" : ""}`} style={{ color: INK }}>{c.r(r)}</td>)}
                {actions && <td className="px-4 py-2.5"><div className="flex justify-end gap-2">{actions(r)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const [first, ...rest] = cols;
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i} onClick={onRow ? () => onRow(r) : undefined} className="rounded-[20px] p-4" style={{ background: TILE }}>
          <div className="text-[14px] font-medium" style={{ color: INK }}>{first.r(r)}</div>
          <div className="mt-2 space-y-1.5">
            {rest.map((c) => (
              <div key={c.h} className="flex items-center justify-between gap-3 text-[12.5px]"><span style={{ color: MUTED }}>{c.h}</span><span className="text-right font-medium" style={{ color: INK }}>{c.r(r)}</span></div>
            ))}
          </div>
          {actions && <div className="mt-3 flex flex-wrap gap-2">{actions(r)}</div>}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- tiny hooks */
export function useModal<T = true>() {
  const [m, setM] = useState<T | null>(null);
  return [m, (v: T | true | null) => setM(v as T | null)] as const;
}

export function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
