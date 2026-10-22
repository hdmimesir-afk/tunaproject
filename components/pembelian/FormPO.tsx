"use client";

import { useActionState, useEffect } from "react";
import { Btn, Field, TextIn } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { simpanPO } from "@/lib/actions/pembelian";
import { rp } from "@/lib/format";
import type { Opsi, POBaris } from "@/lib/types/pembelian";

const selectCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]";

/** Buat PO baru atau ubah PO yang masih draf / perlu revisi. */
export function FormPO({ po, pemasok, siklus, bolehSiklusBaru, hariIni, onSelesai }: {
  po: POBaris | null; pemasok: Opsi[]; siklus: Opsi[]; bolehSiklusBaru: boolean; hariIni: string; onSelesai: (id?: string) => void;
}) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanPO, undefined);
  useEffect(() => {
    if (state?.id && !state.error) onSelesai(state.id);
  }, [state, onSelesai]);

  return (
    <form action={action} className="space-y-4">
      {po && <input type="hidden" name="id" value={po.id} />}
      {state?.error && <div role="alert" className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>}
      <Field label="Pemasok" error={state?.kolom?.supplierId?.[0]}>
        <select name="supplierId" defaultValue={po?.supplier_id ?? ""} className={selectCls} required>
          <option value="" disabled>Pilih pemasok</option>
          {pemasok.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Berat (kg)" error={state?.kolom?.kg?.[0]}>
          <TextIn name="kg" type="number" inputMode="decimal" step="0.001" min="0" defaultValue={po?.kg ?? ""} required />
        </Field>
        <Field label="Harga per kg (Rp)" error={state?.kolom?.hargaPerKg?.[0]}>
          <TextIn name="hargaPerKg" type="number" inputMode="decimal" step="0.01" min="0" defaultValue={po?.harga_per_kg ?? ""} required />
        </Field>
      </div>
      {po && <p className="-mt-2 text-[12px]" style={{ color: MUTED }}>Total sekarang {rp(po.total)}. Dihitung ulang saat disimpan.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}>
          <TextIn name="tanggal" type="date" defaultValue={po?.tanggal ?? hariIni} required />
        </Field>
        <Field label="Siklus" error={state?.kolom?.siklusId?.[0]}>
          <select name="siklusId" defaultValue={po?.cycle_id ?? ""} className={selectCls}>
            <option value="">Tanpa siklus</option>
            {bolehSiklusBaru && <option value="baru">Siklus baru (otomatis)</option>}
            {siklus.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Catatan" error={state?.kolom?.catatan?.[0]} hint="Boleh kosong.">
        <TextIn name="catatan" defaultValue={po?.catatan ?? ""} maxLength={500} />
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : po ? "Simpan perubahan" : "Buat PO (draf)"}</Btn>
    </form>
  );
}
