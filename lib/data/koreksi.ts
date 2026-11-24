import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Satu koreksi data: alasan, siapa, kapan, dan isian sebelum/sesudahnya. */
export type Koreksi = {
  id: string;
  tabel: "lots" | "purchase_orders" | "payments" | "productions" | "cycles" | "expenses" | "sales_orders" | "customer_payments" | "storage_units" | "service_items";
  ref_id: string;
  kode: string;
  alasan: string;
  sebelum: Record<string, unknown>;
  sesudah: Record<string, unknown>;
  oleh: string | null;
  pada: string;
};

/** Riwayat koreksi beberapa catatan sekaligus, terbaru dulu. RLS menyaring koreksi yang memuat harga. */
export async function riwayatKoreksi(tabel: Koreksi["tabel"][], ids: string[]): Promise<Koreksi[]> {
  if (ids.length === 0) return [];
  const sb = await createClient();
  const { data, error } = await sb.from("koreksi_data").select("*").in("tabel", tabel).in("ref_id", ids).order("pada", { ascending: false }).limit(200);
  if (error) return [];
  return (data ?? []) as Koreksi[];
}
