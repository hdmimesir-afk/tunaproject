"use client";

import { useEffect, useId, useRef, useState } from "react";
import { INK, MUTED } from "@/components/ui/tokens";
import { rp } from "@/lib/format";
import { kgOwner } from "@/lib/logic/laporanOwner";
import type { TitikHarian } from "@/lib/logic/laporanOwner";

/* Grafik batang harian buat laporan owner. Satu grafik satu data (nggak ada dua sumbu); kalau datanya lebih dari satu,
   pindahnya lewat tab. Batang tipis, ujung atas membulat, garis bantu tipis. Sentuh atau arahkan ke batang buat liat
   tanggal dan nilainya. Ada "Lihat tabel" buat yg mau baca angkanya. */

export type SeriGrafik = { id: string; label: string; satuan: "kg" | "rp"; data: TitikHarian[]; warna?: string };

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tglPendek = (t: string) => `${Number(t.slice(8, 10))} ${BULAN[Number(t.slice(5, 7)) - 1]}`;
const nilaiTeks = (n: number, s: SeriGrafik["satuan"]) => (s === "rp" ? rp(n) : kgOwner(n));
const ringkas = (n: number, s: SeriGrafik["satuan"]) => {
  const x = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  return s === "rp" ? `Rp${x}` : `${x} kg`;
};

