"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { INK, MUTED } from "./tokens";

/* Pencarian untuk daftar: kata-kata yang diketik harus semuanya ada di baris (tanpa peduli huruf besar-kecil dan urutan).
   Penyaringan di peramban atas baris yang sudah dimuat, jadi tidak ada permintaan baru ke database. */

const normal = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Benar bila setiap kata di `q` muncul di `teks`. `q` kosong cocok dengan semuanya. */
export function cocok(teks: string, q: string): boolean {
  const kata = normal(q).split(/\s+/).filter(Boolean);
  if (kata.length === 0) return true;
  const t = normal(teks);
  return kata.every((k) => t.includes(k));
}

/** Saring `rows` dengan teks yang dibentuk `teks(row)`. */
export function useCari<T>(rows: T[], teks: (r: T) => string) {
  const [q, setQ] = useState("");
  const hasil = useMemo(() => (q.trim() ? rows.filter((r) => cocok(teks(r), q)) : rows), [rows, q, teks]);
  return { q, setQ, hasil, aktif: q.trim() !== "" };
}

export function KotakCari({ q, onUbah, placeholder = "Cari...", label = "Cari di daftar", tampil, total, className = "" }: {
  q: string; onUbah: (v: string) => void; placeholder?: string; label?: string; tampil?: number; total?: number; className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <label className="relative min-w-0 flex-1">
        <Search size={16} color={MUTED} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="search" value={q} onChange={(e) => onUbah(e.target.value)} placeholder={placeholder} aria-label={label} autoComplete="off" enterKeyHint="search"
          className="h-10 w-full rounded-full border border-[#E2E4EA] bg-white pl-10 pr-10 text-[13.5px] outline-none transition placeholder:text-[#8A949E] focus:border-[#00171F] focus:ring-3 focus:ring-[#00171F]/10 [&::-webkit-search-cancel-button]:hidden"
          style={{ color: INK }} />
        {q !== "" && (
          <button type="button" onClick={() => onUbah("")} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full hover:bg-[#F1F3F8]">
            <X size={14} color={MUTED} aria-hidden />
          </button>
        )}
      </label>
      {q.trim() !== "" && tampil !== undefined && total !== undefined && (
        <span className="shrink-0 whitespace-nowrap text-[12px] tabular-nums" style={{ color: MUTED }} role="status">{tampil} dari {total}</span>
      )}
    </div>
  );
}
