"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { keGram } from "@/lib/logic/grid";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";
import type { HasilForm } from "./auth";

/* Alur baru (training 17 Nov): ikan diterima dulu tanpa PO, digrading (grading tuna utuh = dasar harga ke nelayan),
   terus diajukan pembeliannya dengan harga per grade. PO-nya baru terbit waktu disetujui. */

async function izin(aksi: string): Promise<HasilForm | null> {
  try {
    await requireIzin(aksi);
    return null;
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
}

const Berat = z.coerce.number("Isi beratnya").positive("Berat harus lebih dari nol").max(10_000_000, "Beratnya kebesaran").transform((n) => Math.round(n * 1000) / 1000);

const FormTerima = z.object({
  supplierId: z.uuid("Pilih pemasok atau nelayannya"),
  cara: z.enum(["total", "ekor"]).default("total"),
  kg: z.string().max(14).optional(),
  jumlahEkor: z.string().max(7).optional(),
  tanggal: z.iso.date("Isi tanggalnya"),
  catatan: z.string().trim().max(300),
  /** Grading langsung (berat total): JSON [{grade_id, kg}]. */
  baris: z.string().max(10_000).optional(),
  /** Per ekor: JSON [{id, no_tag, spesies, kg, grade_id, gancu}]. */
  ekor: z.string().max(200_000).optional(),
  kapal: z.string().trim().max(80, "Nama kapal maksimal 80 huruf").default(""),
  jenis: z.string().trim().max(40, "Jenis ikan maksimal 40 huruf").default(""),
  /** Kunci anti dobel: dibuat sekali tiap form dibuka. Kirim ulang (klik dua kali, retry) = lot yang sama. */
  kunci: z.uuid("Muat ulang halaman, terus coba lagi."),
});

const EkorRpc = z.array(z.object({
  id: z.uuid().nullable(),
  no_tag: z.string().max(30, "Nomor tag kepanjangan"),
  spesies: z.string().max(40, "Spesies kepanjangan"),
  kg: z.number().positive("Berat tiap ekor harus lebih dari nol").max(10_000),
  grade_id: z.uuid().nullable(),
  gancu: z.number().int().min(0).max(50),
})).max(500, "Maksimal 500 ekor sekali catat");

function bacaEkor(teks: string | undefined): { ekor?: z.infer<typeof EkorRpc>; error?: string } {
  try {
    const p = EkorRpc.safeParse(JSON.parse(teks || "[]"));
    if (!p.success) return { error: p.error.issues[0]?.message ?? "Data ekornya nggak valid." };
    return { ekor: p.data };
  } catch {
    return { error: "Data ekornya nggak valid. Muat ulang halaman, terus coba lagi." };
  }
}

/** Ubah isian grade (JSON dari IsianGrade) jadi baris buat database, atau pesan salah. */
function bacaGrade(teks: string | undefined): { baris: { grade_id: string; kg: number }[]; error?: string } {
  let isian: z.infer<typeof BarisGrade>;
  try {
    isian = BarisGrade.parse(JSON.parse(teks ?? "[]"));
  } catch {
    return { baris: [], error: "Data grade-nya nggak valid. Muat ulang halaman, terus coba lagi." };
  }
  const baris: { grade_id: string; kg: number }[] = [];
  for (const b of isian) {
    if (b.grade_id === "" && b.kg.trim() === "") continue;
    if (!z.uuid().safeParse(b.grade_id).success) return { baris, error: "Pilih grade di tiap baris yang diisi beratnya." };
    const g = keGram(b.kg);
    if (g === null) return { baris, error: "Berat tiap grade harus lebih dari nol, paling banyak tiga angka di belakang koma." };
    if (baris.some((x) => x.grade_id === b.grade_id)) return { baris, error: "Satu grade cuma boleh diisi sekali." };
    baris.push({ grade_id: b.grade_id, kg: g / 1000 });
  }
  return { baris };
}

/** Terima ikan tanpa PO, cara berat total atau per ekor. Grading boleh sekalian (butuh izin mutu). Proyeknya dipilih nanti di Produksi. */
export async function terimaIkan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("penerimaan.write");
  if (tolak) return tolak;
  const p = FormTerima.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const d = p.data;

  let kg: number | null = null;
  let jumlahEkor: number | null = null;
  let grade: { grade_id: string; kg: number }[] = [];
  let ekor: z.infer<typeof EkorRpc> | null = null;
  if (d.cara === "ekor") {
    const b = bacaEkor(d.ekor);
    if (b.error) return { kolom: { ekor: [b.error] } };
    if (!b.ekor || b.ekor.length === 0) return { kolom: { ekor: ["Isi minimal satu ekor."] } };
    ekor = b.ekor;
  } else {
    const g = keGram(d.kg ?? "");
    if (g === null) return { kolom: { kg: ["Isi beratnya, lebih dari nol"] } };
    kg = g / 1000;
    if (d.jumlahEkor && d.jumlahEkor.trim() !== "") {
      const n = Number(d.jumlahEkor);
      if (!Number.isInteger(n) || n <= 0) return { kolom: { jumlahEkor: ["Isi angka bulat, atau kosongin"] } };
      jumlahEkor = n;
    }
    const gr = bacaGrade(d.baris);
    if (gr.error) return { kolom: { baris: [gr.error] } };
    grade = gr.baris;
  }
  if ((grade.length > 0 || ekor?.some((e) => e.grade_id)) && (await izin("mutu.write"))) {
    return { error: "Peran ini nggak punya izin grading. Kosongin grade-nya, nanti QC yang grading." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("terima_ikan_lengkap", {
    p_supplier: d.supplierId, p_tanggal: d.tanggal,
    p_cycle: null, p_catatan: d.catatan, p_proyek_baru: null,
    p_kg: kg, p_jumlah_ekor: jumlahEkor, p_ekor: ekor, p_grade: grade.length > 0 ? grade : null,
    p_kapal: d.kapal, p_jenis: d.cara === "ekor" ? "" : d.jenis, p_kunci: d.kunci,
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  const digrading = grade.length > 0 || (ekor !== null && ekor.length > 0 && ekor.every((e) => e.grade_id));
  return { pesan: digrading ? "Ikan udah diterima dan digrading. Tinggal ajukan pembeliannya." : "Ikan udah diterima. Lanjut grading ya." };
}

const FormMutu = z.object({
  lotId: z.uuid(),
  hasil: z.enum(["lulus", "ditahan"], "Isi grading-nya atau tandai ditahan"),
  baris: z.string().max(10_000).optional(),
  catatan: z.string().trim().max(300),
  /** Lot per ekor: grading-nya diambil dari grade tiap ekor di database. */
  perEkor: z.string().optional(),
});

const BarisGrade = z.array(z.object({ grade_id: z.string(), kg: z.string().max(14) })).max(30);

/** Grading satu lot (berat per grade), atau tahan kalau ikannya gugur/bau. Di database "lulus" artinya udah digrading. */
export async function cekMutuLot(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("mutu.write");
  if (tolak) return tolak;
  const p = FormMutu.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  let baris: { grade_id: string; kg: number }[] = [];
  if (p.data.hasil === "lulus" && p.data.perEkor !== "1") {
    const gr = bacaGrade(p.data.baris);
    if (gr.error) return { kolom: { baris: [gr.error] } };
    baris = gr.baris;
    if (baris.length === 0) return { kolom: { baris: ["Isi berat minimal buat satu grade."] } };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cek_mutu_grade", {
    p_lot: p.data.lotId, p_hasil: p.data.hasil, p_baris: baris, p_catatan: p.data.catatan,
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: p.data.hasil === "lulus" ? "Grading udah disimpan." : "Lot ditahan." };
}

const FormKoreksiLot = z.object({
  lotId: z.uuid(),
  kg: Berat,
  tanggal: z.iso.date("Isi tanggalnya"),
  supplierId: z.uuid("Pilih pemasok atau nelayannya"),
  siklusId: z.union([z.literal(""), z.uuid("Proyeknya nggak valid")]),
  catatan: z.string().trim().max(300),
  alasan: z.string().trim().min(1, "Tulis alasan koreksinya").max(500, "Alasannya kepanjangan"),
  jumlahEkor: z.string().max(7).optional(),
  /** Lot per ekor: JSON isian ekor yang baru. Berat lot ngikut ekornya. */
  ekor: z.string().max(200_000).optional(),
  kapal: z.string().trim().max(80, "Nama kapal maksimal 80 huruf").optional(),
  jenis: z.string().trim().max(40, "Jenis ikan maksimal 40 huruf").optional(),
});

/** Koreksi data penerimaan. Lot per ekor: ekornya dikoreksi dulu, beratnya ngikut. Kalau udah masuk pembelian, harga PO dihitung ulang. */
export async function koreksiLot(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("penerimaan.write");
  if (tolak) return tolak;
  const p = FormKoreksiLot.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const d = p.data;
  const supabase = await createClient();

  if (d.ekor) {
    const b = bacaEkor(d.ekor);
    if (b.error || !b.ekor || b.ekor.length === 0) return { kolom: { ekor: [b.error ?? "Isi minimal satu ekor."] } };
    const { error } = await supabase.rpc("koreksi_ekor", { p_lot: d.lotId, p_ekor: b.ekor, p_alasan: d.alasan });
    if (error) return { error: pesanDb(error) };
    // Berat lot udah ngikut ekornya; sisanya (tanggal, pemasok, proyek, catatan) lewat koreksi lot dengan berat yang baru.
    const { data: lot } = await supabase.from("lots").select("kg").eq("id", d.lotId).single();
    const { error: e2 } = await supabase.rpc("koreksi_lot", {
      p_lot: d.lotId, p_kg: lot?.kg ?? d.kg, p_tanggal: d.tanggal, p_supplier: d.supplierId,
      p_cycle: d.siklusId || null, p_catatan: d.catatan, p_alasan: d.alasan, p_kapal: d.kapal ?? null, p_jenis: null,
    });
    if (e2) return { error: `Ekornya udah dikoreksi, tapi data lainnya gagal: ${pesanDb(e2)}` };
  } else {
    const t = d.jumlahEkor?.trim() ?? "";
    const n = t === "" ? null : Number(t);
    if (n !== null && (!Number.isInteger(n) || n <= 0)) return { kolom: { jumlahEkor: ["Isi angka bulat, atau kosongin"] } };
    const { error } = await supabase.rpc("koreksi_lot", {
      p_lot: d.lotId, p_kg: d.kg, p_tanggal: d.tanggal, p_supplier: d.supplierId,
      p_cycle: d.siklusId || null, p_catatan: d.catatan, p_alasan: d.alasan, p_kapal: d.kapal ?? null, p_jenis: d.jenis ?? null,
    });
    if (error) return { error: pesanDb(error) };
    if (d.jumlahEkor !== undefined) {
      const { error: e2 } = await supabase.rpc("isi_ekor_lot", { p_lot: d.lotId, p_jumlah: n, p_alasan: d.alasan });
      if (e2) return { error: pesanDb(e2) };
    }
  }
  refresh();
  return { pesan: "Koreksi udah disimpan." };
}

const FormAjukan = z.object({
  lot: z.array(z.uuid()).min(1, "Pilih minimal satu lot").max(50),
  harga: z.array(z.object({ grade_id: z.uuid(), harga_per_kg: z.number().positive("Harga harus lebih dari nol").max(100_000_000) })).min(1).max(30),
  notaMenyusul: z.boolean(),
  catatan: z.string().trim().max(500),
});

/** Ajukan pembelian dari lot yang udah digrading, harga per grade. PO-nya terbit waktu disetujui. */
export async function ajukanPembelian(input: z.input<typeof FormAjukan>): Promise<HasilForm> {
  const tolak = await izin("pembelian.write");
  if (tolak) return tolak;
  const p = FormAjukan.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Isiannya belum lengkap." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ajukan_pembelian", {
    p_lots: p.data.lot,
    p_harga: p.data.harga.map((h) => ({ grade_id: h.grade_id, harga_per_kg: Math.round(h.harga_per_kg * 100) / 100 })),
    p_nota_menyusul: p.data.notaMenyusul, p_catatan: p.data.catatan,
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { id: data as string, pesan: "Pembelian udah diajukan. Tinggal nunggu disetujui, PO-nya terbit habis itu." };
}