/** Batang dengan ujung atas membulat (alasnya rata di garis dasar). */
function batang(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export function GrafikHarian({ seri, judul }: { seri: SeriGrafik[]; judul: string }) {
  const tersedia = seri.filter((s) => s.data.length > 0);
  const [aktifId, setAktifId] = useState(tersedia[0]?.id ?? "");
  const [sorot, setSorot] = useState<number | null>(null);
  const idTabel = useId();
  // Grafik digambar selebar kotaknya (bukan diperbesar), biar huruf tanggal tetap sama besar di HP dan laptop.
  const wadah = useRef<HTMLDivElement>(null);
  const [lebarAsli, setLebarAsli] = useState(640);
  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLebarAsli(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const s = tersedia.find((x) => x.id === aktifId) ?? tersedia[0];
  if (!s) return null;

  const data = s.data;
  const total = Math.round(data.reduce((a, d) => a + Math.round(d.nilai * 100), 0)) / 100;
  const maks = Math.max(...data.map((d) => d.nilai), 0);
  const W = lebarAsli, H = 190, kiri = 4, kanan = 4, atas = 14, bawah = 24;
  const lebarArea = W - kiri - kanan;
  const lebarSlot = lebarArea / data.length;
  const lebarBatang = Math.max(2, Math.min(14, lebarSlot - 2));
  const tinggiArea = H - atas - bawah;
  const tinggi = (n: number) => (maks > 0 ? Math.max(n > 0 ? 2 : 0, (n / maks) * tinggiArea) : 0);
  const warna = s.warna ?? "#0B6B4A";
  // Jumlah label tanggal ngikut lebar (kira kira tiap 70 px satu label).
  const labelTiap = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(W / 70))));
  const titik = sorot !== null ? data[sorot] : null;

  const pilihDariX = (clientX: number, kotak: DOMRect) => {
    const x = ((clientX - kotak.left) / kotak.width) * W - kiri;
    const i = Math.floor(x / lebarSlot);
    setSorot(i >= 0 && i < data.length ? i : null);
  };

  return (
    <div className="space-y-3" data-testid="grafik-harian">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[12.5px]" style={{ color: MUTED }}>{judul}</p>
          <p className="text-[22px] font-semibold tabular-nums tracking-tight" style={{ color: INK }}>{nilaiTeks(total, s.satuan)}</p>
          <p className="text-[12px]" style={{ color: MUTED }}>Total {s.label.toLowerCase()} {tglPendek(data[0].tanggal)} sampai {tglPendek(data[data.length - 1].tanggal)}</p>
        </div>
        {tersedia.length > 1 && (
          <div role="tablist" aria-label="Pilih data grafik" className="flex flex-wrap gap-1 rounded-full bg-white p-1">
            {tersedia.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === s.id} onClick={() => { setAktifId(x.id); setSorot(null); }}
                className="h-8 rounded-full px-3 text-[12.5px] font-medium" style={x.id === s.id ? { background: INK, color: "#fff" } : { color: MUTED }}>{x.label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="relative" ref={wadah}>
        {titik && sorot !== null && (
          <div className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-white px-2.5 py-1.5 text-[12px] shadow-md"
            style={{ left: `${((kiri + sorot * lebarSlot + lebarSlot / 2) / W) * 100}%`, color: INK }} role="status">
            <span style={{ color: MUTED }}>{tglPendek(titik.tanggal)}</span> · <b className="font-semibold tabular-nums">{nilaiTeks(titik.nilai, s.satuan)}</b>
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full touch-pan-y" role="img"
          aria-label={`${s.label} per hari, total ${nilaiTeks(total, s.satuan)}. Rincian ada di Lihat tabel.`}
          onPointerMove={(e) => pilihDariX(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => pilihDariX(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={(e) => { if (e.pointerType === "mouse") setSorot(null); }}>
          {[0.5, 1].map((f) => (
            <line key={f} x1={kiri} x2={W - kanan} y1={atas + tinggiArea * (1 - f)} y2={atas + tinggiArea * (1 - f)} stroke="#E2E4EA" strokeDasharray="3 4" />
          ))}
          {maks > 0 && <text x={W - kanan} y={atas - 2} textAnchor="end" fontSize="11" fill={MUTED}>{ringkas(maks, s.satuan)}</text>}
          <line x1={kiri} x2={W - kanan} y1={atas + tinggiArea} y2={atas + tinggiArea} stroke="#CBD0D9" />
          {data.map((d, i) => {
            const h = tinggi(d.nilai);
            const x = kiri + i * lebarSlot + (lebarSlot - lebarBatang) / 2;
            return h > 0 ? <path key={d.tanggal} d={batang(x, atas + tinggiArea - h, lebarBatang, h, 4)} fill={warna} opacity={sorot === null || sorot === i ? 1 : 0.35} /> : null;
          })}
          {data.map((d, i) => {
            const akhir = i === data.length - 1;
            if (!(i % labelTiap === 0 || akhir) || (!akhir && data.length - 1 - i < labelTiap / 2)) return null;
            // Label ujung kiri rata kiri, ujung kanan rata kanan, biar nggak kepotong.
            const x = i === 0 ? kiri : akhir ? W - kanan : kiri + i * lebarSlot + lebarSlot / 2;
            return <text key={`l${d.tanggal}`} x={x} y={H - 6} textAnchor={i === 0 ? "start" : akhir ? "end" : "middle"} fontSize="11" fill={MUTED}>{tglPendek(d.tanggal)}</text>;
          })}
        </svg>
        {maks === 0 && <p className="absolute inset-x-0 top-1/3 text-center text-[13px]" style={{ color: MUTED }}>Belum ada data di periode ini.</p>}
      </div>

      <details className="text-[12.5px]">
        <summary className="cursor-pointer select-none" style={{ color: MUTED }} aria-controls={idTabel}>Lihat tabel</summary>
        <div id={idTabel} className="mt-2 max-h-64 overflow-auto rounded-2xl bg-white">
          <table className="w-full tabular-nums">
            <thead className="sticky top-0 bg-white"><tr style={{ color: MUTED }}><th className="px-3 py-1.5 text-left font-medium">Tanggal</th><th className="px-3 py-1.5 text-right font-medium">{s.label}</th></tr></thead>
            <tbody>{[...data].reverse().map((d) => (
              <tr key={d.tanggal} className="border-t border-[#EEF0F4]"><td className="px-3 py-1.5" style={{ color: INK }}>{tglPendek(d.tanggal)}</td><td className="px-3 py-1.5 text-right" style={{ color: INK }}>{nilaiTeks(d.nilai, s.satuan)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
