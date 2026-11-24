"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
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
/* Form mulai produksi (training 17 Nov): proyek (pilih atau baru, pakai nama), tanggal, PT pemilik ikan, dan lini bisnis.
   jual: ikan dari lot. jasa: ikan dari PT, cukup beratnya. titip: nggak diproduksi, lanjut ke titipan gudang. */
const FormMulai = z.object({
  lini: z.enum(["jual", "jasa", "titip"], "Pilih lini bisnisnya"),
  siklusId: z.union([z.literal("baru"), z.uuid("Pilih proyeknya")], "Pilih proyeknya"),
  namaProyek: z.string().trim().max(120, "Nama proyeknya kepanjangan").optional(),
  ptId: z.union([z.literal(""), z.uuid("Pilih PT-nya")]).optional(),
  tanggal: z.iso.date("Isi tanggal"),
  catatan: z.string().trim().max(300),
  kgPt: z.string().max(14).optional(),
  alokasi: z.string().max(20_000).optional(),
  jumlahEkor: z.string().max(7).optional(),
});
const Alokasi = z.array(z.object({ lot_id: z.uuid(), kg: z.string() }));

/** Jumlah ekor dari isian: kosong = null, selain angka bulat positif = salah. */
function bacaJumlahEkor(t: string | undefined): number | null | "salah" {
  const s = (t ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n > 0 && n <= 100_000 ? n : "salah";
}

function proyekBaru(d: z.infer<typeof FormMulai>) {
  return d.siklusId === "baru" ? { nama: d.namaProyek ?? "", lini_bisnis: d.lini, pt_id: d.lini === "jual" ? "" : d.ptId ?? "" } : null;
}

/** Mulai produksi. Mengembalikan id produksi di `id`. Lini titip cuma bikin proyek (id proyek di `id`), barangnya diterima di gudang. */
export async function mulaiProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = FormMulai.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const d = p.data;
  if (d.siklusId === "baru" && !d.namaProyek) return { kolom: { namaProyek: ["Tulis nama proyeknya"] } };
  if (d.lini !== "jual" && d.siklusId === "baru" && !d.ptId) return { kolom: { ptId: ["Pilih PT pemilik ikannya"] } };
  const supabase = await createClient();

  if (d.lini === "titip") {
    if (d.siklusId !== "baru") return { id: d.siklusId, pesan: "Lanjut terima titipannya di Gudang Dingin." };
    const { data, error } = await supabase.rpc("buat_proyek", { p_nama: d.namaProyek, p_lini: "titip", p_pt: d.ptId || null, p_tanggal: d.tanggal });
    if (error) return { error: pesanDb(error) };
    refresh();
    return { id: data as string, pesan: "Proyek titipan udah dibikin. Lanjut terima barangnya di Gudang Dingin." };
  }

  const ekor = bacaJumlahEkor(d.jumlahEkor);
  if (ekor === "salah") return { kolom: { jumlahEkor: ["Isi angka bulat, atau kosongin"] } };
  const alokasi: { lot_id: string; kg: number }[] = [];
  let kgPt: number | null = null;
  if (d.lini === "jasa") {
    const g = keGram(d.kgPt ?? "");
    if (g === null) return { kolom: { kgPt: ["Isi berat ikan dari PT, lebih dari nol"] } };
    kgPt = kgDariGram(g);
  } else {
    let isi: z.infer<typeof Alokasi>;
    try {
      isi = Alokasi.parse(JSON.parse(d.alokasi || "[]"));
    } catch {
      return { error: "Pilih minimal satu lot dan isi beratnya." };
    }
    if (isi.length === 0) return { error: "Pilih minimal satu lot dan isi beratnya." };
    for (const a of isi) {
      const g = keGram(a.kg);
      if (g === null) return { error: "Berat dari tiap lot harus lebih dari nol, paling banyak tiga angka di belakang koma." };
      alokasi.push({ lot_id: a.lot_id, kg: kgDariGram(g) });
    }
  }
  const { data, error } = await supabase.rpc("mulai_produksi", {
    p_alokasi: alokasi, p_tanggal: d.tanggal, p_catatan: d.catatan,
    p_cycle: d.siklusId === "baru" ? null : d.siklusId, p_proyek_baru: proyekBaru(d), p_kg_pt: kgPt,
  });
  if (error) return { error: pesanDb(error) };
  if (ekor !== null) {
    const { error: e2 } = await supabase.rpc("isi_ekor_produksi", { p_production: data as string, p_jumlah: ekor, p_alasan: "" });
    if (e2) return { id: data as string, pesan: `Produksi dimulai, tapi jumlah ekornya gagal disimpan: ${pesanDb(e2)}` };
  }
  refresh();
  return { pesan: "Produksi dimulai.", id: data as string };
}

