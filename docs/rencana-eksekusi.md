# Rencana Eksekusi KATALIS ERP (v2)

Dokumen kerja internal Dar Dev setelah penawaran disepakati. Isinya menggabungkan:

- `rancangan-pembangunan.md`: arsitektur, model data, jadwal 4 minggu (rancangan v1).
- `rencana-sistem-fitur-logika-alur.md`: fitur, aturan, dan alur antarmodul (rancangan v1).
- **Catatan owner** `Rincian_Perbaikan_Sistem_Bungus_Barat.pdf` (rekaman Bungus Barat 5, 12 poin).
- **Dokumen konfirmasi** untuk owner: 35 pertanyaan (disebut **Q1–Q35** di sini) dan 9 bahan (**B1–B9**).
- **Halaman owner** `/rancangan` di website deck: versi sederhana untuk owner, berisi jadwal 1 bulan, 7 hal yang perlu disetujui, 14 pertanyaan, dan 9 bahan.

Kalau dokumen ini bertentangan dengan rancangan v1, **dokumen ini yang berlaku**. Status: rencana kerja, 19 Okt 2026, diperbarui ke jadwal 1 bulan. Diperbarui lagi 21 Okt 2026 mengikuti Formulir Produksi FRM-PRD-01 revisi 01.

---

## 0. Ringkasan

**Prinsip dari owner:** data produksi lengkap dan teliti, setiap transaksi saling terhubung, dan setiap angka laporan bisa ditelusuri ke sumbernya. Prinsip ini mengalahkan fitur tambahan.

**Yang berubah dari rancangan v1:**
1. Relasi transaksi dibuat **banyak-ke-banyak** sejak awal: satu pembelian bisa ke beberapa produksi, satu penjualan bisa dari beberapa produksi.
2. Status **persetujuan dipisah dari status pembayaran**. Alur persetujuan ditambah pemeriksa dan revisi.
3. Input produksi berubah dari **per ekor** menjadi **per loin**, dengan berat desimal yang tidak dipotong.
4. Selisih berat **tidak lagi otomatis dihitung sebagai susut**. Selisih ditampilkan sebagai "belum terjelaskan" sampai diperiksa.
5. Stok membedakan fresh dan beku, barang sendiri dan titipan, serta lokasi dan berat masuk/keluar.
6. Tarif ABF dan cold storage berupa **pengaturan**, bukan rumus tetap.
7. **Modul baru:** ringkasan harian, penelusuran per PO/siklus, pemantauan harga beli, dan **absensi dan izin**.
8. Peran tidak lagi tetap 4. Dashboard **owner dan petugas dibedakan**, dan owner diutamakan di ponsel.

**Durasi:** **1 bulan (4 minggu) untuk semua pekerjaan**, sesuai kesepakatan dengan owner dan halaman `/rancangan` di website deck. Jadwal per minggu ada di bagian 4. Supaya muat, setiap modul dikerjakan sampai "versi pertama" (bagian 4.3), dan ada titik periksa di akhir Minggu 2 untuk memakai titik potong kalau mepet (bagian 6).

Perkiraan awal untuk semua catatan owner adalah sekitar 11 minggu dengan 2 pengembang. Selisihnya ditutup dengan kedalaman versi pertama, tampilan dari demo, nilai bawaan yang bisa diubah, dan saran menambah 1 pengembang (bagian 4.1).

---

## 1. Catatan owner dan perubahannya

