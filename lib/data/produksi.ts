import "server-only";
import { BATAS_BAWAAN, type BatasHasil } from "@/lib/logic/neraca";
import { createClient } from "@/lib/supabase/server";
import type { Opsi } from "@/lib/types/pembelian";
import type { AlokasiLot, Ekor, ItemLoin, KomponenSamping, LotSiap, ProduksiBaris, RiwayatLoin } from "@/lib/types/produksi";

/* Lapisan akses data produksi. Klien pengguna, jadi RLS berlaku. Pemanggil sudah memeriksa produksi.read. */

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function daftarProduksi(): Promise<ProduksiBaris[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_productions").select("*").order("kode", { ascending: false }).limit(100);
  if (error) gagal("daftar produksi");
  return (data ?? []) as ProduksiBaris[];
}

/** Lot yang lulus mutu dan masih bersisa, siap dialokasikan ke produksi. */
export async function lotSiapProduksi(): Promise<LotSiap[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("lots").select("id, kode, sisa_kg, grades(kode), suppliers(nama)").eq("qc", "lulus").gt("sisa_kg", 0).order("kode");
  if (error) gagal("daftar lot");
  return (data ?? []).map((l) => {
    const x = l as unknown as { id: string; kode: string; sisa_kg: number; grades: { kode: string } | null; suppliers: { nama: string } | null };
    return { id: x.id, kode: x.kode, sisa_kg: x.sisa_kg, grade_kode: x.grades?.kode ?? null, supplier_nama: x.suppliers?.nama ?? "-" };
  });
}

export async function gradeProduksi(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("grades").select("id, kode, nama").eq("aktif", true).order("urutan");
  if (error) gagal("daftar grade");
  return (data ?? []).map((g) => ({ id: g.id as string, label: g.kode as string }));
}

export async function jenisHasilSamping(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("component_categories").select("id, nama").eq("aktif", true).eq("komponen", "hasil_samping").order("urutan");
  if (error) gagal("jenis hasil samping");
  return (data ?? []).map((c) => ({ id: c.id as string, label: c.nama as string }));
}

/** Rencana dan batas wajar hasil dari pengaturan (Owner bisa mengubah tanpa programmer). */
export async function batasHasil(): Promise<BatasHasil> {
  const sb = await createClient();
  const { data } = await sb.from("settings").select("kunci, nilai").in("kunci", ["rencana_hasil_pct", "batas_hasil_min_pct", "batas_hasil_max_pct"]);
  const peta = new Map((data ?? []).map((s) => [s.kunci as string, Number(s.nilai)]));
  const ambil = (k: string, awal: number) => { const v = peta.get(k); return v !== undefined && Number.isFinite(v) ? v : awal; };
  return {
    rencanaPct: ambil("rencana_hasil_pct", BATAS_BAWAAN.rencanaPct),
    minPct: ambil("batas_hasil_min_pct", BATAS_BAWAAN.minPct),
    maxPct: ambil("batas_hasil_max_pct", BATAS_BAWAAN.maxPct),
  };
}

export type DetailProduksi = {
  produksi: ProduksiBaris;
  alokasi: AlokasiLot[];
  loin: ItemLoin[];
  ekor: Ekor[];
  samping: KomponenSamping[];
  riwayat: RiwayatLoin[];
};

export async function detailProduksi(id: string): Promise<DetailProduksi | null> {
  const sb = await createClient();
  const [p, alokasi, loin, ekor, samping, riwayat] = await Promise.all([
    sb.from("v_productions").select("*").eq("id", id).maybeSingle(),
    sb.from("lot_allocations").select("id, lot_id, lot_kode, kg").eq("production_id", id).order("lot_kode"),
    sb.from("production_items").select("id, no_ekor, no_loin, grade_id, kg, versi, batal, alasan_batal").eq("production_id", id).order("no_loin"),
    sb.from("production_fish").select("id, no_ekor, berat_utuh_kg").eq("production_id", id).order("no_ekor"),
    sb.from("production_components").select("id, category_id, kg").eq("production_id", id),
    sb.from("production_items_history").select("*").eq("production_id", id).order("id", { ascending: false }).limit(300),
  ]);
  if (p.error || alokasi.error || loin.error || ekor.error || samping.error || riwayat.error) gagal("detail produksi");
  if (!p.data) return null;
  return {
    produksi: p.data as ProduksiBaris,
    alokasi: (alokasi.data ?? []) as AlokasiLot[],
    loin: (loin.data ?? []) as ItemLoin[],
    ekor: (ekor.data ?? []) as Ekor[],
    samping: (samping.data ?? []) as KomponenSamping[],
    riwayat: (riwayat.data ?? []) as RiwayatLoin[],
  };
}
