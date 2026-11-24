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
  return g / 1000;
});
const KgOpsional = z.string().trim().transform((s, ctx) => {
  if (s === "") return null;
  const g = keGram(s);
  if (g === null) {
    ctx.addIssue({ code: "custom", message: "Isi berat lebih dari nol, maksimal 3 desimal" });
    return z.NEVER;
  }
  return g / 1000;
});
const Harga = z.string().trim().transform((s, ctx) => {
  const t = s.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  if (!/^\d+(\.\d{1,2})?$/.test(t) || !(n > 0)) {
    ctx.addIssue({ code: "custom", message: "Isi harga per kg lebih dari nol" });
    return z.NEVER;
  }
  return n;
});
/** Kolom yang boleh tidak dikirim sama sekali (mis. id pada formulir baru) atau dikirim kosong. */
const Opsional = z.string().trim().optional().transform((s) => (s ? s : null));
const dariJson = <T extends z.ZodType>(skema: T, pesan: string) =>
  z.string().transform((s, ctx): z.output<T> => {
    try {
      return skema.parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: pesan });
      return z.NEVER;
    }
  });

/* ------------------------------------------------------------ pesanan */
const FormPesanan = z.object({
  pesananId: Opsional.pipe(z.uuid().nullable()),
  buyerId: z.uuid("Pilih pembeli"),
  siklusId: Opsional.pipe(z.uuid().nullable()),
  tanggal: z.iso.date("Isi tanggal"),
  catatan: z.string().trim().max(300),
  baris: dariJson(z.array(z.object({ id: z.uuid().nullish(), unit_id: z.uuid("Pilih stok"), kg: z.string(), harga: z.string() })).min(1, "Isi minimal satu baris"), "Isi minimal satu baris pesanan"),
});

export async function simpanPesanan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("penjualan.write");
  if (tolak) return tolak;
  const p = FormPesanan.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const baris = [];
  for (const [i, b] of p.data.baris.entries()) {
    const kg = Kg.safeParse(b.kg);
    const harga = Harga.safeParse(b.harga);
    if (!kg.success || !harga.success) return { error: `Baris ${i + 1}: cek lagi berat (maks. 3 desimal) sama harga per kg-nya.` };
    baris.push({ id: b.id ?? null, unit_id: b.unit_id, kg: kg.data, harga: harga.data });
  }
  const pot = PajakDiskon.safeParse(Object.fromEntries(fd.entries()));
  if (!pot.success) return { error: pot.error.issues[0]?.message ?? "Cek lagi pajak sama diskonnya." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("simpan_pesanan", {
    p_order: p.data.pesananId, p_buyer: p.data.buyerId, p_cycle: p.data.siklusId, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan, p_baris: baris,
  });
  if (error) return { error: pesanDb(error) };
  const { error: e2 } = await supabase.rpc("atur_pajak_diskon", { p_order: id, ...argPotongan(pot.data), p_alasan: "" });
  if (e2) return { error: `Pesanan kesimpan, tapi pajak/diskonnya belum: ${pesanDb(e2)}` };
  refresh();
  return { pesan: "Pesanan udah disimpan.", id: typeof id === "string" ? id : undefined };
}

/* ------------------------------------------------------------ pajak, diskon, jasa (25 Nov 2026) */
/** Angka gaya Indonesia: titik ribuan, koma desimal ("1.250.000" atau "11,5"). */
const Angka = (pesan: string) => z.string().trim().transform((s, ctx) => {
  if (s === "") return 0;
  const t = s.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  if (!/^\d+(\.\d{1,2})?$/.test(t) || !Number.isFinite(n)) {
    ctx.addIssue({ code: "custom", message: pesan });
    return z.NEVER;
  }
  return n;
});
const PajakDiskon = z.object({
  pajakAktif: z.string().optional().transform((s) => s === "1" || s === "on"),
  pajakPersen: Angka("Persen pajak nggak valid").optional().transform((n) => n ?? 0),
  diskonJenis: z.enum(["persen", "nominal"]).optional().transform((s) => s ?? "nominal"),
  diskonNilai: Angka("Diskon nggak valid").optional().transform((n) => n ?? 0),
}).refine((x) => x.pajakPersen <= 100, "Persen pajak paling banyak 100").refine((x) => x.diskonJenis !== "persen" || x.diskonNilai <= 100, "Diskon persen paling banyak 100");
const argPotongan = (x: z.output<typeof PajakDiskon>) => ({ p_pajak_aktif: x.pajakAktif, p_pajak_persen: x.pajakPersen, p_diskon_jenis: x.diskonJenis, p_diskon_nilai: x.diskonNilai });

