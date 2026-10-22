import { describe, expect, it } from "vitest";
import { isTabelMaster, skemaMaster } from "./master";

describe("skemaMaster", () => {
  it("mewajibkan nama dan merapikan spasi", () => {
    const s = skemaMaster("suppliers");
    expect(s.safeParse({ nama: "  ", kontak: "", catatan: "" }).success).toBe(false);
    expect(s.parse({ nama: " Pemasok A ", kontak: "", catatan: "" })).toEqual({ nama: "Pemasok A", kontak: "", catatan: "" });
  });
  it("membatasi angka dan pilihan", () => {
    const pembeli = skemaMaster("buyers");
    expect(pembeli.parse({ nama: "B", kontak: "", tempo_hari: "30" }).tempo_hari).toBe(30);
    expect(pembeli.safeParse({ nama: "B", kontak: "", tempo_hari: "400" }).success).toBe(false);
    const komponen = skemaMaster("component_categories");
    expect(komponen.safeParse({ nama: "X", komponen: "lain", urutan: 1 }).success).toBe(false);
  });
  it("hanya menerima tabel master yang dikenal", () => {
    expect(isTabelMaster("suppliers")).toBe(true);
    expect(isTabelMaster("profiles")).toBe(false);
  });
});
