import { describe, expect, it } from "vitest";
import { angka, keAngka, kg, normalAngka, persen, rp, ukuranBerkas } from "./format";

describe("format angka Indonesia (titik ribuan, koma desimal)", () => {
  it("nampilin", () => {
    expect(angka(1234567.5)).toBe("1.234.567,5");
    expect(kg(1234.5)).toBe("1.234,5 kg");
    expect(persen(12.345)).toBe("12,3%");
    expect(rp(1250000)).toBe("Rp1.250.000");
    expect(ukuranBerkas(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });
  it("ngebaca isian", () => {
    expect(normalAngka("1.234,5")).toBe("1234.5");
    expect(normalAngka("1.500")).toBe("1500");
    expect(normalAngka("235.5")).toBe("235.5");
    expect(keAngka("1.250.000")).toBe(1250000);
    expect(keAngka("11,5")).toBe(11.5);
    expect(keAngka("11,555")).toBeNull();
    expect(keAngka("abc")).toBeNull();
    expect(keAngka("-5")).toBeNull();
  });
});
