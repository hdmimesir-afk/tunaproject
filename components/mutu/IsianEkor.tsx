"use client";

import { useRef } from "react";
import { bacaAngka } from "@/lib/format";
import { flushSync } from "react-dom";
import { Btn } from "@/components/ui";
import { PilihGrade } from "@/components/ui/PilihGrade";
import { INK, MUTED } from "@/components/ui/tokens";
import { ekorKeRpc, ringkasEkor, tagBerikut, type IsianEkor as Baris } from "@/lib/logic/ekor";
import { formatKg } from "@/lib/logic/neraca";
import type { EkorLot, Opsi } from "@/lib/types/pembelian";

/* Tabel penerimaan per ekor, ngikut desain Figma Mas Bisma: nomor tag, spesies, berat, grade tuna utuh (tap), tusukan gancu,
   dan berat dibayar. Enter di kolom berat nambah baris baru dengan nomor tag berikutnya. */

const sel = "h-10 w-full min-w-0 rounded-xl border bg-white px-2.5 text-[14px] outline-none focus:border-[#00171F]";
const kode = (label: string) => label.split(" · ")[0];
let urut = 0;
const kunci = () => `e${Date.now().toString(36)}${(urut++).toString(36)}`;

export const ekorBaru = (tag = ""): Baris => ({ k: kunci(), noTag: tag, spesies: "Tuna", kg: "", gradeId: "", gancu: 0 });
export const dariLot = (ekor: EkorLot[]): Baris[] =>
  ekor.map((e) => ({ k: e.id, id: e.id, noTag: e.no_tag, spesies: e.spesies, kg: String(e.kg).replace(".", ","), gradeId: e.grade_id ?? "", gancu: e.gancu }));

