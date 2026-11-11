import type { LotBaris, StatusApv, StatusBayar, StatusPO, StatusTerima } from "@/lib/types/pembelian";

/* Rumus dan label murni untuk pembelian dan persetujuan. Hitungan uang dalam sen supaya tidak bergeser. */

const sen = (n: number) => Math.round(n * 100);
const gram = (kg: number) => Math.round(kg * 1000);

export type GradeLot = { grade_id: string; kode: string; kg: number };

/** Grade lot yang masih berisi, urut dari yang terberat. Lot lama tanpa rincian memakai grade utamanya untuk seluruh berat. */
export function gradeLot(l: Pick<LotBaris, "kg" | "qc" | "grade_id" | "grades" | "lot_grades">): GradeLot[] {
  if (l.qc !== "lulus") return [];
  const isi = (l.lot_grades ?? []).filter((g) => g.kg > 0).map((g) => ({ grade_id: g.grade_id, kode: g.grades?.kode ?? "-", kg: g.kg }));
  if (isi.length > 0) return isi.sort((a, b) => b.kg - a.kg || a.kode.localeCompare(b.kode));
  return l.grade_id && l.grades ? [{ grade_id: l.grade_id, kode: l.grades.kode, kg: l.kg }] : [];
}

/** Berat lot yang belum dibagi ke grade mana pun (kg, dihitung dalam gram). */
export function sisaBelumDibagi(kgLot: number, grade: { kg: number }[]): number {
  return (gram(kgLot) - grade.reduce((a, g) => a + gram(g.kg), 0)) / 1000;
}

/** Jumlah dan total beberapa pengajuan, untuk layar konfirmasi setuju massal. */
export function ringkasBatch(items: { jumlah: number }[]) {
  const totalSen = items.reduce((a, x) => a + sen(x.jumlah), 0);
  return { jumlah: items.length, total: totalSen / 100 };
}

/** Perbandingan harga dengan harga acuan (PO terakhir yang disetujui untuk pemasok yang sama). */
export function selisihHarga(harga: number, acuan: number | null) {
  if (acuan === null || acuan <= 0) return null;
  const selisih = (sen(harga) - sen(acuan)) / 100;
  return { selisih, persen: (selisih / acuan) * 100, naik: selisih > 0, sama: selisih === 0 };
}

export const sisaBayar = (total: number, sudahBayar: number) => Math.max(0, (sen(total) - sen(sudahBayar)) / 100);

/** PO hanya bisa diedit dan diajukan saat draf atau perlu revisi. */
export const bisaDiedit = (s: StatusPO) => s === "draf" || s === "perlu_revisi";

export const LABEL_PO: Record<StatusPO, string> = {
  draf: "Draf", diajukan: "Diajukan", perlu_revisi: "Perlu revisi", disetujui: "Disetujui", ditolak: "Ditolak",
};
export const LABEL_APV: Record<StatusApv, string> = {
  diajukan: "Perlu diperiksa", diperiksa: "Perlu disetujui", perlu_revisi: "Perlu revisi", disetujui: "Disetujui", ditolak: "Ditolak",
};
export const LABEL_TERIMA: Record<StatusTerima, string> = { belum: "Belum diterima", sebagian: "Sebagian", selesai: "Selesai" };
export const LABEL_BAYAR: Record<StatusBayar, string> = { belum: "Belum dibayar", sebagian: "Sebagian", lunas: "Lunas" };
export const LABEL_QC = { menunggu: "Menunggu", lulus: "Lulus", ditahan: "Ditahan" } as const;
