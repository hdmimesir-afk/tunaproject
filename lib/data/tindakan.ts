import "server-only";
import { rp, tanggal } from "@/lib/format";
import { boleh, type Sesi } from "@/lib/izin";
import { tampilKg } from "@/lib/logic/grid";
import { createClient } from "@/lib/supabase/server";
import type { BukuBulanan } from "@/lib/types/keuangan";

/* Daftar hal yang menunggu pengguna ini, satu baris per transaksi, dengan tautan langsung ke halaman tempat urusannya
   diselesaikan. Hanya hal yang BISA ditindak peran ini yang muncul (izin dicek di sini; database tetap menolak sendiri).
   Dibaca lewat klien pengguna, jadi RLS berlaku. */

export type Tindakan = {
  id: string;
  kelompok: string;
  icon: "check" | "cash" | "box" | "factory" | "flask" | "truck" | "calendar";
  judul: string;
  rincian: string;
  aksi: string;
  href: string;
  /** Mendesak: sudah lewat batas waktu (mis. invoice terlambat) atau menahan pekerjaan orang lain. */
  mendesak: boolean;
};

const BATAS = 8;
const kg = (n: number) => `${tampilKg(Math.round(Number(n) * 1000))} kg`;
const namaBulan = (b: string) => new Date(`${b}T00:00:00Z`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

export async function daftarTindakan(sesi: Sesi, buku: BukuBulanan[]): Promise<Tindakan[]> {
  const sb = await createClient();
  const hasil: Tindakan[] = [];
  const tugas: PromiseLike<void>[] = [];
  const tambah = (fn: () => PromiseLike<void>) => tugas.push(fn());

  // 1. Persetujuan PO: diperiksa dulu, lalu disetujui.
  if (boleh(sesi, "persetujuan.periksa") || boleh(sesi, "persetujuan.setuju")) {
    tambah(async () => {
      const { data } = await sb.from("v_persetujuan").select("id, kode, status, judul, jumlah, supplier_nama, po_kode").in("status", ["diajukan", "diperiksa"]).order("diajukan_pada").limit(BATAS);
      for (const a of data ?? []) {
        const perluSetuju = a.status === "diperiksa";
        if (perluSetuju ? !boleh(sesi, "persetujuan.setuju") : !(boleh(sesi, "persetujuan.periksa") || boleh(sesi, "persetujuan.setuju"))) continue;
        hasil.push({ id: `apv-${a.id}`, kelompok: "Persetujuan PO", icon: "check", judul: `${a.po_kode ?? a.kode} · ${a.supplier_nama}`, rincian: `${a.judul} · ${rp(Number(a.jumlah))}`, aksi: perluSetuju ? "Setujui" : "Periksa", href: `/persetujuan?a=${a.id}`, mendesak: true });
      }
    });
  }

  // 2. Biaya menunggu keputusan Owner.
  if (boleh(sesi, "biaya.setuju")) {
    tambah(async () => {
      const { data } = await sb.from("v_expenses").select("id, kode, kategori_nama, uraian, jumlah, jml_nota").eq("status", "diajukan").order("diajukan_pada").limit(BATAS);
      for (const b of data ?? []) hasil.push({ id: `bya-${b.id}`, kelompok: "Biaya", icon: "cash", judul: `${b.kode} · ${b.kategori_nama}`, rincian: `${b.uraian} · ${rp(Number(b.jumlah))}${Number(b.jml_nota) === 0 ? " · tanpa nota" : ""}`, aksi: "Putuskan", href: `/keuangan?b=${b.id}`, mendesak: false });
    });
  }

  // 3. Koreksi stok menunggu Owner.
  if (boleh(sesi, "stok.setuju")) {
    tambah(async () => {
      const { data } = await sb.from("storage_movements").select("id, kg, alasan, storage_units(kode)").eq("jenis", "koreksi").eq("status", "diajukan").order("waktu").limit(BATAS);
      for (const m of data ?? []) {
        const unit = (m as unknown as { storage_units: { kode: string } | null }).storage_units?.kode ?? "stok";
        hasil.push({ id: `kor-${m.id}`, kelompok: "Koreksi stok", icon: "box", judul: `${unit} · ${Number(m.kg) > 0 ? "+" : ""}${kg(Number(m.kg))}`, rincian: String(m.alasan), aksi: "Putuskan", href: "/stok", mendesak: false });
      }
    });
  }

  // 4. Produksi menunggu QC atau Owner.
  if (boleh(sesi, "produksi.periksa") || boleh(sesi, "produksi.setuju")) {
    tambah(async () => {
      const { data } = await sb.from("v_productions").select("id, kode, status, masuk_kg, loin_kg, hasil_pct, belum_jelas_kg").in("status", ["selesai", "diperiksa_qc"]).order("kode").limit(BATAS);
      for (const p of data ?? []) {
        const qc = p.status === "selesai";
        if (qc ? !boleh(sesi, "produksi.periksa") : !boleh(sesi, "produksi.setuju")) continue;
        hasil.push({ id: `prd-${p.id}`, kelompok: "Produksi", icon: "factory", judul: `${p.kode} · ${qc ? "menunggu pemeriksaan QC" : "menunggu persetujuan Owner"}`, rincian: `Loin ${kg(Number(p.loin_kg))} dari ${kg(Number(p.masuk_kg))} (${Number(p.hasil_pct).toLocaleString("id-ID", { minimumFractionDigits: 1 })}%), selisih belum jelas ${kg(Number(p.belum_jelas_kg))}`, aksi: qc ? "Periksa" : "Setujui", href: `/produksi?p=${p.id}`, mendesak: false });
      }
    });
  }

  // 5. Lot baru menunggu cek mutu.
  if (boleh(sesi, "mutu.write")) {
    tambah(async () => {
      const { data } = await sb.from("lots").select("id, kode, po_kode, kg, sebelum_disetujui").eq("qc", "menunggu").order("kode").limit(BATAS);
      for (const l of data ?? []) hasil.push({ id: `lot-${l.id}`, kelompok: "Mutu", icon: "flask", judul: `${l.kode} · ${l.po_kode}`, rincian: `${kg(Number(l.kg))} menunggu cek mutu${l.sebelum_disetujui ? " · bongkar malam" : ""}`, aksi: "Cek mutu", href: "/mutu", mendesak: Boolean(l.sebelum_disetujui) });
    });
  }

  // 6. Pesanan jual yang belum dikirim.
  if (boleh(sesi, "pengiriman.write")) {
    tambah(async () => {
      const { data } = await sb.from("v_sales_orders").select("id, kode, buyer_nama, kg_pesan, total_pesan").eq("status", "draf").order("tanggal").limit(BATAS);
      for (const p of data ?? []) hasil.push({ id: `psn-${p.id}`, kelompok: "Pengiriman", icon: "truck", judul: `${p.kode} · ${p.buyer_nama}`, rincian: `${kg(Number(p.kg_pesan))} · ${rp(Number(p.total_pesan))} belum dikirim`, aksi: "Kirim", href: `/penjualan?p=${p.id}`, mendesak: false });
    });
  }

  // 7. Invoice terlambat: tagih.
  if (boleh(sesi, "terima_bayar.write") || boleh(sesi, "invoice.write")) {
    tambah(async () => {
      const { data } = await sb.from("v_invoices").select("id, kode, buyer_nama, sisa, jatuh_tempo, hari_telat").eq("status_tagihan", "terlambat").order("hari_telat", { ascending: false }).limit(BATAS);
      for (const i of data ?? []) hasil.push({ id: `inv-${i.id}`, kelompok: "Tagihan terlambat", icon: "cash", judul: `${i.kode} · ${i.buyer_nama}`, rincian: `Sisa ${rp(Number(i.sisa))} · terlambat ${i.hari_telat} hari (jatuh tempo ${tanggal(i.jatuh_tempo as string)})`, aksi: "Tagih", href: `/penjualan?inv=${i.id}`, mendesak: true });
    });
  }

  // 9. Izin atau sakit karyawan menunggu keputusan Owner.
  if (boleh(sesi, "absensi.setuju")) {
    tambah(async () => {
      const { data } = await sb.rpc("daftar_izin");
      const menunggu = ((data ?? []) as { id: string; nama: string; jenis: string; dari: string; sampai: string; alasan: string; status: string; milik_saya: boolean }[])
        .filter((i) => i.status === "diajukan" && !i.milik_saya).slice(0, BATAS);
      for (const i of menunggu) {
        const tgl = i.dari === i.sampai ? tanggal(i.dari) : `${tanggal(i.dari)} s.d. ${tanggal(i.sampai)}`;
        hasil.push({ id: `izn-${i.id}`, kelompok: "Izin karyawan", icon: "calendar", judul: `${i.nama} · ${i.jenis}`, rincian: `${tgl} · ${i.alasan}`, aksi: "Putuskan", href: "/absensi", mendesak: false });
      }
    });
  }

  await Promise.all(tugas);

  // 8. Buku bulan yang sudah berakhir dan siap ditutup (hanya yang tertua).
  if (boleh(sesi, "periode.tutup")) {
    const tertua = [...buku].reverse().find((b) => b.status === "terbuka" && !b.bulan_berjalan && b.jumlah_transaksi > 0);
    if (tertua) hasil.push({ id: `per-${tertua.bulan}`, kelompok: "Tutup buku", icon: "calendar", judul: `Buku ${namaBulan(tertua.bulan)} siap ditutup`, rincian: `${tertua.jumlah_transaksi} transaksi · saldo akhir ${rp(tertua.saldo_akhir)}`, aksi: "Tutup buku", href: "/keuangan", mendesak: false });
  }

  // Yang mendesak dulu, lalu yang sudah lama menunggu (urutan asal dipertahankan di dalam kelompok).
  return hasil.sort((a, b) => Number(b.mendesak) - Number(a.mendesak));
}
