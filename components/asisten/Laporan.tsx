"use client";

import { useRef } from "react";
import { Btn, Icon } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { waktu } from "@/lib/format";
import { buatCsv } from "@/lib/logic/grid";
import type { Laporan } from "@/lib/asisten/alat";
import { TabelHasil } from "./Jawaban";

/* Laporan dari Asisten: satu kartu berbagian (judul, kalimat ringkas, tabel). Bisa dicetak atau disimpan sebagai PDF lewat dialog cetak
   peramban, dan diunduh sebagai CSV. Isinya sama persis dengan yang tampil; tidak ada angka yang dihitung ulang di sini. */

const namaBerkas = (judul: string) => judul.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function csvLaporan(l: Laporan) {
  const lebar = Math.max(1, ...l.bagian.map((b) => b.tabel?.kepala.length ?? 1));
  const kosong = (r: string[]) => [...r, ...Array(Math.max(0, lebar - r.length)).fill("")];
  const baris: string[][] = [[l.judul], [`Periode: ${l.periode}`], [`Dibuat: ${waktu(l.dibuat)}`], []].map(kosong);
  for (const b of l.bagian) {
    baris.push(kosong([b.judul]));
    for (const r of b.ringkas ?? []) baris.push(kosong([r]));
    if (b.tabel) { baris.push(kosong(b.tabel.kepala)); for (const r of b.tabel.baris) baris.push(kosong(r)); }
    baris.push(kosong([]));
  }
  const [kepala, ...isi] = baris;
  return buatCsv(kepala, isi);
}

export function KartuLaporan({ l, ringkas }: { l: Laporan; ringkas?: string[] }) {
  const kartu = useRef<HTMLDivElement>(null);

  const cetak = () => {
    const el = kartu.current;
    if (!el) return;
    // Hanya kartu ini yang dicetak: stylesheet cetak (globals.css) menyembunyikan sisa halaman bila body diberi kelas ini.
    el.classList.add("laporan-aktif");
    document.body.classList.add("cetak-laporan");
    const beres = () => { el.classList.remove("laporan-aktif"); document.body.classList.remove("cetak-laporan"); window.removeEventListener("afterprint", beres); };
    window.addEventListener("afterprint", beres);
    window.print();
  };

  const unduh = () => {
    const url = URL.createObjectURL(new Blob([csvLaporan(l)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${namaBerkas(l.judul)}-${new Date(l.dibuat).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={kartu} className="laporan-cetak -mx-1 overflow-hidden rounded-2xl border border-[#E2E4EA] bg-white" aria-label={l.judul}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5" style={{ background: INK, color: "#fff", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
        <div className="min-w-0">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.12em] opacity-70">KATALIS ERP · Laporan</div>
          <h3 className="mt-0.5 text-[18px] font-semibold leading-tight tracking-tight">{l.judul}</h3>
          <div className="mt-0.5 text-[12px] opacity-75">{l.periode} · dibuat {waktu(l.dibuat)}</div>
        </div>
        <div className="flex gap-1.5 print:hidden">
          <Btn size="sm" v="light" onClick={cetak}><Icon n="note" s={14} />Cetak atau PDF</Btn>
          <Btn size="sm" v="light" onClick={unduh}><Icon n="download" s={14} />Unduh CSV</Btn>
        </div>
      </div>
      <div className="space-y-4 px-4 py-4">
        {ringkas && ringkas.length > 0 && <ul className="list-disc space-y-1 pl-4 text-[13px]" style={{ color: INK }}>{ringkas.map((r, i) => <li key={i}>{r}</li>)}</ul>}
        {l.bagian.map((b) => (
          <section key={b.judul} className="break-inside-avoid">
            <h4 className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: INK }}><span className="h-3.5 w-1 rounded-full" style={{ background: "#176d9c" }} />{b.judul}</h4>
            {b.ringkas?.map((r, i) => <p key={i} className="mt-1 text-[12.5px]" style={{ color: MUTED }}>{r}</p>)}
            {b.tabel && <TabelHasil t={b.tabel} />}
          </section>
        ))}
        <p className="border-t border-[#EEF0F4] pt-2 text-[11px]" style={{ color: MUTED }}>Angka diambil langsung dari sistem pada saat laporan dibuat.</p>
      </div>
    </div>
  );
}
