/* Rincian berat satu lot ikan utuh buat halaman Stok. Semua dalam gram bulat biar nggak meleset.
   - Tersedia: lots.sisa_kg (belum dialokasikan ke produksi mana pun).
   - Sedang diproduksi: alokasi ke produksi yang belum disetujui Owner (berjalan, selesai, dicek QC).
   - Selesai diproduksi: alokasi ke produksi yang udah disetujui Owner (status diperiksa).
   Ini berat IKAN UTUH yang dipakai, bukan berat loin hasilnya. Normalnya tersedia + sedang + selesai = berat awal;
   kalau nggak pas (data lama atau koreksi di luar jalur), lotnya ditandai, angkanya nggak ditutupin. */

export type AlokasiLot = { kg: number; status: string };

export type StatusLot = "belum" | "sebagian" | "diolah" | "habis";

export type RincianLot = {
  awalKg: number;
  tersediaKg: number;
  sedangKg: number;
  selesaiKg: number;
  /** Selisih berat awal dengan jumlah tiga angka di atas (0 kalau cocok). */
  selisihKg: number;
  status: StatusLot;
};

export const DISETUJUI = "diperiksa";

const g = (n: number) => Math.round(Number(n ?? 0) * 1000);

export function rincianLot(awalKg: number, sisaKg: number, alokasi: AlokasiLot[]): RincianLot {
  const awal = g(awalKg);
  const tersedia = g(sisaKg);
  const sedang = alokasi.filter((a) => a.status !== DISETUJUI).reduce((t, a) => t + g(a.kg), 0);
  const selesai = alokasi.filter((a) => a.status === DISETUJUI).reduce((t, a) => t + g(a.kg), 0);
  const status: StatusLot =
    tersedia > 0 && sedang === 0 && selesai === 0 ? "belum"
      : tersedia > 0 ? "sebagian"
        : sedang > 0 ? "diolah"
          : "habis";
  return {
    awalKg: awal / 1000,
    tersediaKg: tersedia / 1000,
    sedangKg: sedang / 1000,
    selesaiKg: selesai / 1000,
    selisihKg: (awal - tersedia - sedang - selesai) / 1000,
    status,
  };
}

export const LABEL_STATUS_LOT: Record<StatusLot, string> = {
  belum: "Belum diolah",
  sebagian: "Sebagian diolah",
  diolah: "Lagi diolah semua",
  habis: "Selesai diolah",
};