| # | Catatan owner | Perubahan pada rancangan v1 | Modul/tabel terdampak | Tergantung |
|---|---|---|---|---|
| 01 | Satu siklus transaksi terhubung, ringkasan harian | Entitas `cycles` + tabel alokasi N:M; halaman **Rincian Siklus** dan **Ringkasan Harian** | Pembelian, Produksi, Penjualan, Laporan | Q1–Q4 |
| 02 | Persetujuan simpel, bukti terlampir, jangan sampai terpencet | Status persetujuan 5 tahap terpisah dari pembayaran; pemeriksa + penyetuju; setuju massal dengan ringkasan total; bukti tampil di kartu persetujuan | Persetujuan, semua transaksi | Q5–Q9 |
| 03 | Hasil produksi dan selisih berat dijelaskan | Komponen hasil (produk utama, hasil samping, limbah, susut tercatat, selisih belum terjelaskan) + persen terhadap bahan masuk | Produksi, Laporan, Dashboard | Q10–Q13 |
| 04 | Input per loin, angka desimal tidak hilang | Grid input per loin (keyboard, tambah baris cepat, draft otomatis, riwayat koreksi); `numeric` dengan nilai asli tersimpan | Produksi | Q14–Q17, B1, B5 |
| 05 | Stok sesuai barang yang disimpan | Stok per **unit simpan** (pemilik, produk, grade, kondisi fresh/beku, lokasi, berat masuk/keluar); jalur fresh langsung kirim | Stok, Gudang Dingin | Q18–Q20 |
| 06 | Biaya ABF dan cold storage | Mesin tarif dengan parameter (masa transit, pembulatan, minimum hari, dasar berat, pengambilan sebagian); rincian hitungan di invoice | Gudang Dingin, Tagihan | Q21–Q25, B6 |
| 07 | Pantau harga beli ikan | Laporan harga per kg (rata-rata tertimbang), harian/mingguan, klik sampai transaksi | Laporan, Pembelian | Q29 |
| 08 | Biaya dan laporan keuangan | Kategori biaya baku (8 kelompok); laba rugi dan penggunaan dana sesuai format finance | Keuangan, Laporan | Q26–Q28, B7 |
| 09 | Dashboard owner vs petugas | Dua jenis beranda; owner baca di ponsel, petugas hanya menu tugasnya; peran dari tabel | Dashboard, Akses | Q30, B8 |
| 10 | Absensi dan izin | **Modul baru**: absen dengan lokasi (geofence) + foto, pengajuan izin/sakit, rekap | Absensi (baru) | Q31–Q33, B9 |
| 11 | Keamanan dan pemulihan data | Sudah ada di v1; ditambah: uji pemulihan wajib, gagal simpan selalu terlihat, tidak ada hapus permanen di UI, pembagian tanggung jawab server | Semua | Q34 |
| 12 | Uji satu siklus nyata | UAT diganti **uji siklus nyata** dengan dokumen lapangan (B3) sebelum dipakai luas | Semua | Q35, B3 |

---

## 2. Perubahan model data

Ini menambah dan mengganti tabel di `rancangan-pembangunan.md` bagian 4. Tabel yang tidak disebut tetap seperti v1.

### 2.1 Aturan umum baru

- **Angka berat:** `numeric(12,3)` (kg, 3 desimal). Total dihitung dari nilai asli, pembulatan hanya di tampilan. Presisi final mengikuti Q14; cukup ubah format tampilan, bukan skema.
- **Uang:** `numeric(16,2)` dalam rupiah. Tidak ada `float` untuk berat atau uang.
- **Tidak ada hapus permanen** dari aplikasi. Baris punya `dibatalkan_pada` dan `alasan_batal`, atau dikoreksi dengan baris pembalik. Hapus fisik hanya oleh admin teknis lewat migrasi.
- **Riwayat koreksi:** semua tabel transaksi masuk `activity_log` (sebelum/sesudah). Untuk baris loin juga ada `production_items_history`.

### 2.2 Tabel baru atau berubah

