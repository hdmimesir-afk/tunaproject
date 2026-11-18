"use client";

import { INK, MUTED } from "./tokens";

/** Grade dipilih dengan sekali tap (tombol), bukan dropdown. Cocok buat tablet di lantai produksi. */
export function PilihGrade({ grade, nilai, onPilih, label, nonaktif, disabled, kecil }: {
  grade: { id: string; label: string }[];
  nilai: string;
  onPilih: (id: string) => void;
  label: string;
  nonaktif?: Set<string>;
  disabled?: boolean;
  kecil?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {grade.map((g) => {
        const aktif = g.id === nilai;
        const mati = disabled || (!aktif && nonaktif?.has(g.id));
        return (
          <button key={g.id} type="button" role="radio" aria-checked={aktif} aria-label={g.label} title={g.label} disabled={mati} onClick={() => onPilih(g.id)}
            className={`${kecil ? "h-9 min-w-[3.25rem] px-2 text-[12.5px]" : "h-10 min-w-[3.75rem] px-2.5 text-[13px]"} rounded-xl border font-medium tabular-nums transition-colors disabled:opacity-35`}
            style={aktif ? { background: INK, borderColor: INK, color: "#fff" } : { background: "#fff", borderColor: "#E2E4EA", color: mati ? MUTED : INK }}>
            {/* Label lengkap "A-SO · A dengan kulit" kepanjangan buat tombol, cukup kodenya. */}
            {g.label.split(" · ")[0]}
          </button>
        );
      })}
    </div>
  );
}
