/* Mencocokkan angka utama antara database asli dan hasil pemulihan cadangan (runbook: docs/pulih-cadangan.md).
   Pakai:  npm run cocokkan-pulih
   Butuh di .env.local (atau lingkungan):
     SUMBER_URL / SUMBER_SECRET_KEY   proyek asli
     PULIH_URL  / PULIH_SECRET_KEY    proyek tempat cadangan dipulihkan
   Hanya MEMBACA. Kunci rahasia tidak dicetak. Keluar dengan kode 1 bila ada angka yang berbeda. */
import { createClient } from "@supabase/supabase-js";

type Proyek = { nama: string; url: string; kunci: string };

function ambil(awalan: string, nama: string): Proyek {
  const url = process.env[`${awalan}_URL`];
  const kunci = process.env[`${awalan}_SECRET_KEY`];
  if (!url || !kunci?.startsWith("sb_secret_")) throw new Error(`Isi ${awalan}_URL dan ${awalan}_SECRET_KEY (sb_secret_...) untuk ${nama}.`);
  return { nama, url, kunci };
}

const TABEL = [
  "profiles", "suppliers", "buyers", "cycles", "purchase_orders", "lots", "payments", "productions", "production_items", "production_components",
  "storage_units", "storage_movements", "service_charges", "sales_orders", "sale_allocations", "invoices", "customer_payments", "expenses", "ledger", "documents", "activity_log",
];

async function ukur(p: Proyek) {
  const sb = createClient(p.url, p.kunci, { auth: { persistSession: false, autoRefreshToken: false } });
  const hasil: Record<string, string> = {};
  for (const t of TABEL) {
    const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
    hasil[`baris ${t}`] = error ? `GALAT: ${error.message}` : String(count);
  }
  const jumlah = async (tabel: string, kolom: string, saring?: (q: ReturnType<typeof sb.from>) => unknown) => {
    const q = sb.from(tabel).select(kolom);
    const { data, error } = await (saring ? (saring(q as never) as typeof q) : q);
    if (error) return `GALAT: ${error.message}`;
    return ((data ?? []) as unknown as Record<string, number | string>[]).reduce((a, r) => a + Math.round(Number(r[kolom]) * 1000), 0) / 1000;
  };
  hasil["total PO (Rp)"] = String(await jumlah("purchase_orders", "total"));
  hasil["total bayar pemasok (Rp)"] = String(await jumlah("payments", "jumlah"));
  hasil["total invoice (Rp)"] = String(await jumlah("invoices", "total"));
  hasil["total uang masuk pembeli (Rp)"] = String(await jumlah("customer_payments", "jumlah"));
  hasil["total buku kas (Rp)"] = String(await jumlah("ledger", "jumlah"));
  hasil["total berat lot (kg)"] = String(await jumlah("lots", "kg"));
  hasil["total berat loin (kg)"] = String(await jumlah("production_items", "kg"));
  hasil["sisa stok (kg)"] = String(await jumlah("storage_units", "sisa_kg"));
  return hasil;
}

async function main() {
  const [a, b] = [ambil("SUMBER", "proyek asli"), ambil("PULIH", "proyek pulihan")];
  if (a.url === b.url) throw new Error("Proyek asli dan pulihan tidak boleh sama.");
  const [x, y] = await Promise.all([ukur(a), ukur(b)]);
  let beda = 0;
  console.log("Angka utama: asli | pulihan");
  for (const k of Object.keys(x)) {
    const sama = x[k] === y[k];
    if (!sama) beda++;
    console.log(`${sama ? "OK    " : "BEDA  "} ${k}: ${x[k]} | ${y[k]}`);
  }
  console.log(beda === 0 ? "\nSemua angka utama cocok." : `\n${beda} angka berbeda. Pemulihan belum bisa dianggap berhasil.`);
  process.exit(beda === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
