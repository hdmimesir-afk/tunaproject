/* Hitungan grid loin (FRM-PRD-01 rev 01). Murni tanpa I/O. Semua berat dihitung dalam gram bulat
   supaya 500 baris berdesimal tiga tidak bergeser karena pecahan biner, dan sama dengan hitungan database. */

export type BarisLoin = {
  /** Dibuat di perangkat; sama saat disimpan ulang supaya tidak menggandakan baris. */
  id: string;
  noEkor: string;
  noLoin: string;
  gradeId: string;
  /** Teks seperti diketik: "20,123" atau "20.123". */
  kg: string;
  /** Versi baris di database saat dimuat (kosong untuk baris baru). */
  versi?: number;
};

/** "20,123" atau "20.123" menjadi gram bulat (20123). null bila bukan angka positif dengan paling banyak tiga desimal. */
export function keGram(teks: string): number | null {
  const t = teks.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(t)) return null;
  const [bulat, desimal = ""] = t.split(".");
  const gram = Number(bulat) * 1000 + Number(desimal.padEnd(3, "0"));
  return gram > 0 ? gram : null;
}

export const gramKeKg = (gram: number) => gram / 1000;
export const gramKeTeks = (gram: number) => (gram / 1000).toFixed(3);

export type GalatBaris = { noLoin?: string; gradeId?: string; kg?: string; noEkor?: string };

const bilanganPositif = (t: string) => /^\d{1,6}$/.test(t.trim()) && Number(t) > 0;

/** Periksa semua baris sebelum disimpan. Baris yang benar-benar kosong (belum diisi) dilewati. */
export function periksaBaris(baris: BarisLoin[]): Map<string, GalatBaris> {
  const galat = new Map<string, GalatBaris>();
  const dipakai = new Map<string, string>();
  for (const b of baris) {
    if (barisKosong(b)) continue;
    const g: GalatBaris = {};
    if (!bilanganPositif(b.noLoin)) g.noLoin = "Isi nomor loin";
    else if (dipakai.has(b.noLoin.trim())) {
      g.noLoin = "Nomor ganda";
      const lain = galat.get(dipakai.get(b.noLoin.trim()) as string) ?? {};
      galat.set(dipakai.get(b.noLoin.trim()) as string, { ...lain, noLoin: "Nomor ganda" });
    } else dipakai.set(b.noLoin.trim(), b.id);
    if (b.noEkor.trim() !== "" && !bilanganPositif(b.noEkor)) g.noEkor = "Nomor ekor tidak valid";
    if (!b.gradeId) g.gradeId = "Pilih grade";
    if (keGram(b.kg) === null) g.kg = "Isi berat (maks. 3 desimal)";
    if (g.noLoin || g.noEkor || g.gradeId || g.kg) galat.set(b.id, { ...galat.get(b.id), ...g });
  }
  return galat;
}

export const barisKosong = (b: BarisLoin) => b.noLoin.trim() === "" && b.kg.trim() === "" && b.noEkor.trim() === "";

export type Total = { jumlah: number; gram: number };

export function hitungTotal(baris: BarisLoin[]) {
  let gram = 0;
  let jumlah = 0;
  const perGrade = new Map<string, Total>();
  const perEkor = new Map<string, Total>();
  for (const b of baris) {
    const g = keGram(b.kg);
    if (g === null) continue;
    gram += g;
    jumlah += 1;
    const pg = perGrade.get(b.gradeId) ?? { jumlah: 0, gram: 0 };
    perGrade.set(b.gradeId, { jumlah: pg.jumlah + 1, gram: pg.gram + g });
    if (b.noEkor.trim() !== "") {
      const k = String(Number(b.noEkor));
      const pe = perEkor.get(k) ?? { jumlah: 0, gram: 0 };
      perEkor.set(k, { jumlah: pe.jumlah + 1, gram: pe.gram + g });
    }
  }
  return { gram, jumlah, perGrade, perEkor };
}

/** Hasil per ekor: loin ekor itu dibagi berat utuhnya, dalam persen satu desimal. null bila belum ditimbang utuh. */
export function hasilPerEkor(loinGram: number, utuhKg: number | null): number | null {
  if (utuhKg === null || utuhKg <= 0) return null;
  return Math.round((loinGram / (utuhKg * 1000)) * 1000) / 10;
}

/** Nomor loin berikutnya (terbesar + 1) untuk tambah baris cepat. */
export function nomorLoinBerikut(baris: Pick<BarisLoin, "noLoin">[]) {
  const terbesar = baris.reduce((a, b) => Math.max(a, Number(b.noLoin) || 0), 0);
  return String(terbesar + 1);
}

/** Format tampilan: koma desimal Indonesia, tiga angka di belakang koma selalu ada, tanpa pembulatan. */
export const tampilKg = (gram: number) => (gram / 1000).toLocaleString("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** CSV dengan titik koma (Excel Indonesia) dan berat tiga desimal persis seperti di layar. */
export function buatCsv(kepala: string[], isi: (string | number)[][]) {
  const sel = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [kepala, ...isi].map((r) => r.map(sel).join(";")).join("\r\n");
}
