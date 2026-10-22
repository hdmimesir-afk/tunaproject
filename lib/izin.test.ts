import { describe, expect, it } from "vitest";
import { boleh, parseSesi, perluMfa, tujuanAman } from "./izin";

const dasar = { aktif: true, roleId: "petugas_lapangan", semuaIzin: false, izin: ["master.read"], wajibMfa: false, aal: "aal1" as const };

describe("boleh", () => {
  it("mengikuti daftar izin peran", () => {
    expect(boleh(dasar, "master.read")).toBe(true);
    expect(boleh(dasar, "master.write")).toBe(false);
    expect(boleh(dasar)).toBe(true);
  });
  it("menolak akun nonaktif atau tanpa peran", () => {
    expect(boleh({ ...dasar, aktif: false }, "master.read")).toBe(false);
    expect(boleh({ ...dasar, roleId: null })).toBe(false);
  });
  it("owner memegang semua izin hanya setelah MFA", () => {
    const owner = { ...dasar, roleId: "owner", semuaIzin: true, izin: [], wajibMfa: true };
    expect(boleh(owner, "apa.saja")).toBe(false);
    expect(perluMfa(owner)).toBe(true);
    expect(boleh({ ...owner, aal: "aal2" }, "apa.saja")).toBe(true);
  });
});

describe("parseSesi", () => {
  it("mengubah hasil sesi_saya menjadi Sesi", () => {
    const s = parseSesi({ user_id: "u1", nama: "A", email: "a@x", aktif: true, role_id: "finance", role_nama: "Finance", semua_izin: false, wajib_mfa: true, aal: "aal1", izin: ["master.read"] });
    expect(s?.roleId).toBe("finance");
    expect(s && perluMfa(s)).toBe(true);
  });
  it("menolak bentuk yang tidak sesuai", () => {
    expect(parseSesi(null)).toBeNull();
    expect(parseSesi({ user_id: 1 })).toBeNull();
  });
});

describe("tujuanAman", () => {
  it("hanya menerima jalur internal", () => {
    expect(tujuanAman("/produksi")).toBe("/produksi");
    expect(tujuanAman("https://jahat.example")).toBe("/dashboard");
    expect(tujuanAman("//jahat.example")).toBe("/dashboard");
    expect(tujuanAman("/\\jahat.example")).toBe("/dashboard");
    expect(tujuanAman(null)).toBe("/dashboard");
  });
});
