import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Dokumen, Pengajuan } from "@/lib/types/pembelian";

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export type BongkarMalam = { id: string; kode: string; po_kode: string; kg: number; tanggal_terima: string; supplier_nama: string };

export type DataPersetujuan = {
  antrean: Pengajuan[];
  riwayat: Pengajuan[];
  /** Nota per PO (kunci: id PO), untuk tombol "Lihat nota" di kartu. */
  nota: Record<string, Dokumen[]>;
  bongkarMalam: BongkarMalam[];
};

export async function dataPersetujuan(): Promise<DataPersetujuan> {
  const sb = await createClient();
  const [antrean, riwayat, malam] = await Promise.all([
    sb.from("v_persetujuan").select("*").in("status", ["diajukan", "diperiksa"]).order("diajukan_pada", { ascending: true }),
    sb.from("v_persetujuan").select("*").in("status", ["disetujui", "ditolak", "perlu_revisi"]).order("diajukan_pada", { ascending: false }).limit(20),
    sb.from("lots").select("id, kode, po_id, po_kode, kg, tanggal_terima, suppliers(nama)").eq("sebelum_disetujui", true).order("kode", { ascending: false }).limit(50),
  ]);
  if (antrean.error || riwayat.error || malam.error) gagal("antrean persetujuan");

  const aktif = (antrean.data ?? []) as Pengajuan[];
  const poIds = [...new Set([...aktif, ...((riwayat.data ?? []) as Pengajuan[])].map((a) => a.ref_id))];
  const nota: Record<string, Dokumen[]> = {};
  if (poIds.length > 0) {
    const dok = await sb.from("documents").select("*").eq("ref_tabel", "purchase_orders").eq("jenis", "nota").in("ref_id", poIds);
    if (dok.error) gagal("nota");
    for (const d of (dok.data ?? []) as Dokumen[]) (nota[d.ref_id] ??= []).push(d);
  }

  // Lot bongkar malam yang PO-nya masih menunggu persetujuan.
  const lotMalam = (malam.data ?? []) as unknown as (BongkarMalam & { po_id: string; suppliers: { nama: string } | null })[];
  const menunggu = new Set(aktif.map((a) => a.ref_id));
  const bongkarMalam = lotMalam
    .filter((l) => menunggu.has(l.po_id))
    .map((l) => ({ id: l.id, kode: l.kode, po_kode: l.po_kode, kg: l.kg, tanggal_terima: l.tanggal_terima, supplier_nama: l.suppliers?.nama ?? "-" }));

  return { antrean: aktif, riwayat: (riwayat.data ?? []) as Pengajuan[], nota, bongkarMalam };
}
