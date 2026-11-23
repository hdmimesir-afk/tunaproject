import { z } from "zod";

/* Sesi pengguna dan cek izin. Sumber kebenaran izin ada di database (private.has_permission + RLS);
   fungsi di sini hanya untuk menampilkan menu dan memberi pesan lebih awal. */

const SesiDb = z.object({
  user_id: z.string(),
  nama: z.string(),
  email: z.string(),
  aktif: z.boolean(),
  role_id: z.string().nullable(),
  role_nama: z.string().nullable(),
  semua_izin: z.boolean(),
  wajib_mfa: z.boolean(),
  aal: z.enum(["aal1", "aal2"]),
  izin: z.array(z.string()),
});

export type Sesi = {
  userId: string;
  nama: string;
  email: string;
  aktif: boolean;
  roleId: string | null;
  roleNama: string | null;
  semuaIzin: boolean;
  wajibMfa: boolean;
  aal: "aal1" | "aal2";
  izin: string[];
};

/** Hasil RPC sesi_saya() menjadi Sesi; null bila bentuknya tidak sesuai. */
export function parseSesi(raw: unknown): Sesi | null {
  const r = SesiDb.safeParse(raw);
  if (!r.success) return null;
  const d = r.data;
  return { userId: d.user_id, nama: d.nama, email: d.email, aktif: d.aktif, roleId: d.role_id, roleNama: d.role_nama, semuaIzin: d.semua_izin, wajibMfa: d.wajib_mfa, aal: d.aal, izin: d.izin };
}

/** Peran wajib MFA tapi sesi belum lolos kode kedua. */
export const perluMfa = (s: Pick<Sesi, "wajibMfa" | "aal">) => s.wajibMfa && s.aal !== "aal2";

/* Akun owner cuma buat lihat dan nyetujuin (permintaan owner 23 Nov 2026, "kayak aplikasi barber"): nggak ada input,
   upload, hapus data, atau kelola akun dari aplikasi. Yang boleh: lihat (.read, .rekap), setuju/periksa (.setuju, .periksa),
   tutup buku/proyek (.tutup), dan Asisten AI (cuma baca). Database tetap ngasih owner semua izin; batasan ini di aplikasi. */
export const PERAN_OWNER = "owner";
/** Menu yang muncul buat owner. Halaman lain tetap bisa dibuka dari kotak "Perlu persetujuan" buat nyetujuin, tanpa tombol input. */
export const MENU_OWNER = new Set(["dashboard", "laporan"]);
export const izinOwner = (aksi: string) => /\.(read|rekap|setuju|periksa|tutup)$/.test(aksi) || aksi === "asisten.use";

/** Boleh melakukan aksi? Aksi kosong berarti cukup masuk dan aktif. Sama dengan aturan di database (kecuali owner, lihat di atas). */
export function boleh(s: Pick<Sesi, "aktif" | "roleId" | "semuaIzin" | "izin" | "wajibMfa" | "aal">, aksi?: string | null) {
  if (!s.aktif || !s.roleId || perluMfa(s)) return false;
  if (aksi && s.roleId === PERAN_OWNER && !izinOwner(aksi)) return false;
  return !aksi || s.semuaIzin || s.izin.includes(aksi);
}

/** Menu buat sesi ini: owner cuma Dashboard dan Laporan, peran lain ngikut izin tiap modul. */
export function bolehMenu(s: Pick<Sesi, "aktif" | "roleId" | "semuaIzin" | "izin" | "wajibMfa" | "aal">, slug: string, izinModul: string | null) {
  if (s.roleId === PERAN_OWNER) return MENU_OWNER.has(slug) && boleh(s, izinModul);
  return boleh(s, izinModul);
}

/** Alamat tujuan setelah masuk: hanya jalur internal, tidak pernah ke situs lain. */
export function tujuanAman(next: unknown, bawaan = "/dashboard") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : bawaan;
}
