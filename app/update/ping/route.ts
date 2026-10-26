/* DIAGNOSTIK SEMENTARA: mengukur jarak server Vercel ke database. Dihapus setelah wilayah server diperbaiki. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !kunci) return Response.json({ error: "belum disambungkan" }, { status: 503 });
  const ms: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t = performance.now();
    await fetch(`${url}/auth/v1/health`, { headers: { apikey: kunci }, cache: "no-store" });
    ms.push(Math.round(performance.now() - t));
  }
  return Response.json({ wilayahFungsi: process.env.VERCEL_REGION ?? "lokal", ms, median: [...ms].sort((a, b) => a - b)[3] }, { headers: { "cache-control": "no-store" } });
}
