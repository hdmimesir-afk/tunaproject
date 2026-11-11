"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { keGram } from "@/lib/logic/grid";
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
  beratBeda: z.string().optional(),
  kg: z.string().optional(),
  catatan: z.string().trim().max(300),
  sebelumDisetujui: z.string().optional(),
});

const BeratBeda = z.coerce.number("Isi berat").positive("Berat harus lebih dari nol").max(10_000_000).transform((n) => Math.round(n * 1000) / 1000);

/** Terima ikan dari satu PO. Berat memakai sisa PO; diisi hanya bila kiriman nyata berbeda. Bongkar malam: boleh sebelum PO disetujui, dengan tanda. */
export async function terimaIkan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("penerimaan.write");
  if (tolak) return tolak;
  const p = FormTerima.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const beda = p.data.beratBeda === "on" ? BeratBeda.safeParse(p.data.kg) : null;
  if (beda && !beda.success) return { kolom: { kg: z.flattenError(beda.error).formErrors } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("terima_po", {
    p_po: p.data.poId, p_kg: beda?.success ? beda.data : null, p_catatan: p.data.catatan, p_sebelum_disetujui: p.data.sebelumDisetujui === "on",
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Ikan udah diterima. Lanjut cek mutu." };
}

const FormMutu = z.object({
  lotId: z.uuid(),
  hasil: z.enum(["lulus", "ditahan"], "Pilih lulus atau ditahan"),
  baris: z.string().max(10_000).optional(),
  catatan: z.string().trim().max(300),
});

const BarisGrade = z.array(z.object({ grade_id: z.string(), kg: z.string().max(14) })).max(30);

/** Cek mutu satu lot. Lulus: berat per grade (satu lot bisa beberapa grade), jumlahnya tidak boleh melebihi berat lot. */
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
  return { pesan: p.data.hasil === "lulus" ? "Lot lulus cek mutu." : "Lot ditahan." };
}