export function IsianEkor({ baris, onUbah, grade, bolehGrade, potonganKg, error }: {
  baris: Baris[]; onUbah: (b: Baris[]) => void; grade: Opsi[]; bolehGrade: boolean; potonganKg: number; error?: string;
}) {
  const wadah = useRef<HTMLDivElement>(null);
  const r = ringkasEkor(baris, potonganKg);
  const namaGrade = new Map(grade.map((g) => [g.id, kode(g.label)]));
  const ubah = (k: string, isi: Partial<Baris>) => onUbah(baris.map((b) => (b.k === k ? { ...b, ...isi } : b)));
  const tambah = () => {
    const akhir = [...baris].reverse().find((b) => b.noTag.trim() !== "");
    const baru = ekorBaru(akhir ? tagBerikut(akhir.noTag) : "");
    // Baris baru dirender saat itu juga, baru fokus pindah. Kalau nggak, ketikan berikutnya nyasar ke baris lama.
    flushSync(() => onUbah([...baris, { ...baru, spesies: baris[baris.length - 1]?.spesies || "Tuna" }]));
    wadah.current?.querySelector<HTMLInputElement>(`[data-kg="${baru.k}"]`)?.focus();
  };
  const hapus = (k: string) => onUbah(baris.length > 1 ? baris.filter((b) => b.k !== k) : [ekorBaru()]);

  const ringkasGrade = [...r.perGrade.entries()].filter(([id]) => id !== "")
    .map(([id, x]) => `${namaGrade.get(id) ?? "?"} ${x.jumlah}`).join(" · ");

  return (
    <div ref={wadah} className="space-y-2.5" data-testid="isian-ekor">
      <input type="hidden" name="ekor" value={JSON.stringify(r.salah.size === 0 ? ekorKeRpc(baris) : [])} />
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium" style={{ color: INK }}>Ekor</span>
        <span className="text-[12px]" style={{ color: MUTED }}>Potongan gancu {formatKg(potonganKg)} kg per tusukan</span>
      </div>
      <ol className="space-y-2">
        {baris.map((b, i) => {
          const salah = r.salah.get(b.k);
          const g = b.kg.trim() === "" ? null : bacaAngka(b.kg);
          const bayar = g !== null && Number.isFinite(g) ? Math.max(0, g - b.gancu * potonganKg) : null;
          return (
            <li key={b.k} className="rounded-2xl bg-white p-2.5" style={salah ? { boxShadow: "inset 0 0 0 1px #E4A7A2" } : undefined}>
              {/* Baris 1: nomor, tag, spesies, berat. Baris 2: grade, gancu, berat dibayar. Muat di form yang sempit maupun lebar. */}
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,6.5rem)] items-center gap-1.5 sm:gap-2">
                <span className="text-center text-[12px] tabular-nums" style={{ color: MUTED }}>{i + 1}</span>
                <input className={sel} style={{ borderColor: "#E2E4EA" }} aria-label={`No. tag ekor ${i + 1}`} placeholder="No. tag" maxLength={30}
                  value={b.noTag} onChange={(e) => ubah(b.k, { noTag: e.target.value })} />
                <input className={sel} style={{ borderColor: "#E2E4EA" }} aria-label={`Spesies ekor ${i + 1}`} placeholder="Spesies" maxLength={40}
                  value={b.spesies} onChange={(e) => ubah(b.k, { spesies: e.target.value })} />
                <input data-kg={b.k} className={`${sel} text-right tabular-nums`} style={{ borderColor: salah ? "#E4A7A2" : "#E2E4EA" }} aria-label={`Berat ekor ${i + 1} (kg)`}
                  placeholder="kg" inputMode="decimal" value={b.kg} onChange={(e) => ubah(b.k, { kg: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (i === baris.length - 1) tambah(); else wadah.current?.querySelector<HTMLInputElement>(`[data-kg="${baris[i + 1].k}"]`)?.focus(); } }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 pl-[1.875rem] sm:pl-8">
                <div>
                  {bolehGrade
                    ? <PilihGrade label={`Grade ekor ${i + 1}`} grade={grade} nilai={b.gradeId} kecil onPilih={(id) => ubah(b.k, { gradeId: b.gradeId === id ? "" : id })} />
                    : <span className="text-[12px]" style={{ color: MUTED }}>{b.gradeId ? namaGrade.get(b.gradeId) : "Grade diisi QC"}</span>}
                </div>
                <div className="flex items-center gap-1" role="group" aria-label={`Tusukan gancu ekor ${i + 1}`}>
                  <span className="mr-1 text-[12px]" style={{ color: MUTED }}>Gancu</span>
                  <button type="button" aria-label="Kurangi gancu" onClick={() => ubah(b.k, { gancu: Math.max(0, b.gancu - 1) })}
                    className="h-9 w-9 rounded-xl border border-[#E2E4EA] text-[16px]" style={{ color: INK }}>−</button>
                  <span className="w-6 text-center text-[14px] font-semibold tabular-nums" style={{ color: INK }}>{b.gancu}</span>
                  <button type="button" aria-label="Tambah gancu" onClick={() => ubah(b.k, { gancu: Math.min(50, b.gancu + 1) })}
                    className="h-9 w-9 rounded-xl border border-[#E2E4EA] text-[16px]" style={{ color: INK }}>+</button>
                </div>
                <span className="ml-auto text-right text-[13px] tabular-nums" style={{ color: INK }}>
                  <span className="text-[12px]" style={{ color: MUTED }}>Dibayar </span>{bayar !== null ? `${formatKg(Math.round(bayar * 1000) / 1000)} kg` : "-"}
                </span>
                <button type="button" onClick={() => hapus(b.k)} aria-label={`Hapus ekor ${i + 1}`}
                  className="h-9 rounded-xl px-2 text-[12.5px] hover:bg-[#F3F4F7]" style={{ color: MUTED }}>Hapus</button>
              </div>
              {salah && <p className="mt-1 pl-7 text-[11.5px]" style={{ color: "#A8322B" }}>{salah}</p>}
            </li>
          );
        })}
      </ol>
      <Btn type="button" size="sm" v="light" onClick={tambah}>+ Tambah ekor</Btn>
      <div className="rounded-2xl bg-white px-3.5 py-3" data-testid="ringkasan-ekor">
        <p className="text-[12.5px] tabular-nums" style={{ color: MUTED }}>
          {r.jumlah} ekor · {formatKg(r.gram / 1000)} kg{ringkasGrade ? ` · ${ringkasGrade}` : ""}{r.gramPotongan > 0 ? ` · potongan gancu ${formatKg(r.gramPotongan / 1000)} kg` : ""}
        </p>
        <p className="mt-0.5 text-[18px] font-semibold tabular-nums" style={{ color: INK }}>{formatKg(r.gramBayar / 1000)} kg dibayar</p>
        {bolehGrade && r.adaGrade && !r.semuaGrade && <p className="mt-1 text-[12px]" style={{ color: "#8A5A00" }}>Grade baru diisi sebagian. Isi semua, atau kosongin semua biar digrading belakangan.</p>}
      </div>
      {error && <p role="alert" className="text-[12.5px]" style={{ color: "#A8322B" }}>{error}</p>}
    </div>
  );
}
