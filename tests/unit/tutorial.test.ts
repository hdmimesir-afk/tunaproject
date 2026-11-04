import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODULES } from "@/lib/modules";
import { MATRIKS } from "@/components/update/isi";
import { GAMBAR } from "@/components/tutorial/gambar";
import { BAB, DAFTAR_PERAN } from "@/components/tutorial/isi";

describe("isi panduan", () => {
  it("membahas semua menu aplikasi", () => {
    const dibahas = new Set(BAB.map((b) => b.menu));
    for (const m of MODULES) expect(dibahas, `menu /${m.slug}`).toContain(`/${m.slug}`);
  });

  it("setiap gambar yang dipakai ada berkasnya", () => {
    for (const nama of Object.keys(GAMBAR)) expect(existsSync(join(process.cwd(), "public", "tutorial", `${nama}.webp`)), nama).toBe(true);
  });

  it("jabatan tiap bab sama dengan tabel menu", () => {
    for (const b of BAB) {
      if (!b.menu) continue;
      const modul = MODULES.find((m) => `/${m.slug}` === b.menu);
      const baris = MATRIKS.find((m) => m.menu === modul?.label);
      expect(baris, b.judul).toBeDefined();
      const seharusnya = DAFTAR_PERAN.filter((_, i) => baris!.ada[i]).map((p) => p.id);
      expect([...b.peran].sort(), b.judul).toEqual([...seharusnya].sort());
    }
  });
});
