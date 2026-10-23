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
const Opsional = z.string().trim().transform((s) => (s === "" ? null : s));
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
    if (!kg.success || !harga.success) return { error: `Baris ${i + 1}: isi berat (maks. 3 desimal) dan harga per kg dengan benar.` };
    baris.push({ id: b.id ?? null, unit_id: b.unit_id, kg: kg.data, harga: harga.data });
  }
  return panggil("penjualan.write", "simpan_pesanan", {
    p_order: p.data.pesananId, p_buyer: p.data.buyerId, p_cycle: p.data.siklusId, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan, p_baris: baris,
  }, "Pesanan disimpan.");
}

export async function batalkanPesanan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ pesananId: z.uuid(), alasan: z.string().trim().min(1, "Tulis alasan").max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("penjualan.write", "batalkan_pesanan", { p_order: p.data.pesananId, p_alasan: p.data.alasan }, "Pesanan dibatalkan.");
}

const FormKirim = z.object({
  pesananId: z.uuid(),
  baris: dariJson(z.array(z.object({ id: z.uuid(), kirim: z.string(), diterima: z.string() })).min(1), "Isi berat kirim semua baris"),
});

export async function kirimPesanan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const tolak = await izin("pengiriman.write");
  if (tolak) return tolak;
  const p = FormKirim.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Isi berat kirim semua baris." };
  const baris = [];
  for (const [i, b] of p.data.baris.entries()) {
    const kirim = Kg.safeParse(b.kirim);
    const diterima = KgOpsional.safeParse(b.diterima);
    if (!kirim.success || !diterima.success) return { error: `Baris ${i + 1}: berat kirim wajib, berat diterima boleh kosong (maks. 3 desimal).` };
    baris.push({ id: b.id, kg_kirim: kirim.data, kg_diterima: diterima.data });
  }
  return panggil("pengiriman.write", "kirim_pesanan", { p_order: p.data.pesananId, p_baris: baris }, "Pesanan dikirim dan stok berkurang.");
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
  return { pesan: "Berat diterima pembeli dicatat." };
}

/* ------------------------------------------------------------ invoice */
export async function terbitkanInvoice(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ pesananId: z.uuid() }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Pesanan tidak valid." };
  return panggil("invoice.write", "terbitkan_invoice", { p_order: p.data.pesananId }, "Invoice terbit.");
}

export async function terbitkanInvoiceJasa(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ buyerId: z.uuid(), ids: dariJson(z.array(z.uuid()).min(1), "Pilih tagihan jasa") }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { error: "Pilih minimal satu tagihan jasa." };
  return panggil("invoice.write", "terbitkan_invoice_jasa", { p_buyer: p.data.buyerId, p_charge_ids: p.data.ids, p_catatan: "" }, "Invoice jasa gudang terbit.");
}

export async function batalkanInvoice(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ invoiceId: z.uuid(), alasan: z.string().trim().min(1, "Tulis alasan").max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("invoice.write", "batalkan_invoice", { p_invoice: p.data.invoiceId, p_alasan: p.data.alasan }, "Invoice dibatalkan.");
}

export async function terimaPembayaran(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const p = z.object({ invoiceId: z.uuid(), jumlah: Harga, tanggal: z.iso.date("Isi tanggal"), catatan: z.string().trim().max(300) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { kolom: z.flattenError(p.error).fieldErrors };
  return panggil("terima_bayar.write", "terima_pembayaran", { p_invoice: p.data.invoiceId, p_jumlah: p.data.jumlah, p_tanggal: p.data.tanggal, p_catatan: p.data.catatan }, "Pembayaran dicatat. Lampirkan bukti transfer bila ada.");
}
