import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardOwner } from "@/components/dashboard/DashboardOwner";
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
    for (const h of ["/mutu", "/produksi", "/stok", "/keuangan"]) expect(html).toContain(`href="${h}"`);
    expect(html).toContain("60,0%");
    expect(html).toContain("1 nunggu dicek");
  });

  it("bisa ganti periode, dan bagian yang nggak boleh dilihat nggak muncul", () => {
    expect(html).toContain('href="/dashboard?periode=7hari"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("Terjual");
  });
});
