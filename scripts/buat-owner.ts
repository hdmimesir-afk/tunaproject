/* Membuat akun Owner pertama. Pendaftaran mandiri ditutup, jadi akun pertama dibuat dari sini;
   akun berikutnya diundang dari halaman Akses.
   Pakai: npm run buat-owner -- owner@contoh.com "Nama Owner"
   Butuh NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY di .env.local. Kata sandi sementara dicetak sekali;
   ganti setelah masuk, lalu daftarkan aplikasi authenticator (Owner wajib MFA). */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, nama] = process.argv.slice(2);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!email || !nama) throw new Error('Pakai: npm run buat-owner -- email@contoh.com "Nama Owner"');
  if (!url || !secret?.startsWith("sb_secret_")) throw new Error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY di .env.local");

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const sandi = randomBytes(12).toString("base64url");
  const { data, error } = await supabase.auth.admin.createUser({ email, password: sandi, email_confirm: true, user_metadata: { nama } });
  if (error || !data.user) throw new Error(`Gagal membuat akun: ${error?.message}`);

  const { error: e2 } = await supabase.from("profiles").update({ nama, role_id: "owner", aktif: true }).eq("user_id", data.user.id);
  if (e2) throw new Error(`Akun dibuat, tapi peran Owner gagal diberikan: ${e2.message}`);

  console.log(`Owner dibuat: ${email}`);
  console.log(`Kata sandi sementara (tampil sekali): ${sandi}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
