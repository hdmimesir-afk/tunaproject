import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JawabanTeks, TabelHasil } from "@/components/asisten/Jawaban";

describe("tampilan jawaban Asisten", () => {
  it("tabel markdown menjadi tabel HTML dengan kepala kolom", () => {
    const html = renderToStaticMarkup(<JawabanTeks teks={"**2 invoice** terlambat.\n\n| Invoice | Sisa |\n| --- | ---: |\n| INV-0001 | Rp1.000.000 |\n| INV-0002 | Rp500.000 |"} />);
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("INV-0002");
    expect(html).toContain("<strong");
  });

  it("HTML mentah, gambar, dan tautan luar tidak dirender", () => {
    const html = renderToStaticMarkup(<JawabanTeks teks={'<script>alert(1)</script>\n\n![x](https://evil.test/a.png)\n\n[klik](https://evil.test) dan [bagus](/penjualan)'} />);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain('href="https://evil.test"');
    expect(html).toContain('href="/penjualan"');
  });

  it("tabel hasil alat: kolom angka rata kanan", () => {
    const html = renderToStaticMarkup(<TabelHasil t={{ kepala: ["Ekor", "Hasil"], kananDari: 1, baris: [["1", "65,0%"]] }} />);
    expect(html).toContain("text-right");
    expect(html).toContain("65,0%");
  });
});