/** Ubah pajak dan diskon satu pesanan. Kalau invoice-nya udah terbit, alasannya wajib dan invoice dihitung ulang. */
export async function aturPajakDiskon(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ pesananId: z.uuid(), alasan: z.string().trim().max(500) }).safeParse(Object.fromEntries(fd.entries()));
  const pot = PajakDiskon.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  if (!pot.success) return { error: pot.error.issues[0]?.message ?? "Cek lagi pajak sama diskonnya." };
  return panggil("penjualan.write", "atur_pajak_diskon", { p_order: p.data.pesananId, ...argPotongan(pot.data), p_alasan: p.data.alasan },
    "Pajak sama diskonnya udah kesimpan.");
}

const BarisJasaForm = z.array(z.object({ service_item_id: z.uuid().nullish(), keterangan: z.string().trim().min(1).max(200), harga: z.string() })).min(1, "Isi minimal satu jasa").max(10);
function barisJasa(baris: z.output<typeof BarisJasaForm>): { error: string } | { service_item_id: string | null; keterangan: string; harga: number }[] {
  const hasil = [];
  for (const [i, b] of baris.entries()) {
    const harga = Harga.safeParse(b.harga);
    if (!harga.success) return { error: `Baris ${i + 1}: isi harganya lebih dari nol.` };
    hasil.push({ service_item_id: b.service_item_id ?? null, keterangan: b.keterangan, harga: harga.data });
  }
  if (hasil.filter((b) => !b.service_item_id).length > 5) return { error: "Baris manual paling banyak 5." };
  return hasil;
}

