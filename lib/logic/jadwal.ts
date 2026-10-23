/* Jadwal mesin tunggal (produksi mitra dan ABF). Murni; aturan yang sama dijaga database lewat fungsi cari_bentrok / slot_kosong. */

export type Rentang = { id?: string; mulai: Date; selesai: Date };

/** Dua rentang bentrok bila saling tumpang tindih; yang hanya menempel (selesai = mulai) tidak bentrok. */
export const bentrok = (a: Rentang, b: Rentang) => a.mulai < b.selesai && a.selesai > b.mulai;

export function cariBentrok<T extends Rentang>(jadwal: T[], baru: Rentang): T[] {
  return jadwal.filter((j) => j.id !== baru.id && bentrok(j, baru)).sort((x, y) => x.mulai.getTime() - y.mulai.getTime());
}

/** Jam kosong pertama (sepanjang durasi) pada atau setelah `dari`: lompat ke akhir jadwal yang bentrok sampai kosong. */
export function slotKosong(jadwal: Rentang[], durasiMenit: number, dari: Date, kecuali?: string): Date {
  if (durasiMenit <= 0) throw new Error("Durasi harus lebih dari nol.");
  let t = dari.getTime();
  for (let i = 0; i < 1000; i++) {
    const akhir = t + durasiMenit * 60_000;
    const kena = jadwal.filter((j) => j.id !== kecuali && j.mulai.getTime() < akhir && j.selesai.getTime() > t);
    if (kena.length === 0) return new Date(t);
    t = Math.max(...kena.map((j) => j.selesai.getTime()));
  }
  throw new Error("Tidak menemukan jam kosong.");
}
