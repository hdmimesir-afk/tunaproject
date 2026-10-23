# Serah terima KATALIS ERP

Daftar periksa yang dicentang bersama owner. Satu baris selesai bila ada tanggal dan nama yang memastikannya. Serah terima dilakukan dua tahap: **tahap 1** sistem diserahkan untuk dipakai berdampingan dengan catatan kertas, **tahap 2** serah terima akhir setelah satu siklus asli cocok.

Status per 23 Oktober 2026 (baris yang sudah dikerjakan developer diberi tanda ✓ dan tetap perlu dipastikan bersama owner).

## Tahap 1: mulai dipakai berdampingan

### 1. Akun dan akses

- [ ] **Kata sandi sementara `admin123` sudah diganti** oleh Owner
- [x] Kode autentikator (MFA) Owner sudah terdaftar ✓
- [ ] Akun Finance, Super Admin, Kepala Produksi/QC, dan Petugas Lapangan dibuat di **Akses → Buat akun pengguna**; tautan aktivasi dikirim lewat WhatsApp dan setiap orang membuat kata sandinya sendiri (berlaku 24 jam, sekali pakai)
- [ ] Finance mendaftarkan autentikator pada masuk pertama
- [ ] Akun orang yang keluar dinonaktifkan di menu Akses (tidak dihapus); lupa sandi: tombol **Tautan atur sandi**

### 2. Data awal

- [ ] Master data diisi: pemasok, pembeli (dengan kontak untuk pengingat), produk, grade, jenis hasil samping
- [x] Kategori biaya (8 kelompok) tersedia ✓
- [x] Monitor Dana diimpor ke buku kas: 235 transaksi uang keluar, Rp2.160.890.880 ✓ (setoran investor tidak diimpor; keputusan owner: dicatat sebagai modal atau diberi keterangan)
- [x] Lokasi kerja absensi: Cold Storage Bungus, radius 100 m, jam masuk 08.00 ✓ (dipastikan titiknya saat di lokasi)
- [ ] Tarif gudang dingin dikonfirmasi owner (minimum hari, masa transit, dasar berat) dan ditandai "Dikonfirmasi"

### 3. Keamanan dan cadangan

- [x] Tes keamanan otomatis lulus di CI: RLS dipaksa di semua tabel, tamu tanpa hak, tanpa hapus, bucket privat ✓
- [x] Berkas nota dan foto absen hanya terbuka lewat tautan 60 detik ✓
- [x] Tamu yang membuka alamat menu tanpa masuk dialihkan ke halaman masuk ✓
- [x] Cadangan harian aktif dan terenkripsi; berhasil pertama kali 23 Okt 2026 ✓
- [ ] Frasa sandi cadangan disimpan terpisah dan dipegang minimal dua orang
- [x] Kunci `sb_secret_` dan `OPENROUTER_API_KEY` hanya di variabel lingkungan server Vercel, tidak di repo ✓

### 4. Pelatihan

- [ ] Owner, Finance, Super Admin, Kepala Produksi/QC, dan Petugas Lapangan dilatih memakai `docs/panduan-peran.md`
- [ ] Setiap peran pernah mencoba tugas utamanya sendiri di HP atau laptopnya

## Tahap 2: serah terima akhir

### 5. Uji siklus nyata

- [ ] Satu siklus produksi asli dicatat di sistem bersama petugas lapangan, berdampingan dengan catatan kertas
- [ ] Angka loin, hasil samping, limbah, tagihan, dan kas dicocokkan dengan catatan kertas; selisih dijelaskan
- [ ] Temuan uji diperbaiki atau dicatat sebagai pekerjaan lanjutan
- [ ] Absensi dicoba petugas di lokasi (kamera dan GPS)

### 6. Data dan kepemilikan

- [ ] Uji pulih cadangan dijalankan dan semua angka cocok (`docs/pulih-cadangan.md`, catat di tabelnya)
- [x] Pemilik akun GitHub, Supabase, dan Vercel: Dar Dev; tetap paket gratis (keputusan 23 Okt 2026) ✓. Risiko diterima: ketentuan Vercel Hobby untuk non-komersial, proyek Supabase Free dijeda bila sepi 7 hari
- [ ] Bila kepemilikan pindah ke perusahaan atau developer berganti: kunci dirotasi (buat kunci baru di Supabase dan OpenRouter → isi di Vercel → redeploy → matikan kunci lama) dan token GitHub pribadi dicabut

## Yang sengaja belum ada (disepakati menyusul)

- Laba bersih: butuh biaya bulanan, penyusutan, dan pajak dari owner (laba kotor per siklus sudah ada)
- Impor Siklus 1: butuh foto formulir timbang per loin
- Rekonsiliasi saldo bank otomatis (tutup buku per bulan dan per siklus sudah ada)
- Notifikasi WhatsApp/email otomatis, integrasi timbangan digital, pengenalan wajah
- Giliran tetap mingguan mitra di jadwal mesin

## Persetujuan

| Tahap | Peran | Nama | Tanggal | Tanda tangan |
| --- | --- | --- | --- | --- |
| 1 | Owner | | | |
| 1 | Developer (Dar Dev) | | | |
| 2 | Owner | | | |
| 2 | Developer (Dar Dev) | | | |
