import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardOwner } from "@/components/dashboard/DashboardOwner";
import type { DataOwner } from "@/lib/data/dashboardOwner";

// Server action buat buka lampiran nggak dijalanin di tes render.
vi.mock("@/lib/actions/pembelian", () => ({ urlDokumen: async () => ({}), catatDokumen: async () => ({}) }));
vi.mock("@/lib/actions/pengaturan", () => ({ simpanPengaturan: async () => undefined, simpanCctv: async () => undefined, setAktifCctv: async () => undefined }));
import type { LaporanHarian } from "@/lib/data/laporanHarian";
import type { Tindakan } from "@/lib/data/tindakan";
import type { Dashboard } from "@/lib/types/keuangan";

const d: Dashboard = {
  hutang_pemasok: 0, piutang: 5_000_000, invoice_terlambat: 1, piutang_terlambat: 5_000_000, kas_masuk_bulan_ini: 0, kas_keluar_bulan_ini: 0,
  persetujuan_menunggu: 0, biaya_menunggu: 0, koreksi_menunggu: 0, produksi_menunggu: 0, produksi_berjalan: 0, lot_menunggu_mutu: 0,
  stok_sendiri_kg: 0, stok_titipan_kg: 0, pesanan_belum_dikirim: 0, dokumen_kurang: 0,
};
const izin = { persetujuan: true, keuangan: true, penjualan: true, pembelian: true, produksi: true, stok: true, mutu: true, laporan: true };
const item = (n: number, mendesak = false): Tindakan => ({ id: `t${n}`, kelompok: "Persetujuan PO", icon: "check", judul: `PO-${n}`, rincian: "Beli ikan 100 kg · Rp4.500.000", aksi: "Setujui", href: `/persetujuan?x=${n}`, mendesak });
const tampil = (tindakan: Tindakan[]) => renderToStaticMarkup(<DashboardOwner d={d} izin={izin} nama="Hilmy" salam="Selamat pagi" tanggal="Jumat, 23 Oktober 2026" buku={[]} siklus={null} tindakan={tindakan} />);

describe("dashboard: perlu tindakan", () => {
  it("tanpa tindakan: pesan semua beres", () => {
    const html = tampil([]);
    expect(html).toContain("Semua beres");
    expect(html).toContain("Selamat pagi, Hilmy");
  });

  it("setiap item menjadi tautan langsung ke halamannya dengan tombol aksi", () => {
    const html = tampil([item(1, true), item(2)]);
    expect(html).toContain('href="/persetujuan?x=1"');
    expect(html).toContain('href="/persetujuan?x=2"');
    expect(html).toContain("Setujui");
    expect(html).toContain("1 mendesak");
    expect(html).toContain("2 hal");
  });

  it("lebih dari 6 item: sisanya dilipat di 'Lihat N lainnya'", () => {
    const html = tampil(Array.from({ length: 9 }, (_, i) => item(i + 1)));
    expect(html).toContain("Lihat 3 lainnya");
    expect(html).toContain('href="/persetujuan?x=9"'); // item yang dilipat tetap ada di halaman
  });
});

describe("dashboard: laporan harian", () => {
  const lap: LaporanHarian = {
    periode: "kemarin", dari: "2026-11-21", sampai: "2026-11-21",
    ikan: { kg: 1200, lot: 3, ekor: 40, pemasok: ["UD Samudra"] },
    produksi: { jumlah: 1, masukKg: 900, loinKg: 540, sampingKg: 100, berjalan: 0, menunggu: 1, disetujui: 0 },
    stok: { kg: 742, perJenis: [{ nama: "Loin tuna A-SO", kg: 742 }] },
    jual: null,
    uang: { masuk: 5_000_000, keluar: 1_000_000 },
  };
  const html = renderToStaticMarkup(<DashboardOwner d={d} izin={izin} nama="Hilmy" salam="Selamat pagi" tanggal="x" buku={[]} siklus={null} tindakan={[]}
    laporan={{ data: lap, judulTanggal: "Sabtu, 21 November 2026", teks: "teks" }} />);

  it("muncul di atas, judulnya ikut periode, dan tiap kotak nyambung ke menunya", () => {
    expect(html.indexOf("Laporan kemarin")).toBeLessThan(html.indexOf("Perlu tindakan Anda"));
    expect(html).toContain("Sabtu, 21 November 2026");
    for (const h of ["/mutu", "/produksi/jual", "/produksi", "/keuangan"]) expect(html).toContain(`href="${h}"`);
    expect(html).toContain("60,0%");
    expect(html).toContain("1 nunggu dicek");
  });

  it("bisa ganti periode, dan bagian yang nggak boleh dilihat nggak muncul", () => {
    expect(html).toContain('href="/dashboard?periode=7hari"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("Terjual");
  });
});

const owner: DataOwner = {
  saldo: { saldo: 125_000_000, saldoAwal: 100_000_000, masuk: 40_000_000, keluar: 15_000_000, terakhir: "2026-11-22" },
  margin: { pendapatan: 200_000_000, biaya: 150_000_000, laba: 50_000_000, marginPct: 25, jumlahProyek: 3, belumLaku: 0 },
  bep: { modal: 500_000_000, laba: 50_000_000, pct: 10, sisa: 450_000_000, lunas: false, perBulan: 15_000_000, bulanLagi: 30 },
  absensi: { tanggal: "2026-11-23", hadir: 2, terlambat: 1, udahPulang: 0, orang: [{ nama: "Andi", masuk: "2026-11-23T01:10:00Z", pulang: null, terlambat: 10 }] },
  cctv: [{ id: "c1", nama: "Gudang", url: "https://cctv.contoh.test/gudang", urutan: 0, aktif: true }],
  foto: [],
  lampiran: [{ id: "l1", jenis: "kwitansi", nama: "kwitansi-pt-a.pdf", ref: "Bayar dari pembeli", waktu: "2026-11-22T03:00:00Z" }],
};

describe("dashboard: mode owner", () => {
  const html = renderToStaticMarkup(<DashboardOwner d={d} izin={izin} nama="Abay" salam="Selamat pagi" tanggal="Senin, 23 November 2026" buku={[]} siklus={null}
    tindakan={[item(1)]} ruangan={[{ id: "r1", kode: "CS1", nama: "Cold Storage 1", jenis: "cs", kapasitas_kg: 10000, urutan: 1, dikonfirmasi: true, catatan: "", aktif: true, isi_sendiri_kg: 3000, isi_titipan_kg: 1000, isi_kg: 4000, jumlah_unit: 3 }]}
    modeOwner owner={owner} />);

  it("nampilin saldo, margin, balik modal, kapasitas, absensi, CCTV, lampiran", () => {
    expect(html).toContain("Saldo perusahaan");
    expect(html).toContain("Rp125.000.000");
    expect(html).toContain("Margin profit");
    expect(html).toContain("Balik modal (BEP)");
    expect(html).toContain("Kira kira 30 bulan lagi");
    expect(html).toContain("Lihat rincian lainnya");
    expect(html).toContain("Sisa kapasitas gudang dingin");
    expect(html).toContain("6.000,000 kg");
    expect(html).toContain("Absensi hari ini");
    expect(html).toContain("https://cctv.contoh.test/gudang");
    expect(html).toContain("kwitansi-pt-a.pdf");
  });

  it("judulnya Perlu persetujuan, kotak angka bisa diketuk ke halamannya (cuma lihat)", () => {
    expect(html).toContain("Perlu persetujuan Anda");
    expect(html).toContain('href="/persetujuan?x=1"');
    expect(html).toContain('href="/keuangan"');
    expect(html).toContain('href="/penjualan"');
  });
});