import { describe, expect, it } from "vitest";
import { ekorKeRpc, ringkasEkor, tagBerikut, type IsianEkor } from "./ekor";

const e = (k: string, noTag: string, kg: string, gradeId = "", gancu = 0): IsianEkor => ({ k, noTag, spesies: "Tuna", kg, gradeId, gancu });

describe("ringkasEkor", () => {
  it("menghitung berat, potongan gancu, dan berat dibayar per grade (contoh Figma)", () => {
    const r = ringkasEkor([e("1", "T-014", "42", "ab"), e("2", "T-027", "38", "ab", 1), e("3", "T-031", "51", "c"), e("4", "T-008", "46", "ab")], 1);
    expect(r.jumlah).toBe(4);
    expect(r.gram).toBe(177_000);
    expect(r.gramPotongan).toBe(1_000);
    expect(r.gramBayar).toBe(176_000);
    expect(r.perGrade.get("ab")).toEqual({ jumlah: 3, gramBayar: 125_000 });
    expect(r.perGrade.get("c")).toEqual({ jumlah: 1, gramBayar: 51_000 });
    expect(r.semuaGrade).toBe(true);
  });

  it("pakai potongan per tusukan dari pengaturan", () => {
    expect(ringkasEkor([e("1", "A", "20", "", 2)], 0.5).gramBayar).toBe(19_000);
  });

  it("baris kosong di-skip, grade sebagian ketahuan", () => {
    const r = ringkasEkor([e("1", "A", "10", "ab"), e("2", "B", "12"), e("3", "", "")], 1);
    expect(r.jumlah).toBe(2);
    expect(r.adaGrade).toBe(true);
    expect(r.semuaGrade).toBe(false);
  });

  it("nandain berat salah, gancu kebanyakan, dan tag ganda", () => {
    const r = ringkasEkor([e("1", "A", "abc"), e("2", "B", "1", "", 2), e("3", "C", "10"), e("4", "c", "11")], 1);
    expect(r.salah.get("1")).toMatch(/berat/i);
    expect(r.salah.get("2")).toMatch(/gancu/i);
    expect(r.salah.get("3")).toMatch(/dua kali/);
    expect(r.salah.get("4")).toMatch(/dua kali/);
  });
});

describe("ekorKeRpc dan tagBerikut", () => {
  it("ngubah isian ke data database", () => {
    expect(ekorKeRpc([e("1", " T-1 ", "42,5", "ab", 1), e("2", "", "")])).toEqual([
      { id: null, no_tag: "T-1", spesies: "Tuna", kg: 42.5, grade_id: "ab", gancu: 1 },
    ]);
  });
  it("nomor tag berikutnya", () => {
    expect(tagBerikut("T-014")).toBe("T-015");
    expect(tagBerikut("T-099")).toBe("T-100");
    expect(tagBerikut("ABC")).toBe("");
  });
});
