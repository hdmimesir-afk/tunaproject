"use client";

import { useMemo, useState } from "react";
import { Btn, Card, Pill } from "@/components/ui";
import { KotakCari, useCari } from "@/components/ui/Cari";
import { INK, MUTED } from "@/components/ui/tokens";
import { tanggal } from "@/lib/format";
import { formatKg } from "@/lib/logic/neraca";
import { LABEL_QC } from "@/lib/logic/pembelian";
import type { LotBaris } from "@/lib/types/pembelian";

type Saring = "semua" | "menunggu" | "lulus" | "ditahan";
const KOLOM = "md:grid md:grid-cols-[minmax(0,1.25fr)_150px_190px_minmax(0,1fr)_104px] md:gap-5";
const AMBER = "#8A5A00";
const teksLot = (l: LotBaris) => `${l.kode} ${l.po_kode} ${l.suppliers?.nama ?? ""} ${l.grades?.kode ?? ""} ${LABEL_QC[l.qc]} ${l.qc_catatan} ${l.catatan} ${l.sebelum_disetujui ? "bongkar malam" : ""}`;

/** Daftar lot: filter mutu, pemakaian lot sebagai batang, kelas sebagai label satu baris. Tabel di desktop, kartu di HP. */
export function DaftarLot({ lots, bolehMutu, onCek }: { lots: LotBaris[]; bolehMutu: boolean; onCek: (l: LotBaris) => void }) {
  const [saring, setSaring] = useState<Saring>("semua");
  const jumlah = useMemo(() => ({
    semua: lots.length,
    menunggu: lots.filter((l) => l.qc === "menunggu").length,
    lulus: lots.filter((l) => l.qc === "lulus").length,
    ditahan: lots.filter((l) => l.qc === "ditahan").length,
  }), [lots]);
  const dasar = saring === "semua" ? lots : lots.filter((l) => l.qc === saring);
  const { q, setQ, hasil: tampil } = useCari(dasar, teksLot);
  const pilihan: { id: Saring; label: string }[] = [{ id: "semua", label: "Semua" }, { id: "menunggu", label: "Menunggu" }, { id: "lulus", label: "Lulus" }, { id: "ditahan", label: "Ditahan" }];

  return (
    <Card title="Lot ikan">
      <div className="space-y-3">
        <div role="group" aria-label="Filter mutu" className="flex w-full gap-0.5 rounded-full bg-white p-1 md:w-fit md:gap-1">
          {pilihan.map((p) => (
            <button key={p.id} type="button" aria-pressed={saring === p.id} onClick={() => setSaring(p.id)}
              className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 text-[12.5px] font-medium transition md:h-9 md:flex-none md:gap-1.5 md:px-4 md:text-[13px]"
              style={saring === p.id ? { background: INK, color: "#fff" } : { color: MUTED }}>
              {p.label}
              <span className="rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums" style={saring === p.id ? { background: "rgba(255,255,255,.18)" } : { background: "#EEF0F5" }}>{jumlah[p.id]}</span>
            </button>
          ))}
        </div>
        {lots.length > 0 && <KotakCari q={q} onUbah={setQ} placeholder="Cari lot, PO, pemasok, atau kelas" tampil={tampil.length} total={dasar.length} />}

        {tampil.length === 0 ? (
          <div className="rounded-[20px] bg-white px-4 py-8 text-center text-[13px]" style={{ color: MUTED }}>
            {lots.length === 0 ? "Belum ada ikan diterima." : q.trim() ? `Tidak ada lot yang cocok dengan “${q.trim()}”.` : "Tidak ada lot untuk filter ini."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[20px] bg-white">
            <div className={`hidden border-b border-[#EEF0F4] px-5 py-3 text-[12px] font-medium ${KOLOM}`} style={{ color: MUTED }} aria-hidden>
              <span>Lot</span><span>Diterima</span><span>Pemakaian</span><span>Mutu dan catatan</span><span className="text-right">Aksi</span>
            </div>
            <ul>
              {tampil.map((l) => <BarisLot key={l.id} l={l} aksi={bolehMutu && l.sisa_kg === l.kg ? <Btn size="sm" v={l.qc === "menunggu" ? "dark" : "light"} onClick={() => onCek(l)}>{l.qc === "menunggu" ? "Cek mutu" : "Ubah"}</Btn> : null} />)}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function BarisLot({ l, aksi }: { l: LotBaris; aksi: React.ReactNode }) {
  const dipakai = Math.max(0, l.kg - l.sisa_kg);
  const pct = l.kg > 0 ? Math.min(100, (dipakai / l.kg) * 100) : 0;
  const catatan = l.sebelum_disetujui ? "Bongkar malam" : l.qc_catatan || l.catatan || "";
  const menunggu = l.qc === "menunggu";
  return (
    <li className={`flex flex-col gap-3 border-t border-[#EEF0F4] px-4 py-4 first:border-t-0 md:items-center md:px-5 ${KOLOM} hover:bg-[#FAFBFD]`}
      style={menunggu ? { boxShadow: "inset 3px 0 0 #E2B24A" } : undefined}>
      {/* Lot + sumber */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] font-semibold" style={{ color: INK }}>{l.kode}</span>
          <span className="rounded-md bg-[#EEF0F5] px-1.5 py-0.5 text-[11px] leading-none" style={{ color: "#4A5560" }}>{l.po_kode}</span>
          {l.sebelum_disetujui && <span className="rounded-md bg-[#FBF0D5] px-1.5 py-0.5 text-[11px] leading-none" style={{ color: AMBER }}>Sebelum disetujui</span>}
        </div>
        <div className="mt-0.5 truncate text-[12.5px]" style={{ color: MUTED }}>{l.suppliers?.nama ?? "-"}</div>
      </div>

      {/* Diterima */}
      <div className="flex items-baseline justify-between gap-2 md:block">
        <span className="text-[12px] md:hidden" style={{ color: MUTED }}>Diterima</span>
        <div className="text-right md:text-left">
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: INK }}>{formatKg(l.kg)} kg</div>
          <div className="text-[12px]" style={{ color: MUTED }}>{tanggal(l.tanggal_terima)}</div>
        </div>
      </div>

      {/* Pemakaian */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[12px] tabular-nums" style={{ color: MUTED }}>
          <span><b className="font-semibold" style={{ color: INK }}>{formatKg(l.sisa_kg)} kg</b> tersisa</span>
          <span>{dipakai > 0 ? `${Math.round(pct)}% terpakai` : "belum dipakai"}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#E6E9EF]" role="img" aria-label={`${Math.round(pct)} persen terpakai`}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "#9AA2AB" : INK }} />
        </div>
      </div>

      {/* Mutu, kelas, catatan */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill t={LABEL_QC[l.qc]} />
          {l.grades?.kode && <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#D5D9E0] px-2.5 py-[3px] text-[11.5px] font-semibold leading-none" style={{ color: INK }}>{l.grades.kode}</span>}
        </div>
        {catatan && <p className="mt-1.5 text-[12.5px] leading-snug" style={{ color: MUTED }}>{catatan}</p>}
      </div>

      <div className="flex md:justify-end">{aksi}</div>
    </li>
  );
}
