import { describe, expect, it } from "vitest";
import { gantiAkhiran, ukuranBaru } from "./kompresFoto";

describe("ukuranBaru", () => {
  it("foto gede dikecilin, perbandingan tetap", () => {
    expect(ukuranBaru(4000, 3000, 2000)).toEqual({ lebar: 2000, tinggi: 1500 });
    expect(ukuranBaru(3000, 4000, 2000)).toEqual({ lebar: 1500, tinggi: 2000 });
  });
  it("foto kecil nggak diperbesar", () => {
    expect(ukuranBaru(800, 600, 2000)).toEqual({ lebar: 800, tinggi: 600 });
  });
});

describe("gantiAkhiran", () => {
  it("ganti akhiran nama berkas", () => {
    expect(gantiAkhiran("nota timbang.JPG", "webp")).toBe("nota timbang.webp");
    expect(gantiAkhiran("IMG_001.heic.jpg", "webp")).toBe("IMG_001.heic.webp");
    expect(gantiAkhiran("tanpa-akhiran", "jpg")).toBe("tanpa-akhiran.jpg");
  });
});
