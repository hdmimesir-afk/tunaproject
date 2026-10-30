"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireIzin, TidakBerizin } from "@/lib/data/auth";
import { keGram } from "@/lib/logic/grid";
import { createClient } from "@/lib/supabase/server";
import { dariInputWib } from "@/lib/waktu";
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

async function panggil(aksi: string, fn: string, args: Record<string, unknown>, pesan: string): Promise<HasilForm> {
  const tolak = await izin(aksi);
  if (tolak) return tolak;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan, id: typeof data === "string" ? data : undefined };
}

const Kg = z.string().trim().transform((s, ctx) => {
  const g = keGram(s);
  if (g === null) {
    ctx.addIssue({ code: "custom", message: "Isi berat lebih dari nol, maksimal 3 desimal" });
    return z.NEVER;
  }
  return kgDariGram(g);
});
const Opsional = z.string().trim().transform((s) => (s === "" ? null : s));

/* ---------------------------------------------------- hasil produksi */
const FormHasil = z.object({
  produksiId: z.uuid("Pilih produksi"),
  productId: z.uuid("Pilih produk"),
  gradeId: Opsional.pipe(z.uuid().nullable()),
  kondisi: z.enum(["fresh", "beku"], "Pilih fresh atau beku"),
  kg: Kg,
  lokasi: z.string().trim().max(60),
  ruanganId: Opsional.pipe(z.uuid().nullable()).optional(),
  langsungKirim: z.string().optional(),
  catatan: z.string().trim().max(300),
});

/** Hasil produksi yang sudah disetujui Owner masuk stok (atau fresh langsung kirim tanpa masuk gudang). */
export async function masukkanHasil(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("stok.write");
  if (tolak) return tolak;
  const p = FormHasil.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("stok.write", "masukkan_hasil_produksi", {
    p_production: p.data.produksiId, p_product: p.data.productId, p_grade: p.data.gradeId, p_kondisi: p.data.kondisi, p_kg: p.data.kg,
    p_lokasi: p.data.lokasi, p_langsung_kirim: p.data.langsungKirim === "on", p_catatan: p.data.catatan,
    ...(p.data.ruanganId ? { p_room: p.data.ruanganId } : {}),
  }, p.data.langsungKirim === "on" ? "Tercatat langsung kirim (tidak masuk gudang)." : "Hasil produksi masuk stok.");
}

/* ------------------------------------------------------- ambil stok */
const FormAmbil = z.object({ unitId: z.uuid(), kg: Kg, alasan: z.string().trim().max(300) });

export async function ambilStok(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormAmbil.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  // Titipan perlu izin gudang, stok sendiri perlu izin stok; database memutuskan sesuai pemilik unit.
  const tolak = (await izin("stok.write")) && (await izin("gudang.write"));
  if (tolak) return tolak;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ambil_stok", { p_unit: p.data.unitId, p_kg: p.data.kg, p_alasan: p.data.alasan });
  if (error) return { error: pesanDb(error) };
  refresh();
  const jumlah = (data as { jumlah: number | null } | null)?.jumlah;
  return { pesan: jumlah ? `Stok diambil. Tagihan jasa dibuat: Rp${jumlah.toLocaleString("id-ID")}.` : "Stok diambil." };
}

/* ---------------------------------------------------------- koreksi */
const FormKoreksi = z.object({
  unitId: z.uuid(),
  selisih: z.string().trim().transform((s, ctx) => {
    const minus = s.startsWith("-");
    const g = keGram(minus ? s.slice(1) : s);
    if (g === null) {
      ctx.addIssue({ code: "custom", message: "Isi selisih berat (boleh minus), maksimal 3 desimal" });
      return z.NEVER;
    }
    return kgDariGram(minus ? -g : g);
  }),
  alasan: z.string().trim().min(1, "Tulis alasan").max(300),
});

export async function ajukanKoreksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormKoreksi.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("stok.write", "ajukan_koreksi_stok", { p_unit: p.data.unitId, p_selisih_kg: p.data.selisih, p_alasan: p.data.alasan }, "Koreksi diajukan. Berlaku setelah disetujui Owner.");
}

export async function putuskanKoreksi(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ gerakId: z.uuid(), setuju: z.enum(["ya", "tidak"]), catatan: z.string().trim().max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Data tidak valid." };
  return panggil("stok.setuju", "putuskan_koreksi_stok", { p_movement: p.data.gerakId, p_setuju: p.data.setuju === "ya", p_catatan: p.data.catatan },
    p.data.setuju === "ya" ? "Koreksi disetujui dan stok diperbarui." : "Koreksi ditolak.");
}

