import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BayarBaris, Dokumen, LotBaris, Opsi, Pengajuan, Pengguna, POBaris } from "@/lib/types/pembelian";

/* Lapisan akses data pembelian. Memakai klien pengguna, jadi RLS dan izin database berlaku.
   Pemanggil sudah memeriksa izin halaman lewat requireSesi/boleh. */

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function daftarPO(): Promise<POBaris[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_purchase_orders").select("*").order("kode", { ascending: false });
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
  const { data, error } = await sb.from("cycles").select("id, kode, ref_po_pembeli").eq("status", "terbuka").order("kode", { ascending: false }).limit(50);
  if (error) gagal("daftar siklus");
  return (data ?? []).map((c) => ({ id: c.id as string, label: c.ref_po_pembeli ? `${c.kode} · ${c.ref_po_pembeli}` : (c.kode as string) }));
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

export type DetailPO = {
  po: POBaris;
  pengajuan: Pengajuan[];
  dokumen: Dokumen[];
  lot: LotBaris[];
  bayar: BayarBaris[];
};

export async function detailPO(id: string): Promise<DetailPO | null> {
  const sb = await createClient();
  const [po, apv, dok, lot, bayar] = await Promise.all([
    sb.from("v_purchase_orders").select("*").eq("id", id).maybeSingle(),
    sb.from("v_persetujuan").select("*").eq("ref_id", id).eq("ref_tabel", "purchase_orders").order("kode", { ascending: false }),
    sb.from("documents").select("*").eq("ref_tabel", "purchase_orders").eq("ref_id", id).order("dibuat_pada", { ascending: false }),
    sb.from("lots").select("*, suppliers(nama), grades(kode, nama)").eq("po_id", id).order("kode"),
    sb.from("payments").select("*").eq("po_id", id).order("kode"),
  ]);
  if (po.error || apv.error || dok.error || lot.error || bayar.error) gagal("detail PO");
  if (!po.data) return null;

  const bayarBaris = (bayar.data ?? []) as BayarBaris[];
  let dokumen = (dok.data ?? []) as Dokumen[];
  if (bayarBaris.length > 0) {
    const bukti = await sb.from("documents").select("*").eq("ref_tabel", "payments").in("ref_id", bayarBaris.map((b) => b.id));
    if (bukti.error) gagal("bukti pembayaran");
    dokumen = [...dokumen, ...((bukti.data ?? []) as Dokumen[])];
  }
  return { po: po.data as POBaris, pengajuan: (apv.data ?? []) as Pengajuan[], dokumen, lot: (lot.data ?? []) as unknown as LotBaris[], bayar: bayarBaris };
}
