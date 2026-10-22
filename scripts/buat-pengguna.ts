/* Membuat pengguna dengan peran tertentu tanpa email undangan (email bawaan Supabase paket gratis dibatasi).
   Pakai: npm run buat-pengguna -- email@contoh.com "Nama" finance
   Peran: owner, finance, super_admin, kepala_produksi, petugas_lapangan.
   Butuh NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY di .env.local. Kata sandi sementara dicetak sekali.
   Owner dan Finance wajib mendaftarkan authenticator saat pertama masuk. */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PERAN = ["owner", "finance", "super_admin", "kepala_produksi", "petugas_lapangan"];

async function main() {
  const [email, nama, peran] = process.argv.slice(2);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!email || !nama || !PERAN.includes(peran ?? "")) throw new Error(`Pakai: npm run buat-pengguna -- email@contoh.com "Nama" <${PERAN.join("|")}>`);
  if (!url || !secret?.startsWith("sb_secret_")) throw new Error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY di .env.local");

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const sandi = randomBytes(12).toString("base64url");
  const { data, error } = await supabase.auth.admin.createUser({ email, password: sandi, email_confirm: true, user_metadata: { nama } });
  if (error || !data.user) throw new Error(`Gagal membuat akun: ${error?.message}`);

  const { error: e2 } = await supabase.from("profiles").update({ nama, role_id: peran, aktif: true }).eq("user_id", data.user.id);
  if (e2) throw new Error(`Akun dibuat, tapi peran gagal diberikan: ${e2.message}`);

  console.log(`Pengguna dibuat: ${email} (${peran})`);
  console.log(`Kata sandi sementara (tampil sekali): ${sandi}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
