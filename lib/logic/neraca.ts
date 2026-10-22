/* Neraca berat produksi (PRD, Aturan bisnis). Rumus murni tanpa I/O; database memakai rumus yang sama.
   Semua hitungan memakai gram bulat supaya tiga angka di belakang koma tidak bergeser karena pecahan biner. */

export type NeracaInput = {
  masukKg: number;
  loinKg: number;
  hasilSampingKg: number;
  /** null = belum ditimbang (bukan nol). */
  limbahKg: number | null;
  susutKg: number | null;
};

export type BatasHasil = { rencanaPct: number; minPct: number; maxPct: number };
export const BATAS_BAWAAN: BatasHasil = { rencanaPct: 60, minPct: 40, maxPct: 80 };

export type Neraca = {
  masukKg: number;
  loinKg: number;
  hasilSampingKg: number;
  limbahKg: number | null;
  susutKg: number | null;
  /** Sisa hitungan, tidak pernah diisi manual. */
  belumJelasKg: number;
  hasilPct: number;
  belumJelasPct: number;
  /** Total timbangan melebihi ikan masuk: harus ditolak. */
  melebihi: boolean;
  /** Hasil di luar batas wajar: ditandai untuk diperiksa, bukan ditolak. */
  perluDiperiksa: boolean;
  diAtasRencana: boolean;
};

const g = (kg: number) => Math.round(kg * 1000);
const kg = (gram: number) => gram / 1000;
const pct = (bagian: number, total: number) => (total > 0 ? (bagian / total) * 100 : 0);

export function hitungNeraca(input: NeracaInput, batas: BatasHasil = BATAS_BAWAAN): Neraca {
  const masuk = g(input.masukKg);
  const loin = g(input.loinKg);
  const samping = g(input.hasilSampingKg);
  const limbah = input.limbahKg === null ? 0 : g(input.limbahKg);
  const susut = input.susutKg === null ? 0 : g(input.susutKg);
  const belumJelas = masuk - loin - samping - limbah - susut;
  const hasilPct = pct(loin, masuk);
  return {
    masukKg: kg(masuk),
    loinKg: kg(loin),
    hasilSampingKg: kg(samping),
    limbahKg: input.limbahKg === null ? null : kg(limbah),
    susutKg: input.susutKg === null ? null : kg(susut),
    belumJelasKg: kg(belumJelas),
    hasilPct,
    belumJelasPct: pct(belumJelas, masuk),
    melebihi: belumJelas < 0,
    perluDiperiksa: hasilPct < batas.minPct || hasilPct > batas.maxPct,
    diAtasRencana: hasilPct >= batas.rencanaPct,
  };
}

/** Format berat Indonesia, maksimal tiga angka di belakang koma: 300,94 */
export const formatKg = (n: number, digit = 3) => n.toLocaleString("id-ID", { maximumFractionDigits: digit });
export const formatPct = (n: number) => n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