/* ----------------------------------------------------------- titipan */
const FormTitipan = z.object({
  buyerId: z.uuid("Pilih pelanggan"),
  productId: z.uuid("Pilih produk"),
  gradeId: Opsional.pipe(z.uuid().nullable()),
  kondisi: z.enum(["fresh", "beku"], "Pilih fresh atau beku"),
  kg: Kg,
  lokasi: z.string().trim().max(60),
  ruanganId: Opsional.pipe(z.uuid().nullable()).optional(),
  perluAbf: z.string().optional(),
  catatan: z.string().trim().max(300),
});

export async function terimaTitipan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormTitipan.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("gudang.write", "terima_titipan", {
    p_buyer: p.data.buyerId, p_product: p.data.productId, p_grade: p.data.gradeId, p_kondisi: p.data.kondisi, p_kg: p.data.kg,
    p_lokasi: p.data.lokasi, p_perlu_abf: p.data.perluAbf === "on", p_catatan: p.data.catatan,
    ...(p.data.ruanganId ? { p_room: p.data.ruanganId } : {}),
  }, "Titipan diterima.");
}

/* ----------------------------------------------------- ruangan gudang */
export async function pindahRuangan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ unitId: z.uuid(), ruanganId: z.uuid("Pilih ruangan tujuan") }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  // Titipan perlu izin gudang, stok sendiri perlu izin stok; database memutuskan sesuai pemilik unit.
  const tolak = (await izin("stok.write")) && (await izin("gudang.write"));
  if (tolak) return tolak;
  const supabase = await createClient();
  const { error } = await supabase.rpc("pindah_ruangan", { p_unit: p.data.unitId, p_room: p.data.ruanganId });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Unit dipindahkan ke ruangan baru." };
}

const FormRuangan = z.object({
  ruanganId: z.uuid(),
  kapasitas: z.string().trim().transform((s, ctx) => {
    const g = keGram(s);
    if (g === null) {
      ctx.addIssue({ code: "custom", message: "Isi kapasitas lebih dari nol, maksimal 3 desimal" });
      return z.NEVER;
    }
    return kgDariGram(g);
  }),
  dikonfirmasi: z.string().optional(),
  catatan: z.string().trim().max(300),
  aktif: z.string().optional(),
});

export async function ubahRuangan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormRuangan.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("pengaturan.write", "ubah_ruangan", {
    p_room: p.data.ruanganId, p_kapasitas: p.data.kapasitas, p_dikonfirmasi: p.data.dikonfirmasi === "on", p_catatan: p.data.catatan, p_aktif: p.data.aktif === "on",
  }, "Ruangan disimpan.");
}

/* ------------------------------------------------- stok penunjang */
const Jumlah = z.string().trim().transform((s, ctx) => {
  const g = keGram(s);
  if (g === null) {
    ctx.addIssue({ code: "custom", message: "Isi jumlah lebih dari nol, maksimal 3 desimal" });
    return z.NEVER;
  }
  return kgDariGram(g);
});
const TanggalOpsional = z.string().trim().transform((s) => (s === "" ? null : s)).pipe(z.iso.date("Tanggal tidak valid").nullable());

const FormBarang = z.object({
  barangId: Opsional.pipe(z.uuid().nullable()),
  kategori: z.enum(["kerja", "pekerja"], "Pilih kategori"),
  nama: z.string().trim().min(1, "Isi nama barang").max(100),
  satuan: z.string().trim().min(1, "Isi satuan, misalnya pcs atau box").max(20),
  minimum: z.string().trim().transform((s, ctx) => {
    if (s === "") return 0;
    const g = keGram(s);
    if (g === null) {
      ctx.addIssue({ code: "custom", message: "Isi angka lebih dari nol, maksimal 3 desimal (atau kosongkan)" });
      return z.NEVER;
    }
    return kgDariGram(g);
  }),
  lokasi: z.string().trim().max(60),
  keterangan: z.string().trim().max(300),
  aktif: z.string().optional(),
});

/** Tambah atau ubah barang penunjang. Barang tidak dihapus; yang tidak dipakai lagi dinonaktifkan. */
export async function simpanBarang(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormBarang.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("stok.write", "simpan_barang", {
    p_id: p.data.barangId, p_kategori: p.data.kategori, p_nama: p.data.nama, p_satuan: p.data.satuan, p_minimum: p.data.minimum,
    p_lokasi: p.data.lokasi, p_keterangan: p.data.keterangan, p_aktif: p.data.barangId ? p.data.aktif === "on" : true,
  }, p.data.barangId ? "Barang disimpan." : "Barang ditambahkan.");
}

