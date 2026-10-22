import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: { root },
  // Pola data dan sesi sistem ERP mengikuti Cache Components (lihat AGENTS.md).
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    // Header keamanan (PRD, Keamanan data). SAMEORIGIN karena /demo/live menyematkan demo dalam iframe sendiri.
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
      ],
    }];
  },
  async redirects() {
    // Halaman utama adalah sistem ERP; penawaran pindah ke /penawaran.
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
};
export default nextConfig;
