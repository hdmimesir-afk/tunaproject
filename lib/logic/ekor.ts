import { keGram } from "./grid";

/* Penerimaan per ekor (desain Figma Mas Bisma): tiap ekor punya nomor tag, spesies, berat, grade tuna utuh, dan tusukan gancu.
   Potongan gancu nggak dibayar: berat dibayar = berat dikurangi (tusukan x potongan per tusukan). Hitungan dalam gram bulat. */

export type IsianEkor = { k: string; id?: string; noTag: string; spesies: string; kg: string; gradeId: string; gancu: number };

export type RingkasanEkor = {
  jumlah: number;
  gram: number;
  gramBayar: number;
  gramPotongan: number;
  /** Per grade: jumlah ekor dan berat dibayar. Kunci "" = belum ada grade. */
  perGrade: Map<string, { jumlah: number; gramBayar: number }>;
  /** Pesan salah per baris (kunci = k). */
  salah: Map<string, string>;
  /** Semua ekor udah ada grade-nya. */
  semuaGrade: boolean;
  /** Minimal satu ekor udah ada grade-nya. */
  adaGrade: boolean;
};

export const ekorKosong = (e: IsianEkor) => e.noTag.trim() === "" && e.kg.trim() === "" && e.gradeId === "" && e.gancu === 0;

/** Ringkasan isian ekor. Baris kosong di-skip. potonganKg = potongan per tusukan gancu. */
export function ringkasEkor(baris: IsianEkor[], potonganKg: number): RingkasanEkor {
  const r: RingkasanEkor = { jumlah: 0, gram: 0, gramBayar: 0, gramPotongan: 0, perGrade: new Map(), salah: new Map(), semuaGrade: true, adaGrade: false };
  const perGancu = Math.round(potonganKg * 1000);
  const tag = new Map<string, number>();
  for (const e of baris) {
    if (ekorKosong(e)) continue;
    const g = keGram(e.kg);
    if (g === null) { r.salah.set(e.k, "Isi beratnya, lebih dari nol"); continue; }
    const pot = Math.max(0, e.gancu) * perGancu;
    if (pot >= g) { r.salah.set(e.k, "Potongan gancu lebih besar dari beratnya"); continue; }
    const t = e.noTag.trim().toUpperCase();
    if (t) tag.set(t, (tag.get(t) ?? 0) + 1);
    r.jumlah += 1;
    r.gram += g;
    r.gramPotongan += pot;
    r.gramBayar += g - pot;
    if (e.gradeId) r.adaGrade = true; else r.semuaGrade = false;
    const x = r.perGrade.get(e.gradeId) ?? { jumlah: 0, gramBayar: 0 };
    r.perGrade.set(e.gradeId, { jumlah: x.jumlah + 1, gramBayar: x.gramBayar + g - pot });
  }
  for (const e of baris) {
    const t = e.noTag.trim().toUpperCase();
    if (t && (tag.get(t) ?? 0) > 1 && !r.salah.has(e.k)) r.salah.set(e.k, `Tag ${e.noTag.trim()} dipakai dua kali`);
  }
  if (r.jumlah === 0) r.semuaGrade = false;
  return r;
}

/** Isian ekor ke bentuk yang dikirim ke database (baris kosong di-skip). Panggil setelah ringkasEkor nggak ada yang salah. */
export function ekorKeRpc(baris: IsianEkor[]) {
  return baris.filter((e) => !ekorKosong(e)).map((e) => ({
    id: e.id ?? null,
    no_tag: e.noTag.trim(),
    spesies: e.spesies.trim() || "Tuna",
    kg: (keGram(e.kg) ?? 0) / 1000,
    grade_id: e.gradeId || null,
    gancu: Math.max(0, Math.min(50, Math.trunc(e.gancu))),
  }));
}

/** Nomor tag berikutnya: kalau tag terakhir berakhiran angka, angkanya ditambah satu (T-014 jadi T-015). */
export function tagBerikut(tagTerakhir: string): string {
  const m = tagTerakhir.trim().match(/^(.*?)(\d+)$/);
  if (!m) return "";
  const n = String(Number(m[2]) + 1).padStart(m[2].length, "0");
  return m[1] + n;
}
