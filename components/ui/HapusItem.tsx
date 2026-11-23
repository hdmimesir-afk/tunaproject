"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Field, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm } from "@/components/ui/PesanForm";
import type { HasilForm } from "@/lib/actions/auth";

/* Tombol hapus satu data yg kecatat dobel atau salah input (23 Nov 2026): dipakai di pesanan, uang masuk, titipan, lot.
   Wajib alasan, dua langkah, kecatat di log hapus. Datanya dihapus permanen, jadi warnanya merah dan ada keterangan jelas. */
export function HapusItem({ aksi, isian, tombol, keterangan, konfirmasi, onSelesai, testId }: {
  aksi: (s: HasilForm, fd: FormData) => Promise<HasilForm>;
  /** Isian tersembunyi, misalnya { pesananId: "..." }. */
  isian: Record<string, string>;
  tombol: string;
  keterangan: string;
  konfirmasi: string;
  onSelesai?: () => void;
  testId?: string;
}) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(aksi, undefined);
  const [buka, setBuka] = useState(false);
  useEffect(() => { if (state?.pesan && !state.error && onSelesai) onSelesai(); }, [state, onSelesai]);
  if (!buka) return <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={() => setBuka(true)}>{tombol}...</Btn></div>;
  return (
    <form action={action} className="space-y-2.5 rounded-2xl p-3.5" style={{ background: "#FBE5E3" }} data-testid={testId}>
      {Object.entries(isian).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[12.5px]" style={{ color: "#A8322B" }}>{keterangan} Nggak bisa dibalikin.</p>
      <Field label="Alasan hapus" hint="Misalnya kecatat dobel atau salah input." error={state?.kolom?.alasan?.[0]}>
        <TextIn name="alasan" maxLength={500} required />
      </Field>
      <KonfirmasiDua full v="danger" label={tombol} labelYa="Ya, hapus permanen" pending={pending} pesan={konfirmasi} />
      <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={() => setBuka(false)}>Nggak jadi</Btn></div>
    </form>
  );
}