| Tabel | Status | Kolom/isi penting | Untuk catatan |
|---|---|---|---|
| `roles`, `role_permissions` | baru (ganti enum 4 peran) | peran dan izin per aksi bisa diatur Owner; peran awal: Owner, Keuangan, Pembelian, Produksi, Gudang, Admin, Karyawan (hanya absen/izin) | 09 |
| `cycles` | baru | `kode`, `tanggal_bongkar`, `ref_po_pembeli`, `status` (terbuka, ditutup), `ditutup_oleh` | 01 |
| `purchase_orders` | berubah | `status_persetujuan` (draf, diajukan, perlu_revisi, disetujui, ditolak) **terpisah dari** `status_bayar` (belum, sebagian, lunas); `status_terima`; `cycle_id`; `diterima_sebelum_disetujui bool` | 01, 02 |
| `approvals` | berubah | tahap: `diajukan_oleh/pada`, `diperiksa_oleh/pada`, `disetujui_oleh/pada`, `catatan_revisi`; `batch_id` untuk setuju massal | 02 |
| `approval_rules` | baru | per jenis transaksi: siapa pemeriksa, siapa penyetuju, ambang nilai, apakah bukti wajib | 02 |
| `lot_allocations` | baru | `lot_id` → `production_id`, `kg` (satu lot ke banyak produksi dan sebaliknya) | 01 |
| `productions` | berubah | `cycle_id`, `kg_masuk`, status (draf, berjalan, selesai, diperiksa); kolom `hasil_persen`, `kg_loin`, `kg_sisa` dihapus (dihitung dari item) | 03, 04 |
| `production_items` | baru (ganti `production_fish`) | `production_id`, `no_urut`, `no_ikan` (opsional, Q15), `no_loin`, `product_id`, `grade_id`, `kg numeric(12,3)`, `keterangan`, `status` (draf, lengkap) | 04 |
| `production_components` | baru | per produksi: `komponen` (produk_utama, hasil_samping, limbah, susut_tercatat), `kategori_id` (kepala, tulang, dll.), `kg`; ditimbang per produksi atau per bongkaran (Q11) | 03 |
| `products`, `grades`, `component_categories` | baru (master) | daftar dari B4; urutan grade | 03, 04 |
| `storage_units` | baru (ganti `stock_balances` + `cold_deposits`) | `pemilik` (usaha / pelanggan), `product_id`, `grade_id`, `kondisi` (fresh, beku), `lokasi`, `ref_produksi/penerimaan`, `kg_masuk`, `kg_sisa`, `tanggal_masuk`, `status` | 05 |
| `storage_movements` | baru (ganti `stock_movements`) | keluar sebagian/penuh: `kg_tercatat`, `kg_timbang_ulang` (Q19), alasan, rujukan pengiriman/invoice | 05 |
| `sale_allocations` | baru | `sales_order_id` → `storage_unit_id` / `production_id`, `kg` (satu penjualan dari banyak produksi) | 01 |
| `tariff_rules` | baru (ganti `tariffs`) | `jenis_layanan` (ABF, transit, simpan), `tarif_per_kg`, `satuan` (per kg, per kg/hari), `masa_transit_jam`, `pembulatan` (ke atas per hari, per 24 jam), `minimum_hari`, `dasar_berat` (masuk/keluar), `berlaku_dari` | 06 |
| `service_charges` | baru | rincian invoice jasa: waktu mulai, selesai beku, masuk simpan, ambil, durasi tertagih, tarif yang dipakai, tambahan | 06 |
| `expense_categories` | baru | 8 kelompok: bahan baku, produksi, pengemasan/pengiriman, operasional rutin, perawatan/perbaikan, aset, penerimaan penjualan, pembayaran/tagihan | 08 |
| `ledger` | berubah | `kategori_id`, `cycle_id`/`production_id`/`po_id` opsional, `jenis_biaya` (tetap/variabel, Q27) | 08 |
| `payments` | dipastikan ada | pembayaran sebagian untuk PO dan invoice | 02 |
| `employees` | baru | data karyawan; tidak semua karyawan punya akun penuh | 10 |
| `attendance` | baru | `employee_id`, `jenis` (masuk/pulang), `waktu_server`, `lat`, `lng`, `akurasi_m`, `jarak_m`, `foto_path`, `hasil` (berhasil/gagal), `alasan_gagal` | 10 |
| `work_sites` | baru | titik lokasi, radius (bawaan 50 m), jam kerja, toleransi terlambat | 10 |
| `leave_requests` | baru | `jenis` (izin, sakit, libur), tanggal/durasi, alasan, bukti, status, `diputuskan_oleh`, catatan | 10 |

