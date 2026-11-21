// Bikin ikon aplikasi (PWA) dari logo KATALIS: node scripts/ikon-pwa.mjs
// Hasil di public/pwa/. Latar warna gelap aplikasi (#00171F), logo putih di tengah.
// Ikon "maskable" logonya lebih kecil (zona aman 80%) supaya nggak kepotong bentuk ikon Android.
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const LOGO = "public/brand/katalis-mark-white.png";
const LATAR = "#00171F";
mkdirSync("public/pwa", { recursive: true });

async function ikon(nama, ukuran, skalaLogo) {
  const sisi = Math.round(ukuran * skalaLogo);
  const logo = await sharp(LOGO).resize(sisi, sisi, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: ukuran, height: ukuran, channels: 4, background: LATAR } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(`public/pwa/${nama}`);
  console.log("ok", nama);
}

await ikon("icon-192.png", 192, 0.62);
await ikon("icon-512.png", 512, 0.62);
await ikon("icon-maskable-512.png", 512, 0.5);
await ikon("apple-touch-icon.png", 180, 0.62);
