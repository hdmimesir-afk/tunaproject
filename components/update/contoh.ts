import type { Tindakan } from "@/lib/data/tindakan";
import type { DataPersetujuan } from "@/lib/data/persetujuan";
import type { RantaiSiklus } from "@/lib/data/laporan";
import type { Absen, Izin, LokasiKerja } from "@/lib/types/absensi";
import type { BarisLabaSiklus, BukuBulanan, Dashboard, RingkasSiklus } from "@/lib/types/keuangan";
import type { Opsi, Pengguna } from "@/lib/types/pembelian";
import type { Ekor, ItemLoin } from "@/lib/types/produksi";

/* Data contoh untuk halaman /update. Semua nama, angka, dan tanggal di sini karangan untuk memperlihatkan tampilan;
   bukan data perusahaan. Bentuknya memakai tipe asli sistem, jadi komponen yang dirender adalah komponen asli. */

export const SALAM = { nama: "Pak Hilmy", salam: "Selamat pagi", tanggal: "Senin, 26 Oktober 2026" };

export const dashboard: Dashboard = {
  hutang_pemasok: 12_600_000, piutang: 18_750_000, invoice_terlambat: 1, piutang_terlambat: 4_200_000,
  kas_masuk_bulan_ini: 21_300_000, kas_keluar_bulan_ini: 9_850_000, persetujuan_menunggu: 2, biaya_menunggu: 1, koreksi_menunggu: 0,
  produksi_menunggu: 1, produksi_berjalan: 1, lot_menunggu_mutu: 1, stok_sendiri_kg: 412.5, stok_titipan_kg: 1250, pesanan_belum_dikirim: 1, dokumen_kurang: 3,
};

export const izinOwner = { persetujuan: true, keuangan: true, penjualan: true, pembelian: true, produksi: true, stok: true, mutu: true, laporan: true };

const bulan = (b: string, masuk: number, keluar: number, awal: number, berjalan = false): BukuBulanan => ({
  bulan: `${b}-01`, masuk, keluar, jumlah_transaksi: 18, saldo_awal: awal, saldo_akhir: awal + masuk - keluar, status: berjalan ? "terbuka" : "ditutup",
  ditutup_pada: null, catatan: "", ringkasan: null, dibuka_kali: 0, alasan_buka: "", bulan_berjalan: berjalan,
});
export const buku: BukuBulanan[] = [
  bulan("2026-05", 14_200_000, 11_400_000, 8_000_000), bulan("2026-06", 9_800_000, 12_900_000, 10_800_000), bulan("2026-07", 22_500_000, 15_300_000, 7_700_000),
  bulan("2026-08", 18_900_000, 17_200_000, 14_900_000), bulan("2026-09", 26_400_000, 13_600_000, 16_600_000), bulan("2026-10", 21_300_000, 9_850_000, 29_400_000, true),
];

export const siklusTerbaru: BarisLabaSiklus = {
  cycle_id: "c-3", kode: "SIK-0003", ref_po_pembeli: "PO-PEMBELI-27", status: "terbuka", pendapatan_loin: 12_935_000, pendapatan_samping: 3_000_000, pendapatan_total: 15_935_000,
  kg_loin_terjual: 129.5, biaya_ikan: 9_000_000, kg_ikan: 200, biaya_lain: 500_000, biaya_total: 9_500_000, laba_kotor: 6_435_000, margin_pct: 40.4, loin_kg: 145.875,
};

export const tindakan: Tindakan[] = [
  { id: "t1", kelompok: "Persetujuan PO", icon: "check", judul: "PO-0012 · Pemasok Contoh A", rincian: "Beli ikan 200 kg · Rp9.000.000", aksi: "Setujui", href: "/persetujuan", mendesak: true },
  { id: "t2", kelompok: "Tagihan terlambat", icon: "cash", judul: "INV-0004 · Pembeli Contoh B", rincian: "Sisa Rp4.200.000 · terlambat 3 hari (jatuh tempo 23 Okt 2026)", aksi: "Tagih", href: "/penjualan", mendesak: true },
  { id: "t3", kelompok: "Biaya", icon: "cash", judul: "BYA-0007 · Pengemasan dan pengiriman", rincian: "Kemasan siklus SIK-0003 · Rp500.000", aksi: "Putuskan", href: "/keuangan", mendesak: false },
  { id: "t4", kelompok: "Produksi", icon: "factory", judul: "PRD-004 · menunggu persetujuan Owner", rincian: "Loin 145,875 kg dari 200,000 kg (72,9%), selisih belum jelas 4,125 kg", aksi: "Setujui", href: "/produksi", mendesak: false },
  { id: "t5", kelompok: "Mutu", icon: "flask", judul: "LOT-0009 · PO-0012", rincian: "200,000 kg menunggu cek mutu", aksi: "Cek mutu", href: "/mutu", mendesak: false },
  { id: "t6", kelompok: "Izin karyawan", icon: "calendar", judul: "Petugas Contoh · sakit", rincian: "27 Okt 2026 · demam", aksi: "Putuskan", href: "/absensi", mendesak: false },
  { id: "t7", kelompok: "Tutup siklus", icon: "list", judul: "SIK-0002 sudah lunas", rincian: "Uang masuk Rp21.400.000. Tutup supaya tidak dipakai lagi untuk transaksi baru.", aksi: "Tutup siklus", href: "/siklus", mendesak: false },
];

