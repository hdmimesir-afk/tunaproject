import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hariIni } from "@/lib/format";

/* Laporan harian buat Owner di Dashboard: ikan masuk, produksi, stok siap jual, penjualan, dan uang, satu periode.
   Tiap bagian cuma diambil kalau peran ini boleh lihat (sisanya null). Semua lewat klien pengguna, jadi RLS berlaku.
   Berat dihitung dalam gram bulat biar nggak meleset. */

export type Periode = "hari" | "kemarin" | "7hari";

export type LaporanHarian = {
  periode: Periode;
  dari: string;
  sampai: string;
  ikan: { kg: number; lot: number; ekor: number; pemasok: string[] } | null;
  produksi: { jumlah: number; masukKg: number; loinKg: number; sampingKg: number; berjalan: number; menunggu: number; disetujui: number } | null;
  stok: { kg: number; perJenis: { nama: string; kg: number }[] } | null;
  jual: { kg: number; nilai: number; pesanan: number; pembeli: string[] } | null;
  uang: { masuk: number; keluar: number } | null;
};

const gram = (n: unknown) => Math.round(Number(n ?? 0) * 1000);
const kg = (g: number) => g / 1000;

/** Tanggal (YYYY-MM-DD, WIB) mundur n hari. */
function mundur(tgl: string, n: number) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

export function rentang(periode: Periode): { dari: string; sampai: string } {
  const hari = hariIni();
  if (periode === "kemarin") return { dari: mundur(hari, 1), sampai: mundur(hari, 1) };
  if (periode === "7hari") return { dari: mundur(hari, 6), sampai: hari };
  return { dari: hari, sampai: hari };
}

export async function laporanHarian(periode: Periode, izin: { mutu: boolean; produksi: boolean; stok: boolean; penjualan: boolean; keuangan: boolean }): Promise<LaporanHarian> {
  const sb = await createClient();
  const { dari, sampai } = rentang(periode);
  const awalWaktu = `${dari}T00:00:00+07:00`;
  const akhirWaktu = `${sampai}T23:59:59.999+07:00`;
  const kosong = Promise.resolve(null);

  const [lots, prd, stok, jual, kas] = await Promise.all([
    izin.mutu ? sb.from("lots").select("kg, jumlah_ekor, suppliers(nama)").gte("tanggal_terima", dari).lte("tanggal_terima", sampai) : kosong,
    izin.produksi ? sb.from("v_productions").select("status, masuk_kg, loin_kg, samping_kg").gte("tanggal", dari).lte("tanggal", sampai) : kosong,
    izin.stok ? sb.from("storage_units").select("product_nama, grade_kode, sisa_kg").eq("status", "aktif").is("buyer_id", null).gt("sisa_kg", 0) : kosong,
    izin.penjualan
      ? sb.from("sales_orders").select("buyer_nama, sale_allocations(kg_kirim, harga_per_kg, batal)").not("dikirim_pada", "is", null).gte("dikirim_pada", awalWaktu).lte("dikirim_pada", akhirWaktu)
      : kosong,
    izin.keuangan ? sb.from("ledger").select("arah, jumlah").gte("tanggal", dari).lte("tanggal", sampai) : kosong,
  ]);

  let ikan: LaporanHarian["ikan"] = null;
  if (lots && !lots.error) {
    const rows = (lots.data ?? []) as unknown as { kg: number; jumlah_ekor: number | null; suppliers: { nama: string } | null }[];
    ikan = {
      kg: kg(rows.reduce((a, r) => a + gram(r.kg), 0)),
      lot: rows.length,
      ekor: rows.reduce((a, r) => a + (r.jumlah_ekor ?? 0), 0),
      pemasok: [...new Set(rows.map((r) => r.suppliers?.nama).filter((x): x is string => !!x))],
    };
  }

  let produksi: LaporanHarian["produksi"] = null;
  if (prd && !prd.error) {
    const rows = (prd.data ?? []) as { status: string; masuk_kg: number; loin_kg: number; samping_kg: number }[];
    produksi = {
      jumlah: rows.length,
      masukKg: kg(rows.reduce((a, r) => a + gram(r.masuk_kg), 0)),
      loinKg: kg(rows.reduce((a, r) => a + gram(r.loin_kg), 0)),
      sampingKg: kg(rows.reduce((a, r) => a + gram(r.samping_kg), 0)),
      berjalan: rows.filter((r) => r.status === "berjalan").length,
      menunggu: rows.filter((r) => r.status === "selesai" || r.status === "diperiksa_qc").length,
      disetujui: rows.filter((r) => r.status === "diperiksa").length,
    };
  }

  let stokSiap: LaporanHarian["stok"] = null;
  if (stok && !stok.error) {
    const rows = (stok.data ?? []) as { product_nama: string; grade_kode: string | null; sisa_kg: number }[];
    const peta = new Map<string, number>();
    for (const r of rows) {
      const nama = r.grade_kode ? `${r.product_nama} ${r.grade_kode}` : r.product_nama;
      peta.set(nama, (peta.get(nama) ?? 0) + gram(r.sisa_kg));
    }
    stokSiap = {
      kg: kg(rows.reduce((a, r) => a + gram(r.sisa_kg), 0)),
      perJenis: [...peta.entries()].sort((a, b) => b[1] - a[1]).map(([nama, g]) => ({ nama, kg: kg(g) })),
    };
  }

  let penjualan: LaporanHarian["jual"] = null;
  if (jual && !jual.error) {
    const rows = (jual.data ?? []) as unknown as { buyer_nama: string; sale_allocations: { kg_kirim: number | null; harga_per_kg: number; batal: boolean }[] }[];
    let g = 0;
    let sen = 0;
    for (const o of rows) for (const a of o.sale_allocations ?? []) {
      if (a.batal || !a.kg_kirim) continue;
      g += gram(a.kg_kirim);
      sen += Math.round(Number(a.kg_kirim) * Number(a.harga_per_kg) * 100);
    }
    penjualan = { kg: kg(g), nilai: sen / 100, pesanan: rows.length, pembeli: [...new Set(rows.map((r) => r.buyer_nama).filter(Boolean))] };
  }

  let uang: LaporanHarian["uang"] = null;
  if (kas && !kas.error) {
    const rows = (kas.data ?? []) as { arah: "masuk" | "keluar"; jumlah: number }[];
    const sen = (arah: string) => rows.filter((r) => r.arah === arah).reduce((a, r) => a + Math.round(Number(r.jumlah) * 100), 0) / 100;
    uang = { masuk: sen("masuk"), keluar: sen("keluar") };
  }

  return { periode, dari, sampai, ikan, produksi, stok: stokSiap, jual: penjualan, uang };
}
