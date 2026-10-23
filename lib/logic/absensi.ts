/* Hitungan absensi yang murni (tanpa I/O). Keputusan lokasi dan waktu tetap di database; ini hanya untuk tampilan dan isian. */

/** "-0,9492" atau "-0.9492" menjadi angka; null bila bukan koordinat dalam rentangnya. */
export function bacaKoordinat(teks: string, batas: 90 | 180): number | null {
  const t = teks.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d{1,3}(\.\d{1,8})?$/.test(t)) return null;
  const n = Number(t);
  return Math.abs(n) <= batas ? n : null;
}

/** Jarak dua titik dalam meter (haversine), sama rumusnya dengan database. Hanya untuk petunjuk di layar. */
export function jarakMeter(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "48 m" atau "1,5 km". */
export function tampilJarak(m: number): string {
  if (m >= 1000) return `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
  return `${Math.round(m)} m`;
}

/** Jam "08:00:00" atau "08:00" menjadi "08.00". */
export const tampilJam = (j: string) => j.slice(0, 5).replace(":", ".");

/** Absen masuk dan pulang yang berhasil pada satu hari (tanggal WIB 'YYYY-MM-DD'). */
export function absenHari<T extends { tanggal: string; jenis: string; hasil: string }>(daftar: T[], hari: string) {
  const berhasil = daftar.filter((a) => a.tanggal === hari && a.hasil === "berhasil");
  return { masuk: berhasil.find((a) => a.jenis === "masuk") ?? null, pulang: berhasil.find((a) => a.jenis === "pulang") ?? null };
}

/** Bulan 'YYYY-MM' yang sah, atau bulan bawaan. */
export const bulanSah = (s: unknown, bawaan: string) => (typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : bawaan);

/** Banyak hari kalender, termasuk hari mulai dan selesai. */
export function jumlahHari(dari: string, sampai: string): number {
  const a = Date.parse(`${dari}T00:00:00Z`);
  const b = Date.parse(`${sampai}T00:00:00Z`);
  return Number.isNaN(a) || Number.isNaN(b) || b < a ? 0 : Math.round((b - a) / 86400000) + 1;
}

/** Foto kamera diperkecil sebelum diunggah: sisi terpanjang paling besar `maks` piksel, rasio tetap. */
export function ukuranFoto(lebar: number, tinggi: number, maks = 640): { lebar: number; tinggi: number } {
  const skala = Math.min(1, maks / Math.max(lebar, tinggi, 1));
  return { lebar: Math.max(1, Math.round(lebar * skala)), tinggi: Math.max(1, Math.round(tinggi * skala)) };
}
