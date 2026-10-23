import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Tautan undangan dan atur ulang sandi (dibuat di halaman Akses, dikirim lewat WhatsApp): token diverifikasi di server,
   sesi dibuat lewat cookie, lalu pengguna diarahkan membuat kata sandi. Hanya dua jenis tautan yang diterima. */
const JENIS: EmailOtpType[] = ["invite", "recovery"];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && JENIS.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect("/login/sandi-baru");
  }
  redirect("/login?status=tautan");
}
