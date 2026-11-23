import { describe, expect, it } from "vitest";
import { GantiSandi } from "./sandi";

const cek = (lama: string, sandi: string, ulangi = sandi) => GantiSandi.safeParse({ lama, sandi, ulangi });
const kolom = (r: ReturnType<typeof cek>) => (r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));

describe("ganti kata sandi", () => {
  it("lolos kalau lengkap dan beda dari yg lama", () => {
    expect(cek("lama-banget-123", "baru-banget-456").success).toBe(true);
  });
  it("sandi lama wajib diisi", () => {
    expect(kolom(cek("", "baru-banget-456"))).toHaveProperty("lama");
  });
  it("minimal 10 karakter, maksimal 72", () => {
    expect(kolom(cek("lama-banget-123", "pendek"))).toHaveProperty("sandi");
    expect(kolom(cek("lama-banget-123", "x".repeat(73)))).toHaveProperty("sandi");
  });
  it("ulangi harus sama", () => {
    expect(kolom(cek("lama-banget-123", "baru-banget-456", "baru-banget-457"))).toHaveProperty("ulangi");
  });
  it("sandi baru nggak boleh sama dengan yg lama", () => {
    expect(kolom(cek("sama-persis-123", "sama-persis-123"))).toHaveProperty("sandi");
  });
});