**Views baru:** `v_ringkasan_harian`, `v_rincian_siklus`, `v_neraca_produksi` (komponen dan %), `v_harga_beli` (rata-rata tertimbang per periode/jenis/grade/pemasok), `v_stok_per_pemilik`, `v_rekap_kehadiran`, `v_laba_rugi` (menunggu format B7).

---

## 3. Aturan bisnis yang diganti

Nomor merujuk `rancangan-pembangunan.md` bagian 5.

| Aturan v1 | Diganti menjadi |
|---|---|
| 1. PO hanya bisa disetujui lewat `approval.decide`, satu penyetuju (Owner) | Alur `draf → diajukan → (perlu_revisi ↺) → disetujui / ditolak`. Pemeriksa dan penyetuju diambil dari `approval_rules`. "Verifikasi dua tahap" ditafsirkan sebagai **pemeriksa + penyetuju**, bukan OTP, sampai Q7 dijawab. |
| 2. Hanya PO disetujui yang bisa diterima | Bawaan tetap begitu. Bila Q5 mengizinkan bongkar malam, penerimaan boleh lebih dulu dengan tanda `diterima_sebelum_disetujui` dan muncul di antrean Owner pagi harinya. Pembayaran tetap menunggu persetujuan. |
| 4. Hasil per ekor wajib 40–80%; susut = sisa hitungan | Hasil dihitung dari `production_items`. Neraca: `bahan masuk = produk utama + hasil samping + limbah + susut tercatat + selisih belum terjelaskan`. **Selisih tidak pernah diisi otomatis.** Produksi baru bisa ditandai "diperiksa" setelah selisih diberi penjelasan atau diterima Owner. Batas 40–80% menjadi peringatan, bukan penolakan. |
| 5 dan 7. Bayar mengubah status PO/invoice jadi dibayar/lunas | Pembayaran ditulis ke `payments`. `status_bayar` dihitung dari jumlah pembayaran (belum/sebagian/lunas). Disetujui tidak sama dengan dibayar. |
| 8. Tarif gudang dingin tetap (≤24 jam, min 10 hari, Rp75, ABF Rp3.500) | Semua angka dari `tariff_rules`. Nilai awal diisi dari proposal **dan ditandai "belum dikonfirmasi"** sampai Q21–Q24 dijawab. Uji wajib: input yang sama menghasilkan tagihan yang sama. |
| 13. Kelengkapan dokumen | Bukti wajib sebelum **diajukan** untuk jenis transaksi yang ditentukan `approval_rules` (Q8), bukan hanya dihitung belakangan. |
| Peran tetap 4 (bagian 3) | Peran dan izin dari `roles`/`role_permissions`. Matriks v1 dipakai sebagai nilai awal. |

**Aturan baru:**
- **Setuju massal:** layar konfirmasi wajib menampilkan daftar transaksi terpilih, jumlah transaksi, dan total nilai. Tombol konfirmasi terpisah dari tombol pilih.
- **Tombol berisiko** (setuju, tolak, bayar, kirim, tutup buku): konfirmasi kedua dan tidak diletakkan bersebelahan dengan tombol lain yang bertolak belakang.
- **Harga acuan** tidak mengubah harga transaksi lama. Harga beli tersimpan di PO saat diajukan.
- **Gagal simpan** selalu menampilkan pesan dan menyimpan isian di perangkat (draft) supaya tidak hilang.

---

## 4. Jadwal 1 bulan

