import type { Metadata, Viewport } from "next";
import "@fontsource/google-sans/400.css";
import "@fontsource/google-sans/500.css";
import "@fontsource/google-sans/600.css";
import "@fontsource/google-sans/700.css";
import "./globals.css";

/* Satu aplikasi untuk tiga hal: sistem KATALIS ERP di "/", penawaran di "/penawaran",
   dan halaman owner di "/rancangan" serta "/PRD". Tiap halaman memberi judulnya sendiri. */
export const metadata: Metadata = {
  title: "KATALIS ERP",
  description: "Sistem pencatatan PT Katalis Lintas Global: pembelian ikan, produksi, stok, penjualan, dan keuangan.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#00171F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