/* ------------------------------------------------------------ koreksi */
const FormKoreksi = z.object({
  produksiId: z.uuid(),
  tanggal: z.iso.date("Isi tanggal"),
  siklusId: z.union([z.literal(""), z.uuid("Proyeknya nggak valid")]),
  kgPt: z.string().max(14).optional(),
  catatan: z.string().trim().max(300),
  alokasi: z.string().max(20_000).optional(),
  alasan: z.string().trim().min(1, "Tulis alasan koreksinya").max(500, "Alasannya kepanjangan"),
  jumlahEkor: z.string().max(7).optional(),
});

/** Koreksi produksi: tanggal, proyek, berat ikan dari PT, catatan, dan berat tiap lot yang dipakai. Wajib alasan. */
export async function koreksiProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = FormKoreksi.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const d = p.data;
  const ekor = bacaJumlahEkor(d.jumlahEkor);
  if (ekor === "salah") return { kolom: { jumlahEkor: ["Isi angka bulat, atau kosongin"] } };
  let kgPt: number | null = null;
  if (d.kgPt && d.kgPt.trim() !== "") {
    const g = keGram(d.kgPt);
    if (g === null) return { kolom: { kgPt: ["Berat ikan dari PT harus lebih dari nol"] } };
    kgPt = kgDariGram(g);
  }
  let ubah: { lot_id: string; kg: string; lama: number }[] = [];
  try {
    ubah = z.array(z.object({ lot_id: z.uuid(), kg: z.string(), lama: z.number() })).parse(JSON.parse(d.alokasi || "[]"));
  } catch {
    return { error: "Data lot-nya nggak valid. Muat ulang halaman, terus coba lagi." };
  }
  const supabase = await createClient();
  for (const a of ubah) {
    const g = keGram(a.kg);
    if (g === null) return { error: "Berat tiap lot harus lebih dari nol, paling banyak tiga angka di belakang koma." };
    if (g === Math.round(a.lama * 1000)) continue;
    const { error } = await supabase.rpc("ubah_alokasi_lot", { p_production: d.produksiId, p_lot: a.lot_id, p_kg: kgDariGram(g), p_alasan: d.alasan });
    if (error) return { error: pesanDb(error) };
  }
  const { error } = await supabase.rpc("koreksi_produksi", {
    p_production: d.produksiId, p_tanggal: d.tanggal, p_cycle: d.siklusId || null, p_kg_pt: kgPt, p_catatan: d.catatan, p_alasan: d.alasan,
  });
  if (error) return { error: pesanDb(error) };
  if (d.jumlahEkor !== undefined) {
    const { error: e2 } = await supabase.rpc("isi_ekor_produksi", { p_production: d.produksiId, p_jumlah: ekor, p_alasan: d.alasan });
    if (e2) return { error: pesanDb(e2) };
  }
  refresh();
  return { pesan: "Koreksi udah disimpan." };
}

/* --------------------------------------------- koreksi timbangan setelah selesai */
const FormTimbangan = z.object({
  produksiId: z.uuid(),
  loin: z.string().max(10_000).optional(),
  samping: z.string().max(10_000),
  limbah: z.string().trim().max(14),
  susut: z.string().trim().max(14),
  alasan: z.string().trim().min(1, "Tulis alasan koreksinya").max(500, "Alasannya kepanjangan"),
});
const BarisKg = (id: "grade_id" | "category_id") => z.array(z.object({ [id]: z.uuid(), kg: z.string().max(14) }));

