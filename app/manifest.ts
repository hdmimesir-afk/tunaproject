import type { MetadataRoute } from "next";

/* Biar KATALIS ERP bisa dipasang di HP (dan laptop) kayak aplikasi: ikon di layar utama, buka tanpa bilah browser.
   Ikonnya dibikin dari logo lewat scripts/ikon-pwa.mjs. id sengaja tetap ("/") supaya aplikasi yang udah terpasang
   nggak dianggap aplikasi lain kalau halaman awalnya nanti diganti. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KATALIS ERP",
    short_name: "KATALIS",
    description: "Sistem pencatatan PT Katalis Lintas Global: penerimaan ikan, produksi, stok, penjualan, dan keuangan.",
    lang: "id",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#00171F",
    theme_color: "#00171F",
    categories: ["business", "productivity"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Terima ikan", url: "/mutu", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Produksi", url: "/produksi/jual", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Stok", url: "/produksi", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
