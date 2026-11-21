/* Upload Excel data master. Di sini cuma aturan kolom dan pemetaan judul kolom ke kolom database (dipakai di klien dan tes).
   Validasi isinya (wajib, angka, dobel, cocok sama data yg udah ada) dikerjain database lewat public.impor_master,
   jadi aturannya cuma satu tempat. Urutan kolom di file bebas: yg dicocokin judulnya. */

export type JenisImpor = "suppliers" | "buyers" | "products" | "supply_items";

export type KolomImpor = {
  /** Nama kolom di database / di data yg dikirim ke public.impor_master. */
  k: string;
  /** Judul kolom di template. */
  judul: string;
  wajib?: boolean;
  /** Judul lain yg juga dikenali (udah dinormalisasi lewat normalJudul). */
  lain: string[];
  contoh: string;
  keterangan: string;
};

export const IMPOR: Record<JenisImpor, { label: string; izin: "master.write" | "stok.write"; kolom: KolomImpor[] }> = {
  suppliers: {
    label: "Pemasok",
    izin: "master.write",
    kolom: [
      { k: "nama", judul: "Nama", wajib: true, lain: ["nama pemasok", "pemasok", "nelayan", "nama nelayan", "supplier"], contoh: "Pak Darto", keterangan: "Wajib. Kalo namanya udah ada, datanya diperbarui, bukan dibikin baru." },
      { k: "kontak", judul: "Kontak", lain: ["no hp", "hp", "telepon", "no telepon", "telp", "whatsapp", "wa", "nomor hp"], contoh: "081234567890", keterangan: "Boleh kosong. Ketik sebagai teks biar angka 0 di depan nggak ilang." },
      { k: "catatan", judul: "Catatan", lain: ["keterangan", "alamat"], contoh: "Nelayan Sendang Biru", keterangan: "Boleh kosong." },
    ],
  },
  buyers: {
    label: "Pembeli",
    izin: "master.write",
    kolom: [
      { k: "nama", judul: "Nama", wajib: true, lain: ["nama pembeli", "pembeli", "perusahaan", "nama perusahaan", "customer", "pt"], contoh: "PT Samudra Jaya", keterangan: "Wajib. Kalo namanya udah ada, datanya diperbarui." },
      { k: "kontak", judul: "Kontak", lain: ["no hp", "hp", "telepon", "no telepon", "telp", "whatsapp", "wa", "email"], contoh: "021555123", keterangan: "Boleh kosong." },
      { k: "tempo_hari", judul: "Tempo bayar (hari)", lain: ["tempo", "tempo bayar", "tempo hari", "top", "jatuh tempo"], contoh: "14", keterangan: "Angka bulat 0 sampai 365. Kosong = 14 hari." },
    ],
  },
  products: {
    label: "Produk",
    izin: "master.write",
    kolom: [
      { k: "nama", judul: "Nama", wajib: true, lain: ["nama produk", "produk", "nama barang"], contoh: "Loin tuna", keterangan: "Wajib. Kalo namanya udah ada, datanya diperbarui." },
      { k: "satuan", judul: "Satuan", lain: ["unit"], contoh: "kg", keterangan: "Boleh kosong, bawaannya kg." },
      { k: "kelompok", judul: "Kelompok", lain: ["jenis", "kategori", "jenis produk"], contoh: "Loin", keterangan: "Isi salah satu: Tuna utuh, Loin, Hasil samping, Lainnya. Kosong = Loin." },
    ],
  },
  supply_items: {
    label: "Barang penunjang",
    izin: "stok.write",
    kolom: [
      { k: "kategori", judul: "Kategori", wajib: true, lain: ["jenis", "jenis penunjang", "kelompok"], contoh: "Penunjang kerja", keterangan: "Wajib. Isi Penunjang kerja (es, kemasan, label) atau Penunjang pekerja (sarung tangan, sepatu, dll)." },
      { k: "nama", judul: "Nama", wajib: true, lain: ["nama barang", "barang"], contoh: "Es balok", keterangan: "Wajib. Kalo nama di kategori yg sama udah ada, datanya diperbarui." },
      { k: "satuan", judul: "Satuan", lain: ["unit"], contoh: "balok", keterangan: "Boleh kosong, bawaannya pcs." },
      { k: "stok_minimum", judul: "Stok minimum", lain: ["minimum", "stok min", "min", "batas minimum"], contoh: "10", keterangan: "Angka, boleh pakai koma. Kosong = 0." },
      { k: "lokasi", judul: "Lokasi", lain: ["tempat", "lokasi simpan"], contoh: "Gudang belakang", keterangan: "Boleh kosong." },
      { k: "keterangan", judul: "Keterangan", lain: ["catatan"], contoh: "", keterangan: "Boleh kosong." },
    ],
  },
};

