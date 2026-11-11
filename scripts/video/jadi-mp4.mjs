// Ubah hasil rekaman (scripts/video/hasil/*.webm) jadi MP4 kecil yang bisa diputar di semua HP, plus gambar sampul.
// Hasilnya di public/tutorial/video/. Butuh ffmpeg di PATH.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const ASAL = join(DIR, "hasil");
const TUJUAN = join(DIR, "..", "..", "public", "tutorial", "video");
mkdirSync(TUJUAN, { recursive: true });

for (const f of readdirSync(ASAL).filter((x) => /^\d\d-.+\.webm$/.test(x)).sort()) {
  const nama = f.replace(/\.webm$/, "");
  const mp4 = join(TUJUAN, `${nama}.mp4`);
  // H.264 + AAC kosong tidak perlu (video tanpa suara). faststart supaya bisa diputar sebelum unduhan selesai.
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(ASAL, f), "-c:v", "libx264", "-preset", "slow", "-crf", "28",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4], { stdio: "inherit" });
  // Sampul: layar judul di awal video (nomor dan nama alurnya).
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "2", "-i", mp4, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "75", join(TUJUAN, `${nama}.webp`)], { stdio: "inherit" });
  console.log(`${nama}.mp4  ${(statSync(mp4).size / 1024 / 1024).toFixed(1)} MB`);
}
