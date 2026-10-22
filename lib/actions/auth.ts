"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseConfigured } from "@/lib/env";
import { parseSesi, perluMfa, tujuanAman } from "@/lib/izin";
import { createClient } from "@/lib/supabase/server";

export type HasilForm = { error?: string; kolom?: Record<string, string[] | undefined>; pesan?: string; id?: string } | undefined;

const Masuk = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Isi kata sandi"),
});

/** Masuk dengan email dan kata sandi, lalu ke verifikasi MFA bila perannya mewajibkan. */
export async function masuk(_: HasilForm, fd: FormData): Promise<HasilForm> {
  if (!supabaseConfigured) return { error: "Database belum disambungkan." };
  const p = Masuk.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  // Pesan sama untuk email tidak terdaftar dan sandi salah, supaya tidak membocorkan akun yang ada.
  if (error) return { error: "Email atau kata sandi salah." };

  const sesi = parseSesi((await supabase.rpc("sesi_saya")).data);
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!sesi?.aktif || !sesi.roleId) {
    await supabase.auth.signOut();
    return { error: "Akun belum aktif. Hubungi pengelola akses." };
  }
  const butuhKodeKedua = perluMfa(sesi) || (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2");
  redirect(butuhKodeKedua ? "/login/mfa" : tujuanAman(fd.get("next")));
}

/** Mulai mendaftarkan aplikasi authenticator: kembalikan QR dan kode rahasia. */
export async function mulaiDaftarMfa(): Promise<{ factorId: string; qr: string; rahasia: string } | { error: string }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { error: "Sesi berakhir. Silakan masuk lagi." };

  // Faktor lama yang belum selesai didaftarkan dibersihkan dulu supaya pendaftaran baru tidak bentrok.
  const { data: daftar } = await supabase.auth.mfa.listFactors();
  for (const f of daftar?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `KATALIS ERP ${Date.now()}` });
  if (error || !data) return { error: "Gagal memulai pendaftaran kode. Coba lagi." };
  return { factorId: data.id, qr: data.totp.qr_code, rahasia: data.totp.secret };
}

const Kode = z.object({
  factorId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Kode terdiri dari 6 angka"),
});

/** Verifikasi kode 6 angka dari aplikasi authenticator (pendaftaran pertama atau masuk berikutnya). */
export async function verifikasiMfa(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = Kode.safeParse({ factorId: fd.get("factorId"), code: String(fd.get("code") ?? "").replace(/\s/g, "") });
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify(p.data);
  if (error) return { error: "Kode salah atau sudah kedaluwarsa." };
  redirect("/dashboard");
}

export async function keluar() {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