/* ------------------------------------------------------------ persetujuan */
const jam = (h: number) => `2026-10-26T0${h}:10:00+07:00`;
const pengajuan = (id: string, kode: string, status: "diajukan" | "diperiksa" | "disetujui" | "ditolak", po: string, kg: number, harga: number, acuan: number | null, pemasok: string, nota: number) => ({
  id, kode, jenis: "po", ref_tabel: "purchase_orders", ref_id: `ref-${id}`, judul: `Beli ikan ${kg} kg`, jumlah: kg * harga, status,
  diajukan_oleh: "u-admin", diajukan_pada: jam(7), diperiksa_oleh: status === "diajukan" ? null : "u-fin", diperiksa_pada: status === "diajukan" ? null : jam(8),
  catatan_periksa: status === "diajukan" ? "" : "nota cocok", disetujui_oleh: status === "disetujui" ? "u-owner" : null, disetujui_pada: status === "disetujui" ? jam(9) : null,
  catatan_revisi: "", alasan_tolak: status === "ditolak" ? "harga tidak masuk akal" : "", batch_id: null, po_kode: po, po_kg: kg, harga_per_kg: harga, harga_acuan: acuan,
  supplier_nama: pemasok, jml_nota: nota,
});
export const IDSOROT = "apv-12";
export const persetujuan: DataPersetujuan = {
  antrean: [
    pengajuan("apv-12", "APV-0012", "diperiksa", "PO-0012", 200, 45_000, 42_000, "Pemasok Contoh A", 1),
    pengajuan("apv-14", "APV-0014", "diperiksa", "PO-0014", 120, 41_000, 41_000, "Pemasok Contoh C", 1),
    pengajuan("apv-13", "APV-0013", "diajukan", "PO-0013", 150, 43_500, 43_500, "Pemasok Contoh B", 2),
  ],
  riwayat: [
    pengajuan("apv-11", "APV-0011", "disetujui", "PO-0011", 180, 42_000, null, "Pemasok Contoh A", 1),
    pengajuan("apv-10", "APV-0010", "ditolak", "PO-0010", 60, 78_000, 42_000, "Pemasok Contoh D", 1),
  ],
  nota: {
    "ref-apv-12": [{ id: "d1", ref_tabel: "purchase_orders", ref_id: "ref-apv-12", jenis: "nota", nama_asli: "nota-pemasok-a.jpg", ukuran: 182_000, tipe: "image/jpeg", dibuat_pada: jam(7), dibuat_oleh: "u-admin" }],
    "ref-apv-14": [{ id: "d2", ref_tabel: "purchase_orders", ref_id: "ref-apv-14", jenis: "nota", nama_asli: "nota-pemasok-c.pdf", ukuran: 96_000, tipe: "application/pdf", dibuat_pada: jam(7), dibuat_oleh: "u-admin" }],
    "ref-apv-13": [],
  },
  bongkarMalam: [{ id: "l-8", kode: "LOT-0008", po_kode: "PO-0013", kg: 150, tanggal_terima: "2026-10-25", supplier_nama: "Pemasok Contoh B" }],
};
export const penggunaPersetujuan: Record<string, Pengguna> = {
  "u-admin": { nama: "Admin Contoh", role: "super_admin" }, "u-fin": { nama: "Finance Contoh", role: "finance" }, "u-owner": { nama: "Pak Hilmy", role: "owner" },
};

/* ----------------------------------------------------------------- produksi */
export const gradeContoh: Opsi[] = [{ id: "g-a", label: "A dengan kulit" }, { id: "g-b", label: "B dengan kulit" }];
const loin = (no: number, ekor: number, grade: string, kg: number): ItemLoin => ({ id: `lo-${no}`, no_ekor: ekor, no_loin: no, grade_id: grade, kg, versi: 1, batal: false, alasan_batal: "" });
export const loinContoh: ItemLoin[] = [
  loin(1, 1, "g-a", 18.25), loin(2, 1, "g-a", 16.875), loin(3, 1, "g-b", 9.5), loin(4, 2, "g-a", 15.125),
  loin(5, 2, "g-a", 14.5), loin(6, 2, "g-b", 8.75), loin(7, 3, "g-a", 17.0), loin(8, 3, "g-b", 10.0),
];
export const ekorContoh: Ekor[] = [{ id: "e-1", no_ekor: 1, berat_utuh_kg: 62.5 }, { id: "e-2", no_ekor: 2, berat_utuh_kg: 58.0 }, { id: "e-3", no_ekor: 3, berat_utuh_kg: 55.25 }];

