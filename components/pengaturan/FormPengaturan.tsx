"use client";

import { useActionState } from "react";
import { Btn, Field, TextIn } from "@/components/ui";
import type { HasilForm } from "@/lib/actions/auth";
import { simpanPengaturan } from "@/lib/actions/pengaturan";
import { PENGATURAN, type KunciPengaturan } from "@/lib/master";

/** Isian satu angka pengaturan (target hasil, saldo awal, modal). Dipakai di Pengaturan dan di dashboard owner. */
export function FormPengaturan({ kunci, nilai, bolehAtur }: { kunci: KunciPengaturan; nilai: number | undefined; bolehAtur: boolean }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanPengaturan, undefined);
  const p = PENGATURAN[kunci];
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="kunci" value={kunci} />
      <div className={p.grup === "owner" ? "w-full max-w-[320px]" : "w-[220px]"}><Field label={p.label}><TextIn name="nilai" inputMode="decimal" defaultValue={nilai === null || nilai === undefined ? "" : String(nilai).replace(".", ",")} disabled={!bolehAtur} /></Field></div>
      {bolehAtur && <Btn type="submit" size="sm" disabled={pending}>{pending ? "..." : "Simpan"}</Btn>}
      <div className="w-full">
        {state?.error && <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>}
      </div>
    </form>
  );
}