Disepakati dengan owner: **semua pekerjaan selesai dalam 1 bulan (4 minggu)**. Urutannya sama dengan halaman `/rancangan` di website deck (bagian "Jadwal 1 bulan"). Kalau ada perbedaan, halaman itu yang disampaikan ke owner, jadi dokumen ini harus mengikutinya.

### 4.1 Syarat agar 4 minggu tercapai

Perkiraan sebelumnya untuk semua catatan owner adalah sekitar 11 minggu dengan 2 pengembang. Jadwal 4 minggu hanya realistis dengan syarat berikut:

1. **Kedalaman "versi pertama"** untuk setiap modul (bagian 4.3). Fitur lanjutan masuk masa garansi atau permintaan perubahan.
2. **Tampilan memakai ulang demo** (`components/demo/*`). Yang dibangun baru hanya sumber data, aturan, dan layar yang belum ada di demo (grid loin, neraca, absensi).
3. **Nilai bawaan yang bisa diubah** (bagian 5) supaya pekerjaan tidak menunggu jawaban yang tidak wajib.
4. **Jawaban wajib masuk paling lambat hari ke-2 Minggu 1** dan bahan B1, B3, B4, B5, B8 masuk di Minggu 1. Syarat ini juga tertulis di halaman owner.
5. **Tim:** 2 pengembang penuh waktu adalah batas minimum. Disarankan menambah 1 pengembang untuk Minggu 2–4 (absensi, laporan, dan Asisten AI bisa dikerjakan paralel).
6. **Titik periksa akhir Minggu 2** (bagian 6): kalau produksi per loin dan stok belum jalan, titik potong langsung dipakai dan owner diberi tahu hari itu juga.

### 4.2 Rincian per minggu

Setiap akhir minggu hasilnya ditunjukkan ke owner di lingkungan uji.

**Minggu 1: Sepakati aturan, lalu pembelian dan persetujuan**
- Hari 1–2: rapat menyepakati 7 hal yang perlu disetujui dan 14 pertanyaan di halaman owner. Terima bahan.
- Akun Vercel dan Supabase atas nama klien, repo produksi, CI, lingkungan uji dan produksi.
- Skema v2 (bagian 2), login, peran dari `role_permissions`, RLS, `activity_log`, larangan hapus, cadangan harian aktif.
- Master data: pemasok, pembeli, produk, grade, kategori komponen dan biaya.
- Pembelian, penerimaan (termasuk sebagian dan tanda bongkar malam), cek mutu.
- Persetujuan v2 dengan pemeriksa dan penyetuju, bukti di kartu, setuju massal dengan total, pembayaran pemasok terpisah.
- **Keluar bila:** pengguna masuk sesuai peran; beli → setuju → terima → bayar jalan; disetujui tidak otomatis dibayar.

**Minggu 2: Produksi, stok, dan gudang dingin**
- Grid input per loin sesuai formulir B1: tambah baris cepat, total otomatis, draft otomatis, riwayat koreksi, presisi 3 desimal.
- Alokasi lot ke produksi (N:M).
- Komponen hasil dan selisih belum terjelaskan beserta pemeriksaannya.
- Stok per unit simpan: pemilik, fresh/beku, berat masuk/keluar, ambil sebagian; jalur fresh langsung kirim.
- Mesin tarif ABF/cold storage dari `tariff_rules` (angka proposal sebagai nilai awal) dan invoice jasa dengan rincian hitungan.
- Jadwal ABF dan giliran mitra dengan cek bentrok dasar.
- **Keluar bila:** 300+ baris loin tersimpan utuh saat jaringan putus; neraca Siklus 1 bisa dijelaskan; tarif yang sama menghasilkan tagihan yang sama.

