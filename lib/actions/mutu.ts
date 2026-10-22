"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";
import type { HasilForm } from "./auth";

async function izin(aksi: string): Promise<HasilForm | null> {
  try {
    await requireIzin(aksi);
    return null;
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
}

const FormTerima = z.object({
  poId: z.uuid("Pilih PO"),
  kg: z.coerce.number("Isi berat").positive("Berat harus lebih dari nol").max(10_000_000).transform((n) => Math.round(n * 1000) / 1000),
  catatan: z.string().trim().max(300),
  sebelumDisetujui: z.string().optional(),
});

/** Terima ikan dari satu PO (boleh sebagian dan berulang). Bongkar malam: boleh sebelum PO disetujui, dengan tanda. */
export async function terimaIkan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("penerimaan.write");
  if (tolak) return tolak;
  const p = FormTerima.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("terima_po", {
    p_po: p.data.poId, p_kg: p.data.kg, p_catatan: p.data.catatan, p_sebelum_disetujui: p.data.sebelumDisetujui === "on",
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Ikan diterima. Lanjut cek mutu." };
}

const FormMutu = z.object({
  lotId: z.uuid(),
  hasil: z.enum(["lulus", "ditahan"], "Pilih lulus atau ditahan"),
  gradeId: z.string().trim().optional(),
  catatan: z.string().trim().max(300),
});

export async function cekMutuLot(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("mutu.write");
  if (tolak) return tolak;
  const p = FormMutu.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const grade = p.data.hasil === "lulus" ? z.uuid("Pilih kelas mutu").safeParse(p.data.gradeId) : null;
  if (grade && !grade.success) return { kolom: { gradeId: ["Pilih kelas mutu"] } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cek_mutu", {
    p_lot: p.data.lotId, p_hasil: p.data.hasil, p_grade: grade?.success ? grade.data : null, p_catatan: p.data.catatan,
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: p.data.hasil === "lulus" ? "Lot lulus cek mutu." : "Lot ditahan." };
}
