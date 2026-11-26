import "server-only";
import { jenisLot } from "@/lib/logic/ekor";
import { createClient } from "@/lib/supabase/server";
import type { Opsi } from "@/lib/types/pembelian";
import { DISETUJUI, rincianLot } from "@/lib/logic/stokLot";
import type { AturanTarif, Barang, Booking, GerakBarang, GerakStok, IkanUtuh, IsiGudang, ProduksiSiapStok, Ruangan, Tagihan, UnitStok } from "@/lib/types/stok";

/* Lapisan akses data stok dan gudang dingin. Klien pengguna, jadi RLS dan izin database berlaku. */

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

export async function daftarUnit(): Promise<UnitStok[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("storage_units").select("*, cycles(kode), buyers(jenis_pemilik)").order("masuk_pada").order("kode").limit(5000);
  if (error) gagal("daftar stok");
  return (data ?? []) as UnitStok[];
}

export async function isiGudang(): Promise<IsiGudang> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_gudang_isi").select("*").maybeSingle();
  if (error) gagal("isi gudang");
  return (data as IsiGudang | null) ?? { kapasitas_kg: 17500, isi_sendiri_kg: 0, isi_titipan_kg: 0 };
}

/** Ruangan gudang dingin (ABF dan CS) beserta isinya. Kosong bila migrasi ruangan belum terpasang, supaya halaman lama tetap terbuka. */
export async function daftarRuangan(): Promise<Ruangan[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_ruangan_isi").select("*").eq("aktif", true).order("urutan");
  if (error) return [];
  return (data ?? []) as Ruangan[];
}

/** Barang penunjang (kerja dan pekerja) beserta stok hasil hitung riwayatnya. Kosong bila migrasi belum terpasang. */
export async function daftarBarang(): Promise<Barang[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("v_supply_stok").select("*").order("kategori").order("nama");
  if (error) return [];
  return (data ?? []) as Barang[];
}

/** Riwayat masuk, keluar, dan koreksi barang penunjang, terbaru dulu. */
export async function riwayatBarang(): Promise<GerakBarang[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("supply_movements").select("*").order("tanggal").order("dibuat_pada").limit(5000);
  if (error) return [];
  return (data ?? []) as GerakBarang[];
}

/** Koreksi stok yang menunggu keputusan Owner, beserta unitnya. */
export async function koreksiMenunggu(): Promise<(GerakStok & { unit_kode: string; sisa_kg: number })[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("storage_movements").select("*, storage_units(kode, sisa_kg)").eq("jenis", "koreksi").eq("status", "diajukan").order("waktu");
  if (error) gagal("koreksi stok");
  return (data ?? []).map((m) => {
    const x = m as unknown as GerakStok & { storage_units: { kode: string; sisa_kg: number } | null };
    return { ...x, unit_kode: x.storage_units?.kode ?? "?", sisa_kg: x.storage_units?.sisa_kg ?? 0 };
  });
}

/** Lot yang ditahan (gugur atau bau) dan beratnya masih ada, buat dashboard Produksi bagian "Ditahan". */
export type LotDitahan = { id: string; kode: string; tanggal_terima: string; kg: number; sisa_kg: number; pemasok: string; jenis: string | null; catatan: string | null };
export async function lotDitahan(): Promise<LotDitahan[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("lots").select("id, kode, tanggal_terima, kg, sisa_kg, catatan, jenis_ikan, lot_ekor(spesies, batal), suppliers(nama)")
    .eq("qc", "ditahan").gt("sisa_kg", 0).order("tanggal_terima").order("kode").limit(200);
  if (error) gagal("lot ditahan");
  type Baris = { id: string; kode: string; tanggal_terima: string; kg: number; sisa_kg: number; catatan: string | null; jenis_ikan: string | null; lot_ekor: { spesies: string; batal: boolean }[] | null; suppliers: { nama: string } | null };
  return ((data ?? []) as unknown as Baris[]).map((l) => ({
    id: l.id, kode: l.kode, tanggal_terima: l.tanggal_terima, kg: Number(l.kg), sisa_kg: Number(l.sisa_kg),
    pemasok: l.suppliers?.nama ?? "-", jenis: jenisLot(l.jenis_ikan, l.lot_ekor), catatan: l.catatan,
  }));
}

const KOLOM_LOT = "id, kode, kg, sisa_kg, qc, jumlah_ekor, jenis_ikan, lot_ekor(spesies, batal), tanggal_terima, cycle_id, cycles(kode, nama), suppliers(nama), lot_grades(kg, grades(kode, urutan))";

/** Ikan utuh (bahan baku) buat dashboard Stok: lot yang masih ada sisanya, plus lot yang sisanya udah habis tapi masih
    lagi diolah (biar ikannya nggak "ilang" dari layar). Lot ditahan nggak ikut. Rinciannya dihitung dari lot_allocations
    dan status produksinya (lihat lib/logic/stokLot.ts). Cuma baca, nggak ngubah data. */