**Minggu 3: Penjualan, uang masuk, dan laporan**
- Pesanan, pengiriman (berat kirim dan terima), invoice, pembayaran sebagian; alokasi penjualan ke produksi.
- Halaman Rincian Siklus/PO dan Ringkasan Harian.
- Biaya per kategori dengan bukti dan hubungan ke PO/produksi; laporan biaya per siklus, tagihan, pembayaran; laba rugi sesuai format B7 (kalau B7 belum ada: laba kotor berlabel sementara).
- Laporan harga beli per kg (tabel + grafik sederhana, rata-rata tertimbang).
- Dashboard owner di HP; menu petugas disaring sesuai izin.
- **Keluar bila:** alur beli sampai uang masuk bisa dicoba penuh; satu siklus bisa ditelusuri tanpa input ulang.

**Minggu 4: Absensi, uji coba nyata, dan mulai pakai**
- Absensi (lokasi + akurasi GPS + foto langsung + waktu server) dan pengajuan izin/sakit/libur dengan rekap.
- Asisten AI tahap (a) dan simulasi harga versi sederhana (dari rancangan v1).
- Uji pemulihan cadangan ke proyek terpisah, tinjauan RLS dan bucket, impor master data dan Siklus 1.
- **Uji satu siklus nyata** dengan B3 bersama petugas lapangan dan owner, lalu perbaikan temuan.
- Pelatihan per peran, lalu mulai dipakai berdampingan dengan catatan lama.
- **Keluar bila:** satu siklus selesai tanpa data hilang, tanpa pencatatan ganda, dan tanpa selisih yang tidak bisa dijelaskan; owner menyetujui serah terima tertulis.

### 4.3 Kedalaman "versi pertama" per modul

| Modul | Masuk 1 bulan | Menyusul (garansi atau permintaan perubahan) |
|---|---|---|
| Penelusuran siklus | Rincian Siklus/PO, Ringkasan Harian | Perbandingan antarsiklus |
| Persetujuan | 5 status, pemeriksa + penyetuju, setuju massal, bukti | Ambang persetujuan otomatis, notifikasi WA/email |
| Produksi | Grid per loin, komponen hasil, selisih + pemeriksaan | Integrasi timbangan digital, tren selisih |
| Stok | Pemilik, fresh/beku, berat masuk/keluar, ambil sebagian | Lokasi rak/palet, opname terjadwal |
| Tarif ABF/CS | Mesin tarif dari pengaturan, invoice rinci | Pengingat batas hari ke pelanggan |
| Harga beli | Tabel + grafik sederhana per periode, jenis, grade, pemasok | Analisis lanjutan |
| Keuangan | Kategori biaya, laporan biaya/tagihan/pembayaran, laba rugi sesuai B7 | Tutup buku dengan kunci periode, rekonsiliasi bank |
| Dashboard | Dashboard owner di HP, menu petugas disaring | Halaman kerja khusus per peran |
| Absensi | Lokasi + foto + izin + rekap | Pengenalan wajah (permintaan perubahan) |
| Jadwal ABF | Cek bentrok dan pindah ke jam kosong | Jadwal pihak lain, kalender per tanggal |
| Asisten AI | Tahap (a): alat baca terbatas | Tahap (b): model bahasa |
| Simulasi | Slider harga dan dampak laba sederhana | Simpan/muat skenario |

Tutup buku dengan kunci periode ada di rancangan v1. Di jadwal 1 bulan ini ia masuk kolom "menyusul" karena bergantung pada format laporan dari finance (B7). Kalau B7 masuk di Minggu 1, tutup buku bisa dicoba dikerjakan di Minggu 3.

### 4.4 Yang diminta dari owner (sesuai halaman `/rancangan`)

