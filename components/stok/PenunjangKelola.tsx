"use client";

import { useState } from "react";
import { INK, MUTED } from "@/components/ui/tokens";
import type { Barang, GerakBarang } from "@/lib/types/stok";
import { NAMA_KATEGORI, Penunjang } from "./Penunjang";

type Tab = "kerja" | "pekerja";

/** Halaman Barang Penunjang: dua tab, penunjang kerja (es, kemasan, label) dan penunjang pekerja. */
export function PenunjangKelola({ barang, riwayat, bolehTulis, tabAwal }: { barang: Barang[]; riwayat: GerakBarang[]; bolehTulis: boolean; tabAwal: Tab }) {
  const [tab, setTab] = useState<Tab>(tabAwal);
  const menipis = (k: Tab) => barang.filter((b) => b.kategori === k && b.aktif && b.status_stok !== "aman").length;
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Jenis barang penunjang" className="flex w-full gap-1 overflow-x-auto rounded-full bg-white p-1 md:w-fit">
        {(["kerja", "pekerja"] as const).map((id) => {
          const n = menipis(id);
          return (
            <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition md:h-9 md:flex-none md:px-5"
              style={tab === id ? { background: INK, color: "#fff" } : { color: MUTED }}>
              {NAMA_KATEGORI[id]}
              {n > 0 && <span className="rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold leading-none" style={tab === id ? { background: "rgba(255,255,255,.2)" } : { background: "#FBF0D5", color: "#8A5A00" }} title="Barang menipis atau habis">{n}</span>}
            </button>
          );
        })}
      </div>
      <Penunjang kategori={tab} barang={barang} riwayat={riwayat} bolehTulis={bolehTulis} />
    </div>
  );
}
