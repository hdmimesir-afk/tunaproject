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
  async redirects() {
    // Halaman utama adalah sistem ERP; penawaran pindah ke /penawaran.
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
};
export default nextConfig;
