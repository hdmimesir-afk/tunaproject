import "server-only";
import { hariIni } from "@/lib/format";
import { hitungBep, hitungMargin, hitungSaldo, ringkasAbsen, type BarisAbsen, type ProyekLaba } from "@/lib/logic/dashboardOwner";
import { createClient } from "@/lib/supabase/server";
import type { BarisLabaSiklus } from "@/lib/types/keuangan";
import type { JenisDokumen, RefDokumen } from "@/lib/types/pembelian";

/* Bahan tambahan dashboard owner (permintaan owner 23 Nov 2026): saldo, margin, balik modal, absensi hari ini, CCTV,
   foto timbangan, dan lampiran (invoice, kwitansi, bukti bayar). Tiap bagian cuma diambil kalau izinnya ada.
   Kalau satu bagian gagal dimuat, bagian itu kosong aja, dashboard tetap tampil. */

export type IzinOwner = { keuangan: boolean; laporan: boolean; dokumen: boolean; absensi: boolean; cctv: boolean };

export type FotoTimbangan = { id: string; url: string; lot: string; waktu: string };
export type LampiranOwner = { id: string; jenis: JenisDokumen; nama: string; ref: string; waktu: string };

export type DataOwner = {
  saldo: { saldo: number; saldoAwal: number; masuk: number; keluar: number; terakhir: string | null } | null;
  margin: ReturnType<typeof hitungMargin> | null;
  bep: ReturnType<typeof hitungBep> | null;
  absensi: (ReturnType<typeof ringkasAbsen> & { tanggal: string }) | null;
  /** Semua link CCTV (aktif dan nonaktif) buat diatur owner; yg tampil di dashboard cuma yg aktif. */
  cctv: { id: string; nama: string; url: string; urutan: number; aktif: boolean }[];
  foto: FotoTimbangan[];
  lampiran: LampiranOwner[];
};

const angka = (v: unknown) => {
  const n = Number(typeof v === "string" ? v : v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const REF_LABEL: Partial<Record<RefDokumen, string>> = {
  payments: "Bayar nelayan", customer_payments: "Bayar dari pembeli", invoices: "Invoice", purchase_orders: "Pembelian",
  expenses: "Biaya", sales_orders: "Penjualan", storage_units: "Titipan gudang", lots: "Penerimaan",
};

async function aman<T>(p: PromiseLike<T>, kosong: T): Promise<T> {
  try {
    return await p;
  } catch {
    return kosong;
  }
}

export async function dataOwner(izin: IzinOwner, tren: BarisLabaSiklus[]): Promise<DataOwner> {
  const sb = await createClient();
  const tgl = hariIni();

  const saldoP = izin.keuangan
    ? aman((async () => {
        const [v, s] = await Promise.all([
          sb.from("v_saldo_kas").select("saldo_buku, total_masuk, total_keluar, tanggal_terakhir").maybeSingle(),
          sb.from("settings").select("nilai").eq("kunci", "saldo_awal_kas_rp").maybeSingle(),
        ]);
        if (v.error || !v.data) return null;
        const awal = angka(s.data?.nilai);
        return { saldo: hitungSaldo(awal, angka(v.data.saldo_buku)), saldoAwal: awal, masuk: angka(v.data.total_masuk), keluar: angka(v.data.total_keluar), terakhir: (v.data.tanggal_terakhir as string | null) ?? null };
      })(), null)
    : Promise.resolve(null);

  const labaP = izin.laporan
    ? aman((async () => {
        const [c, m] = await Promise.all([
          sb.from("cycles").select("id, tanggal_bongkar, dibuat_pada"),
          sb.from("settings").select("nilai").eq("kunci", "modal_usaha_rp").maybeSingle(),
        ]);
        const tanggal = new Map(((c.data ?? []) as { id: string; tanggal_bongkar: string | null; dibuat_pada: string }[])
          .map((x) => [x.id, x.tanggal_bongkar ?? x.dibuat_pada.slice(0, 10)]));
        const proyek: ProyekLaba[] = tren.map((t) => ({
          pendapatan: angka(t.pendapatan_total), biaya: angka(t.biaya_total), laba: angka(t.laba_kotor), tanggal: tanggal.get(t.cycle_id) ?? tgl,
        }));
        return { margin: hitungMargin(proyek), bep: hitungBep(angka(m.data?.nilai), proyek, tgl) };
      })(), { margin: null, bep: null } as Pick<DataOwner, "margin" | "bep">)
    : Promise.resolve({ margin: null, bep: null } as Pick<DataOwner, "margin" | "bep">);

  const absenP = izin.absensi
    ? aman((async () => {
        const { data, error } = await sb.rpc("absensi_harian", { p_tanggal: tgl });
        if (error) return null;
        return { ...ringkasAbsen((data ?? []) as BarisAbsen[]), tanggal: tgl };
      })(), null)
    : Promise.resolve(null);

  const cctvP = izin.cctv
    ? aman((async () => {
        const { data } = await sb.from("cctv_links").select("id, nama, url, urutan, aktif").order("aktif", { ascending: false }).order("urutan").order("nama");
        return (data ?? []) as DataOwner["cctv"];
      })(), [])
    : Promise.resolve([]);

  const fotoP = izin.dokumen
    ? aman((async () => {
        const { data } = await sb.from("documents").select("id, ref_id, path, tipe, dibuat_pada")
          .eq("jenis", "foto_timbangan").like("tipe", "image/%").order("dibuat_pada", { ascending: false }).limit(8);
        const baris = (data ?? []) as { id: string; ref_id: string; path: string; tipe: string; dibuat_pada: string }[];
        if (baris.length === 0) return [];
        const [lot, url] = await Promise.all([
          sb.from("lots").select("id, kode").in("id", [...new Set(baris.map((b) => b.ref_id))]),
          sb.storage.from("dokumen").createSignedUrls(baris.map((b) => b.path), 60 * 30),
        ]);
        const kode = new Map(((lot.data ?? []) as { id: string; kode: string }[]).map((l) => [l.id, l.kode]));
        const link = new Map((url.data ?? []).map((u) => [u.path, u.signedUrl]));
        return baris.flatMap((b) => {
          const u = link.get(b.path);
          return u ? [{ id: b.id, url: u, lot: kode.get(b.ref_id) ?? "-", waktu: b.dibuat_pada }] : [];
        });
      })(), [] as FotoTimbangan[])
    : Promise.resolve([] as FotoTimbangan[]);

  const lampiranP = izin.dokumen
    ? aman((async () => {
        const { data } = await sb.from("documents").select("id, ref_tabel, jenis, nama_asli, dibuat_pada")
          .in("jenis", ["invoice", "kwitansi", "bukti_transfer", "nota", "tagihan"]).order("dibuat_pada", { ascending: false }).limit(12);
        return ((data ?? []) as { id: string; ref_tabel: RefDokumen; jenis: JenisDokumen; nama_asli: string; dibuat_pada: string }[])
          .map((d) => ({ id: d.id, jenis: d.jenis, nama: d.nama_asli, ref: REF_LABEL[d.ref_tabel] ?? "-", waktu: d.dibuat_pada }));
      })(), [] as LampiranOwner[])
    : Promise.resolve([] as LampiranOwner[]);

  const [saldo, laba, absensi, cctv, foto, lampiran] = await Promise.all([saldoP, labaP, absenP, cctvP, fotoP, lampiranP]);
  return { saldo, margin: laba.margin, bep: laba.bep, absensi, cctv, foto, lampiran };
}
