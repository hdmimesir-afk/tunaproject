import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

/* Tautan undangan dan atur ulang sandi (dibuat di halaman Akses, dikirim lewat WhatsApp). Membuka tautan tidak memakai token,
   karena pratinjau tautan di aplikasi chat juga membukanya. Token baru dipakai saat kata sandi disimpan (aturSandiBaru). */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (tokenHash && (type === "invite" || type === "recovery")) {
    redirect(`/login/sandi-baru?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`);
  }
  redirect("/login?status=tautan");
}
