"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";
import type { HasilForm } from "./auth";

/* Setiap action: cek sesi dan izin, validasi Zod, lalu panggil tabel atau fungsi database.
   Aturan alur (status, total, batas bayar) dijaga fungsi database; di sini hanya pesan yang ramah. */

async function izin(aksi: string) {
  try {
    return { sesi: await requireIzin(aksi) };
  } catch (e) {
    if (e instanceof TidakBerizin) return { tolak: { error: e.message } satisfies NonNullable<HasilForm> };
    throw e;
  }
}

const bulatkan = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

const PemasokBaru = z.object({
  nama: z.string().trim().min(1, "Isi nama pemasok").max(120, "Nama terlalu panjang"),
  kontak: z.string().trim().max(120, "Kontak terlalu panjang"),
});

/** Tambah pemasok langsung dari form PO (masukan Mas Bisma: tidak perlu pindah ke Pengaturan). Izin sama dengan data master. */
export async function tambahPemasok(input: z.input<typeof PemasokBaru>): Promise<{ id?: string; label?: string; error?: string }> {
  const a = await izin("master.write");
  if (a.tolak) return a.tolak;
  const p = PemasokBaru.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Data pemasoknya nggak valid." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").insert({ nama: p.data.nama, kontak: p.data.kontak }).select("id, nama").single();
  if (error || !data) return { error: error?.code === "23505" ? "Nama pemasok ini udah ada. Pilih aja dari daftar." : pesanDb(error ?? {}) };
  refresh();
  return { id: data.id as string, label: data.nama as string };
}

/* PO sekarang lahir dari penerimaan (Mutu dan Penerimaan > Ajukan pembelian). Di sini cuma koreksi dan bayar. */

const FormKoreksiPO = z.object({
  poId: z.uuid(),
  supplierId: z.uuid("Pilih pemasok"),
  siklusId: z.union([z.literal(""), z.uuid("Proyeknya nggak valid")]),
  harga: z.string().max(5_000),
  catatan: z.string().trim().max(500, "Catatannya kepanjangan"),
  alasan: z.string().trim().min(1, "Tulis alasan koreksinya").max(500, "Alasannya kepanjangan"),
});
const HargaGrade = z.array(z.object({ grade_id: z.uuid(), harga_per_kg: z.coerce.number().positive("Harga harus lebih dari nol").max(100_000_000) })).max(30);

/** Koreksi pembelian: harga per grade, pemasok, proyek, catatan. Kalau total PO yang udah disetujui berubah, balik ke persetujuan. */
export async function koreksiPembelian(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const a = await izin("pembelian.write");
  if (a.tolak) return a.tolak;
  const p = FormKoreksiPO.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  let harga: z.infer<typeof HargaGrade>;
  try {
    harga = HargaGrade.parse(JSON.parse(p.data.harga || "[]"));
  } catch {
    return { kolom: { harga: ["Isi harga per kg yang valid buat tiap grade."] } };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("koreksi_pembelian", {
    p_po: p.data.poId, p_harga: harga.map((h) => ({ grade_id: h.grade_id, harga_per_kg: bulatkan(h.harga_per_kg, 2) })),
    p_supplier: p.data.supplierId, p_cycle: p.data.siklusId || null, p_catatan: p.data.catatan, p_alasan: p.data.alasan,
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Koreksi udah disimpan. Kalau totalnya berubah, pembelian ini balik nunggu persetujuan." };
}

const FormBatalBayar = z.object({
  bayarId: z.uuid(),
  alasan: z.string().trim().min(1, "Tulis alasan pembatalannya").max(500, "Alasannya kepanjangan"),
});

/** Batalkan pembayaran yang salah. Buku kas dapat baris pembalik; pembayaran yang benar dicatat ulang. */
export async function batalkanBayar(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const a = await izin("pembayaran.write");
  if (a.tolak) return a.tolak;
  const p = FormBatalBayar.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("batalkan_pembayaran", { p_payment: p.data.bayarId, p_alasan: p.data.alasan });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Pembayaran dibatalkan. Kalau nominalnya salah, catat lagi yang benar." };
}

const FormBayar = z.object({
  poId: z.uuid(),
  jumlah: z.coerce.number("Isi jumlah").positive("Jumlah harus lebih dari nol").max(100_000_000_000).transform((n) => bulatkan(n, 2)),
  tanggal: z.iso.date("Isi tanggal"),
  catatan: z.string().trim().max(300),
});

export async function catatBayar(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const a = await izin("pembayaran.write");
  if (a.tolak) return a.tolak;
  const p = FormBayar.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catat_bayar", { p_po: p.data.poId, p_jumlah: p.data.jumlah, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { id: data as string, pesan: "Pembayaran udah dicatat. Lampirkan bukti transfer kalau ada." };
}

/* ------------------------------------------------------------- dokumen */

const Berkas = z.object({
  refTabel: z.enum(["purchase_orders", "payments", "lots", "sales_orders", "invoices", "customer_payments", "expenses", "storage_units"]),
  refId: z.uuid(),
  jenis: z.enum(["nota", "bukti_transfer", "surat_jalan", "foto_timbangan", "tanda_terima", "tagihan", "invoice", "kwitansi", "lainnya"]),
  path: z.string().min(5).max(300).refine((p) => !p.includes("..") && !p.startsWith("/"), "Alamat berkas tidak valid"),
  namaAsli: z.string().trim().min(1).max(200),
  ukuran: z.number().int().positive().max(10 * 1024 * 1024),
  tipe: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
});
export type InputBerkas = z.input<typeof Berkas>;

/** Catat berkas yang sudah diunggah browser ke bucket privat. Unggahan dan pencatatan dijaga izin dokumen.write. */
export async function catatDokumen(input: InputBerkas): Promise<HasilForm> {
  const a = await izin("dokumen.write");
  if (a.tolak) return a.tolak;
  const p = Berkas.safeParse(input);
  if (!p.success) return { error: "Berkasnya nggak valid." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").insert({
    ref_tabel: p.data.refTabel, ref_id: p.data.refId, jenis: p.data.jenis, path: p.data.path,
    nama_asli: p.data.namaAsli, ukuran: p.data.ukuran, tipe: p.data.tipe,
  }).select("id").single();
  if (error || !data) return { error: pesanDb(error ?? {}) };
  refresh();
  return { id: data.id as string, pesan: "Berkas tersimpan." };
}

/** Alamat unduhan berumur 60 detik. Baris dokumen dan berkasnya sama-sama dibatasi izin dokumen.read. */
export async function urlDokumen(id: string): Promise<{ url?: string; error?: string }> {
  const a = await izin("dokumen.read");
  if (a.tolak) return { error: a.tolak.error };
  const uuid = z.uuid().safeParse(id);
  if (!uuid.success) return { error: "Berkasnya nggak valid." };
  const supabase = await createClient();
  const { data: baris } = await supabase.from("documents").select("path").eq("id", uuid.data).maybeSingle();
  if (!baris) return { error: "Berkasnya nggak ketemu." };
  const { data, error } = await supabase.storage.from("dokumen").createSignedUrl(baris.path as string, 60);
  if (error || !data) return { error: "Berkasnya nggak bisa dibuka." };
  return { url: data.signedUrl };
}
