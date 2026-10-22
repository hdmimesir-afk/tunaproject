import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ADMIN, PETUGAS, type Akun } from "./akun";

async function siapkanPengguna(supabase: SupabaseClient, akun: Akun, nama: string, peran: string) {
  const { data: daftar } = await supabase.auth.admin.listUsers({ perPage: 200 });
  let user = daftar?.users.find((u) => u.email === akun.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email: akun.email, password: akun.sandi, email_confirm: true, user_metadata: { nama } });
    if (error || !data.user) throw new Error(`Gagal membuat pengguna uji: ${error?.message}`);
    user = data.user;
  }
  const { error } = await supabase.from("profiles").update({ nama, role_id: peran, aktif: true }).eq("user_id", user.id);
  if (error) throw new Error(`Gagal memberi peran: ${error.message}`);
}

/* Menyiapkan data uji di Supabase LOKAL: Super Admin dan Petugas Lapangan (tanpa MFA), satu pemasok,
   dan tiga lot ikan 2.000 kg yang sudah lulus mutu untuk uji produksi. Aman dijalankan berulang. */
export default async function setup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret?.startsWith("sb_secret_")) throw new Error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY (Supabase lokal) untuk tes e2e.");
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)) throw new Error("Tes e2e hanya boleh berjalan di Supabase lokal, bukan proyek cloud.");

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  await siapkanPengguna(supabase, ADMIN, "Admin E2E", "super_admin");
  await siapkanPengguna(supabase, PETUGAS, "Petugas E2E", "petugas_lapangan");

  // Pastikan akun uji benar-benar bisa masuk lewat kunci publik, supaya kegagalan login ketahuan sebabnya.
  const publik = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: eMasuk } = await publik.auth.signInWithPassword({ email: ADMIN.email, password: ADMIN.sandi });
  if (eMasuk) throw new Error(`Akun uji tidak bisa masuk (${eMasuk.status ?? "?"}): ${eMasuk.message}`);

  let { data: pemasok } = await supabase.from("suppliers").select("id").eq("nama", "Pemasok E2E").maybeSingle();
  if (!pemasok) {
    const r = await supabase.from("suppliers").insert({ nama: "Pemasok E2E" }).select("id").single();
    if (r.error) throw new Error(`Gagal membuat pemasok uji: ${r.error.message}`);
    pemasok = r.data;
  }

  // Lot baru yang lulus mutu, dibuat langsung (jalur terima ikan dan cek mutu sudah diuji di pgTAP).
  const po = await supabase.from("purchase_orders").insert({ supplier_id: pemasok.id, kg: 6000, harga_per_kg: 45000, catatan: "e2e-produksi" }).select("id, kode").single();
  if (po.error) throw new Error(`Gagal membuat PO uji: ${po.error.message}`);
  const grade = await supabase.from("grades").select("id").eq("kode", "A-SO").single();
  if (grade.error) throw new Error(`Grade A-SO tidak ada: ${grade.error.message}`);
  // Tiga lot: tiap tes produksi memakai satu lot penuh.
  for (let i = 0; i < 3; i++) {
    const lot = await supabase.from("lots").insert({ po_id: po.data.id, po_kode: po.data.kode, supplier_id: pemasok.id, kg: 2000, sisa_kg: 2000, qc: "lulus", grade_id: grade.data.id });
    if (lot.error) throw new Error(`Gagal membuat lot uji: ${lot.error.message}`);
  }
}
