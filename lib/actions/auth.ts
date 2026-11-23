"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseConfigured } from "@/lib/env";
import { parseSesi, tujuanAman } from "@/lib/izin";
import { createClient } from "@/lib/supabase/server";
import { requireSesi } from "@/lib/data/auth";
import { GantiSandi } from "@/lib/logic/sandi";

export type HasilForm = { error?: string; kolom?: Record<string, string[] | undefined>; pesan?: string; id?: string; tautan?: string; emailMasuk?: string; tokenTerpakai?: boolean } | undefined;

const Masuk = z.object({
  email: z.email("Emailnya nggak valid"),
  password: z.string().min(1, "Isi kata sandi"),
});

/** Masuk dengan email dan kata sandi. Tidak ada langkah kode kedua (MFA dihapus 27 Okt 2026). */
export async function masuk(_: HasilForm, fd: FormData): Promise<HasilForm> {
  if (!supabaseConfigured) return { error: "Database belum nyambung." };
  const p = Masuk.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  // Pesan sama untuk email tidak terdaftar dan sandi salah, supaya tidak membocorkan akun yang ada.
  if (error) return { error: "Email atau kata sandi salah." };

  const sesi = parseSesi((await supabase.rpc("sesi_saya")).data);
  if (!sesi?.aktif || !sesi.roleId) {
    await supabase.auth.signOut();
    return { error: "Akunnya belum aktif. Coba hubungi pengelola akses." };
  }
  redirect(tujuanAman(fd.get("next")));
}

const SandiBaru = z.object({
  sandi: z.string().min(10, "Minimal 10 karakter").max(72, "Maksimal 72 karakter"),
  ulangi: z.string(),
}).refine((d) => d.sandi === d.ulangi, { message: "Kata sandinya nggak sama", path: ["ulangi"] });

const TAUTAN_MATI = "Tautan sudah tidak berlaku. Minta tautan baru aja ke pengelola akses.";

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
    if (error.code === "same_password") return { error: "Kata sandi baru harus beda dari yang lama.", tokenTerpakai };
    if (error.code === "weak_password") return { error: "Kata sandinya terlalu gampang ditebak. Pakai gabungan huruf sama angka yang lebih panjang.", tokenTerpakai };
    return { error: "Kata sandinya gagal disimpan. Coba lagi, atau minta tautan baru ke pengelola akses.", tokenTerpakai };
  }
  redirect("/dashboard");
}

/** Ganti kata sandi akun sendiri dari menu Akun. Sandi lama dicek dulu (masuk ulang pakai email akun ini),
   baru sandi baru disimpan. Sesi yg lagi dipakai tetap jalan, jadi nggak perlu masuk lagi. */
export async function gantiSandi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  if (!supabaseConfigured) return { error: "Database belum nyambung." };
  const sesi = await requireSesi();
  const p = GantiSandi.safeParse({ lama: fd.get("lama"), sandi: fd.get("sandi"), ulangi: fd.get("ulangi") });
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = typeof claims?.claims?.email === "string" ? claims.claims.email : "";
  // Akun yg dicek harus akun yg lagi login (bukan email dari form).
  if (!email || claims?.claims?.sub !== sesi.userId) return { error: "Sesinya udah habis. Coba keluar terus masuk lagi." };

  const { error: salahLama } = await supabase.auth.signInWithPassword({ email, password: p.data.lama });
  if (salahLama) {
    if (salahLama.code === "over_request_rate_limit" || salahLama.status === 429) return { error: "Kebanyakan percobaan. Tunggu beberapa menit terus coba lagi." };
    return { kolom: { lama: ["Kata sandi yg sekarang salah"] } };
  }

  const { error } = await supabase.auth.updateUser({ password: p.data.sandi });
  if (error) {
    if (error.code === "same_password") return { kolom: { sandi: ["Kata sandi baru harus beda dari yg sekarang"] } };
    if (error.code === "weak_password") return { kolom: { sandi: ["Terlalu gampang ditebak. Pakai gabungan huruf sama angka yg lebih panjang."] } };
    return { error: "Kata sandinya gagal disimpan. Coba lagi bentar." };
  }
  return { pesan: "Kata sandi udah diganti. Lain kali masuk pakai kata sandi yg baru ya." };
}

export async function keluar() {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
