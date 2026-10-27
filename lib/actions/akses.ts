"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import type { Sesi } from "@/lib/izin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";
import type { HasilForm } from "./auth";

const PERAN = ["owner", "finance", "super_admin", "kepala_produksi", "petugas_lapangan"] as const;

const Undang = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(100),
  email: z.email("Email tidak valid"),
  roleId: z.enum(PERAN, "Pilih peran"),
});

/* Undangan tidak dikirim lewat email (SMTP bawaan Supabase hanya mengirim ke anggota tim proyek). Sistem membuat tautan
   aktivasi sekali pakai yang dikirim pengelola lewat WhatsApp; penerima membuat kata sandinya sendiri di /login/sandi-baru. */

async function asalSitus() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}
const tautanAktivasi = (asal: string, tokenHash: string, jenis: "invite" | "recovery") =>
  `${asal}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${jenis}`;

async function izinAkses(): Promise<{ error: string } | { sesi: Sesi }> {
  try {
    return { sesi: await requireIzin("akses.kelola") };
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
}

function klienAdmin(): ReturnType<typeof createAdminClient> | { error: string } {
  try {
    return createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Buat akun dan tautan aktivasi, lalu beri peran. Peran diberi lewat klien pengguna supaya aturan database
   (misalnya hanya Owner yang boleh memberi peran Owner) tetap berlaku. */
export async function undangPengguna(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const a = await izinAkses();
  if ("error" in a) return a;
  const p = Undang.safeParse({ nama: fd.get("nama"), email: fd.get("email"), roleId: fd.get("roleId") });
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  if (p.data.roleId === "owner" && !a.sesi.semuaIzin) return { error: "Hanya Owner yang boleh membuat akun Owner." };

  const admin = klienAdmin();
  if ("error" in admin) return admin;
  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email: p.data.email, options: { data: { nama: p.data.nama } } });
  if (error || !data.user) return { error: error?.message.toLowerCase().includes("already") ? "Email ini sudah terdaftar. Pakai tombol Tautan atur sandi di daftar pengguna." : "Akun gagal dibuat." };

  const supabase = await createClient();
  const { error: e2 } = await supabase.from("profiles")
    .update({ nama: p.data.nama, role_id: p.data.roleId, aktif: true })
    .eq("user_id", data.user.id);
  if (e2) return { error: `Akun dibuat, tapi peran belum tersimpan: ${pesanDb(e2)}` };
  refresh();
  return {
    pesan: `Akun ${p.data.email} dibuat. Kirim tautan ini ke ${p.data.nama}; tautan hanya bisa dipakai sekali dan berlaku 24 jam.`,
    tautan: tautanAktivasi(await asalSitus(), data.properties.hashed_token, "invite"),
  };
}

/** Tautan atur sandi baru untuk pengguna yang lupa sandi atau tautan undangannya kedaluwarsa.
   Akun Owner hanya bisa dibuatkan tautan oleh Owner, supaya pengelola akses tidak bisa mengambil alih akun Owner. */
export async function tautanAturSandi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const a = await izinAkses();
  if ("error" in a) return a;
  const id = z.uuid().safeParse(fd.get("userId"));
  if (!id.success) return { error: "Pengguna tidak valid." };
  const supabase = await createClient();
  const { data: profil } = await supabase.from("profiles").select("email, nama, role_id").eq("user_id", id.data).maybeSingle();
  if (!profil?.email) return { error: "Pengguna tidak ditemukan." };
  if (profil.role_id === "owner" && !a.sesi.semuaIzin) return { error: "Tautan untuk akun Owner hanya bisa dibuat oleh Owner." };

  const admin = klienAdmin();
  if ("error" in admin) return admin;
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: profil.email as string });
  if (error) return { error: "Tautan gagal dibuat. Coba lagi." };
  return {
    pesan: `Kirim tautan ini ke ${profil.nama || profil.email}; tautan hanya bisa dipakai sekali dan berlaku 24 jam.`,
    tautan: tautanAktivasi(await asalSitus(), data.properties.hashed_token, "recovery"),
  };
}

const UbahEmail = z.object({ userId: z.uuid(), email: z.email("Email tidak valid").transform((v) => v.trim().toLowerCase()) });

