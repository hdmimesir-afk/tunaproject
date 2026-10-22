"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Btn, Field, TextIn } from "@/components/ui";
import { masuk, type HasilForm } from "@/lib/actions/auth";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<HasilForm, FormData>(masuk, undefined);
  const nonaktif = params.get("status") === "nonaktif";
  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="next" value={params.get("next") ?? ""} />
      {nonaktif && !state?.error && <Pesan>Akun belum aktif. Hubungi pengelola akses.</Pesan>}
      {state?.error && <Pesan>{state.error}</Pesan>}
      <Field label="Email" error={state?.kolom?.email?.[0]}>
        <TextIn name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Kata sandi" error={state?.kolom?.password?.[0]}>
        <TextIn name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Memeriksa..." : "Masuk"}</Btn>
    </form>
  );
}

export function Pesan({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{children}</div>;
}
