import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AturanLampiran, BarisPO, BayarBaris, Dokumen, LotBaris, Opsi, PemegangTugas, Pengajuan, Pengguna, POBaris } from "@/lib/types/pembelian";
import { riwayatKoreksi, type Koreksi } from "./koreksi";

/* Lapisan akses data pembelian. Memakai klien pengguna, jadi RLS dan izin database berlaku.
   Pemanggil sudah memeriksa izin halaman lewat requireSesi/boleh. */

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function daftarPO(): Promise<POBaris[]> {
  const sb = await createClient();
  // Yang belum punya kode (masih diajukan) di atas, terus kode terbaru.
  const { data, error } = await sb.from("v_purchase_orders").select("*").order("kode", { ascending: false, nullsFirst: true }).order("diajukan_pada", { ascending: false });
  if (error) gagal("daftar PO");
  return (data ?? []) as POBaris[];
}

export async function pemasokAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("suppliers").select("id, nama").eq("aktif", true).order("nama");
  if (error) gagal("daftar pemasok");
  return (data ?? []).map((s) => ({ id: s.id as string, label: s.nama as string }));
}

export async function daftarSiklus(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("cycles").select("id, kode, nama, ref_po_pembeli").eq("status", "terbuka").order("kode", { ascending: false }).limit(50);
  if (error) gagal("daftar proyek");
  return (data ?? []).map((c) => ({ id: c.id as string, label: [c.kode, c.nama || c.ref_po_pembeli].filter(Boolean).join(" · ") }));
}

/** Nama pengguna aktif untuk riwayat, tanpa email. */
export async function petaPengguna(): Promise<Record<string, Pengguna>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("pengguna_ringkas");
  if (error) return {};
  const peta: Record<string, Pengguna> = {};
  for (const p of (data ?? []) as { user_id: string; nama: string; role_nama: string | null }[]) {
    peta[p.user_id] = { nama: p.nama || "(tanpa nama)", role: p.role_nama ?? "" };
  }
  return peta;
}

/** Aturan lampiran wajib/opsional dari admin (Pengaturan). Terbaca semua pengguna yang masuk. */
export async function aturanLampiran(): Promise<AturanLampiran[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("document_rules").select("id, ref_tabel, jenis, wajib, keterangan, urutan").order("ref_tabel").order("urutan");
  if (error) gagal("aturan lampiran");
  return (data ?? []) as AturanLampiran[];
}

/** Siapa memegang tugas pilihan admin (menyetujui PO, memeriksa PO, nota susulan). */
export async function pemegangTugas(): Promise<PemegangTugas[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("pemegang_tugas");
  if (error) return [];
  return (data ?? []) as PemegangTugas[];
}

export type DetailPO = {
  po: POBaris;
  pengajuan: Pengajuan[];
  dokumen: Dokumen[];
  lot: LotBaris[];
  bayar: BayarBaris[];
  baris: BarisPO[];
  koreksi: Koreksi[];
};

export async function detailPO(id: string): Promise<DetailPO | null> {
  const sb = await createClient();
  const [po, apv, dok, lot, bayar, baris] = await Promise.all([
    sb.from("v_purchase_orders").select("*").eq("id", id).maybeSingle(),
    sb.from("v_persetujuan").select("*").eq("ref_id", id).eq("ref_tabel", "purchase_orders").order("kode", { ascending: false }),
    sb.from("documents").select("*").eq("ref_tabel", "purchase_orders").eq("ref_id", id).order("dibuat_pada", { ascending: false }),
    sb.from("lots").select("*, suppliers(nama), grades(kode, nama), lot_grades(grade_id, kg, grades(kode))").eq("po_id", id).order("kode"),
    sb.from("payments").select("*").eq("po_id", id).order("kode"),
    sb.from("purchase_order_lines").select("id, grade_id, kg, harga_per_kg, jumlah, grades(kode)").eq("po_id", id).gt("kg", 0),
  ]);
  if (po.error || apv.error || dok.error || lot.error || bayar.error || baris.error) gagal("detail PO");
  if (!po.data) return null;

  const bayarBaris = (bayar.data ?? []) as BayarBaris[];
  const lotBaris = (lot.data ?? []) as unknown as LotBaris[];
  let dokumen = (dok.data ?? []) as Dokumen[];
  // Bukti transfer per pembayaran, plus nota nelayan yang dilampirin di lot-lotnya.
  const [bukti, notaLot, koreksi] = await Promise.all([
    bayarBaris.length > 0 ? sb.from("documents").select("*").eq("ref_tabel", "payments").in("ref_id", bayarBaris.map((b) => b.id)) : Promise.resolve({ data: [], error: null }),
    lotBaris.length > 0 ? sb.from("documents").select("*").eq("ref_tabel", "lots").eq("jenis", "nota").in("ref_id", lotBaris.map((l) => l.id)) : Promise.resolve({ data: [], error: null }),
    riwayatKoreksi(["purchase_orders", "payments"], [id, ...bayarBaris.map((b) => b.id)]),
  ]);
  if (bukti.error || notaLot.error) gagal("lampiran PO");
  dokumen = [...dokumen, ...((bukti.data ?? []) as Dokumen[]), ...((notaLot.data ?? []) as Dokumen[])];
  const barisPO = ((baris.data ?? []) as unknown as BarisPO[]).sort((a, b) => (a.grades?.kode ?? "").localeCompare(b.grades?.kode ?? ""));
  return { po: po.data as POBaris, pengajuan: (apv.data ?? []) as Pengajuan[], dokumen, lot: lotBaris, bayar: bayarBaris, baris: barisPO, koreksi };
}
