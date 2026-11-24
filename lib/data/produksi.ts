import "server-only";
import { BATAS_BAWAAN, type BatasHasil } from "@/lib/logic/neraca";
import { createClient } from "@/lib/supabase/server";
import { gradeLot } from "@/lib/logic/pembelian";
import { jenisLot } from "@/lib/logic/ekor";
import { DISETUJUI } from "@/lib/logic/stokLot";
import type { LotBaris, Opsi } from "@/lib/types/pembelian";
import type { AlokasiLot, Ekor, ItemLoin, KomponenSamping, LoinTotal, LotAsal, LotSiap, ProduksiBaris, ProyekOpsi, RiwayatLoin } from "@/lib/types/produksi";
import { riwayatKoreksi, type Koreksi } from "./koreksi";

/* Lapisan akses data produksi. Klien pengguna, jadi RLS berlaku. Pemanggil sudah memeriksa produksi.read. */

function gagal(apa: string): never {
  throw new Error(`Gagal memuat ${apa}. Coba muat ulang halaman.`);
}

/** Daftar produksi; `lini` buat halaman per lini bisnis (produksi tanpa proyek dianggap jual). */
export async function daftarProduksi(lini?: "jual" | "jasa"): Promise<ProduksiBaris[]> {
  const sb = await createClient();
  let q = sb.from("v_productions").select("*");
  if (lini === "jual") q = q.or("lini_bisnis.eq.jual,lini_bisnis.is.null");
  if (lini === "jasa") q = q.eq("lini_bisnis", "jasa");
  const { data, error } = await q.order("tanggal").order("kode").limit(5000);
  if (error) gagal("daftar produksi");
  return (data ?? []) as ProduksiBaris[];
}

/** Lini bisnis satu produksi atau proyek, buat ngarahin tautan lama (/produksi?p=...) ke halaman lininya. */
export async function liniDari(tabel: "v_productions" | "cycles", id: string): Promise<"jual" | "jasa" | "titip"> {
  const sb = await createClient();
  const { data } = await sb.from(tabel).select("lini_bisnis").eq("id", id).maybeSingle();
  const l = (data as { lini_bisnis: string | null } | null)?.lini_bisnis;
  return l === "jasa" || l === "titip" ? l : "jual";
}

/** Ringkasan grade per produksi buat laporan: grade loin (grading akhir) dan grade tuna utuh dari lot asalnya. */
export type GradeProduksi = { loin: string; utuh: string };
export async function ringkasGradeProduksi(ids: string[]): Promise<Record<string, GradeProduksi>> {
  if (ids.length === 0) return {};
  const sb = await createClient();
  const [total, potong, alokasi] = await Promise.all([
    sb.from("production_loin_totals").select("production_id, kg, grades(kode, urutan)").in("production_id", ids).gt("kg", 0),
    sb.from("production_items").select("production_id, kg, grades(kode, urutan)").in("production_id", ids).eq("batal", false),
    sb.from("lot_allocations").select("production_id, lots(qc, lot_grades(kg, grades(kode, urutan)))").in("production_id", ids),
  ]);
  if (total.error || potong.error || alokasi.error) gagal("ringkasan grade produksi");
  type G = { kode: string; urutan: number } | null;
  const tambah = (peta: Map<string, Map<string, { gram: number; urutan: number }>>, id: string, g: G, kg: number) => {
    const m = peta.get(id) ?? new Map<string, { gram: number; urutan: number }>();
    const x = m.get(g?.kode ?? "?") ?? { gram: 0, urutan: g?.urutan ?? 99 };
    m.set(g?.kode ?? "?", { gram: x.gram + Math.round(Number(kg) * 1000), urutan: x.urutan });
    peta.set(id, m);
  };
  const loin = new Map<string, Map<string, { gram: number; urutan: number }>>();
  for (const r of [...(total.data ?? []), ...(potong.data ?? [])] as unknown as { production_id: string; kg: number; grades: G }[]) tambah(loin, r.production_id, r.grades, r.kg);
  const utuh = new Map<string, Map<string, { gram: number; urutan: number }>>();
  for (const a of (alokasi.data ?? []) as unknown as { production_id: string; lots: { qc: string; lot_grades: { kg: number; grades: G }[] } | null }[]) {
    if (a.lots?.qc !== "lulus") continue;
    for (const g of a.lots.lot_grades) if (g.kg > 0) tambah(utuh, a.production_id, g.grades, g.kg);
  }
  const teks = (m?: Map<string, { gram: number; urutan: number }>) =>
    m ? [...m.entries()].sort((a, b) => a[1].urutan - b[1].urutan || a[0].localeCompare(b[0])).map(([k, v]) => `${k} ${(v.gram / 1000).toLocaleString("id-ID", { maximumFractionDigits: 3 })}`).join(", ") : "";
  return Object.fromEntries(ids.map((id) => [id, { loin: teks(loin.get(id)), utuh: teks(utuh.get(id)) }]));
}