export async function barangMasuk(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ barangId: z.uuid(), jumlah: Jumlah, tanggal: TanggalOpsional, catatan: z.string().trim().max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("stok.write", "catat_barang_masuk", { p_item: p.data.barangId, p_jumlah: p.data.jumlah, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan }, "Barang masuk dicatat.");
}

export async function barangKeluar(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ barangId: z.uuid(), jumlah: Jumlah, tanggal: TanggalOpsional, penerima: z.string().trim().max(100), catatan: z.string().trim().max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("stok.write", "catat_barang_keluar", {
    p_item: p.data.barangId, p_jumlah: p.data.jumlah, p_tanggal: p.data.tanggal, p_penerima: p.data.penerima, p_catatan: p.data.catatan,
  }, "Barang keluar dicatat.");
}

export async function koreksiBarang(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({
    barangId: z.uuid(),
    selisih: z.string().trim().transform((s, ctx) => {
      const minus = s.startsWith("-");
      const g = keGram(minus ? s.slice(1) : s);
      if (g === null) {
        ctx.addIssue({ code: "custom", message: "Isi selisih jumlah (boleh minus), maksimal 3 desimal" });
        return z.NEVER;
      }
      return kgDariGram(minus ? -g : g);
    }),
    alasan: z.string().trim().min(1, "Tulis alasan").max(300),
  }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("stok.write", "koreksi_barang", { p_item: p.data.barangId, p_selisih: p.data.selisih, p_alasan: p.data.alasan }, "Koreksi dicatat.");
}

/* ------------------------------------------------------------- tarif */
const FormTarif = z.object({
  jenis: z.enum(["simpan", "abf", "transit"]),
  tarif: z.coerce.number("Isi tarif").min(0, "Tarif tidak boleh negatif").max(100_000_000),
  minimumHari: z.coerce.number().int().min(1, "Minimal 1 hari").max(365),
  masaTransitJam: z.coerce.number().int().min(0).max(72),
  dasarBerat: z.enum(["masuk", "keluar"]),
  berlakuDari: z.iso.date("Isi tanggal berlaku"),
  dikonfirmasi: z.string().optional(),
  catatan: z.string().trim().max(300),
});

export async function ubahTarif(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormTarif.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("pengaturan.write", "ubah_tarif", {
    p_jenis: p.data.jenis, p_tarif: Math.round(p.data.tarif * 100) / 100, p_minimum_hari: p.data.minimumHari, p_masa_transit_jam: p.data.masaTransitJam,
    p_dasar_berat: p.data.dasarBerat, p_berlaku_dari: p.data.berlakuDari, p_dikonfirmasi: p.data.dikonfirmasi === "on", p_catatan: p.data.catatan,
  }, "Tarif disimpan. Tagihan lama tetap memakai tarif saat ikan masuk.");
}

/* ------------------------------------------------------------ jadwal */
const FormBooking = z.object({
  jenis: z.enum(["produksi", "abf"], "Pilih jenis"),
  partnerId: Opsional.pipe(z.uuid().nullable()),
  label: z.string().trim().min(1, "Isi keterangan").max(120),
  mulai: z.string().transform((s, ctx) => dariInputWib(s) ?? (ctx.addIssue({ code: "custom", message: "Isi jam mulai" }), z.NEVER)),
  selesai: z.string().transform((s, ctx) => dariInputWib(s) ?? (ctx.addIssue({ code: "custom", message: "Isi jam selesai" }), z.NEVER)),
  kg: z.string().trim().transform((s) => (s === "" ? null : keGram(s))),
  catatan: z.string().trim().max(300),
});

export async function buatBooking(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormBooking.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("gudang.write", "buat_booking", {
    p_jenis: p.data.jenis, p_partner: p.data.partnerId, p_label: p.data.label, p_mulai: p.data.mulai, p_selesai: p.data.selesai,
    p_kg: p.data.kg === null ? null : kgDariGram(p.data.kg), p_catatan: p.data.catatan,
  }, "Jadwal dibuat.");
}

export async function pindahBooking(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ bookingId: z.uuid(), mulai: z.string() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Data tidak valid." };
  const mulai = p.data.mulai === "" ? null : dariInputWib(p.data.mulai);
  if (p.data.mulai !== "" && !mulai) return { kolom: { mulai: ["Isi jam mulai baru"] } };
  return panggil("gudang.write", "pindah_booking", { p_id: p.data.bookingId, p_mulai: mulai }, mulai ? "Jadwal dipindah." : "Jadwal dipindah ke jam kosong pertama.");
}

export async function batalkanBooking(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ bookingId: z.uuid(), alasan: z.string().trim().min(1, "Tulis alasan").max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("gudang.write", "batalkan_booking", { p_id: p.data.bookingId, p_alasan: p.data.alasan }, "Jadwal dibatalkan.");
}
