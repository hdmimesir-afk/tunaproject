"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
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

async function panggil(aksi: string, fn: string, args: Record<string, unknown>, pesan: string): Promise<HasilForm> {
  const tolak = await izin(aksi);
  if (tolak) return tolak;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan, id: typeof data === "string" ? data : undefined };
}

/** Kolom yang boleh tidak dikirim sama sekali (mis. id pada formulir baru) atau dikirim kosong. */
const Opsional = z.string().trim().optional().transform((s) => (s ? s : null));

const FormBiaya = z.object({
  biayaId: Opsional.pipe(z.uuid().nullable()),
  kategoriId: z.uuid("Pilih kategori"),
  uraian: z.string().trim().min(1, "Tulis uraian").max(200),
  jumlah: z.string().trim().transform((s, ctx) => {
    const t = s.replace(/\./g, "").replace(",", ".");
    const n = Number(t);
    if (!/^\d+(\.\d{1,2})?$/.test(t) || !(n > 0)) {
      ctx.addIssue({ code: "custom", message: "Isi jumlah lebih dari nol" });
      return z.NEVER;
    }
    return n;
  }),
  tanggal: z.iso.date("Isi tanggal"),
  siklusId: Opsional.pipe(z.uuid().nullable()),
  poId: Opsional.pipe(z.uuid().nullable()),
  produksiId: Opsional.pipe(z.uuid().nullable()),
  // Lini bisnis buat biaya tanpa proyek (25 Nov 2026). Kosong = biaya umum. Yang punya proyek ikut lini proyeknya.
  lini: z.enum(["", "jual", "jasa", "titip"]).optional().transform((s) => (s ? s : null)),
});

/** Abis simpan atau koreksi: atur lini bisnis biaya yang nggak punya proyek. */
async function aturLini(id: string | undefined, lini: string | null): Promise<string | null> {
  if (!id) return null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("atur_lini_biaya", { p_id: id, p_lini: lini });
  return error ? pesanDb(error) : null;
}

/** Simpan biaya sebagai draf. Nota dilampirkan sesudahnya, lalu biaya diajukan ke Owner. */
export async function simpanBiaya(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormBiaya.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const hasil = await panggil("keuangan.write", "simpan_biaya", {
    p_id: p.data.biayaId, p_category: p.data.kategoriId, p_uraian: p.data.uraian, p_jumlah: p.data.jumlah, p_tanggal: p.data.tanggal, p_cycle: p.data.siklusId,
    p_po: p.data.poId, p_production: p.data.produksiId,
  }, "Biaya udah disimpan jadi draf. Lampirkan notanya, terus ajukan.");
  if (hasil?.error || hasil?.kolom) return hasil;
  const salah = await aturLini(hasil?.id ?? p.data.biayaId ?? undefined, p.data.lini);
  return salah ? { ...hasil, error: `Biaya kesimpan, tapi lini bisnisnya belum: ${salah}` } : hasil;
}

export async function ajukanBiaya(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ biayaId: z.uuid() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Biayanya nggak valid." };
  return panggil("keuangan.write", "ajukan_biaya", { p_id: p.data.biayaId }, "Biaya udah diajukan. Tinggal nunggu keputusan Owner.");
}

export async function putuskanBiaya(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ biayaId: z.uuid(), setuju: z.enum(["ya", "tidak"]), catatan: z.string().trim().max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Datanya nggak valid." };
  return panggil("biaya.setuju", "putuskan_biaya", { p_id: p.data.biayaId, p_setuju: p.data.setuju === "ya", p_catatan: p.data.catatan },
    p.data.setuju === "ya" ? "Biaya disetujui dan udah masuk buku kas." : "Biaya ditolak.");
}

const Alasan = z.string().trim().min(1, "Tulis alasannya").max(500, "Maksimal 500 huruf");

