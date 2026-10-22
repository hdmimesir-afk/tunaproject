import { createClient } from "@supabase/supabase-js";

export const EMAIL = "e2e-admin@katalis.test";
export const SANDI = "e2e-Sandi-Uji-12345";

/* Menyiapkan data uji di Supabase LOKAL: satu Super Admin (tanpa MFA) dan satu pemasok. Aman dijalankan berulang. */
export default async function setup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret?.startsWith("sb_secret_")) throw new Error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY (Supabase lokal) untuk tes e2e.");
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)) throw new Error("Tes e2e hanya boleh berjalan di Supabase lokal, bukan proyek cloud.");

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: daftar } = await supabase.auth.admin.listUsers({ perPage: 200 });
  let user = daftar?.users.find((u) => u.email === EMAIL);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email: EMAIL, password: SANDI, email_confirm: true, user_metadata: { nama: "Admin E2E" } });
    if (error || !data.user) throw new Error(`Gagal membuat pengguna uji: ${error?.message}`);
    user = data.user;
  }
  const { error: e2 } = await supabase.from("profiles").update({ nama: "Admin E2E", role_id: "super_admin", aktif: true }).eq("user_id", user.id);
  if (e2) throw new Error(`Gagal memberi peran: ${e2.message}`);

  const { data: ada } = await supabase.from("suppliers").select("id").eq("nama", "Pemasok E2E").maybeSingle();
  if (!ada) {
    const { error } = await supabase.from("suppliers").insert({ nama: "Pemasok E2E" });
    if (error) throw new Error(`Gagal membuat pemasok uji: ${error.message}`);
  }
}
