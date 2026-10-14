import type { Metadata } from "next";
import "@fontsource/google-sans/400.css";
import "@fontsource/google-sans/500.css";
import "@fontsource/google-sans/600.css";
import "@fontsource/google-sans/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "KATALIS ERP | Penawaran dari Dar Dev",
  description: "Penawaran aplikasi untuk usaha perikanan PT Katalis Lintas Global: masalah yang kami lihat dan fitur yang menjawabnya.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