/** Ganti email masuk pengguna. Email ada di Supabase Auth dan di salinan profil; trigger profil menolak perubahan email dari klien pengguna,
   jadi dua-duanya diubah lewat klien admin setelah izin, aturan Owner, dan duplikat diperiksa. Kata sandi tidak berubah. */
export async function ubahEmail(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const a = await izinAkses();
  if ("error" in a) return a;
  const p = UbahEmail.safeParse({ userId: fd.get("userId"), email: fd.get("email") });
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors, error: "Email tidak valid." };

  const supabase = await createClient();
  const { data: profil } = await supabase.from("profiles").select("email, nama, role_id, aktif").eq("user_id", p.data.userId).maybeSingle();
  if (!profil) return { error: "Pengguna tidak ditemukan." };
  if (profil.role_id === "owner" && !a.sesi.semuaIzin) return { error: "Email akun Owner hanya bisa diubah oleh Owner." };
  if (String(profil.email).toLowerCase() === p.data.email) return { error: "Email baru sama dengan email sekarang." };
  const { data: dipakai } = await supabase.from("profiles").select("user_id").eq("email", p.data.email).neq("user_id", p.data.userId).maybeSingle();
  if (dipakai) return { error: "Email ini sudah dipakai pengguna lain." };

  const admin = klienAdmin();
  if ("error" in admin) return admin;
  const { error } = await admin.auth.admin.updateUserById(p.data.userId, { email: p.data.email, email_confirm: true });
  if (error) return { error: error.message.toLowerCase().includes("already") ? "Email ini sudah terdaftar di akun lain." : "Email gagal diubah. Coba lagi." };
  const { error: e2 } = await admin.from("profiles").update({ email: p.data.email, diubah_oleh: a.sesi.userId }).eq("user_id", p.data.userId);
  if (e2) return { error: `Email masuk sudah diganti, tapi salinan profil belum ikut berubah: ${pesanDb(e2)}` };
  refresh();
  return { pesan: `Email ${profil.nama || ""} diganti menjadi ${p.data.email}. Kata sandinya tidak berubah; ia masuk dengan email baru.`.replace("  ", " ") };
}

const Lepas = z.object({ userId: z.uuid() });

/** Lepas peran pengguna: peran dikosongkan dan akun dinonaktifkan (tanpa peran tidak ada izin apa pun). Tidak ada baris yang dihapus;
   akun bisa diberi peran dan diaktifkan lagi. Database menolak melepas peran akun sendiri dan akun Owner oleh bukan Owner. */
export async function lepasPeran(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const a = await izinAkses();
  if ("error" in a) return a;
  const p = Lepas.safeParse({ userId: fd.get("userId") });
  if (!p.success) return { error: "Pengguna tidak valid." };
  if (p.data.userId === a.sesi.userId) return { error: "Tidak bisa melepas peran akun sendiri." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles")
    .update({ role_id: null, aktif: false })
    .eq("user_id", p.data.userId)
    .select("user_id");
  if (error) return { error: pesanDb(error) };
  if (!data?.length) return { error: "Pengguna tidak ditemukan atau Anda tidak berhak mengubahnya." };
  refresh();
  return { pesan: "Peran dilepas dan akun dinonaktifkan." };
}

const Ubah = z.object({
  userId: z.uuid(),
  roleId: z.enum(PERAN),
  aktif: z.enum(["true", "false"]).transform((v) => v === "true"),
});

/** Ubah peran atau status pengguna. Database menolak mengubah akun sendiri dan akun Owner oleh bukan Owner. */
export async function ubahPengguna(_: HasilForm, fd: FormData): Promise<HasilForm> {
  try {
    await requireIzin("akses.kelola");
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
  const p = Ubah.safeParse({ userId: fd.get("userId"), roleId: fd.get("roleId"), aktif: fd.get("aktif") });
  if (!p.success) return { error: "Isian tidak valid." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles")
    .update({ role_id: p.data.roleId, aktif: p.data.aktif })
    .eq("user_id", p.data.userId)
    .select("user_id");
  if (error) return { error: pesanDb(error) };
  if (!data?.length) return { error: "Pengguna tidak ditemukan atau Anda tidak berhak mengubahnya." };
  refresh();
  return undefined;
}