/** Koreksi timbangan produksi yang udah selesai, diperiksa, atau disetujui (juga yang udah masuk stok). Status nggak berubah. */
export async function koreksiTimbangan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = FormTimbangan.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const d = p.data;
  let loin: { grade_id: string; kg: number }[] | null = null;
  let samping: { category_id: string; kg: number }[] = [];
  try {
    if (d.loin) {
      loin = [];
      for (const b of BarisKg("grade_id").parse(JSON.parse(d.loin)) as { grade_id: string; kg: string }[]) {
        const g = gramBolehNol(b.kg);
        if (g === "salah") return { error: "Berat loin per grade harus angka, paling banyak tiga angka di belakang koma." };
        loin.push({ grade_id: b.grade_id, kg: kgDariGram(g ?? 0) });
      }
    }
    for (const s of BarisKg("category_id").parse(JSON.parse(d.samping)) as { category_id: string; kg: string }[]) {
      const g = gramBolehNol(s.kg);
      if (g === "salah") return { error: "Berat hasil samping harus angka, paling banyak tiga angka di belakang koma." };
      if (g !== null) samping.push({ category_id: s.category_id, kg: kgDariGram(g) });
    }
  } catch {
    return { error: "Data timbangannya nggak valid. Muat ulang halaman, terus coba lagi." };
  }
  samping = samping.filter((s, i, a) => a.findIndex((x) => x.category_id === s.category_id) === i);
  const limbah = gramBolehNol(d.limbah);
  const susut = gramBolehNol(d.susut);
  if (limbah === "salah" || susut === "salah") return { kolom: { limbah: limbah === "salah" ? ["Isi angka, maks. 3 desimal"] : undefined, susut: susut === "salah" ? ["Isi angka, maks. 3 desimal"] : undefined } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("koreksi_timbangan", {
    p_production: d.produksiId, p_loin: loin, p_samping: samping,
    p_limbah: limbah === null ? null : kgDariGram(limbah), p_susut: susut === null ? null : kgDariGram(susut), p_alasan: d.alasan,
  });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Timbangan udah dikoreksi." };
}

const FormBukaLagi = z.object({
  produksiId: z.uuid(),
  alasan: z.string().trim().min(1, "Tulis alasannya").max(500, "Alasannya kepanjangan"),
});