/** Koreksi biaya di status apa pun (permintaan finance 23 Nov 2026). Langsung berlaku: yg udah disetujui buku kasnya ikut dibenerin. */
export async function koreksiBiaya(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormBiaya.extend({ biayaId: z.uuid(), alasan: Alasan }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const hasil = await panggil("keuangan.write", "koreksi_biaya", {
    p_id: p.data.biayaId, p_category: p.data.kategoriId, p_uraian: p.data.uraian, p_jumlah: p.data.jumlah, p_tanggal: p.data.tanggal, p_cycle: p.data.siklusId,
    p_po: p.data.poId, p_production: p.data.produksiId, p_alasan: p.data.alasan,
  }, "Koreksi biaya udah kesimpan dan langsung berlaku.");
  if (hasil?.error || hasil?.kolom) return hasil;
  const salah = await aturLini(p.data.biayaId, p.data.lini);
  return salah ? { ...hasil, error: `Koreksi kesimpan, tapi lini bisnisnya belum: ${salah}` } : hasil;
}

/** Hapus biaya permanen (misalnya kecatat dobel). Nota dan baris buku kasnya ikut kehapus, kecatat di log hapus. */
export async function hapusBiaya(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ biayaId: z.uuid(), alasan: Alasan }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const tolak = await izin("keuangan.write");
  if (tolak) return tolak;
  const supabase = await createClient();
  const { error } = await supabase.rpc("hapus_biaya", { p_id: p.data.biayaId, p_alasan: p.data.alasan });
  if (error) return { error: pesanDb(error) };
  // Rinciannya udah nggak ada: balik ke daftar biaya (redirect juga nyegarin datanya).
  redirect("/keuangan");
}

/* ---------------------------------------------------------- biaya tetap */
const FormBiayaTetap = z.object({
  tetapId: Opsional.pipe(z.uuid().nullable()),
  nama: z.string().trim().min(1, "Tulis nama posnya").max(120),
  kelompok: z.enum(["tenaga_kerja", "overhead_pabrik", "sertifikasi_izin", "kantor", "keuangan"], "Pilih kelompok"),
  caraBayar: z.enum(["bulanan", "tahunan"], "Pilih cara bayar"),
  jumlah: FormBiaya.shape.jumlah,
  bulanBayar: Opsional.transform((s) => (s === null ? null : Number(s))).pipe(z.number().int().min(1).max(12).nullable()),
  aktif: z.enum(["ya", "tidak"]).default("ya"),
  catatan: z.string().trim().max(300).default(""),
}).refine((d) => d.caraBayar === "bulanan" || d.bulanBayar !== null, { message: "Pilih bulan bayarnya", path: ["bulanBayar"] });

export async function simpanBiayaTetap(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormBiayaTetap.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("keuangan.write", "simpan_biaya_tetap", {
    p_id: p.data.tetapId, p_nama: p.data.nama, p_kelompok: p.data.kelompok, p_cara_bayar: p.data.caraBayar, p_jumlah: p.data.jumlah,
    p_bulan_bayar: p.data.caraBayar === "tahunan" ? p.data.bulanBayar : null, p_aktif: p.data.aktif === "ya", p_catatan: p.data.catatan,
  }, p.data.tetapId ? "Pos udah diubah." : "Pos udah ditambah.");
}

/** Catat semua biaya tetap yg aktif buat satu bulan. Yg udah kecatat bulan itu dilewatin. */
export async function catatBiayaTetap(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ bulan: z.string().regex(/^\d{4}-\d{2}$/, "Bulannya nggak valid"), tanggal: z.iso.date("Isi tanggal") })
    .refine((d) => d.tanggal.startsWith(d.bulan), { message: "Tanggalnya harus di bulan yg dicatat", path: ["tanggal"] })
    .safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const tolak = await izin("keuangan.write");
  if (tolak) return tolak;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catat_biaya_tetap", { p_bulan: `${p.data.bulan}-01`, p_tanggal: p.data.tanggal });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: `${Number(data)} pos udah dicatat jadi biaya. Yg kategorinya wajib nota masih draf, lampirkan notanya dulu terus ajukan.` };
}
/* ---------------------------------------------------------- tutup buku */
const Bulan = z.string().regex(/^\d{4}-\d{2}$/, "Bulannya nggak valid").transform((s) => `${s}-01`);

/** Menutup buku satu bulan: hanya Owner. Setelah ditutup, transaksi bertanggal di bulan itu terkunci di database. */
export async function tutupPeriode(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ bulan: Bulan, catatan: z.string().trim().max(300), akui: z.string().optional() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Bulannya nggak valid." };
  return panggil("periode.tutup", "tutup_periode", { p_bulan: p.data.bulan, p_catatan: p.data.catatan, p_terima_dokumen_kurang: p.data.akui === "on" }, "Buku bulan itu udah ditutup, transaksinya dikunci.");
}

export async function bukaKembaliPeriode(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ bulan: Bulan, alasan: z.string().trim().min(1, "Tulis alasan").max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("periode.tutup", "buka_kembali_periode", { p_bulan: p.data.bulan, p_alasan: p.data.alasan }, "Buku bulan itu udah dibuka lagi.");
}
