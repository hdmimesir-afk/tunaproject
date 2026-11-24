/* Format tampilan berbahasa Indonesia. Tanggal memakai zona Asia/Jakarta supaya server dan browser menampilkan hal yang sama. */

/** Rupiah bulat; sen hanya ditampilkan bila ada. */
export function rp(n: number) {
  const bulat = Math.abs(n % 1) < 0.005;
  // Negatif ditulis -Rp239.334.100 (tanda di depan), bukan Rp-239.334.100.
  return (n < 0 ? "-" : "") + "Rp" + Math.abs(n).toLocaleString("id-ID", { minimumFractionDigits: bulat ? 0 : 2, maximumFractionDigits: 2 });
}

/** Tanggal pendek: "23 Okt 2026". Menerima 'YYYY-MM-DD' atau timestamp. */
export function tanggal(s: string | null | undefined) {
  if (!s) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

/** Tanggal dan jam: "23 Okt 2026, 14.05". */
export function waktu(s: string | null | undefined) {
  if (!s) return "-";
  return new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

/** Hari ini sebagai 'YYYY-MM-DD' di zona Jakarta, untuk nilai awal isian tanggal. */
export function hariIni() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

export function ukuranBerkas(byte: number) {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${angka(byte / 1024, 0)} KB`;
  return `${angka(byte / 1024 / 1024, 1)} MB`;
}

/* Angka gaya Indonesia (permintaan tim 24 Nov 2026): titik buat ribuan, koma buat desimal. Contoh 1.234.567,5. */

/** Angka biasa: titik ribuan, koma desimal, paling banyak `desimal` angka di belakang koma (nol di belakang nggak ditulis). */
export function angka(n: number, desimal = 3) {
  return n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: desimal });
}

/** Berat: "1.234,5 kg". */
export const kg = (n: number) => `${angka(n, 3)} kg`;

/** Persen satu desimal: "12,5%". */
export const persen = (n: number, desimal = 1) => `${angka(n, desimal)}%`;

/** Teks angka gaya Indonesia jadi teks angka standar: "1.234,5" -> "1234.5", "1.500" -> "1500" (titik ribuan),
    "235.5" -> "235.5" (satu titik yang nggak diikuti tepat 3 angka dibaca desimal). null kalau formatnya nggak kebaca. */
export function normalAngka(teks: string): string | null {
  const t = teks.trim().replace(/\s/g, "");
  if (t === "") return null;
  const ribuan = /^\d{1,3}(\.\d{3})+$/;
  if (t.includes(",")) {
    const bagian = t.split(",");
    if (bagian.length !== 2) return null;
    const [a, b] = bagian;
    if (a.includes(".") && !ribuan.test(a)) return null;
    return `${a.replace(/\./g, "")}.${b}`;
  }
  if (ribuan.test(t)) return t.replace(/\./g, "");
  return t;
}

/** Buat hitungan di layar sambil ngetik: kosong = 0, nggak kebaca = NaN. */
export function bacaAngka(teks: string) {
  const t = normalAngka(teks);
  return t === null ? (teks.trim() === "" ? 0 : NaN) : Number(t);
}

/** Baca angka gaya Indonesia, paling banyak `desimal` angka di belakang koma. null kalau bukan angka. Minus nggak diterima. */
export function keAngka(teks: string, desimal = 2): number | null {
  const t = normalAngka(teks);
  if (t === null || !new RegExp(`^\\d+(\\.\\d{1,${desimal}})?$`).test(t)) return null;
  return Number(t);
}