/** Lot yang nggak ditahan dan masih bersisa, siap dialokasikan ke produksi. Lot yang belum digrading juga boleh diolah. */
export async function lotSiapProduksi(): Promise<LotSiap[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("lots")
    .select("id, kode, kg, qc, sisa_kg, jumlah_ekor, jenis_ikan, lot_ekor(spesies, batal), cycle_id, cycles(kode, nama), grade_id, grades(kode, nama), lot_grades(grade_id, kg, grades(kode)), suppliers(nama)")
    .neq("qc", "ditahan").gt("sisa_kg", 0).order("kode");
  if (error) gagal("daftar lot");
  const ids = (data ?? []).map((l) => l.id as string);
  // Berat yang lagi diolah (produksi belum disetujui Owner), cuma buat info di form. Sama kayak hitungan di Stok.
  const { data: alok, error: e2 } = ids.length > 0
    ? await sb.from("lot_allocations").select("lot_id, kg, productions!inner(status)").in("lot_id", ids).neq("productions.status", DISETUJUI)
    : { data: [], error: null };
  if (e2) gagal("daftar lot");
  const sedang = new Map<string, number>();
  for (const a of (alok ?? []) as { lot_id: string; kg: number }[]) sedang.set(a.lot_id, (sedang.get(a.lot_id) ?? 0) + Math.round(Number(a.kg) * 1000));
  return (data ?? []).map((l) => {
    const x = l as unknown as LotBaris & { suppliers: { nama: string } | null; cycles: { kode: string; nama?: string | null } | null };
    // Satu lot bisa beberapa grade (cek mutu); ditampilkan semua, terberat dulu.
    const kode = gradeLot(x).map((g) => g.kode).join(", ");
    return {
      id: x.id, kode: x.kode, sisa_kg: Number(x.sisa_kg), grade_kode: kode || null, supplier_nama: x.suppliers?.nama ?? "-", kg: Number(x.kg),
      jumlah_ekor: x.jumlah_ekor ?? null, cycle_id: x.cycle_id,
      sedang_kg: (sedang.get(x.id) ?? 0) / 1000, jenis: jenisLot(x.jenis_ikan, x.lot_ekor),
      proyek: x.cycles ? [x.cycles.kode, x.cycles.nama].filter(Boolean).join(" · ") : null,
    };
  });
}

/** Proyek yang masih terbuka, plus lini bisnis dan PT-nya (buat form produksi dan titipan). */
export async function proyekTerbuka(): Promise<ProyekOpsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("cycles").select("id, kode, nama, lini_bisnis, pt_id").eq("status", "terbuka").order("kode", { ascending: false }).limit(80);
  if (error) gagal("daftar proyek");
  return (data ?? []).map((c) => ({
    id: c.id as string, label: [c.kode, c.nama].filter(Boolean).join(" · "),
    lini_bisnis: (c.lini_bisnis ?? "jual") as ProyekOpsi["lini_bisnis"], pt_id: (c.pt_id as string | null) ?? null,
  }));
}

/** PT pemilik ikan buat jasa produksi dan titipan (diambil dari daftar pembeli). */
export async function daftarPT(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("buyers").select("id, nama").eq("aktif", true).order("nama");
  if (error) gagal("daftar PT");
  return (data ?? []).map((b) => ({ id: b.id as string, label: b.nama as string }));
}