- **7 hal yang perlu disetujui:** jadwal 1 bulan; selisih berat tidak disembunyikan; disetujui dan dibayar dipisah; data tidak bisa dihapus; tarif sementara memakai angka proposal; absensi pakai foto tanpa pengenalan wajah; server dan biaya bulanan atas nama perusahaan klien.
- **14 pertanyaan** (versi sederhana dari Q1–Q35, ditambah dua dari Formulir Produksi FRM-PRD-01 pada 21 Okt: rencana hasil 60% dan batas wajar 40–80%, serta penimbangan limbah dan susut). Yang wajib di hari ke-2 Minggu 1: relasi beli–produksi–jual (Q1–Q2), nomor acuan siklus (Q3), bongkar malam (Q5), pemeriksa dan penyetuju (Q6), arti verifikasi dua tahap (Q7), presisi timbangan (Q14), daftar pengguna (Q30), dan pemilik server (Q34).
- **9 bahan:** B1–B9, dengan B1 dan B2 (formulir produksi dan pembelian) digabung jadi satu, ditambah catatan timbang Siklus 1 (loin, limbah, susut) pada 21 Okt.

## 5. Kalau jawaban owner belum datang

Jangan menunggu untuk hal yang bisa dibuat fleksibel. Bangun dengan nilai bawaan ini, dan ubah lewat pengaturan, bukan kode.

| Pertanyaan | Nilai bawaan sementara | Alasan aman |
|---|---|---|
| Q1–Q2 relasi pembelian/produksi/penjualan | N:M lewat tabel alokasi | 1:1 adalah kasus khusus N:M; kebalikannya butuh migrasi |
| Q3 nomor acuan siklus | `cycles.kode` internal, dengan kolom untuk PO pembeli dan nomor bongkar | Semua nomor bisa dicari |
| Q5 bongkar malam | Terima lebih dulu diizinkan dengan tanda, bayar tetap menunggu | Operasional tidak terhenti, uang tetap terkontrol |
| Q6–Q7 penyetuju | Pemeriksa: Keuangan; penyetuju: Owner; tanpa ambang | Diubah di `approval_rules` |
| Q14 presisi | Simpan 3 desimal, tampil 2 | Tidak ada nilai yang terpotong |
| Q15 hubungan ikan–loin | Kolom `no_ikan` opsional | Bisa diwajibkan nanti |
| Q21–Q24 tarif | Angka proposal, ditandai belum dikonfirmasi | Semua di `tariff_rules` |
| Q26–Q28 format laporan | Laba kotor sementara berlabel | Tidak mengarang aturan HPP |
| Q31 lokasi absen | Radius 50 m, toleransi akurasi GPS 30 m | Di `work_sites` |
| Q32 pengenalan wajah | Tidak; foto langsung saja | Permintaan perubahan bila diminta |

Yang **tidak boleh** diberi nilai bawaan dan harus menunggu: format laporan keuangan final (Q26), pajak (Q28), dan siapa yang menanggung server (Q34).

---

## 6. Titik potong kalau mepet

**Kapan dipakai:** di titik periksa akhir Minggu 2. Kalau grid per loin, neraca, dan stok belum lulus kriteria "keluar bila" Minggu 2, atau jawaban wajib/bahan terlambat lebih dari 2 hari kerja, titik potong dijalankan. Owner diberi tahu hari itu juga, lengkap dengan apa yang digeser dan kapan selesainya.

**Urutan yang digeser lebih dulu** (dikerjakan dalam 1–2 minggu setelah sistem mulai dipakai):
1. Asisten AI dan simulasi harga.
2. Jadwal ABF dan giliran mitra (sementara dicatat manual).
3. Grafik harga beli (tabel harga per kg tetap ada).
4. Laba rugi format finance (laporan biaya, tagihan, dan pembayaran tetap ada).
5. Absensi dan izin (dirilis terpisah setelah sistem inti dipakai).
6. Setuju massal dan pengambilan sebagian di unit simpan (persetujuan satu per satu dan pengambilan penuh tetap jalan).

**Tidak digeser:** input per loin, neraca produksi dengan selisih terlihat, relasi transaksi dan halaman Rincian Siklus, pemisahan persetujuan dan pembayaran, bukti transaksi, peran dan RLS, riwayat koreksi, cadangan dan uji pemulihan, uji satu siklus nyata.

