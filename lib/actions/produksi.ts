"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { keGram } from "@/lib/logic/grid";
import { createClient } from "@/lib/supabase/server";
import { pesanDb } from "./pesan";
import type { HasilForm } from "./auth";

async function izin(aksi: string): Promise<{ error: string } | null> {
  try {
    await requireIzin(aksi);
    return null;
  } catch (e) {
    if (e instanceof TidakBerizin) return { error: e.message };
    throw e;
  }
}

const kgDariGram = (g: number) => g / 1000;

/* -------------------------------------------------------------- mulai */
const FormMulai = z.object({
  tanggal: z.iso.date("Isi tanggal"),
  catatan: z.string().trim().max(300),
  alokasi: z.string().transform((s, ctx) => {
    try {
      return z.array(z.object({ lot_id: z.uuid(), kg: z.string() })).min(1, "Pilih minimal satu lot").parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Pilih minimal satu lot dan isi beratnya" });
      return z.NEVER;
    }
  }),
});

/** Mulai produksi dari satu atau beberapa lot yang lulus mutu. Mengembalikan id produksi di `id`. */
export async function mulaiProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = FormMulai.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const alokasi: { lot_id: string; kg: number }[] = [];
  for (const a of p.data.alokasi) {
    const g = keGram(a.kg);
    if (g === null) return { error: "Berat dari setiap lot harus lebih dari nol dengan paling banyak tiga desimal." };
    alokasi.push({ lot_id: a.lot_id, kg: kgDariGram(g) });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mulai_produksi", { p_alokasi: alokasi, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Produksi dimulai.", id: data as string };
}

/* -------------------------------------------------------------- loin */
const BarisSchema = z.object({
  id: z.uuid(),
  noEkor: z.string().max(6),
  noLoin: z.string().max(6),
  gradeId: z.uuid("Pilih grade"),
  kg: z.string().max(14),
  versi: z.number().int().positive().optional(),
});
const BatchSchema = z.object({ produksiId: z.uuid(), baris: z.array(BarisSchema).min(1).max(1000) });

export type HasilSimpanLoin = { error?: string; disimpan?: number; sama?: number; konflik?: string[]; totalLoin?: number; versi?: Record<string, number> };

/** Simpan baris loin. Aman diulang (id dari perangkat): dipakai juga untuk mengirim draf offline. */
export async function simpanLoin(input: z.input<typeof BatchSchema>): Promise<HasilSimpanLoin> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = BatchSchema.safeParse(input);
  if (!p.success) return { error: "Data loin tidak valid. Periksa nomor, grade, dan berat." };
  const rpcBaris = [];
  for (const b of p.data.baris) {
    const g = keGram(b.kg);
    const no = Number(b.noLoin);
    if (g === null || !Number.isInteger(no) || no <= 0) return { error: `Loin nomor ${b.noLoin || "?"}: periksa nomor dan berat (maksimal 3 desimal).` };
    rpcBaris.push({ id: b.id, no_ekor: b.noEkor.trim() === "" ? null : Number(b.noEkor), no_loin: no, grade_id: b.gradeId, kg: kgDariGram(g), versi: b.versi ?? null });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("simpan_loin", { p_production: p.data.produksiId, p_baris: rpcBaris });
  if (error) return { error: pesanDb(error) };
  const h = data as { disimpan: number; sama: number; konflik: string[]; total_loin: number; versi: Record<string, number> };
  refresh();
  return { disimpan: h.disimpan, sama: h.sama, konflik: h.konflik, totalLoin: h.total_loin, versi: h.versi };
}

export async function batalkanLoin(itemId: string, alasan: string): Promise<{ error?: string }> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = z.object({ itemId: z.uuid(), alasan: z.string().trim().min(1, "Tulis alasan").max(300) }).safeParse({ itemId, alasan });
  if (!p.success) return { error: "Tulis alasan membatalkan loin." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("batalkan_loin", { p_item: p.data.itemId, p_alasan: p.data.alasan });
  if (error) return { error: pesanDb(error) };
  refresh();
  return {};
}

/* ------------------------------------------------------- ikan utuh */
const FormEkor = z.object({
  produksiId: z.uuid(),
  ekor: z.string().transform((s, ctx) => {
    try {
      return z.array(z.object({ no: z.string(), kg: z.string() })).parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Data ekor tidak valid" });
      return z.NEVER;
    }
  }),
});