export async function ikanUtuh(): Promise<IkanUtuh[]> {
  const sb = await createClient();
  const [bersisa, jalan] = await Promise.all([
    sb.from("lots").select(KOLOM_LOT).neq("qc", "ditahan").gt("sisa_kg", 0)
      .order("tanggal_terima").order("kode").limit(3000),
    // Alokasi yang produksinya belum disetujui Owner: lotnya tetap ditampilin walau sisanya 0.
    sb.from("lot_allocations").select("lot_id, productions!inner(status)").neq("productions.status", DISETUJUI).limit(1000),
  ]);
  if (bersisa.error || jalan.error) gagal("ikan utuh");
  const adaId = new Set((bersisa.data ?? []).map((l) => l.id as string));
  const kurang = [...new Set((jalan.data ?? []).map((a) => a.lot_id as string))].filter((id) => !adaId.has(id));
  const [tambahan, alokasi] = await Promise.all([
    kurang.length > 0 ? sb.from("lots").select(KOLOM_LOT).in("id", kurang) : Promise.resolve({ data: [] as unknown[], error: null }),
    sb.from("lot_allocations").select("lot_id, kg, productions(kode, status)").in("lot_id", [...adaId, ...kurang]),
  ]);
  if (tambahan.error || alokasi.error) gagal("ikan utuh");
  type Alok = { lot_id: string; kg: number; productions: { kode: string; status: string } | null };
  const perLot = new Map<string, Alok[]>();
  for (const a of (alokasi.data ?? []) as unknown as Alok[]) perLot.set(a.lot_id, [...(perLot.get(a.lot_id) ?? []), a]);
  const data = [...(bersisa.data ?? []), ...((tambahan.data ?? []) as typeof bersisa.data & object)];
  type Baris = {
    id: string; kode: string; kg: number; sisa_kg: number; qc: string; jumlah_ekor: number | null; tanggal_terima: string; cycle_id: string | null;
    jenis_ikan: string | null; lot_ekor: { spesies: string; batal: boolean }[] | null;
    cycles: { kode: string; nama: string | null } | null; suppliers: { nama: string } | null;
    lot_grades: { kg: number; grades: { kode: string; urutan: number } | null }[] | null;
  };
  return ((data ?? []) as unknown as Baris[]).map((l) => {
    const alok = perLot.get(l.id) ?? [];
    return {
    id: l.id, kode: l.kode, kg: Number(l.kg), sisa_kg: Number(l.sisa_kg), jumlah_ekor: l.jumlah_ekor, tanggal_terima: l.tanggal_terima,
    rincian: rincianLot(Number(l.kg), Number(l.sisa_kg), alok.map((a) => ({ kg: Number(a.kg), status: a.productions?.status ?? "" }))),
    produksi_jalan: alok.filter((a) => a.productions && a.productions.status !== DISETUJUI).map((a) => a.productions!.kode),
    sudah_grading: l.qc === "lulus", pemasok: l.suppliers?.nama ?? "-", cycle_id: l.cycle_id,
    jenis: jenisLot(l.jenis_ikan, l.lot_ekor),
    proyek: l.cycles ? [l.cycles.kode, l.cycles.nama].filter(Boolean).join(" · ") : null,
    grade: (l.lot_grades ?? []).filter((g) => Number(g.kg) > 0)
      .sort((a, b) => (a.grades?.urutan ?? 99) - (b.grades?.urutan ?? 99))
      .map((g) => g.grades?.kode ?? "?").join(", "),
    };
  }).sort((a, b) => a.tanggal_terima.localeCompare(b.tanggal_terima) || a.kode.localeCompare(b.kode));
}

/** Produksi yang sudah disetujui Owner dan hasilnya belum seluruhnya masuk stok. */
export async function produksiSiapStok(): Promise<ProduksiSiapStok[]> {
  const sb = await createClient();
  const [p, u] = await Promise.all([
    sb.from("v_productions").select("id, kode, loin_kg, samping_kg").eq("status", "diperiksa").order("kode", { ascending: false }).limit(50),
    sb.from("storage_units").select("production_id, kg_masuk").not("production_id", "is", null),
  ]);
  if (p.error || u.error) gagal("daftar produksi");
  const terpakai = new Map<string, number>();
  for (const r of u.data ?? []) terpakai.set(r.production_id as string, (terpakai.get(r.production_id as string) ?? 0) + Number(r.kg_masuk));
  return (p.data ?? [])
    .map((x) => ({ id: x.id as string, kode: x.kode as string, sisaKg: Math.round((Number(x.loin_kg) + Number(x.samping_kg) - (terpakai.get(x.id as string) ?? 0)) * 1000) / 1000 }))
    .filter((x) => x.sisaKg > 0);
}

export async function produkAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("products").select("id, nama").eq("aktif", true).order("nama");
  if (error) gagal("daftar produk");
  return (data ?? []).map((x) => ({ id: x.id as string, label: x.nama as string }));
}

export async function gradeStok(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("grades").select("id, kode").eq("aktif", true).eq("jenis", "loin").order("urutan");
  if (error) gagal("daftar grade");
  return (data ?? []).map((x) => ({ id: x.id as string, label: x.kode as string }));
}

export async function pelangganAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("buyers").select("id, nama").eq("aktif", true).order("nama");
  if (error) gagal("daftar pelanggan");
  return (data ?? []).map((x) => ({ id: x.id as string, label: x.nama as string }));
}

export async function daftarTagihan(): Promise<Tagihan[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("service_charges").select("*").order("dibuat_pada").limit(5000);
  if (error) gagal("tagihan jasa");
  return (data ?? []) as Tagihan[];
}

export async function daftarTarif(): Promise<AturanTarif[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("tariff_rules").select("*").order("jenis").order("berlaku_dari", { ascending: false });
  if (error) gagal("tarif");
  return (data ?? []) as AturanTarif[];
}

/** Jadwal aktif mulai kemarin ke depan. */
export async function daftarBooking(): Promise<Booking[]> {
  const sb = await createClient();
  const dari = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await sb.from("bookings").select("*").eq("status", "aktif").gte("selesai", dari).order("mulai").limit(300);
  if (error) gagal("jadwal");
  return (data ?? []) as Booking[];
}

export async function mitraAktif(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("partners").select("id, nama").eq("aktif", true).order("nama");
  if (error) gagal("daftar mitra");
  return (data ?? []).map((x) => ({ id: x.id as string, label: x.nama as string }));
}
