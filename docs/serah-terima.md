# Serah terima KATALIS ERP

Daftar periksa yang dicentang bersama owner sebelum sistem dipakai sungguhan. Satu baris selesai bila ada tanggal dan nama yang memastikannya.

## 1. Akun dan akses

- [ ] Akun Owner memakai email milik perusahaan, kode autentikator (MFA) sudah terdaftar di HP Owner
- [ ] **Kata sandi sementara `admin123` sudah diganti** (akun owner awal dibuat dengan kata sandi itu)
- [ ] Akun Finance, Super Admin, Kepala Produksi, dan Petugas Lapangan dibuat sesuai nama orang sebenarnya (`npm run buat-pengguna`)
- [ ] Finance mendaftarkan autentikator pada masuk pertama
- [ ] Akun orang yang keluar dinonaktifkan di menu Akses (tidak dihapus)

## 2. Kepemilikan dan rahasia

- [ ] Repo GitHub, proyek Supabase, dan proyek Vercel atas nama perusahaan; Owner terdaftar sebagai pemilik
- [ ] Kunci `sb_secret_` dan kunci model (`OPENROUTER_API_KEY`) hanya ada di variabel lingkungan server, tidak di repo
- [ ] Kunci dirotasi (dibuat ulang) saat developer selesai bertugas; langkah: buat kunci baru di Supabase / Anthropic → isi di Vercel → redeploy → matikan kunci lama
- [ ] Token GitHub pribadi developer dicabut dari mesin proyek

## 3. Data dan cadangan

- [ ] Cadangan harian aktif (`BACKUP_AKTIF = true`), frasa sandi disimpan terpisah dan dipegang minimal dua orang
- [ ] Uji pulih sudah dijalankan dan semua angka cocok (`docs/pulih-cadangan.md`, catat di tabelnya)
- [ ] Master data diisi owner: pemasok, pembeli (dengan kontak untuk pengingat), grade, jenis hasil samping, kategori biaya
- [ ] Tarif gudang dingin dikonfirmasi owner (minimum hari, masa transit, dasar berat) dan ditandai "Dikonfirmasi"

## 4. Keamanan

- [ ] Tes keamanan otomatis lulus di CI (RLS aktif di semua tabel, tamu tanpa hak, tanpa hapus, bucket privat)
- [ ] Bucket dokumen privat; berkas hanya terbuka lewat tautan 60 detik
- [ ] Ujicoba tamu: membuka alamat menu tanpa masuk selalu dialihkan ke halaman masuk

## 5. Uji siklus nyata

- [ ] Satu siklus produksi asli dijalankan bersama petugas lapangan
- [ ] Angka loin, hasil samping, limbah, dan biaya dicocokkan dengan catatan kertas; selisih dijelaskan
- [ ] Temuan uji diperbaiki atau dicatat sebagai pekerjaan lanjutan
- [ ] Siklus lama dijalankan berdampingan dengan sistem baru selama minimal satu siklus

## 6. Pelatihan

- [ ] Owner, Finance, Super Admin, Kepala Produksi/QC, dan Petugas Lapangan sudah dilatih memakai `docs/panduan-peran.md`
- [ ] Setiap peran pernah mencoba tugas utamanya sendiri

## 7. Yang sengaja belum ada (disepakati ditunda)

- Absensi dan izin (ditunda atas keputusan owner 22 Oktober 2026)
- Impor 243 transaksi Monitor Dana lama (perlu dirapikan bersama owner)
- Laba bersih: butuh biaya bulanan, penyusutan, dan pajak dari owner
- Tutup buku per periode
- Giliran tetap mingguan mitra di jadwal mesin

## Persetujuan

| Peran | Nama | Tanggal | Tanda tangan |
| --- | --- | --- | --- |
| Owner | | | |
| Developer (Dar Dev) | | | |
