import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, publicEnv } from "@/lib/env";
import { isJalurErp } from "@/lib/modules";

/* Proxy menyegarkan sesi Supabase dan mengarahkan tamu dari halaman sistem ERP ke /login.
   Ini bukan pengaman data: setiap Server Action dan lapisan akses data tetap memeriksa sesi dan izin
   sendiri, dan RLS di database menolak akses yang tidak berhak (lihat PRD, bagian Keamanan data). */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured) return response;

  const env = publicEnv();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Jangan menaruh kode lain di antara createServerClient dan getClaims: getClaims menyegarkan token yang hampir habis.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && isJalurErp(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    const alih = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => alih.cookies.set(c));
    return alih;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