export async function simpanEkor(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = FormEkor.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Data ekor tidak valid." };
  const baris = [];
  for (const e of p.data.ekor) {
    if (e.no.trim() === "" && e.kg.trim() === "") continue;
    const g = keGram(e.kg);
    const no = Number(e.no);
    if (g === null || !Number.isInteger(no) || no <= 0) return { error: "Setiap ekor butuh nomor dan berat lebih dari nol (maksimal 3 desimal)." };
    baris.push({ no_ekor: no, berat_utuh_kg: kgDariGram(g) });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("simpan_ekor", { p_production: p.data.produksiId, p_baris: baris });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Berat ikan utuh tersimpan." };
}

/* ------------------------------------------------------- komponen */
const FormKomponen = z.object({
  produksiId: z.uuid(),
  samping: z.string().transform((s, ctx) => {
    try {
      return z.array(z.object({ category_id: z.uuid(), kg: z.string() })).parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Data hasil samping tidak valid" });
      return z.NEVER;
    }
  }),
  limbah: z.string().trim().max(14),
  susut: z.string().trim().max(14),
});

/** Nol dan "0" sah (sudah ditimbang, hasilnya nol); kosong = belum ditimbang. */
const gramBolehNol = (t: string): number | null | "salah" => {
  if (t.trim() === "") return null;
  if (/^0([.,]0{1,3})?$/.test(t.trim())) return 0;
  return keGram(t) ?? "salah";
};

export async function simpanKomponen(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = FormKomponen.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Data komponen tidak valid." };
  const samping = [];
  for (const s of p.data.samping) {
    const g = gramBolehNol(s.kg);
    if (g === "salah") return { error: "Berat hasil samping harus angka dengan paling banyak tiga desimal." };
    if (g !== null) samping.push({ category_id: s.category_id, kg: kgDariGram(g) });
  }
  const limbah = gramBolehNol(p.data.limbah);
  const susut = gramBolehNol(p.data.susut);
  if (limbah === "salah" || susut === "salah") return { kolom: { limbah: limbah === "salah" ? ["Isi angka, maks. 3 desimal"] : undefined, susut: susut === "salah" ? ["Isi angka, maks. 3 desimal"] : undefined } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("simpan_komponen", {
    p_production: p.data.produksiId, p_samping: samping,
    p_limbah: limbah === null ? null : kgDariGram(limbah), p_susut: susut === null ? null : kgDariGram(susut),
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Komponen hasil tersimpan." };
}

/* ------------------------------------------------- selesai, periksa */
async function panggil(aksi: string, fn: string, args: Record<string, unknown>, pesan: string): Promise<HasilForm> {
  const tolak = await izin(aksi);
  if (tolak) return tolak;
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan };
}

const Id = z.object({ produksiId: z.uuid() });

export async function selesaikanProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = Id.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Produksi tidak valid." };
  return panggil("produksi.write", "selesaikan_produksi", { p_production: p.data.produksiId }, "Produksi diselesaikan. Menunggu pemeriksaan QC.");
}

export async function periksaProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = Id.extend({ penjelasan: z.string().trim().max(500) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Penjelasan terlalu panjang." };
  return panggil("produksi.periksa", "periksa_produksi", { p_production: p.data.produksiId, p_penjelasan: p.data.penjelasan }, "Pemeriksaan QC dicatat. Menunggu Owner.");
}

export async function setujuiProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = Id.extend({ terimaSelisih: z.string().optional() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Produksi tidak valid." };
  return panggil("produksi.setuju", "setujui_produksi", { p_production: p.data.produksiId, p_terima_selisih: p.data.terimaSelisih === "on" }, "Produksi diperiksa dan disetujui.");
}

export async function mintaPerbaikan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = Id.extend({ alasan: z.string().trim().min(1, "Tulis apa yang perlu diperbaiki").max(500) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const aksi = (await izin("produksi.periksa")) ? "produksi.setuju" : "produksi.periksa";
  return panggil(aksi, "minta_perbaikan_produksi", { p_production: p.data.produksiId, p_alasan: p.data.alasan }, "Produksi dikembalikan untuk diperbaiki.");
}
