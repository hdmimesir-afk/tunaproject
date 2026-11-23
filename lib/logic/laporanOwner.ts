/* Hitungan laporan khusus owner (23 Nov 2026): periode, ringkasan produksi, dan seri harian buat grafik.
   Berat dihitung dalam gram bulat, uang dalam sen bulat. Tanggal pakai 'YYYY-MM-DD' (zona Jakarta dari pemanggil). */

export type PeriodeOwner = "7" | "30" | "bulan";
export const LABEL_PERIODE: Record<PeriodeOwner, string> = { "7": "7 hari", "30": "30 hari", bulan: "Bulan ini" };
export const isPeriodeOwner = (x: unknown): x is PeriodeOwner => x === "7" || x === "30" || x === "bulan";

function geser(tgl: string, hari: number) {
  const d = new Date(`${tgl}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

/** Rentang tanggal periode, sampai hari ini. */
export function rentangPeriode(hariIni: string, p: PeriodeOwner) {
  const dari = p === "bulan" ? `${hariIni.slice(0, 8)}01` : geser(hariIni, -(Number(p) - 1));
  return { dari, sampai: hariIni };
}

/** Daftar tanggal dari..sampai (inklusif). */
export function hariHari(dari: string, sampai: string) {
  const out: string[] = [];
  for (let t = dari; t <= sampai && out.length < 400; t = geser(t, 1)) out.push(t);
  return out;
}

const g = (kg: number | null | undefined) => Math.round(Number(kg ?? 0) * 1000);

export type BarisProduksiOwner = { tanggal: string; status: string; masuk_kg: number; loin_kg: number; samping_kg: number; limbah_kg: number | null; susut_kg: number | null };

/** Total produksi dalam periode: ikan diolah, loin, hasil samping, limbah, susut, yield. */
export function ringkasProduksi(rows: BarisProduksiOwner[]) {
  const masuk = rows.reduce((a, r) => a + g(r.masuk_kg), 0);
  const loin = rows.reduce((a, r) => a + g(r.loin_kg), 0);
  const samping = rows.reduce((a, r) => a + g(r.samping_kg), 0);
  const limbah = rows.reduce((a, r) => a + g(r.limbah_kg), 0);
  const susut = rows.reduce((a, r) => a + g(r.susut_kg), 0);
  return {
    jumlah: rows.length,
    berjalan: rows.filter((r) => r.status === "berjalan").length,
    menunggu: rows.filter((r) => r.status === "selesai" || r.status === "diperiksa_qc").length,
    disetujui: rows.filter((r) => r.status === "diperiksa").length,
    masukKg: masuk / 1000, loinKg: loin / 1000, sampingKg: samping / 1000, limbahKg: limbah / 1000, susutKg: susut / 1000,
    yieldPct: masuk > 0 ? Math.round((loin / masuk) * 1000) / 10 : null,
  };
}

export type TitikHarian = { tanggal: string; nilai: number };

/** Jumlah per hari (semua hari di rentang ikut, yg kosong = 0). `nilai` dalam satuan aslinya (kg atau rupiah). */
export function seriHarian<T>(rows: T[], dari: string, sampai: string, tanggal: (r: T) => string, nilai: (r: T) => number, skala = 1000): TitikHarian[] {
  const per = new Map<string, number>();
  for (const r of rows) {
    const t = tanggal(r);
    if (t < dari || t > sampai) continue;
    per.set(t, (per.get(t) ?? 0) + Math.round(Number(nilai(r) ?? 0) * skala));
  }
  return hariHari(dari, sampai).map((t) => ({ tanggal: t, nilai: (per.get(t) ?? 0) / skala }));
}

/** Loin per grade, urut grade (A-SO dulu). */
export function loinPerGrade(rows: { kg: number; grades: { kode: string; urutan: number } | null }[]) {
  const m = new Map<string, { gram: number; urutan: number }>();
  for (const r of rows) {
    const k = r.grades?.kode ?? "?";
    const x = m.get(k) ?? { gram: 0, urutan: r.grades?.urutan ?? 99 };
    m.set(k, { gram: x.gram + g(r.kg), urutan: x.urutan });
  }
  const total = [...m.values()].reduce((a, x) => a + x.gram, 0);
  return [...m.entries()].sort((a, b) => a[1].urutan - b[1].urutan || a[0].localeCompare(b[0]))
    .map(([kode, x]) => ({ kode, kg: x.gram / 1000, pct: total > 0 ? Math.round((x.gram / total) * 1000) / 10 : 0 }));
}

/** Berat buat owner: tanpa nol di belakang koma (2.400 kg, 12,5 kg). */
export const kgOwner = (kg: number) => `${(Math.round(kg * 10) / 10).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg`;

export type Porsi = { nama: string; nilai: number; pct: number };

/** Jumlah per nama (pemasok, kategori, pembeli, ruangan), urut dari yg terbesar. `skala` 1000 buat kg, 100 buat rupiah.
    Lebih dari `maks` nama: sisanya digabung jadi "Lainnya". */
export function jumlahPer<T>(rows: T[], nama: (r: T) => string, nilai: (r: T) => number, skala = 1000, maks = 6): Porsi[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = nama(r).trim() || "Tanpa nama";
    m.set(k, (m.get(k) ?? 0) + Math.round(Number(nilai(r) ?? 0) * skala));
  }
  const urut = [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const atas = urut.length > maks ? urut.slice(0, maks - 1) : urut;
  const sisa = urut.length > maks ? urut.slice(maks - 1).reduce((a, [, v]) => a + v, 0) : 0;
  const semua = sisa > 0 ? [...atas, ["Lainnya", sisa] as [string, number]] : atas;
  const total = semua.reduce((a, [, v]) => a + v, 0);
  return semua.map(([n, v]) => ({ nama: n, nilai: v / skala, pct: total > 0 ? Math.round((v / total) * 1000) / 10 : 0 }));
}

/** Total dalam satuan aslinya, dijumlah pakai bilangan bulat biar nggak ada sisa koma aneh. */
export function totalBulat<T>(rows: T[], nilai: (r: T) => number, skala = 1000) {
  return rows.reduce((a, r) => a + Math.round(Number(nilai(r) ?? 0) * skala), 0) / skala;
}