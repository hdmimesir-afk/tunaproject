"use client";

import { useActionState } from "react";
import { Pesan } from "@/components/auth/LoginForm";
import { Btn, Field, TextIn } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import { gantiSandi, type HasilForm } from "@/lib/actions/auth";

/** Form ganti kata sandi akun sendiri: sandi sekarang, sandi baru, ulangi. Abis berhasil isiannya kosong lagi. */
export function GantiSandiForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(gantiSandi, undefined);
  return (
    <form action={action} className="space-y-4" data-testid="form-ganti-sandi">
      <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>
        Buat akun <b>{email}</b>. Simpan baik baik ya, pengelola akses juga nggak bisa lihat kata sandinya.
      </p>
      {state?.error && <Pesan>{state.error}</Pesan>}
      {state?.pesan && (
        <p role="status" className="rounded-2xl px-3.5 py-2.5 text-[13px] font-medium" style={{ background: "#E3F1EA", color: "#0B6B4A" }}>{state.pesan}</p>
      )}
      {/* Kolom email tersembunyi biar pengelola kata sandi di HP nyimpen pasangan email dan sandi yg bener. */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <Field label="Kata sandi sekarang" error={state?.kolom?.lama?.[0]}>
        <TextIn name="lama" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Kata sandi baru" hint="Minimal 10 karakter." error={state?.kolom?.sandi?.[0]}>
        <TextIn name="sandi" type="password" autoComplete="new-password" minLength={10} maxLength={72} required />
      </Field>
      <Field label="Ulangi kata sandi baru" error={state?.kolom?.ulangi?.[0]}>
        <TextIn name="ulangi" type="password" autoComplete="new-password" minLength={10} maxLength={72} required />
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Ganti kata sandi"}</Btn>
    </form>
  );
}
