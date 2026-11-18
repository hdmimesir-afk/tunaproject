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
const Proyek = z.union([z.literal(""), z.literal("baru"), z.uuid("Proyeknya nggak valid")]);

const FormTerima = z.object({
  supplierId: z.uuid("Pilih pemasok atau nelayannya"),
  kg: Berat,
  tanggal: z.iso.date("Isi tanggalnya"),
  siklusId: Proyek,
  namaProyek: z.string().trim().max(120, "Nama proyeknya kepanjangan").optional(),
  catatan: z.string().trim().max(300),
});

/** Terima ikan tanpa PO. Proyek boleh dipilih, dibikin baru (pakai nama), atau dikosongkan. */
export async function terimaIkan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("penerimaan.write");
  if (tolak) return tolak;
  const p = FormTerima.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  if (p.data.siklusId === "baru" && !p.data.namaProyek) return { kolom: { namaProyek: ["Tulis nama proyeknya"] } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("terima_ikan", {
    p_supplier: p.data.supplierId, p_kg: p.data.kg, p_tanggal: p.data.tanggal,
    p_cycle: p.data.siklusId && p.data.siklusId !== "baru" ? p.data.siklusId : null,
    p_catatan: p.data.catatan, p_proyek_baru: p.data.siklusId === "baru" ? p.data.namaProyek : null,
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Ikan udah diterima. Lanjut grading ya." };
}

const FormMutu = z.object({
  lotId: z.uuid(),
  hasil: z.enum(["lulus", "ditahan"], "Isi grading-nya atau tandai ditahan"),
  baris: z.string().max(10_000).optional(),
  catatan: z.string().trim().max(300),
});

const BarisGrade = z.array(z.object({ grade_id: z.string(), kg: z.string().max(14) })).max(30);

/** Grading satu lot (berat per grade), atau tahan kalau ikannya gugur/bau. Di database "lulus" artinya udah digrading. */
export async function cekMutuLot(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("mutu.write");
  if (tolak) return tolak;
  const p = FormMutu.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const baris: { grade_id: string; kg: number }[] = [];
  if (p.data.hasil === "lulus") {
    let isian: z.infer<typeof BarisGrade>;
    try {
      isian = BarisGrade.parse(JSON.parse(p.data.baris ?? "[]"));
    } catch {
      return { error: "Data grade-nya nggak valid. Muat ulang halaman, terus coba lagi." };
    }
    for (const b of isian) {
      if (b.grade_id === "" && b.kg.trim() === "") continue;
      if (!z.uuid().safeParse(b.grade_id).success) return { kolom: { baris: ["Pilih grade di tiap baris yang diisi beratnya."] } };
      const g = keGram(b.kg);
      if (g === null) return { kolom: { baris: ["Berat tiap grade harus lebih dari nol, paling banyak tiga angka di belakang koma."] } };
      if (baris.some((x) => x.grade_id === b.grade_id)) return { kolom: { baris: ["Satu grade cuma boleh diisi sekali."] } };
      baris.push({ grade_id: b.grade_id, kg: g / 1000 });
    }
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
});

/** Koreksi data penerimaan. Kalau lotnya udah masuk pembelian, harga PO dihitung ulang dan bisa balik ke persetujuan. */
export async function koreksiLot(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("penerimaan.write");
  if (tolak) return tolak;
  const p = FormKoreksiLot.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("koreksi_lot", {
    p_lot: p.data.lotId, p_kg: p.data.kg, p_tanggal: p.data.tanggal, p_supplier: p.data.supplierId,
    p_cycle: p.data.siklusId || null, p_catatan: p.data.catatan, p_alasan: p.data.alasan,
  });
  if (error) return { error: pesanDb(error) };
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
