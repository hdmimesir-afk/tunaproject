import type { AturanLampiran, Dokumen, JenisDokumen, LotBaris, PemegangTugas, StatusApv, StatusBayar, StatusPO, StatusTerima } from "@/lib/types/pembelian";

/** Jenis lampiran wajib yang belum ada untuk satu catatan. Hanya penanda "belum lengkap", tidak menghentikan pencatatan. */
export function lampiranKurang(aturan: Pick<AturanLampiran, "ref_tabel" | "jenis" | "wajib">[], refTabel: AturanLampiran["ref_tabel"], refId: string, dokumen: Pick<Dokumen, "ref_tabel" | "ref_id" | "jenis">[]): JenisDokumen[] {
  return aturan
    .filter((a) => a.ref_tabel === refTabel && a.wajib)
    .filter((a) => !dokumen.some((d) => d.ref_tabel === refTabel && d.ref_id === refId && d.jenis === a.jenis))
    .map((a) => a.jenis);
}

export const lampiranWajib = (aturan: Pick<AturanLampiran, "ref_tabel" | "jenis" | "wajib">[], refTabel: AturanLampiran["ref_tabel"], jenis: JenisDokumen) =>
  aturan.some((a) => a.ref_tabel === refTabel && a.jenis === jenis && a.wajib);

/** "Owner (Budi), Finance (Sari)" untuk satu tugas; peran tanpa akun aktif ditulis namanya saja. */
export function namaPemegang(pemegang: PemegangTugas[], aksi: string): string {
  return pemegang.filter((p) => p.aksi === aksi).map((p) => (p.nama ? `${p.role_nama} (${p.nama})` : p.role_nama)).join(", ");
}

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
/** Di database "lulus" artinya udah digrading; di layar cuma Menunggu (belum digrading) dan Ditahan (gugur/bau) yang tampil sebagai status. */
export const LABEL_QC = { menunggu: "Menunggu", lulus: "Udah digrading", ditahan: "Ditahan" } as const;

/** Kode PO buat tampilan. PO dari penerimaan baru punya kode setelah disetujui. */
export const kodePO = (kode: string | null | undefined) => kode || "Belum terbit";

export type HargaGrade = { grade_id: string; kode: string; kg: number; harga: number | null };

/** Rincian pengajuan pembelian: kg per grade dari beberapa lot, harga per kg, jumlah, dan total (dihitung dalam gram dan sen). */
export function rincianAjukan(lot: Pick<LotBaris, "kg" | "qc" | "grade_id" | "grades" | "lot_grades">[], harga: Record<string, number | null>) {
  const per = new Map<string, { kode: string; gram: number }>();
  for (const l of lot) {
    for (const g of gradeLot(l)) {
      const x = per.get(g.grade_id) ?? { kode: g.kode, gram: 0 };
      x.gram += gram(g.kg);
      per.set(g.grade_id, x);
    }
  }
  const baris = [...per.entries()]
    .map(([grade_id, x]) => {
      const h = harga[grade_id] ?? null;
      const jumlahSen = h === null ? null : Math.round((x.gram * sen(h)) / 1000);
      return { grade_id, kode: x.kode, kg: x.gram / 1000, harga: h, jumlah: jumlahSen === null ? null : jumlahSen / 100 };
    })
    .sort((a, b) => a.kode.localeCompare(b.kode));
  const lengkap = baris.length > 0 && baris.every((b) => b.harga !== null && b.harga > 0);
  const totalSen = baris.reduce((a, b) => a + (b.jumlah === null ? 0 : sen(b.jumlah)), 0);
  const totalGram = baris.reduce((a, b) => a + gram(b.kg), 0);
  return { baris, lengkap, total: totalSen / 100, kg: totalGram / 1000 };
}

/* Bayar nelayan dua termin (jawaban tim 19 Nov 2026): pengajuan dan persetujuannya 100%, dibayar 50% dulu,
   sisanya paling lambat 10 hari kerja (Senin sampai Jumat) setelah termin pertama. */
export const HARI_KERJA_TERMIN = 10;

/** Termin 1 = setengah total (dibulatkan ke sen), termin 2 = sisanya. Jumlah keduanya pasti sama dengan total. */
export function rencanaTermin(total: number) {
  const s = sen(total);
  const pertama = Math.round(s / 2);
  return { pertama: pertama / 100, kedua: (s - pertama) / 100 };
}

/** Tanggal (YYYY-MM-DD) setelah n hari kerja Senin sampai Jumat. Libur nasional belum dihitung. */
export function tambahHariKerja(tanggal: string, n: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  let sisa = n;
  while (sisa > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const hari = d.getUTCDay();
    if (hari !== 0 && hari !== 6) sisa -= 1;
  }
  return d.toISOString().slice(0, 10);
}

/** Jatuh tempo termin 2: dari pembayaran pertama yang nggak batal. Null kalau belum ada pembayaran atau udah lunas. */
export function jatuhTempoTermin2(bayar: { tanggal: string; batal?: boolean }[], sisa: number): string | null {
  if (sisa <= 0) return null;
  const pertama = bayar.filter((b) => !b.batal).map((b) => b.tanggal).sort()[0];
  return pertama ? tambahHariKerja(pertama, HARI_KERJA_TERMIN) : null;
}
