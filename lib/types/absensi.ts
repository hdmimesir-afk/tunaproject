export type LokasiKerja = {
  id: string;
  nama: string;
  lat: number;
  lng: number;
  radius_m: number;
  akurasi_maks_m: number;
  jam_masuk: string;
  toleransi_menit: number;
  aktif: boolean;
};

export type Absen = {
  id: string;
  user_id: string;
  jenis: "masuk" | "pulang";
  waktu: string;
  tanggal: string;
  akurasi_m: number | null;
  jarak_m: number | null;
  hasil: "berhasil" | "gagal";
  alasan_gagal: string;
  terlambat_menit: number;
};

export type AbsenHarian = {
  id: string;
  user_id: string;
  nama: string;
  jenis: "masuk" | "pulang";
  waktu: string;
  lokasi: string;
  jarak_m: number | null;
  akurasi_m: number | null;
  hasil: "berhasil" | "gagal";
  alasan_gagal: string;
  terlambat_menit: number;
};

export type JenisIzin = "izin" | "sakit" | "libur";
export type StatusIzin = "diajukan" | "disetujui" | "ditolak" | "dibatalkan";

export type Izin = {
  id: string;
  user_id: string;
  nama: string;
  jenis: JenisIzin;
  dari: string;
  sampai: string;
  alasan: string;
  status: StatusIzin;
  catatan_keputusan: string;
  dibuat_pada: string;
  milik_saya: boolean;
};

export type RekapHadir = {
  user_id: string;
  nama: string;
  role_nama: string;
  hari_kerja: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  libur: number;
  tidak_hadir: number;
};
