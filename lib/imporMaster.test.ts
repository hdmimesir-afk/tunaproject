import { describe, expect, it } from "vitest";
import { normalJudul, petakan, teksSel } from "./imporMaster";

describe("normalJudul", () => {
  it("buang kurung, tanda wajib, dan tanda baca", () => {
    expect(normalJudul("Tempo bayar (hari) *")).toBe("tempo bayar");
    expect(normalJudul("  NAMA  (wajib) ")).toBe("nama");
    expect(normalJudul("No. HP")).toBe("no hp");
  });
});

describe("petakan", () => {
  it("urutan kolom bebas, judul lain dikenali, isi masuk ke kolom yg bener", () => {
    const h = petakan("buyers", ["Tempo", "No HP", "Nama Pembeli", "Alamat"], [
      { no: 2, sel: ["30", "0811", "PT A", "Jl. X"] },
      { no: 3, sel: ["", "", "", ""] },
      { no: 4, sel: ["", "", " CV B ", ""] },
    ]);
    expect(h.galat).toBeNull();
    expect(h.baris).toEqual([
      { _no: "2", tempo_hari: "30", kontak: "0811", nama: "PT A" },
      { _no: "4", tempo_hari: "", kontak: "", nama: "CV B" },
    ]);
    expect(h.diabaikan).toEqual(["Alamat"]);
  });

  it("kolom wajib nggak ada = galat", () => {
    expect(petakan("supply_items", ["Nama", "Satuan"], [{ no: 2, sel: ["Es", "balok"] }]).galat).toMatch(/Kategori/);
    expect(petakan("suppliers", ["Kontak"], [{ no: 2, sel: ["0811"] }]).galat).toMatch(/Nama/);
  });

  it("judul dobel: yg kedua diabaikan, nggak nimpa", () => {
    const h = petakan("suppliers", ["Nama", "Nama"], [{ no: 2, sel: ["A", "B"] }]);
    expect(h.baris[0].nama).toBe("A");
    expect(h.diabaikan).toEqual(["Nama"]);
  });

  it("file tanpa data = galat", () => {
    expect(petakan("products", ["Nama"], [{ no: 2, sel: [""] }]).galat).toMatch(/Belum ada data/);
  });
});

describe("teksSel", () => {
  it("angka, rumus, teks berformat, tanggal", () => {
    expect(teksSel(2.5)).toBe("2.5");
    expect(teksSel(14)).toBe("14");
    expect(teksSel({ formula: "A1*2", result: 28 })).toBe("28");
    expect(teksSel({ richText: [{ text: "Es " }, { text: "balok" }] })).toBe("Es balok");
    expect(teksSel({ text: "web", hyperlink: "http://x" })).toBe("web");
    expect(teksSel(new Date("2026-11-22T00:00:00Z"))).toBe("2026-11-22");
    expect(teksSel(null)).toBe("");
  });
});