/* ----------------------------------------------------------------- absensi */
const absen = (id: string, tanggal: string, jenis: "masuk" | "pulang", hhmm: string, hasil: "berhasil" | "gagal", telat = 0, alasan = "", jarak: number | null = 28): Absen => ({
  id, user_id: "u-petugas", jenis, waktu: `${tanggal}T${hhmm}:00+07:00`, tanggal, akurasi_m: 9, jarak_m: jarak, hasil, alasan_gagal: alasan, terlambat_menit: telat,
});
export const saya: Absen[] = [
  absen("a1", "2026-10-26", "masuk", "07:52", "berhasil"),
  absen("a2", "2026-10-24", "pulang", "16:35", "berhasil"),
  absen("a3", "2026-10-24", "masuk", "08:41", "berhasil", 41),
  absen("a4", "2026-10-23", "pulang", "16:31", "berhasil"),
  absen("a5", "2026-10-23", "masuk", "08:03", "gagal", 0, "Anda 214 m dari Lokasi kerja contoh, di luar radius 100 m.", 214),
  absen("a6", "2026-10-23", "masuk", "08:05", "berhasil"),
];
export const lokasi: LokasiKerja[] = [{ id: "lk-1", nama: "Lokasi kerja contoh", lat: 0, lng: 0, radius_m: 100, akurasi_maks_m: 30, jam_masuk: "08:00:00", toleransi_menit: 15, aktif: true }];
export const izinSaya: Izin[] = [
  { id: "iz-1", user_id: "u-petugas", nama: "Petugas Contoh", jenis: "sakit", dari: "2026-10-27", sampai: "2026-10-27", alasan: "Demam", status: "diajukan", catatan_keputusan: "", dibuat_pada: "2026-10-26T06:40:00+07:00", milik_saya: true },
];

/* ------------------------------------------------------------------ siklus */
export const daftarSiklus: RingkasSiklus[] = [
  { cycle_id: "c-3", kode: "SIK-0003", ref_po_pembeli: "PO-PEMBELI-27", no_bongkar: "B-27", status: "terbuka", tanggal_bongkar: "2026-10-22", jumlah_po: 1, nilai_beli: 9_000_000, kg_diterima: 200, jumlah_produksi: 1, loin_kg: 145.875, jumlah_pesanan: 1, nilai_invoice: 15_935_000, uang_masuk: 15_935_000, biaya_lain: 500_000 },
  { cycle_id: "c-2", kode: "SIK-0002", ref_po_pembeli: "PO-PEMBELI-24", no_bongkar: "B-24", status: "terbuka", tanggal_bongkar: "2026-10-09", jumlah_po: 2, nilai_beli: 16_800_000, kg_diterima: 380, jumlah_produksi: 2, loin_kg: 274.5, jumlah_pesanan: 2, nilai_invoice: 21_400_000, uang_masuk: 21_400_000, biaya_lain: 820_000 },
  { cycle_id: "c-1", kode: "SIK-0001", ref_po_pembeli: "PO-PEMBELI-21", no_bongkar: "B-21", status: "ditutup", tanggal_bongkar: "2026-09-18", jumlah_po: 1, nilai_beli: 7_200_000, kg_diterima: 160, jumlah_produksi: 1, loin_kg: 112.25, jumlah_pesanan: 1, nilai_invoice: 11_900_000, uang_masuk: 11_900_000, biaya_lain: 300_000 },
];
export const rantai: RantaiSiklus = {
  ringkas: daftarSiklus[0],
  po: [{ id: "po-12", kode: "PO-0012", supplier_nama: "Pemasok Contoh A", kg: 200, total: 9_000_000, status_persetujuan: "disetujui", total_bayar: 9_000_000 }],
  lot: [{ id: "lot-9", kode: "LOT-0009", po_kode: "PO-0012", kg: 200, qc: "lulus" }],
  produksi: [{ id: "prd-4", kode: "PRD-004", status: "diperiksa", masuk_kg: 200, loin_kg: 145.875 }],
  pesanan: [{ id: "psn-6", kode: "PSN-0006", buyer_nama: "Pembeli Contoh B", status: "terkirim", total_final: 15_935_000, total_pesan: 16_000_000, invoice_kode: "INV-0004", invoice_id: "inv-4" }],
  invoice: [{ id: "inv-4", kode: "INV-0004", total: 15_935_000, sisa: 0, status_tagihan: "lunas" }],
  biaya: [{ id: "bya-7", kode: "BYA-0007", kategori_nama: "Pengemasan dan pengiriman", jumlah: 500_000, status: "disetujui" }],
};
