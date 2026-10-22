"use client";

import { useActionState, useState } from "react";
import { Btn, Field, TextIn } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import { mulaiDaftarMfa, verifikasiMfa, type HasilForm } from "@/lib/actions/auth";
import { Pesan } from "./LoginForm";

/** Form kode 6 angka. */
function FormKode({ factorId }: { factorId: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(verifikasiMfa, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="factorId" value={factorId} />
      {state?.error && <Pesan>{state.error}</Pesan>}
      <Field label="Kode 6 angka dari aplikasi authenticator" error={state?.kolom?.code?.[0]}>
        <TextIn name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required autoFocus />
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Memeriksa..." : "Verifikasi"}</Btn>
    </form>
  );
}

/** Akun yang sudah punya authenticator: cukup masukkan kode. */
export function MfaVerifikasi({ factorId }: { factorId: string }) {
  return <FormKode factorId={factorId} />;
}

/** Akun yang belum punya authenticator: pindai QR, lalu masukkan kode pertama. */
export function MfaDaftar() {
  const [daftar, setDaftar] = useState<{ factorId: string; qr: string; rahasia: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const mulai = async () => {
    setMemuat(true);
    setError(null);
    const r = await mulaiDaftarMfa();
    setMemuat(false);
    if ("error" in r) setError(r.error);
    else setDaftar(r);
  };
  if (!daftar) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] leading-relaxed" style={{ color: MUTED }}>
          Peran Anda wajib memakai kode kedua. Siapkan aplikasi authenticator di HP (misalnya Google Authenticator atau Microsoft Authenticator).
        </p>
        {error && <Pesan>{error}</Pesan>}
        <Btn full onClick={mulai} disabled={memuat}>{memuat ? "Menyiapkan..." : "Mulai pendaftaran"}</Btn>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-relaxed" style={{ color: MUTED }}>Pindai kode QR ini dengan aplikasi authenticator, lalu masukkan 6 angka yang muncul.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- QR berupa data URL SVG dari Supabase */}
      <img src={daftar.qr} alt="Kode QR untuk aplikasi authenticator" className="mx-auto h-48 w-48 rounded-2xl bg-white p-2" />
      <p className="break-all text-center text-[12px]" style={{ color: MUTED }}>Tidak bisa memindai? Masukkan kode ini: <span className="font-mono">{daftar.rahasia}</span></p>
      <FormKode factorId={daftar.factorId} />
    </div>
  );
}
