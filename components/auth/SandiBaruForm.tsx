"use client";

import { useActionState } from "react";
import { Btn, Field, TextIn } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import { aturSandiBaru, type HasilForm } from "@/lib/actions/auth";
import { Pesan } from "./LoginForm";

export function SandiBaruForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(aturSandiBaru, undefined);
  return (
    <form action={action} className="mt-5 space-y-4">
      <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>Buat kata sandi untuk <b>{email}</b>. Simpan baik-baik; pengelola akses tidak bisa melihatnya.</p>
      {state?.error && <Pesan>{state.error}</Pesan>}
      {/* Kolom email tersembunyi supaya pengelola kata sandi di HP menyimpan pasangan email dan sandi yang benar. */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <Field label="Kata sandi baru" hint="Minimal 10 karakter." error={state?.kolom?.sandi?.[0]}>
        <TextIn name="sandi" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Ulangi kata sandi" error={state?.kolom?.ulangi?.[0]}>
        <TextIn name="ulangi" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan dan masuk"}</Btn>
    </form>
  );
}
