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
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(0)} KB`;
  return `${(byte / 1024 / 1024).toFixed(1)} MB`;
}
