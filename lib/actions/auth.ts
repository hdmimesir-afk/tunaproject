"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseConfigured } from "@/lib/env";
import { parseSesi, tujuanAman } from "@/lib/izin";
import { createClient } from "@/lib/supabase/server";

export type HasilForm = { error?: string; kolom?: Record<string, string[] | undefined>; pesan?: string; id?: string; tautan?: string; emailMasuk?: string; tokenTerpakai?: boolean } | undefined;

const Masuk = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Isi kata sandi"),
});

/** Masuk dengan email dan kata sandi. Tidak ada langkah kode kedua (MFA dihapus 27 Okt 2026). */
export async function masuk(_: HasilForm, fd: FormData): Promise<HasilForm> {
  if (!supabaseConfigured) return { error: "Database belum disambungkan." };
  const p = Masuk.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  // Pesan sama untuk email tidak terdaftar dan sandi salah, supaya tidak membocorkan akun yang ada.
  if (error) return { error: "Email atau kata sandi salah." };

  const sesi = parseSesi((await supabase.rpc("sesi_saya")).data);
  if (!sesi?.aktif || !sesi.roleId) {
    await supabase.auth.signOut();
    return { error: "Akun belum aktif. Hubungi pengelola akses." };
  }
  redirect(tujuanAman(fd.get("next")));
}

const SandiBaru = z.object({
  sandi: z.string().min(10, "Minimal 10 karakter").max(72, "Maksimal 72 karakter"),
  ulangi: z.string(),
}).refine((d) => d.sandi === d.ulangi, { message: "Kata sandi tidak sama", path: ["ulangi"] });

const TAUTAN_MATI = "Tautan sudah tidak berlaku. Minta tautan baru ke pengelola akses.";

/** Kata sandi baru dari tautan undangan atau atur ulang. Isian dicek dulu supaya token sekali pakai tidak terbuang.
   Token selalu didahulukan bila ada, supaya sandi tidak mengenai sesi lain yang kebetulan terbuka di peramban itu. */
export async function aturSandiBaru(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = SandiBaru.safeParse({ sandi: fd.get("sandi"), ulangi: fd.get("ulangi") });
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const supabase = await createClient();
  const tokenHash = fd.get("tokenHash");
  const jenis = fd.get("jenis");
  const pakaiToken = typeof tokenHash === "string" && tokenHash !== "";
  if (pakaiToken) {
    if (jenis !== "invite" && jenis !== "recovery") return { error: TAUTAN_MATI };
    const { error } = await supabase.auth.verifyOtp({ type: jenis, token_hash: tokenHash });
    if (error) return { error: TAUTAN_MATI };
  } else {
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims) return { error: TAUTAN_MATI };
  }
  const { error } = await supabase.auth.updateUser({ password: p.data.sandi });
  if (error) {
    // Token sudah terpakai dan sesinya sudah ada, jadi percobaan berikutnya memakai sesi itu.
    const tokenTerpakai = pakaiToken || undefined;
    if (error.code === "same_password") return { error: "Kata sandi baru harus berbeda dari yang lama.", tokenTerpakai };
    if (error.code === "weak_password") return { error: "Kata sandi terlalu lemah. Pakai gabungan huruf dan angka yang lebih panjang.", tokenTerpakai };
    return { error: "Kata sandi gagal disimpan. Coba lagi, atau minta tautan baru ke pengelola akses.", tokenTerpakai };
  }
  redirect("/dashboard");
}

export async function keluar() {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
