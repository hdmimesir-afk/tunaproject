import { z } from "zod";

/* Ganti kata sandi akun sendiri (permintaan user 23 Nov 2026). Kata sandi lama wajib diisi biar HP yg ketinggalan
   dalam keadaan login nggak bisa dipakai orang lain buat ngambil alih akun. Aturan panjangnya sama dengan sandi baru dari tautan. */
export const GantiSandi = z.object({
  lama: z.string().min(1, "Isi kata sandi yg sekarang"),
  sandi: z.string().min(10, "Minimal 10 karakter").max(72, "Maksimal 72 karakter"),
  ulangi: z.string(),
})
  .refine((d) => d.sandi === d.ulangi, { message: "Kata sandinya nggak sama", path: ["ulangi"] })
  .refine((d) => d.sandi !== d.lama, { message: "Kata sandi baru harus beda dari yg sekarang", path: ["sandi"] });