Menggeser item di atas tidak mengubah kesepakatan 1 bulan secara sepihak: owner perlu menyetujui pergeseran itu, sama seperti 7 hal di bagian 4.4.

## 7. Pengujian tambahan

Ditambahkan ke `rencana-sistem-fitur-logika-alur.md` bagian 10.

- **Presisi:** 500 loin dengan berat 3 desimal; total di grid, rekap, laporan, dan CSV identik sampai desimal ketiga.
- **Neraca produksi:** komponen + selisih = bahan masuk; selisih tidak pernah berubah sendiri.
- **N:M:** satu lot ke dua produksi; satu penjualan dari dua produksi; penelusuran dua arah benar.
- **Persetujuan:** disetujui tetap "belum dibayar"; setuju massal menampilkan total yang benar; revisi kembali ke pengaju; pengguna tanpa izin ditolak di database.
- **Tarif:** tabel kasus batas (tepat 3 jam/24 jam/10 hari, ambil sebagian, berat masuk vs keluar) dengan hasil yang diketahui.
- **Absensi:** di dalam radius, di luar radius, akurasi buruk, kamera ditolak, jam server vs jam ponsel berbeda.
- **Ketahanan input:** jaringan putus saat menyimpan grid, klik ganda simpan, dua petugas mengedit produksi yang sama.
- **Pemulihan:** cadangan dipulihkan ke proyek terpisah dan angka utamanya cocok.

---

## 8. Risiko baru

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Jawaban P1 terlambat | Skema berubah di tengah jalan | Nilai bawaan fleksibel (bagian 5); batas waktu jawaban di hari ke-2 Minggu 1 |
| Jadwal 1 bulan terlalu padat untuk 2 pengembang | Kualitas turun atau serah terima mundur | Kedalaman versi pertama (bagian 4.3); tambah 1 pengembang di Minggu 2–4; titik periksa akhir Minggu 2 |
| Owner menolak item yang digeser saat titik potong | Pekerjaan menumpuk di Minggu 4 | Sampaikan sejak awal bahwa titik potong ada (bagian 6); pergeseran butuh persetujuan owner, sama seperti 7 hal di bagian 4.4 |
| Formulir lapangan beda dengan dugaan | Grid input dirombak | Minta B1 di Minggu 1, sebelum grid dibuat di Minggu 2; uji grid dengan petugas lapangan |
| Format laporan finance tidak kunjung ada | Laporan laba tertunda | Laporan transaksi dan biaya tetap jalan; laba rugi berlabel sementara |
| Sinyal di lantai produksi dan ruang dingin lemah | Input hilang | Draft di perangkat, sinkron ulang, indikator status simpan |
| GPS ponsel tidak akurat di dalam gedung | Absen gagal terus | Catat akurasi, toleransi dapat diatur, alasan gagal jelas, jalur pengajuan manual |
| Penambahan "sekalian" dari rekaman berikutnya | Cakupan melebar | Semua permintaan baru dicatat sebagai permintaan perubahan |

---

## 9. Yang dikerjakan minggu ini

- [ ] Kirim halaman `/rancangan` ke owner (perlu di-deploy dulu) dan minta jawaban 7 persetujuan serta 8 pertanyaan wajib paling lambat hari ke-2 Minggu 1.
- [ ] Putuskan apakah menambah 1 pengembang untuk Minggu 2–4.
- [ ] Simpan dokumen konfirmasi 35 pertanyaan sebagai rujukan internal. Yang dikirim ke owner cukup halaman `/rancangan`.
- [ ] Jadwalkan rapat kunci keputusan dengan owner dan finance.
- [ ] Minta pembuatan akun Vercel dan Supabase atas nama klien, atau sepakati siapa pemiliknya (Q34).
- [ ] Siapkan repo aplikasi produksi terpisah dari repo deck (`katalis-erp-pitch`), dengan `supabase/migrations`.
- [ ] Mulai skema v2 bagian 2 untuk tabel yang tidak bergantung pada jawaban owner.
