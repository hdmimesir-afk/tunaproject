import { z } from "zod";
import { normalAngka } from "@/lib/format";

/* Skema Zod buat isian angka gaya Indonesia (24 Nov 2026): "1.234,5" kebaca 1234,5. Angka (number) dari JSON tetap diterima. */
export function AngkaId({ pesan = "Isi angkanya", desimal = 2, min = 0, max = 1e15, minus = false }: { pesan?: string; desimal?: number; min?: number; max?: number; minus?: boolean } = {}) {
  return z.union([z.number(), z.string()]).transform((v, ctx) => {
    let n: number | null = null;
    if (typeof v === "number") n = Number.isFinite(v) ? v : null;
    else {
      const s = v.trim();
      const neg = minus && s.startsWith("-");
      const t = normalAngka(neg ? s.slice(1) : s);
      if (t !== null && new RegExp(`^\\d+(\\.\\d{1,${desimal}})?$`).test(t)) n = (neg ? -1 : 1) * Number(t);
    }
    if (n === null) {
      ctx.addIssue({ code: "custom", message: `${pesan}, pakai koma buat desimal (maks. ${desimal} angka di belakang koma)` });
      return z.NEVER;
    }
    if (n < min || n > max) {
      ctx.addIssue({ code: "custom", message: n < min ? `${pesan}, minimal ${min.toLocaleString("id-ID")}` : `${pesan}, maksimal ${max.toLocaleString("id-ID")}` });
      return z.NEVER;
    }
    const f = 10 ** desimal;
    return Math.round(n * f) / f;
  });
}
