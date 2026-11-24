"use client";

import { Paginasi, useHalaman } from "@/components/ui/Halaman";
import { INK, MUTED } from "@/components/ui/tokens";
import { tanggal } from "@/lib/format";
import { kgOwner } from "@/lib/logic/laporanOwner";

export type HariTerima = { tanggal: string; kg: number; lot: number; ekor: number; pemasok: string[]; kode: string[] };

/** Tabel riwayat penerimaan per tanggal: urut dari tanggal terlama, 20 per halaman, kebuka di halaman terakhir. */
export function RiwayatTanggal({ hari, hariIni }: { hari: HariTerima[]; hariIni: string }) {
  const h = useHalaman(hari);
  return (
    <>
      <div className="overflow-x-auto" data-testid="riwayat-penerimaan">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="text-left text-[12px]" style={{ color: MUTED }}>
              <th className="px-2 py-1.5 font-medium">Tanggal</th>
              <th className="px-2 py-1.5 text-right font-medium">Berat</th>
              <th className="px-2 py-1.5 text-right font-medium">Lot</th>
              <th className="px-2 py-1.5 text-right font-medium">Ekor</th>
              <th className="px-2 py-1.5 font-medium">Pemasok</th>
            </tr>
          </thead>
          <tbody>
            {h.tampil.map((x) => (
              <tr key={x.tanggal} className="border-t border-[#EEF0F4]" style={{ color: INK }}>
                <td className="whitespace-nowrap px-2 py-2 font-medium">{tanggal(x.tanggal)}{x.tanggal === hariIni ? <span className="ml-1.5 text-[11px]" style={{ color: "#B7791F" }}>hari ini</span> : null}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{kgOwner(x.kg)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{x.lot}</td>
                <td className="px-2 py-2 text-right tabular-nums">{x.ekor || "-"}</td>
                <td className="px-2 py-2" style={{ color: MUTED }}>{x.pemasok.join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginasi h={h} label="hari" />
    </>
  );
}