/** Pesanan jasa produksi baru (atau ubah yang belum ditagih). */
export async function simpanPesananJasa(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({
    pesananId: Opsional.pipe(z.uuid().nullable()),
    buyerId: z.uuid("Pilih pelanggan"),
    siklusId: Opsional.pipe(z.uuid().nullable()),
    tanggal: z.iso.date("Isi tanggal"),
    catatan: z.string().trim().max(300),
    baris: dariJson(BarisJasaForm, "Isi minimal satu jasa, keterangan sama harganya"),
  }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const pot = PajakDiskon.safeParse(Object.fromEntries(fd.entries()));
  if (!pot.success) return { error: pot.error.issues[0]?.message ?? "Cek lagi pajak sama diskonnya." };
  const baris = barisJasa(p.data.baris);
  if ("error" in baris) return baris;
  return panggil("penjualan.write", "simpan_pesanan_jasa", {
    p_order: p.data.pesananId, p_buyer: p.data.buyerId, p_cycle: p.data.siklusId, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan, p_baris: baris, ...argPotongan(pot.data),
  }, "Pesanan jasa udah disimpan. Tinggal terbitin invoice-nya.");
}

/** Koreksi pesanan jasa yang udah ditagih: isi jasanya, tanggal, catatan. Invoice dihitung ulang. */
export async function koreksiPesananJasa(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({
    pesananId: z.uuid(), tanggal: z.iso.date("Isi tanggal"), catatan: z.string().trim().max(300), alasan: Alasan,
    baris: dariJson(BarisJasaForm, "Isi minimal satu jasa, keterangan sama harganya"),
  }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const baris = barisJasa(p.data.baris);
  if ("error" in baris) return baris;
  return panggil("penjualan.write", "koreksi_pesanan_jasa", {
    p_order: p.data.pesananId, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan, p_baris: baris, p_alasan: p.data.alasan,
  }, "Koreksi jasa udah kesimpan, invoice-nya ikut dihitung ulang.");
}

/** Tambah atau ubah satu jasa di daftar harga (ubah wajib alasan, kecatat di riwayat). */
export async function simpanJasa(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({
    jasaId: Opsional.pipe(z.uuid().nullable()),
    nama: z.string().trim().min(1, "Tulis nama jasanya").max(120),
    harga: Harga,
    aktif: z.string().optional().transform((s) => s !== "0"),
    alasan: z.string().trim().max(500),
  }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("penjualan.write", "simpan_jasa", { p_id: p.data.jasaId, p_nama: p.data.nama, p_harga: p.data.harga, p_aktif: p.data.aktif, p_alasan: p.data.alasan },
    p.data.jasaId ? "Jasa udah dikoreksi." : "Jasa udah ditambah.");
}

export async function batalkanPesanan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ pesananId: z.uuid(), alasan: z.string().trim().min(1, "Tulis alasan").max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("penjualan.write", "batalkan_pesanan", { p_order: p.data.pesananId, p_alasan: p.data.alasan }, "Pesanan udah dibatalin.");
}

const FormKirim = z.object({
  pesananId: z.uuid(),
  baris: dariJson(z.array(z.object({ id: z.uuid(), kirim: z.string(), diterima: z.string() })).min(1), "Isi berat kirim semua baris"),
});

export async function kirimPesanan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("pengiriman.write");
  if (tolak) return tolak;
  const p = FormKirim.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Berat kirim di semua baris harus diisi." };
  const baris = [];
  for (const [i, b] of p.data.baris.entries()) {
    const kirim = Kg.safeParse(b.kirim);
    const diterima = KgOpsional.safeParse(b.diterima);
    if (!kirim.success || !diterima.success) return { error: `Baris ${i + 1}: berat kirim wajib diisi, berat diterima boleh dikosongin (maks. 3 desimal).` };
    baris.push({ id: b.id, kg_kirim: kirim.data, kg_diterima: diterima.data });
  }
  return panggil("pengiriman.write", "kirim_pesanan", { p_order: p.data.pesananId, p_baris: baris }, "Pesanan udah dikirim, stoknya udah dikurangi.");
}

export async function catatBeratDiterima(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ pesananId: z.uuid(), baris: dariJson(z.array(z.object({ id: z.uuid(), diterima: z.string() })).min(1), "Isi berat diterima") }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Isi berat diterima." };
  const baris = [];
  for (const b of p.data.baris) {
    if (b.diterima.trim() === "") continue;
    const kg = Kg.safeParse(b.diterima);
    if (!kg.success) return { error: "Berat diterima harus lebih dari nol, maksimal 3 desimal." };
    baris.push({ id: b.id, kg_diterima: kg.data });
  }
  if (baris.length === 0) return { error: "Isi minimal satu berat diterima." };
  const a = (await izin("invoice.write")) && (await izin("pengiriman.write"));
  if (a) return a;
  const supabase = await createClient();
  const { error } = await supabase.rpc("catat_berat_diterima", { p_order: p.data.pesananId, p_baris: baris });
  if (error) return { error: pesanDb(error) };
  refresh();
  return { pesan: "Berat yang diterima pembeli udah dicatat." };
}

/* ------------------------------------------------------------ invoice */
export async function terbitkanInvoice(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ pesananId: z.uuid() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Pesanannya nggak valid." };
  return panggil("invoice.write", "terbitkan_invoice", { p_order: p.data.pesananId }, "Invoice udah terbit.");
}