/** Owner buka lagi produksi yang udah disetujui (selama hasilnya belum masuk stok), biar bisa dikoreksi. */
export async function bukaLagiProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("produksi.setuju");
  if (tolak) return tolak;
  const p = FormBukaLagi.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("buka_lagi_produksi", { p_production: p.data.produksiId, p_alasan: p.data.alasan });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Produksi dibuka lagi. Silakan dikoreksi, terus diperiksa ulang." };
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
  if (!p.success) return { error: "Data loin nggak valid. Cek lagi nomor, grade, sama beratnya." };
  const rpcBaris = [];
  for (const b of p.data.baris) {
    const g = keGram(b.kg);
    const no = Number(b.noLoin);
    if (g === null || !Number.isInteger(no) || no <= 0) return { error: `Loin nomor ${b.noLoin || "?"}: cek lagi nomor dan beratnya (maksimal 3 desimal).` };
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
  if (!p.success) return { error: "Tulis alasan kenapa loin dibatalkan." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("batalkan_loin", { p_item: p.data.itemId, p_alasan: p.data.alasan });
  if (error) return { error: pesanDb(error) };
  refresh();
  return {};
}

/* ------------------------------------------------- loin total per grade */
const FormLoinTotal = z.object({
  produksiId: z.uuid(),
  baris: z.string().transform((s, ctx) => {
    try {
      return z.array(z.object({ grade_id: z.uuid(), kg: z.string().max(14) })).max(50).parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Data total loin tidak valid" });
      return z.NEVER;
    }
  }),
});

/** Simpan berat loin total per grade (cara sehari-hari). Kosong atau 0 = grade itu tidak diisi. Aman diulang. */
export async function simpanLoinTotal(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = FormLoinTotal.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Data total loin nggak valid." };
  const baris = [];
  for (const b of p.data.baris) {
    const g = gramBolehNol(b.kg);
    if (g === "salah") return { error: "Berat loin per grade harus angka, paling banyak tiga angka di belakang koma." };
    baris.push({ grade_id: b.grade_id, kg: kgDariGram(g ?? 0) });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("simpan_loin_total", { p_production: p.data.produksiId, p_baris: baris });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Total loin tersimpan." };
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
  if (!p.success) return { error: "Data ekor nggak valid." };
  const baris = [];
  for (const e of p.data.ekor) {
    if (e.no.trim() === "" && e.kg.trim() === "") continue;
    const g = keGram(e.kg);
    const no = Number(e.no);
    if (g === null || !Number.isInteger(no) || no <= 0) return { error: "Tiap ekor butuh nomor dan berat lebih dari nol (maksimal 3 desimal)." };
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
  if (!p.success) return { error: "Data komponen nggak valid." };
  const samping = [];
  for (const s of p.data.samping) {
    const g = gramBolehNol(s.kg);
    if (g === "salah") return { error: "Berat hasil samping harus angka, paling banyak tiga angka di belakang koma." };
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

/** Kondisi hasil (fresh atau beku): stok otomatis dari produksi ini ikut. */
export async function aturKondisiHasil(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = Id.extend({ kondisi: z.enum(["fresh", "beku"]) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Pilih Fresh atau Beku." };
  return panggil("produksi.write", "atur_kondisi_hasil", { p_production: p.data.produksiId, p_kondisi: p.data.kondisi },
    p.data.kondisi === "fresh" ? "Hasilnya dicatat fresh." : "Hasilnya dicatat beku.");
}

export async function selesaikanProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = Id.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Produksinya nggak valid." };
  return panggil("produksi.write", "selesaikan_produksi", { p_production: p.data.produksiId }, "Produksi udah diselesaikan. Tinggal nunggu pemeriksaan QC.");
}

export async function periksaProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  // Kolom penjelasan cuma muncul kalau ada selisih; neraca yang pas berarti kolomnya nggak dikirim sama sekali.
  const p = Id.extend({ penjelasan: z.string().trim().max(500).default("") }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Penjelasan terlalu panjang." };
  return panggil("produksi.periksa", "periksa_produksi", { p_production: p.data.produksiId, p_penjelasan: p.data.penjelasan }, "Pemeriksaan QC udah dicatat. Tinggal nunggu Owner.");
}

export async function setujuiProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = Id.extend({ terimaSelisih: z.string().optional() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Produksinya nggak valid." };
  return panggil("produksi.setuju", "setujui_produksi", { p_production: p.data.produksiId, p_terima_selisih: p.data.terimaSelisih === "on" }, "Produksi diperiksa dan disetujui.");
}

export async function mintaPerbaikan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = Id.extend({ alasan: z.string().trim().min(1, "Tulis apa yang perlu diperbaiki").max(500) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const aksi = (await izin("produksi.periksa")) ? "produksi.setuju" : "produksi.periksa";
  return panggil(aksi, "minta_perbaikan_produksi", { p_production: p.data.produksiId, p_alasan: p.data.alasan }, "Produksi dibalikin buat diperbaiki.");
}

/** Total berat loin + total jumlah loin sebelum digrading (24 Nov 2026). Produksi yg udah selesai wajib alasan (kecatat koreksi). */
export async function simpanTotalLoin(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const p = z.object({
    produksiId: z.uuid(),
    kg: z.string().trim().max(20),
    jumlah: z.string().trim().max(7),
    alasan: z.string().trim().max(500).optional(),
  }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Datanya nggak valid." };
  let kg: number | null = null;
  if (p.data.kg !== "") {
    const g = keGram(p.data.kg);
    if (g === null) return { kolom: { kg: ["Isi berat lebih dari nol, maksimal 3 angka di belakang koma"] } };
    kg = kgDariGram(g);
  }
  const n = p.data.jumlah === "" ? null : Number(p.data.jumlah);
  if (n !== null && (!Number.isInteger(n) || n <= 0)) return { kolom: { jumlah: ["Isi angka bulat lebih dari nol"] } };
  if (kg === null && n === null) return { error: "Isi total berat loin atau jumlah loinnya." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("simpan_total_loin", { p_production: p.data.produksiId, p_kg: kg, p_jumlah: n, p_alasan: p.data.alasan ?? "" });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Total loin udah kesimpan." };
}

/* ------------------------------------------------------------ hapus record produksi (26 Nov 2026) */
const AlasanHapus = z.string().trim().min(1, "Tulis alasannya").max(500, "Maksimal 500 huruf");

/** Hapus satu baris di produksi yang masih berjalan (pemakaian lot, loin per potong, ekor, komponen, loin total per grade). */
export async function hapusBarisProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({
    tabel: z.enum(["lot_allocations", "production_items", "production_fish", "production_components", "production_loin_totals"]),
    barisId: z.uuid(),
    alasan: AlasanHapus,
  }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("produksi.write", "hapus_baris_produksi", { p_tabel: p.data.tabel, p_id: p.data.barisId, p_alasan: p.data.alasan }, "Barisnya udah dihapus.");
}

/** Hapus satu produksi utuh (yang kecatat dobel). Abis itu balik ke daftar produksi lininya. */
export async function hapusProduksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ produksiId: z.uuid(), lini: z.enum(["jual", "jasa"]), alasan: AlasanHapus }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const tolak = await izin("produksi.write");
  if (tolak) return tolak;
  const supabase = await createClient();
  const { error } = await supabase.rpc("hapus_produksi", { p_production: p.data.produksiId, p_alasan: p.data.alasan });
  if (error) return { error: pesanDb(error) };
  redirect(`/produksi/${p.data.lini}`);
}
