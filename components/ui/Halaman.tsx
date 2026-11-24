"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useState } from "react";
import { INK, MUTED } from "./tokens";

/* Paginasi buat semua daftar (permintaan tim 24 Nov 2026): urut dari yang terlama, 20 per halaman, dan pas dibuka langsung
   ke halaman terakhir biar data yang baru diinput keliatan. Datanya udah dimuat semua, jadi pindah halaman nggak nanya server. */

export const PER_HALAMAN = 20;

/** Potong `rows` per halaman. `hal` null artinya halaman terakhir. */
export function useHalaman<T>(rows: T[], ukuran = PER_HALAMAN) {
  const [hal, setHal] = useState<number | null>(null);
  const jumlah = Math.max(1, Math.ceil(rows.length / ukuran));
  const aktif = hal === null ? jumlah : Math.min(Math.max(1, hal), jumlah);
  const dari = (aktif - 1) * ukuran;
  return {
    tampil: rows.slice(dari, dari + ukuran),
    hal: aktif,
    jumlah,
    total: rows.length,
    dari: rows.length === 0 ? 0 : dari + 1,
    sampai: Math.min(dari + ukuran, rows.length),
    ke: (n: number) => setHal(n >= jumlah ? null : Math.max(1, n)),
  };
}

const tombol = "flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-[13px] font-medium transition disabled:opacity-35 enabled:hover:bg-[#EEF0F5]";

/** Kontrol pindah halaman. Nggak tampil kalau datanya cuma satu halaman. */
export function Paginasi({ h, label = "data" }: { h: Pick<ReturnType<typeof useHalaman>, "hal" | "jumlah" | "total" | "dari" | "sampai" | "ke">; label?: string }) {
  if (h.jumlah <= 1) return null;
  return (
    <nav aria-label="Pindah halaman" className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1" data-testid="paginasi">
      <span className="text-[12px] tabular-nums" style={{ color: MUTED }}>{h.dari}–{h.sampai} dari {h.total} {label} · halaman {h.hal} dari {h.jumlah}</span>
      <span className="flex items-center gap-0.5" style={{ color: INK }}>
        <button type="button" className={tombol} onClick={() => h.ke(1)} disabled={h.hal === 1} aria-label="Halaman pertama (paling lama)"><ChevronsLeft size={16} aria-hidden /></button>
        <button type="button" className={tombol} onClick={() => h.ke(h.hal - 1)} disabled={h.hal === 1} aria-label="Halaman sebelumnya"><ChevronLeft size={16} aria-hidden /></button>
        <span className="px-1.5 text-[13px] tabular-nums" aria-current="page">{h.hal}</span>
        <button type="button" className={tombol} onClick={() => h.ke(h.hal + 1)} disabled={h.hal === h.jumlah} aria-label="Halaman berikutnya"><ChevronRight size={16} aria-hidden /></button>
        <button type="button" className={tombol} onClick={() => h.ke(h.jumlah)} disabled={h.hal === h.jumlah} aria-label="Halaman terakhir (paling baru)"><ChevronsRight size={16} aria-hidden /></button>
      </span>
    </nav>
  );
}
