import { describe, expect, it } from "vitest";
import { jumlahBaris, linkWa, pesanPengingat, tersedia, totalBaris } from "./penjualan";

describe("jumlahBaris", () => {
  it("kg x harga tanpa selisih pecahan", () => {
    expect(jumlahBaris(49.5, 100_000)).toBe(4_950_000);
    expect(jumlahBaris(9.8, 50_000)).toBe(490_000);
    expect(jumlahBaris(0.1, 0.2)).toBe(0.02);
  });
  it("dibulatkan ke sen setengah ke atas", () => {
    expect(jumlahBaris(0.333, 100.5)).toBe(33.47); // 33,4665
    expect(jumlahBaris(300.94, 135_144)).toBe(40_670_235.36);
  });
  it("jumlah total dijumlah dalam sen", () => {
    expect(totalBaris([{ kg: 49.5, harga: 100_000 }, { kg: 14, harga: 30_000 }])).toBe(5_370_000);
  });
});

describe("tersedia", () => {
  it("sisa dikurangi pesanan draf lain, tidak negatif", () => {
    expect(tersedia(100, 50)).toBe(50);
    expect(tersedia(10, 12)).toBe(0);
    expect(tersedia(0.3, 0.1)).toBe(0.2);
  });
});

describe("pengingat", () => {
  it("pesan menyebut invoice, sisa, dan hari terlambat", () => {
    const t = pesanPengingat({ pembeli: "Pak Budi", kode: "INV-0001", sisa: 4_370_000, jatuhTempo: "2026-11-05", hariTelat: 3 });
    expect(t).toContain("INV-0001");
    expect(t).toContain("Rp4.370.000");
    expect(t).toContain("terlambat 3 hari");
  });
  it("nomor telepon Indonesia menjadi tautan WhatsApp", () => {
    expect(linkWa("0812-3456-7890", "halo")).toBe("https://wa.me/6281234567890?text=halo");
    expect(linkWa("+62 821-2538-1501", "a b")).toBe("https://wa.me/6282125381501?text=a%20b");
    expect(linkWa("kantor", "x")).toBeNull();
  });
});
