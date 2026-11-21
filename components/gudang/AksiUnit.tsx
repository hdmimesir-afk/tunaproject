"use client";

import { useActionState, useEffect } from "react";
import { Btn, Field, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { ambilStok, pindahRuangan } from "@/lib/actions/stok";
import { tampilKg } from "@/lib/logic/grid";
import type { Ruangan, UnitStok } from "@/lib/types/stok";

const kgTeks = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;

/** Barang keluar dari gudang (titipan diambil pelanggan). Tagihan jasa titipan dibuat otomatis. */
export function FormAmbil({ unit, onTutup }: { unit: UnitStok; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(ambilStok, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="unitId" value={unit.id} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[13px]" style={{ color: MUTED }}>{unit.pemilik_nama} · {unit.product_nama}{unit.grade_kode ? ` ${unit.grade_kode}` : ""} · sisa {kgTeks(unit.sisa_kg)}</p>
      <Field label="Berat keluar, hasil timbang ulang (kg)" error={state?.kolom?.kg?.[0]}><TextIn name="kg" inputMode="decimal" placeholder="0,000" required /></Field>
      <Field label="Keterangan" hint="Misalnya tujuan kirim."><TextIn name="alasan" maxLength={300} /></Field>
      {unit.buyer_id && <p className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Ini titipan pelanggan. Tagihan jasanya dibuat otomatis pas diambil.</p>}
      <KonfirmasiDua full label="Catat pengambilan" labelYa="Ya, ambil dari gudang" pending={pending} pesan="Stok bakal berkurang sesuai berat yang ditimbang. Lanjut?" />
    </form>
  );
}

/** Pindah unit ke ruangan lain (ABF atau CS). */
export function FormPindah({ unit, ruangan, onTutup }: { unit: UnitStok; ruangan: Ruangan[]; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(pindahRuangan, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  const sekarang = ruangan.find((r) => r.id === unit.room_id);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="unitId" value={unit.id} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[13px]" style={{ color: MUTED }}>{unit.pemilik_nama} · {unit.product_nama}{unit.grade_kode ? ` ${unit.grade_kode}` : ""} · {kgTeks(unit.sisa_kg)}. Sekarang di: {sekarang ? sekarang.nama : "belum ditempatkan"}.</p>
      <Field label="Pindah ke ruangan" error={state?.kolom?.ruanganId?.[0]}>
        <select name="ruanganId" className={pilihCls} defaultValue="" required>
          <option value="" disabled>Pilih ruangan</option>
          {ruangan.filter((r) => r.id !== unit.room_id).map((r) => <option key={r.id} value={r.id}>{r.nama} · muat {kgTeks(Math.max(0, r.kapasitas_kg - r.isi_kg))} lagi</option>)}
        </select>
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Memindah..." : "Pindahkan"}</Btn>
    </form>
  );
}
