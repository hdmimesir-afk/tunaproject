import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "KATALIS ERP · Demo Aplikasi",
  description: "Demo interaktif aplikasi ponsel KATALIS ERP dari Dar Dev. Semua angka adalah data contoh kecuali yang berlabel Siklus 1.",
  manifest: "/demo.webmanifest",
  appleWebApp: { capable: true, title: "Katalis", statusBarStyle: "black-translucent" },
  icons: { icon: "/demo-icon-192.png", apple: "/demo-icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0E5C46",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
