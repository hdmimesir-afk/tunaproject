/* Rumus dan label penjualan. Murni tanpa I/O. Uang dihitung dalam sen, berat dalam gram bulat, sama seperti database. */

/** kg x harga per kg, dibulatkan ke sen (setengah ke atas) seperti round(kg * harga, 2) di database. */
export function jumlahBaris(kg: number, hargaPerKg: number) {
  const gram = Math.round(kg * 1000);
  const sen = Math.round((gram * Math.round(hargaPerKg * 100)) / 1000);
  return sen / 100;
}

export function totalBaris(baris: { kg: number; harga: number }[]) {
  const sen = baris.reduce((a, b) => a + Math.round(jumlahBaris(b.kg, b.harga) * 100), 0);
  return sen / 100;
}

/** Stok tersedia untuk pesanan baru = sisa unit dikurangi yang sudah dipesan pesanan draf lain. */
export function tersedia(sisaKg: number, dipesanLainKg: number) {
  return Math.max(0, (Math.round(sisaKg * 1000) - Math.round(dipesanLainKg * 1000)) / 1000);
}

export type StatusTagihan = "belum_jatuh_tempo" | "jatuh_tempo" | "terlambat" | "lunas" | "dibatalkan";

export const LABEL_TAGIHAN: Record<StatusTagihan, string> = {
  belum_jatuh_tempo: "Belum jatuh tempo",
  jatuh_tempo: "Jatuh tempo hari ini",
  terlambat: "Terlambat",
  lunas: "Lunas",
  dibatalkan: "Dibatalkan",
};

export const LABEL_PESANAN = { draf: "Draf", terkirim: "Terkirim", dibatalkan: "Dibatalkan" } as const;

const rpTeks = (n: number) => "Rp" + n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Teks pengingat sopan untuk pembeli; dikirim manual oleh pengguna lewat WhatsApp. */
export function pesanPengingat(p: { pembeli: string; kode: string; sisa: number; jatuhTempo: string; hariTelat: number }) {
  const tgl = new Date(`${p.jatuhTempo}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const telat = p.hariTelat > 0 ? ` (terlambat ${p.hariTelat} hari)` : "";
  return `Selamat siang ${p.pembeli}, kami dari PT Katalis Lintas Global. Mengingatkan invoice ${p.kode} sebesar ${rpTeks(p.sisa)} jatuh tempo ${tgl}${telat}. Mohon konfirmasi jadwal pembayarannya. Terima kasih.`;
}

/** Tautan WhatsApp dari nomor telepon Indonesia (08..., +62..., 62...). null bila nomor tidak terbaca. */
export function linkWa(kontak: string, teks: string): string | null {
  const digit = kontak.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const intl = digit.startsWith("0") ? `62${digit.slice(1)}` : digit;
  if (!/^62\d{8,13}$/.test(intl)) return null;
  return `https://wa.me/${intl}?text=${encodeURIComponent(teks)}`;
}
