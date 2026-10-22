"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { boleh } from "@/lib/izin";
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

const FormPO = z.object({
  supplierId: z.uuid("Pilih pemasok"),
  siklusId: z.string().trim().optional(),
  tanggal: z.iso.date("Isi tanggal"),
  kg: z.coerce.number("Isi berat").positive("Berat harus lebih dari nol").max(10_000_000, "Berat terlalu besar").transform((n) => bulatkan(n, 3)),
  hargaPerKg: z.coerce.number("Isi harga").positive("Harga harus lebih dari nol").max(100_000_000, "Harga terlalu besar").transform((n) => bulatkan(n, 2)),
  catatan: z.string().trim().max(500, "Catatan terlalu panjang"),
});

/** Buat PO baru (tanpa id) atau ubah PO yang masih draf atau perlu revisi (dengan id). */
export async function simpanPO(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const a = await izin("pembelian.write");
  if (a.tolak) return a.tolak;
  const p = FormPO.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const supabase = await createClient();

  let cycleId: string | null = null;
  if (p.data.siklusId === "baru") {
    if (!boleh(a.sesi, "siklus.write")) return { error: "Peran Anda tidak boleh membuat siklus baru. Pilih siklus yang sudah ada." };
    const { data, error } = await supabase.from("cycles").insert({ tanggal_bongkar: p.data.tanggal }).select("id").single();
    if (error || !data) return { error: pesanDb(error ?? {}) };
    cycleId = data.id as string;
  } else if (p.data.siklusId) {
    const id = z.uuid().safeParse(p.data.siklusId);
    if (!id.success) return { kolom: { siklusId: ["Siklus tidak valid"] } };
    cycleId = id.data;
  }

  const isi = { supplier_id: p.data.supplierId, cycle_id: cycleId, tanggal: p.data.tanggal, kg: p.data.kg, harga_per_kg: p.data.hargaPerKg, catatan: p.data.catatan };
  const id = fd.get("id");
  if (typeof id === "string" && id) {
    const { data, error } = await supabase.from("purchase_orders").update(isi).eq("id", id).select("id");
    if (error) return { error: pesanDb(error) };
    if (!data?.length) return { error: "PO ini sudah diajukan atau tidak ditemukan, jadi tidak bisa diubah." };
    refresh();
    return { id, pesan: "PO disimpan." };
  }
  const { data, error } = await supabase.from("purchase_orders").insert(isi).select("id").single();
  if (error || !data) return { error: pesanDb(error ?? {}) };
  refresh();
  return { id: data.id as string, pesan: "PO dibuat sebagai draf. Lampirkan nota, lalu ajukan." };
}

export async function ajukanPO(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const a = await izin("pembelian.write");
  if (a.tolak) return a.tolak;
  const id = z.uuid().safeParse(fd.get("poId"));
  if (!id.success) return { error: "PO tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("ajukan_po", { p_po: id.data });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "PO diajukan. Menunggu diperiksa Finance." };
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
  return { id: data as string, pesan: "Pembayaran dicatat. Lampirkan bukti transfer bila ada." };
}

/* ------------------------------------------------------------- dokumen */

const Berkas = z.object({
  refTabel: z.enum(["purchase_orders", "payments", "lots"]),
  refId: z.uuid(),
  jenis: z.enum(["nota", "bukti_transfer", "surat_jalan", "foto_timbangan", "lainnya"]),
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
  if (!p.success) return { error: "Berkas tidak valid." };
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
  if (!uuid.success) return { error: "Berkas tidak valid." };
  const supabase = await createClient();
  const { data: baris } = await supabase.from("documents").select("path").eq("id", uuid.data).maybeSingle();
  if (!baris) return { error: "Berkas tidak ditemukan." };
  const { data, error } = await supabase.storage.from("dokumen").createSignedUrl(baris.path as string, 60);
  if (error || !data) return { error: "Berkas tidak bisa dibuka." };
  return { url: data.signedUrl };
}