export async function terbitkanInvoiceJasa(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ buyerId: z.uuid(), ids: dariJson(z.array(z.uuid()).min(1), "Pilih tagihan jasa") }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Pilih minimal satu tagihan jasa." };
  return panggil("invoice.write", "terbitkan_invoice_jasa", { p_buyer: p.data.buyerId, p_charge_ids: p.data.ids, p_catatan: "" }, "Invoice jasa gudang udah terbit.");
}

export async function batalkanInvoice(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ invoiceId: z.uuid(), alasan: z.string().trim().min(1, "Tulis alasan").max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("invoice.write", "batalkan_invoice", { p_invoice: p.data.invoiceId, p_alasan: p.data.alasan }, "Invoice udah dibatalin.");
}

export async function terimaPembayaran(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ invoiceId: z.uuid(), jumlah: Harga, tanggal: z.iso.date("Isi tanggal"), catatan: z.string().trim().max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("terima_bayar.write", "terima_pembayaran", { p_invoice: p.data.invoiceId, p_jumlah: p.data.jumlah, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan }, "Pembayaran udah dicatat. Kalau ada bukti transfer, lampirkan sekalian.");
}

/* ------------------------------------------------------------ koreksi dan hapus (23 Nov 2026) */
const Alasan = z.string().trim().min(1, "Tulis alasannya").max(500, "Maksimal 500 huruf");

const FormKoreksiPesanan = z.object({
  pesananId: z.uuid(),
  tanggal: z.iso.date("Isi tanggal"),
  catatan: z.string().trim().max(300),
  alasan: Alasan,
  baris: dariJson(z.array(z.object({ id: z.uuid(), kirim: z.string(), diterima: z.string(), harga: z.string() })).min(1), "Isi baris pesanan"),
});

/** Koreksi pesanan yg udah dikirim: berat kirim, berat diterima, harga, tanggal, catatan. Stok dan invoice ikut disesuaikan. */
export async function koreksiPesananTerkirim(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = FormKoreksiPesanan.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const baris = [];
  for (const [i, b] of p.data.baris.entries()) {
    const kirim = Kg.safeParse(b.kirim);
    const diterima = KgOpsional.safeParse(b.diterima);
    const harga = Harga.safeParse(b.harga);
    if (!kirim.success || !diterima.success || !harga.success) return { error: `Baris ${i + 1}: cek lagi berat kirim, berat diterima (boleh kosong), sama harganya.` };
    baris.push({ id: b.id, kg_kirim: kirim.data, kg_diterima: diterima.data, harga_per_kg: harga.data });
  }
  return panggil("penjualan.write", "koreksi_pesanan_terkirim", {
    p_order: p.data.pesananId, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan, p_baris: baris, p_alasan: p.data.alasan,
  }, "Koreksi pesanan udah kesimpan. Stok sama invoice-nya ikut disesuaikan.");
}

/** Hapus pesanan dobel (draf atau batal). Abis itu balik ke daftar penjualan. */
export async function hapusPesanan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ pesananId: z.uuid(), alasan: Alasan }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  const tolak = await izin("penjualan.write");
  if (tolak) return tolak;
  const supabase = await createClient();
  const { error } = await supabase.rpc("hapus_pesanan", { p_order: p.data.pesananId, p_alasan: p.data.alasan });
  if (error) return { error: pesanDb(error) };
  redirect("/penjualan");
}

export async function koreksiUangMasuk(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ bayarId: z.uuid(), jumlah: Harga, tanggal: z.iso.date("Isi tanggal"), catatan: z.string().trim().max(300), alasan: Alasan })
    .safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("terima_bayar.write", "koreksi_uang_masuk", {
    p_payment: p.data.bayarId, p_jumlah: p.data.jumlah, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan, p_alasan: p.data.alasan,
  }, "Koreksi uang masuk udah kesimpan, buku kasnya ikut dibenerin.");
}

export async function hapusUangMasuk(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ bayarId: z.uuid(), alasan: Alasan }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("terima_bayar.write", "hapus_uang_masuk", { p_payment: p.data.bayarId, p_alasan: p.data.alasan }, "Uang masuknya udah dihapus.");
}