export const JENIS_IMPOR = Object.keys(IMPOR) as JenisImpor[];
export const isJenisImpor = (x: unknown): x is JenisImpor => typeof x === "string" && x in IMPOR;
export const MAKS_BARIS = 2000;

/** "Tempo bayar (hari) *" jadi "tempo bayar". Huruf kecil, tanpa isi kurung, tanda baca jadi spasi. */
export function normalJudul(s: string): string {
  return s.toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\bwajib\b/g, " ").trim().replace(/\s+/g, " ");
}

export type BarisMentah = { no: number; sel: string[] };
export type BarisImpor = Record<string, string> & { _no: string };
export type HasilPetakan = { baris: BarisImpor[]; galat: string | null; diabaikan: string[]; dipetakan: { judul: string; ke: string }[] };

/** Cocokin judul kolom di file ke kolom data. Baris kosong dilewati. Nomor baris ngikut nomor di Excel. */
export function petakan(jenis: JenisImpor, judul: string[], rows: BarisMentah[]): HasilPetakan {
  const kolom = IMPOR[jenis].kolom;
  const ke: (KolomImpor | null)[] = judul.map(() => null);
  const dipakai = new Set<string>();
  const diabaikan: string[] = [];
  judul.forEach((j, i) => {
    const n = normalJudul(j);
    if (!n) return;
    const c = kolom.find((x) => normalJudul(x.judul) === n || x.lain.includes(n));
    if (c && !dipakai.has(c.k)) {
      ke[i] = c;
      dipakai.add(c.k);
    } else {
      diabaikan.push(j.trim());
    }
  });
  const kurang = kolom.filter((c) => c.wajib && !dipakai.has(c.k));
  if (kurang.length > 0) {
    return {
      baris: [], diabaikan, dipetakan: [],
      galat: `Kolom ${kurang.map((c) => c.judul).join(" dan ")} nggak ketemu di baris judul. Pakai template dari tombol Unduh template ya.`,
    };
  }
  const baris: BarisImpor[] = [];
  for (const r of rows) {
    if (r.sel.every((s) => s.trim() === "")) continue;
    const isi: BarisImpor = { _no: String(r.no) };
    ke.forEach((c, i) => {
      if (c) isi[c.k] = (r.sel[i] ?? "").trim();
    });
    baris.push(isi);
  }
  if (baris.length === 0) return { baris, diabaikan, dipetakan: [], galat: "Belum ada data di bawah baris judul." };
  if (baris.length > MAKS_BARIS) return { baris: [], diabaikan, dipetakan: [], galat: `Maksimal ${MAKS_BARIS.toLocaleString("id-ID")} baris sekali upload. Pecah jadi beberapa file ya.` };
  const dipetakan = judul.flatMap((j, i) => (ke[i] ? [{ judul: j.trim(), ke: ke[i]!.judul }] : []));
  return { baris, galat: null, diabaikan, dipetakan };
}

/** Isi satu sel exceljs jadi teks. Angka pakai titik desimal, rumus pakai hasilnya, teks berformat digabung. */
export function teksSel(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : "";
  if (typeof v === "boolean") return v ? "ya" : "tidak";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    if ("result" in o) return teksSel(o.result);
    if ("text" in o) return teksSel(o.text);
    if ("error" in o) return "";
  }
  return String(v);
}

export type StatusBaris = "baru" | "ubah" | "sama" | "salah";
export type HasilImpor = {
  sudah: boolean;
  baru: number;
  ubah: number;
  sama: number;
  salah: number;
  baris: { no: number; nama: string; status: StatusBaris; pesan: string }[];
};
export const LABEL_STATUS: Record<StatusBaris, string> = { baru: "Baru", ubah: "Diperbarui", sama: "Sama, dilewati", salah: "Salah" };