export async function gradeProduksi(): Promise<Opsi[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("grades").select("id, kode, nama").eq("aktif", true).eq("jenis", "loin").order("urutan");
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
  total: LoinTotal[];
  ekor: Ekor[];
  samping: KomponenSamping[];
  riwayat: RiwayatLoin[];
  koreksi: Koreksi[];
  /** Lot asal (jumlah ekor dan grade tuna utuh), buat laporan produksi. */
  lotAsal: LotAsal[];
  /** Kondisi hasil buat stok otomatis, dan apa udah dikunci (stoknya udah ada yang keluar). */
  kondisi: { nilai: "fresh" | "beku"; terkunci: boolean };
};

export async function detailProduksi(id: string): Promise<DetailProduksi | null> {
  const sb = await createClient();
  const [p, alokasi, loin, total, ekor, samping, riwayat] = await Promise.all([
    sb.from("v_productions").select("*").eq("id", id).maybeSingle(),
    sb.from("lot_allocations").select("id, lot_id, lot_kode, kg").eq("production_id", id).order("lot_kode"),
    sb.from("production_items").select("id, no_ekor, no_loin, grade_id, kg, versi, batal, alasan_batal").eq("production_id", id).order("no_loin"),
    sb.from("production_loin_totals").select("id, grade_id, kg").eq("production_id", id),
    sb.from("production_fish").select("id, no_ekor, berat_utuh_kg").eq("production_id", id).order("no_ekor"),
    sb.from("production_components").select("id, category_id, kg").eq("production_id", id),
    sb.from("production_items_history").select("*").eq("production_id", id).order("id", { ascending: false }).limit(300),
  ]);
  if (p.error || alokasi.error || loin.error || total.error || ekor.error || samping.error || riwayat.error) gagal("detail produksi");
  if (!p.data) return null;
  const idLot = (alokasi.data ?? []).map((a) => a.lot_id as string);
  const [koreksi, lot, kondisi, keluar] = await Promise.all([
    riwayatKoreksi(["productions"], [id]),
    idLot.length > 0
      ? sb.from("lots").select("id, kode, kg, qc, jumlah_ekor, jenis_ikan, lot_ekor(spesies, batal), lot_grades(kg, grades(kode))").in("id", idLot)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    sb.from("productions").select("kondisi_hasil").eq("id", id).maybeSingle(),
    sb.from("storage_units").select("sisa_kg, kg_masuk").eq("production_id", id).eq("otomatis", true),
  ]);
  const lotAsal: LotAsal[] = ((lot.data ?? []) as { id: string; kode: string; kg: number; qc: string; jumlah_ekor: number | null; jenis_ikan: string | null; lot_ekor: { spesies: string; batal: boolean }[] | null; lot_grades: { kg: number; grades: { kode: string } | null }[] }[])
    .map((l) => ({
      id: l.id, kode: l.kode, kg: Number(l.kg), jumlah_ekor: l.jumlah_ekor, jenis: jenisLot(l.jenis_ikan, l.lot_ekor),
      grade: l.qc === "lulus" ? l.lot_grades.filter((g) => g.kg > 0).map((g) => ({ kode: g.grades?.kode ?? "?", kg: Number(g.kg) })) : [],
    }));
  return {
    koreksi,
    lotAsal,
    kondisi: {
      nilai: kondisi.data?.kondisi_hasil === "fresh" ? "fresh" : "beku",
      terkunci: (keluar.data ?? []).some((u) => Number(u.sisa_kg) < Number(u.kg_masuk)),
    },
    produksi: p.data as ProduksiBaris,
    alokasi: (alokasi.data ?? []) as AlokasiLot[],
    loin: (loin.data ?? []) as ItemLoin[],
    total: (total.data ?? []) as LoinTotal[],
    ekor: (ekor.data ?? []) as Ekor[],
    samping: (samping.data ?? []) as KomponenSamping[],
    riwayat: (riwayat.data ?? []) as RiwayatLoin[],
  };
}
