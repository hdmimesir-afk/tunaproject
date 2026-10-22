"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
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

/** Undang pengguna lewat email, lalu beri peran. Peran diberi lewat klien pengguna supaya aturan database
   (misalnya hanya Owner yang boleh memberi peran Owner) tetap berlaku. */
export async function undangPengguna(_: HasilForm, fd: FormData): Promise<HasilForm> {
  try {
    await requireIzin("akses.kelola");
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
  const p = Undang.safeParse({ nama: fd.get("nama"), email: fd.get("email"), roleId: fd.get("roleId") });
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data, error } = await admin.auth.admin.inviteUserByEmail(p.data.email, { data: { nama: p.data.nama } });
  if (error || !data.user) return { error: error?.message.includes("already") ? "Email ini sudah terdaftar." : "Undangan gagal dikirim." };

  const supabase = await createClient();
  const { error: e2 } = await supabase.from("profiles")
    .update({ nama: p.data.nama, role_id: p.data.roleId, aktif: true })
    .eq("user_id", data.user.id);
  if (e2) return { error: `Undangan terkirim, tapi peran belum tersimpan: ${pesanDb(e2)}` };
  refresh();
  return undefined;
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
