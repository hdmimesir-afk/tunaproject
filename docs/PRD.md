# PRD Katalis ERP

21 Oktober 2026 · Disusun oleh Dar Dev

## Ringkasan

Katalis ERP adalah satu aplikasi web untuk PT Katalis Lintas Global, dipakai di desktop dan HP, yang mencatat usaha dari beli ikan sampai uang masuk. Pengerjaan 4 minggu; sistem mulai dipakai di akhir minggu 4 setelah satu siklus produksi asli diuji.

**Masalah yang diselesaikan**

- Data produksi tidak lengkap dan angka di belakang koma hilang. Formulir lama mencatat total loin Siklus 1 sebagai 301,0 kg, padahal timbangan 300,94 kg.
- Selisih berat tidak terlihat. Formulir lama menyebut 93,06 kg dari 481 kg ikan Siklus 1 sebagai susut, padahal 65 kg di antaranya tulang tengah dan tetelan hitam yang dibuang; 28,06 kg sisanya belum jelas.
- Catatan tidak nyambung: pembelian, produksi, stok, penjualan, dan kas diketik ulang di tempat berbeda.
- Persetujuan dan bukti tercecer: 55 dari 243 transaksi di Monitor Dana belum punya bukti transfer.

**Tiga prinsip owner** (mengalahkan fitur tambahan)

1. Data produksi lengkap: setiap ekor dan loin tercatat beratnya, desimal tidak hilang.
2. Semua catatan nyambung: dari beli ikan sampai uang masuk tanpa ketik ulang.
3. Setiap angka ada buktinya: angka laporan bisa diklik sampai transaksi dan notanya.

**Ukuran berhasil**

- Satu siklus produksi asli tercatat di sistem dan cocok dengan catatan kertas petugas dan owner.
- Neraca produksi: komponen + selisih = ikan masuk, sama sampai 3 desimal di formulir, rekap, laporan, dan CSV.
- 300+ baris loin tersimpan utuh walau jaringan putus saat menyimpan.
- Tidak ada transaksi keluar yang lolos tanpa persetujuan dan nota.

**Acuan.** Bila ada yang bertentangan, urutan yang berlaku: `docs/rencana-eksekusi.md`, halaman owner `/rancangan`, Formulir Produksi FRM-PRD-01 revisi 01, lalu `docs/rancangan-pembangunan.md`. Tampilan memakai ulang demo di `components/demo`.

## Pengguna dan peran

Lima peran awal, disimpan di tabel `roles` dan `role_permissions` sehingga Owner bisa mengubah izin tanpa programmer. Owner menyebut tiga peran (Super Admin, Finance, Owner); dua peran lapangan diusulkan developer supaya orang yang menimbang tidak sama dengan orang yang memeriksa. Satu orang boleh memegang lebih dari satu peran bila timnya kecil, kecuali menimbang dan memeriksa produksi yang sama.

| Peran | Tugas utama | Aksi yang diizinkan (nilai awal) | Layar utama |
| --- | --- | --- | --- |
| Owner | Memantau dan menyetujui | Semua aksi; penyetuju akhir dan pembuka kembali periode | Dashboard owner di HP |
| Finance | Memeriksa transaksi, mencatat uang keluar dan masuk, laporan | Periksa persetujuan, bayar pemasok, catat bayar pembeli, ajukan biaya, ingatkan tagihan | Persetujuan, Keuangan, Laporan |
| Super Admin | Urusan kantor: akun, data master, pengaturan, beli dan jual | Undang pengguna, master data, tarif dan target hasil, buat PO, buat pesanan jual | Akses, Pembelian, Penjualan, Pengaturan |
| Kepala Produksi / QC (usulan) | Cek mutu dan memeriksa hasil produksi | Cek mutu lot (lulus/tahan, kelas), periksa neraca produksi sebelum ke Owner, ajukan koreksi stok | Mutu, Produksi |
| Petugas Lapangan (usulan) | Terima, timbang, olah, kirim | Terima ikan dan timbang lot, isi grid loin, timbang hasil samping, limbah, dan susut, catat kirim dan titipan | Produksi dan Stok di HP |

- Setiap orang hanya melihat menu sesuai izinnya. Izin dicek di database (RLS), bukan hanya di tampilan.
- Halaman yang hanya untuk melihat data tidak menampilkan tombol ubah.
- Persetujuan memakai dua orang: pemeriksa (bawaan Keuangan) dan penyetuju (bawaan Owner), diatur di `approval_rules`.

## Cakupan

Versi 1 memuat 12 modul (absensi ditunda atas keputusan owner 22 Oktober 2026) sampai kedalaman "versi pertama"; fitur lanjutan masuk masa garansi atau permintaan perubahan.

| Modul | Masuk versi 1 | Menyusul |
| --- | --- | --- |
| Penelusuran siklus | Halaman Rincian Siklus/PO, Ringkasan Harian | Perbandingan antarsiklus |
| Persetujuan | 5 status, pemeriksa + penyetuju, setuju massal dengan total, bukti di kartu | Ambang otomatis, notifikasi WA/email |
| Pembelian dan mutu | PO, terima (termasuk sebagian dan bongkar malam), cek mutu, bayar pemasok | - |
| Produksi | Grid loin per potong, komponen hasil, selisih + pemeriksaan | Integrasi timbangan digital, tren selisih |
| Stok | Pemilik, fresh/beku, berat masuk/keluar, ambil sebagian | Lokasi rak/palet, opname terjadwal |
| Gudang dingin dan tarif | Mesin tarif dari pengaturan, invoice jasa rinci | Pengingat batas hari ke pelanggan |
| Penjualan | Pesanan, kirim (berat kirim dan terima), invoice, bayar sebagian | - |
| Harga beli | Tabel + grafik per periode, jenis, grade, pemasok | Analisis lanjutan |
| Keuangan | Kategori biaya, laporan biaya/tagihan/bayar, laba rugi sesuai format finance | Tutup buku dengan kunci periode, rekonsiliasi bank |
| Dashboard | Owner di HP, menu petugas disaring | Halaman kerja khusus per peran |
| Absensi | Ditunda (keputusan owner) | Pengenalan wajah |
| Jadwal ABF | Cek bentrok, pindah ke jam kosong | Kalender per tanggal |
| Asisten AI dan simulasi | Alat baca terbatas; slider harga | Model bahasa; simpan skenario |

**Tidak termasuk versi 1:** absensi dan izin karyawan (ditunda), pengenalan wajah, integrasi timbangan digital, rekonsiliasi bank otomatis, notifikasi WA/email, pajak (menunggu aturan dari finance), dan impor data selain master data, Siklus 1, dan Monitor Dana.

## Alur utama

Satu siklus berjalan dari beli ikan sampai laporan tanpa ketik ulang.

1. **Beli ikan**: PO + nota.
2. **Persetujuan**: diperiksa, lalu disetujui. Bila perlu revisi, kembali ke langkah 1.
3. **Terima & timbang**: ikan menjadi lot.
4. **Lulus mutu?** Lot yang ditahan tidak bisa diproduksi.
5. **Produksi**: timbang tiap loin dan komponen hasil.
6. **Neraca diperiksa**: QC, lalu Owner.
7. **Stok**: fresh/beku, titipan. Ikan fresh boleh langsung dikirim tanpa masuk gudang.
8. **Kirim & tagihan**: dari berat yang dikirim.
9. **Uang masuk**: lunas atau dicicil.
10. **Laporan**: setiap angka bisa diklik sampai nota.

Setiap langkah memakai catatan dari langkah sebelumnya, jadi satu siklus bisa ditelusuri dua arah.

## Kebutuhan fitur

Setiap kebutuhan di bawah selesai bila kriteria terimanya lulus di lingkungan uji dan ditunjukkan ke owner di akhir minggunya.

| Kode | Modul | Kebutuhan | Kriteria terima | Minggu |
| --- | --- | --- | --- | --- |
| F01 | Akses | Login, peran dari tabel, menu disaring per izin | Pengguna tanpa izin ditolak di database, bukan hanya tombolnya disembunyikan | 1 |
| F02 | Pembelian | Buat PO dengan pemasok, berat, harga, nota; harga dibanding pembelian terakhir | Kenaikan harga tampil sebagai peringatan di kartu persetujuan | 1 |
| F03 | Persetujuan | Alur draf → diajukan → perlu revisi → disetujui/ditolak; bukti tampil di sebelah tombol Setuju | Disetujui tetap "belum dibayar" sampai pembayaran dicatat; revisi kembali ke pengaju | 1 |
| F04 | Persetujuan | Setuju massal | Layar konfirmasi menampilkan daftar, jumlah transaksi, dan total nilai sebelum disetujui | 1 |
| F05 | Penerimaan | Terima ikan jadi lot, termasuk sebagian; bongkar malam diberi tanda | Lot baru berstatus "menunggu cek mutu"; bongkar malam muncul di antrean Owner pagi | 1 |
| F06 | Mutu | Cek mutu per lot: lulus dengan kelas, atau ditahan | Hanya lot lulus dengan sisa berat > 0 yang bisa diproduksi | 1 |
| F07 | Produksi | Alokasi satu atau beberapa lot ke satu produksi | Satu lot ke dua produksi dan sebaliknya tertelusuri dua arah | 2 |
| F08 | Produksi | Grid loin per potong sesuai FRM-PRD-01 rev 01: no. ekor (opsional), no. loin, grade, berat 3 desimal | Keyboard saja cukup; tambah baris cepat; total otomatis; draft tersimpan saat jaringan putus | 2 |
| F09 | Produksi | Komponen hasil: hasil samping per jenis, limbah, susut tercatat | Neraca tampil dalam kg dan %; selisih belum jelas tidak pernah terisi sendiri | 2 |
| F10 | Produksi | Pemeriksaan produksi oleh QC lalu Owner | Status "diperiksa" hanya bisa setelah selisih dijelaskan atau diterima Owner | 2 |
| F11 | Stok | Unit simpan per pemilik, produk, grade, fresh/beku, lokasi | Berat masuk, keluar, dan sisa tercatat; fresh langsung kirim tidak perlu masuk gudang | 2 |
| F12 | Gudang dingin | Titipan pelanggan, mesin tarif ABF/simpan dari pengaturan | Data sama menghasilkan tagihan sama; invoice menampilkan cara hitungnya | 2 |
| F13 | Jadwal ABF | Booking produksi dan ABF per hari/jam | Bentrok terdeteksi dan bisa dipindah ke jam kosong | 2 |
| F14 | Penjualan | Pesanan dari stok, kirim, invoice, bayar sebagian | Pesanan tidak melebihi stok tersedia; tagihan memakai berat diterima pembeli bila dicatat | 3 |
| F15 | Penelusuran | Rincian Siklus/PO dan Ringkasan Harian | Satu siklus bisa diikuti dari beli sampai uang masuk tanpa input ulang | 3 |
| F16 | Keuangan | Biaya per 8 kategori dengan nota, terhubung ke PO/produksi | Pengeluaran tanpa nota tidak bisa diajukan untuk jenis yang mewajibkan | 3 |
| F17 | Laporan | Biaya per siklus, tagihan, pembayaran, laba rugi per siklus mengikuti contoh laporan Siklus 1 (docs/laporan), CSV | Angka laporan bisa diklik sampai transaksi; CSV sama dengan tampilan | 3 |
| F18 | Harga beli | Harga per kg rata-rata tertimbang per hari/minggu, jenis, grade, pemasok | Harga baru tidak mengubah harga transaksi lama | 3 |
| F19 | Dashboard | Ringkasan owner di HP, rincian muncul saat diketuk | Angka cocok dengan view dan ikut berubah saat data berubah | 3 |
| F20 | Absensi | Ditunda (keputusan owner 22 Okt): absen dengan lokasi, foto langsung, waktu server | Gagal di luar radius dengan alasan jelas; foto tidak bisa dari galeri | 4 |
| F21 | Absensi | Ditunda: izin, sakit, libur dari HP dan rekap untuk owner | Rekap hadir, terlambat, izin, sakit, tidak hadir per orang | 4 |
| F22 | Asisten AI | Jawab pertanyaan dari alat baca terbatas, dengan tautan ke modul | Hanya baca; data mengikuti izin pengguna | 4 |
| F23 | Simulasi | Slider harga ikan dan dampak laba | Rumus sesuai lembar asumsi | 4 |

## Aturan bisnis dan rumus

Aturan ini dijaga di database (constraint, trigger, fungsi), bukan hanya di tampilan.

**Neraca produksi.** Selisih belum jelas adalah sisa hitungan dan tidak pernah diisi otomatis atau dipindah ke susut.

```
ikan masuk = loin + hasil samping + limbah + susut tercatat + selisih belum jelas
```

- Loin = jumlah semua potong di grid loin. Hasil (%) = loin ÷ ikan masuk; hasil per ekor = loin dengan no. ekor yang sama ÷ berat utuh ekor itu.
- Rencana hasil 60%. Di luar 40–80% = peringatan dan tanda periksa, bukan penolakan. Angka ini disimpan di pengaturan.
- Total komponen yang ditimbang tidak boleh melebihi ikan masuk.
- Contoh Siklus 1: 481,000 = 300,940 loin + 87,000 hasil samping terjual + 65,000 limbah (tulang tengah dan tetelan hitam, dibuang) + 28,060 belum jelas (5,8%). Susut belum ditimbang, jadi kosong, bukan nol. Limbah dan susut ditimbang totalnya saja, tidak per jenis (keputusan owner).

**Angka.** Berat `numeric(12,3)` kg, uang `numeric(16,2)` rupiah, tidak ada `float`. Total dihitung dari nilai asli; pembulatan hanya di tampilan (bawaan tampil 2 desimal).

**Persetujuan dan pembayaran**

1. Status persetujuan (draf, diajukan, perlu revisi, disetujui, ditolak) terpisah dari status bayar (belum, sebagian, lunas).
2. Status bayar dihitung dari jumlah baris di `payments`.
3. Bukti wajib sebelum diajukan untuk jenis transaksi yang ditetapkan di `approval_rules`.
4. Tombol berisiko (setuju, tolak, bayar, kirim, tutup buku) memakai konfirmasi kedua dan tidak bersebelahan dengan tombol lawannya.
5. Koreksi stok dan biaya baru berlaku setelah disetujui Owner.

**Pembelian dan penerimaan.** Hanya PO disetujui yang bisa diterima, kecuali bongkar malam yang diberi tanda `diterima_sebelum_disetujui`; pembayaran tetap menunggu persetujuan. Harga tersimpan di PO saat diajukan.

**Penjualan.** Pesanan draf tidak boleh melebihi stok tersedia dikurangi pesanan draf lain. Pengiriman mengurangi stok dan menerbitkan invoice dengan jatuh tempo bawaan 14 hari.

**Tarif gudang dingin** (tarif simpan dari owner 22 Oktober 2026; ABF tetap; minimum 10 hari masih mengikuti proposal sampai owner mengubahnya)

| Layanan | Tarif awal | Aturan awal |
| --- | --- | --- |
| Simpan cold storage | Rp76/kg/hari | Minimum 10 hari; hari ke-11 dan seterusnya +Rp76/kg/hari |
| ABF (pembekuan) | Rp3.500/kg | Ditagih terpisah dari simpan |
| Kapasitas | 17.500 kg | Titipan baru ditolak bila stok sendiri + titipan melebihi |

Semua angka tarif, batas transit, pembulatan hari, dan dasar berat (masuk/keluar) diambil dari `tariff_rules`.

**Data tidak bisa dihapus.** Baris dibatalkan dengan alasan atau dikoreksi dengan baris pembalik. Semua perubahan masuk `activity_log` (sebelum/sesudah); baris loin juga ke `production_items_history`.

## Model data

Database Postgres di Supabase, aplikasi Next.js di Vercel, keduanya atas nama perusahaan. Relasi beli, produksi, dan jual dibuat banyak-ke-banyak lewat tabel alokasi, karena satu-ke-satu adalah kasus khususnya. Skema diubah hanya lewat berkas migrasi di `supabase/migrations`.

| Kelompok | Tabel | Isi penting |
| --- | --- | --- |
| Akses | `roles`, `role_permissions`, `profiles` | Peran dan izin per aksi, diatur Owner |
| Master | `suppliers`, `buyers`, `products`, `grades`, `component_categories`, `expense_categories` | Daftar produk, grade, jenis hasil samping/limbah, 8 kategori biaya |
| Siklus | `cycles` | Kode internal + no. PO pembeli + no. bongkar, status terbuka/ditutup |
| Pembelian | `purchase_orders`, `lots`, `payments` | Status persetujuan terpisah dari status bayar; lot dengan status mutu dan kelas |
| Persetujuan | `approvals`, `approval_rules` | Diajukan, diperiksa, disetujui oleh siapa dan kapan; `batch_id` untuk setuju massal |
| Produksi | `productions`, `lot_allocations`, `production_items`, `production_components` | Status draf/berjalan/selesai/diperiksa; satu baris per potong loin (`kg numeric(12,3)`); komponen hasil per jenis |
| Stok | `storage_units`, `storage_movements` | Pemilik, produk, grade, fresh/beku, lokasi, berat masuk/keluar/sisa |
| Penjualan | `sales_orders`, `sale_allocations`, `invoices` | Penjualan bisa dari beberapa produksi; invoice penjualan dan jasa |
| Jasa gudang | `tariff_rules`, `service_charges`, `bookings` | Tarif sebagai pengaturan; rincian hitungan tagihan; jadwal ABF |
| Keuangan | `ledger`, `documents`, `accounting_periods` | Buku kas dengan kategori dan rujukan PO/produksi; nota dan bukti di Storage |
| Absensi | `employees`, `work_sites`, `attendance`, `leave_requests` | Lokasi, akurasi, foto, waktu server; izin/sakit/libur |
| Jejak | `activity_log`, `production_items_history` | Sebelum/sesudah setiap perubahan, tidak bisa diubah atau dihapus |

**Views untuk dashboard dan Asisten AI:** `v_ringkasan_harian`, `v_rincian_siklus`, `v_neraca_produksi`, `v_harga_beli`, `v_stok_per_pemilik`, `v_rekap_kehadiran`, `v_laba_rugi`. Semua memakai izin pemanggil (`security_invoker`).

Rincian kolom per tabel ada di `docs/rencana-eksekusi.md` bagian 2.

## Kebutuhan non-fungsional

| Aspek | Kebutuhan | Cara uji |
| --- | --- | --- |
| Presisi | Berat disimpan 3 desimal, tidak ada nilai terpotong | 500 loin berdesimal tiga: total di grid, rekap, laporan, dan CSV identik |
| Ketahanan input | Isian tersimpan di perangkat saat jaringan putus, sinkron ulang, indikator status simpan selalu terlihat | Putus jaringan saat menyimpan 300+ baris; klik ganda simpan; dua petugas mengedit produksi yang sama |
| Keamanan akses | RLS di semua tabel; bucket Storage privat; kunci AI hanya di server | Pengguna tanpa izin ditolak di database; tinjauan RLS dan bucket di minggu 4 |
| Tidak ada hapus permanen | Pembatalan dengan alasan atau baris pembalik; jejak sebelum/sesudah | Coba hapus dari aplikasi dan dari API pengguna biasa: ditolak |
| Cadangan | Cadangan harian aktif sejak minggu 1 | Pulihkan ke proyek terpisah di minggu 4; angka utama cocok |
| Gagal simpan | Selalu tampil pesan, tidak pernah diam | Matikan koneksi database saat menyimpan |
| Perangkat | Owner diutamakan di HP; petugas di HP atau desktop; satu komponen untuk dua tata letak | Semua layar utama diuji di lebar 375 px dan desktop |
| Lingkungan | Lokal → preview per cabang → produksi; proyek Supabase uji dan produksi terpisah | Data demo tidak pernah menyentuh data nyata |
| Absensi | Waktu dari server, foto langsung dari kamera, akurasi GPS dicatat | Di dalam/luar radius, akurasi buruk, kamera ditolak, jam ponsel salah |

## Stack teknologi

Versi di bawah adalah rilis stabil terbaru di npm per 21 Oktober 2026; versi dikunci di `package-lock.json` dan dinaikkan lewat pull request mingguan, bukan otomatis.

| Lapisan | Pilihan | Versi | Catatan |
| --- | --- | --- | --- |
| Framework web | Next.js (App Router) | 16.4.2 | Server Components dan Server Actions; `proxy.ts` menggantikan `middleware.ts` sejak Next.js 16 |
| UI | React | 19.3.1 | Komponen tampilan memakai ulang `components/demo` |
| Bahasa | TypeScript | 7.0.2 | Mode `strict`; tipe database dibuat dari skema (`supabase gen types`) |
| Gaya | Tailwind CSS | 4.3.3 | Token warna sama dengan demo |
| Database, Auth, Storage | Supabase (Postgres) | supabase-js 2.118.0, @supabase/ssr 0.12.7 | RLS di semua tabel; kunci baru `sb_publishable_` dan `sb_secret_` |
| Migrasi dan tes database | Supabase CLI + pgTAP | 2.121.0 | `supabase/migrations`; tes RLS dengan `supabase test db` |
| Validasi input | Zod | 4.6.7 | Skema yang sama dipakai di form dan Server Action |
| Draft offline | Dexie (IndexedDB) | 4.4.6 | Grid loin dan form tersimpan di perangkat saat jaringan putus |
| Tes unit dan integrasi | Vitest | 5.0.5 | Rumus neraca, tarif, status bayar |
| Tes end-to-end | Playwright | 1.64.1 | Alur beli sampai uang masuk, HP dan desktop |
| Lint | ESLint | 10.13.0 | Wajib lulus di CI |
| Pemantauan error | Sentry untuk Next.js | 11.8.0 | Usulan; data pribadi disaring sebelum dikirim |
| Hosting | Vercel + Supabase | - | Mulai dengan paket gratis (Vercel Hobby, Supabase Free) atas keputusan owner 22 Okt; region Singapura; batasannya di bawah tabel |

**Batasan paket gratis.** Paket gratis cukup untuk mulai, tetapi punya batas yang harus ditutup sebelum dipakai sehari-hari:

- Vercel Hobby hanya untuk pemakaian pribadi non-komersial menurut ketentuan Vercel; untuk dipakai usaha, pindah ke Vercel Pro sebelum sistem mulai dipakai penuh.
- Supabase Free menjeda proyek yang sepi selama 7 hari; pemakaian harian mencegahnya, tetapi jeda bisa terjadi saat libur panjang.
- Supabase Free tidak menyediakan unduhan cadangan; cadangan harian dibuat sendiri (lihat Keamanan data).
- Batas database 500 MB dan penyimpanan berkas 1 GB; cukup untuk data transaksi, perlu dipantau untuk foto nota.
- Pemilik akun dan siapa yang membayar saat naik paket masih menunggu keputusan owner dan investor.

## Keamanan data

Keamanan berlapis: database menolak akses yang tidak berhak walau kode aplikasi salah, dan setiap Server Action memeriksa ulang izin walau halaman sudah memeriksa. Aturan di bawah mengikuti dokumentasi resmi Supabase server-side auth (https://supabase.com/docs/guides/auth/server-side/creating-a-client), kunci API baru Supabase (https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys), dan Next.js Data Security (https://github.com/vercel/next.js/blob/v16.2.9/docs/01-app/02-guides/data-security.mdx).

| Lapisan | Aturan | Cara cek |
| --- | --- | --- |
| Login | Supabase Auth dengan cookie httpOnly lewat `@supabase/ssr`; MFA (TOTP) wajib untuk Owner dan Keuangan | Login Owner tanpa kode kedua ditolak |
| Verifikasi identitas di server | Halaman dan data dilindungi dengan `auth.getClaims()`; objek user dari `getSession()` tidak dipakai untuk keputusan izin | Review kode: tidak ada `getSession()` untuk otorisasi |
| Proxy | `proxy.ts` hanya menyegarkan sesi dan mengarahkan ke login; tidak dianggap pengaman | Tes akses Server Action langsung lewat POST tanpa sesi: ditolak |
| Server Action | Setiap action memeriksa ulang sesi, izin peran, dan kepemilikan data lewat satu lapisan akses data (`import 'server-only'`) | Tes IDOR: pengguna A tidak bisa mengubah data milik siklus yang tidak boleh ia akses |
| Kunci API | Browser hanya memakai kunci `sb_publishable_`; kunci `sb_secret_` hanya di server, tidak pernah berawalan `NEXT_PUBLIC_`; kunci lama `anon` dan `service_role` tidak dipakai karena dihentikan akhir 2026 | Pindai bundle klien: tidak ada kunci rahasia |
| RLS | Aktif dan dipaksa (`force row level security`) di semua tabel; kebijakan dari `role_permissions`; views memakai `security_invoker` | Tes pgTAP per peran untuk baca, tulis, dan tolak |
| Fungsi database | Hindari `security definer`; bila terpaksa, `search_path` dikunci dan izin eksekusi dibatasi | Daftar fungsi definer ditinjau setiap rilis |
| Hapus data | Hak `DELETE` dicabut dari peran aplikasi; `activity_log` hanya `INSERT` | Coba hapus lewat API: ditolak |
| Input | Semua input divalidasi Zod di server; query lewat klien Supabase, tidak ada SQL dirangkai dari teks | Tes input berbahaya di form utama |
| Berkas | Bucket Storage privat; nota dan foto dibuka lewat signed URL berumur pendek; batas jenis dan ukuran berkas | Buka URL berkas tanpa sesi: ditolak |
| Header | CSP, HSTS, `X-Frame-Options`, dan `Referrer-Policy` di `next.config` | Pindai header di lingkungan uji |
| Batas permintaan | Batas percobaan login dan pertanyaan Asisten AI per pengguna per hari | Tes login gagal berulang terkunci sementara |
| Rahasia | Variabel lingkungan dipisah per lingkungan (lokal, preview, produksi) di Vercel; rotasi kunci bila ada developer keluar | Checklist rotasi di serah terima |
| Data pribadi | Foto absen dan lokasi hanya dibuka Owner; masa simpan ditetapkan; mengikuti UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi | Akses foto oleh peran lain ditolak |
| Cadangan | Supabase Free tidak menyediakan unduhan cadangan, jadi cadangan harian dibuat sendiri: pg_dump terjadwal lewat GitHub Actions ke penyimpanan privat; uji pulih ke proyek terpisah | Uji pulih minggu 4 dan setiap 3 bulan |
| Dependensi | `npm audit` dan pembaruan keamanan mingguan lewat pull request | CI gagal bila ada celah tingkat tinggi |

## Workflow pengembangan

Setiap task dari Daftar task berjalan lewat satu cabang dan satu pull request; tidak ada perubahan langsung ke `main` atau ke database produksi.

1. **Ambil task.** Satu task (atau satu kode fitur) = satu cabang, misalnya `feat/F08-grid-loin`.
2. **Cek dokumentasi terbaru lewat Context7.** Sebelum menulis atau menaikkan kode yang memakai library (Next.js, Supabase, Tailwind, Zod, Dexie), developer dan AI coding agent wajib membaca dokumentasi versi yang dipakai lewat MCP Context7. Alasannya: Next.js 16 punya perubahan besar (contoh: `proxy.ts`), dan Supabase mengganti kunci API.
3. **Database dulu.** `supabase migration new <nama>`, tulis tabel, RLS, dan tes pgTAP, jalankan `supabase test db`, lalu `supabase gen types` untuk tipe TypeScript.
4. **Kode.** Lapisan akses data (server-only) → Server Action dengan validasi Zod dan cek izin → tampilan dari `components/demo`.
5. **Tes lokal.** `tsc`, ESLint, Vitest, dan Playwright untuk alur yang disentuh.
6. **Pull request.** CI menjalankan typecheck, lint, tes, tes database, dan `npm audit`; Vercel membuat preview dengan proyek Supabase uji. Developer lain mereview dengan checklist keamanan di bawah.
7. **Gabung ke `main`.** Migrasi diterapkan ke proyek uji lewat CLI; lingkungan uji diperbarui otomatis.
8. **Rilis produksi.** Di akhir minggu, setelah syarat keluar minggu lulus dan owner melihat demo: migrasi ke produksi, deploy, beri tag versi (`v0.1`, `v0.2`, ...), catat perubahan.
9. **Perbaikan darurat.** Cabang `fix/...` dari `main`, alur sama tetapi review bisa langsung oleh satu developer; tetap lewat CI.

**Checklist review keamanan (setiap pull request)**

- [ ] Tabel baru punya RLS aktif dan tes pgTAP per peran
- [ ] Setiap Server Action baru memeriksa sesi, izin, dan kepemilikan data
- [ ] Tidak ada kunci rahasia atau variabel `NEXT_PUBLIC_` yang berisi rahasia
- [ ] Input divalidasi Zod di server
- [ ] Tidak ada `DELETE` dan tidak ada angka berat atau uang bertipe `float`
- [ ] Perubahan tercatat di `activity_log`

**Definisi selesai.** Task dianggap selesai bila kriteria terima fiturnya lulus di lingkungan uji, tes otomatis ditambahkan, pull request sudah direview, dan task dicentang di Daftar task.

## Jadwal dan syarat selesai

Semua pekerjaan selesai dalam 4 minggu, dengan syarat jawaban wajib masuk paling lambat hari ke-2 minggu 1. Setiap akhir minggu hasilnya ditunjukkan ke owner di lingkungan uji.

| Minggu | Fokus | Isi utama | Keluar bila |
| --- | --- | --- | --- |
| 1 | Beli dan persetujuan | H1–2 sepakati jawaban; server, akun, peran; beli, terima, cek mutu; setuju terpisah bayar | Beli sampai bayar jalan; disetujui tidak sama dengan dibayar |
| 2 | Produksi dan stok | Grid loin per potong; neraca dan selisih; stok fresh/beku; titipan + tarif ABF | 300+ loin aman saat offline; neraca Siklus 1 jelas. Gagal: titik potong |
| 3 | Jual, uang, laporan | Pesanan, kirim, tagih; rincian siklus dan harian; biaya dan laba rugi; dashboard owner di HP | Beli sampai uang masuk bisa dicoba penuh |
| 4 | Uji nyata, mulai pakai | Cadangan harian otomatis; Asisten AI, simulasi; uji pulih cadangan; uji 1 siklus asli | Siklus asli tanpa data hilang; serah terima tertulis |

Akhir minggu 2 adalah titik periksa: bila grid loin, neraca, dan stok belum lulus, titik potong di bagian Risiko dijalankan dan owner diberi tahu hari itu juga.

## Daftar task

Task disusun per minggu dan merujuk kode fitur di bagian Kebutuhan fitur. Centang saat task lulus di lingkungan uji; task bertanda (owner) menunggu jawaban atau bahan dari owner.

### Persiapan (sebelum minggu 1)

- [ ] Deploy halaman `/rancangan` dan kirim ke owner
- [ ] Minta jawaban 7 persetujuan dan 8 pertanyaan wajib paling lambat hari ke-2 minggu 1 (owner)
- [ ] Putuskan tambah 1 developer untuk minggu 2–4
- [ ] Jadwalkan rapat kunci keputusan dengan owner dan finance
- [ ] Akun Vercel Hobby dan Supabase Free (paket gratis); pemilik akun dan biaya saat naik paket menunggu keputusan owner dan investor (owner)
- [ ] Repo aplikasi produksi terpisah dari repo deck, dengan folder `supabase/migrations`
- [ ] Inisialisasi stack dengan versi di bagian Stack teknologi; kunci versi di `package-lock.json`
- [ ] Pasang MCP Context7 di alat setiap developer dan AI coding agent
- [ ] CI: typecheck, lint, test, tes database, dan `npm audit` dicek di setiap pull request
- [ ] Dua proyek Supabase (uji dan produksi) region Singapura dan preview per cabang di Vercel
- [ ] Pakai kunci `sb_publishable_` dan `sb_secret_`; variabel lingkungan dipisah per lingkungan

### Minggu 1: fondasi, pembelian, dan persetujuan

**Hari 1–2: kunci keputusan**

- [ ] Rapat dengan owner: 7 persetujuan dan 14 pertanyaan; catat jawaban di dokumen ini (owner)
- [ ] Terima bahan minggu 1: formulir terisi, dokumen satu siklus, daftar produk/grade/hasil samping, foto timbangan, daftar pengguna (owner)
- [ ] Perbarui nilai bawaan di bagian Keputusan terbuka sesuai jawaban

**Fondasi**

- [ ] Migrasi skema v2: akses, master, siklus, pembelian, persetujuan, jejak
- [ ] Tipe angka: berat `numeric(12,3)`, uang `numeric(16,2)`; tidak ada `float`
- [ ] Login Supabase Auth lewat `@supabase/ssr` dan undangan pengguna
- [ ] MFA (TOTP) wajib untuk Owner dan Keuangan
- [ ] `proxy.ts` untuk menyegarkan sesi; halaman dan data dilindungi dengan `auth.getClaims()`
- [ ] Lapisan akses data `server-only`; setiap Server Action memeriksa sesi, izin, dan kepemilikan
- [ ] `roles` dan `role_permissions` dengan matriks awal 5 peran (F01)
- [ ] RLS aktif dan dipaksa di semua tabel; tes pgTAP per peran (F01)
- [ ] Trigger `activity_log` sebelum/sesudah di semua tabel transaksi
- [ ] Larangan hapus: cabut DELETE dari peran aplikasi; pembatalan dengan alasan
- [ ] Header keamanan (CSP, HSTS, X-Frame-Options, Referrer-Policy) dan batas percobaan login
- [ ] Cadangan harian sendiri: pg_dump terjadwal lewat GitHub Actions ke penyimpanan privat (paket gratis tidak menyediakan unduhan cadangan)
- [ ] Kerangka aplikasi dari `components/demo`: tata letak desktop dan HP, menu disaring per izin
- [ ] Pesan gagal simpan global dan draft di perangkat (Dexie)

**Master data**

- [ ] CRUD pemasok, pembeli, produk, grade, kategori komponen, 8 kategori biaya (tanpa hapus)
- [ ] Impor master data awal dari bahan owner (owner)

**Pembelian, penerimaan, mutu**

- [ ] Form PO: pemasok, berat, harga per kg, unggah nota (F02)
- [ ] Peringatan harga dibanding pembelian terakhir pemasok (F02)
- [ ] Tabel `cycles` dan pengisian nomor siklus di PO
- [ ] Terima ikan jadi lot, termasuk terima sebagian (F05)
- [ ] Tanda bongkar malam `diterima_sebelum_disetujui` dan antrean Owner pagi (F05)
- [ ] Cek mutu: lulus dengan kelas atau ditahan (F06)

**Persetujuan dan pembayaran**

- [ ] `approval_rules` per jenis transaksi: pemeriksa, penyetuju, bukti wajib (F03)
- [ ] Alur draf → diajukan → perlu revisi → disetujui/ditolak (F03)
- [ ] Kartu persetujuan dengan nota/bukti di sebelah tombol Setuju (F03)
- [ ] Setuju massal dengan layar daftar, jumlah, dan total (F04)
- [ ] Konfirmasi kedua untuk tombol berisiko
- [ ] Tabel `payments` dan bayar pemasok terpisah dari persetujuan; status bayar dihitung (F03)

**Penutup minggu 1**

- [ ] Uji: pengguna masuk sesuai peran; beli → setuju → terima → bayar jalan; disetujui tidak otomatis dibayar
- [ ] Demo ke owner di lingkungan uji

### Minggu 2: produksi, stok, dan gudang dingin

**Produksi**

- [ ] Migrasi: `productions`, `lot_allocations`, `production_items`, `production_components`, `production_items_history`
- [ ] Mulai produksi dari satu atau beberapa lot lulus mutu; berat lot berkurang (F07)
- [ ] Grid loin per potong sesuai FRM-PRD-01 rev 01: no. ekor opsional, no. loin, grade, berat 3 desimal (F08)
- [ ] Grid: navigasi keyboard, tambah baris cepat, total otomatis per grade dan per ekor (F08)
- [ ] Draft otomatis di perangkat dan sinkron ulang saat jaringan kembali (F08)
- [ ] Riwayat koreksi per baris loin: siapa, kapan, sebelum/sesudah (F08)
- [ ] Timbang ikan utuh per ekor dan hasil per ekor dihitung dari loin bernomor ekor sama
- [ ] Form komponen hasil: hasil samping per jenis, limbah, susut tercatat (F09)
- [ ] View `v_neraca_produksi`: kg dan % per komponen, selisih belum jelas sebagai sisa hitungan (F09)
- [ ] Tolak bila total komponen melebihi ikan masuk (F09)
- [ ] Peringatan hasil di luar 40–80% dan pembanding rencana 60% dari pengaturan (F09)
- [ ] Pemeriksaan QC lalu Owner; "diperiksa" hanya setelah selisih dijelaskan atau diterima Owner (F10)
- [ ] Cetak/ekspor formulir produksi dengan susunan FRM-PRD-01 rev 01

**Stok**

- [ ] Migrasi: `storage_units`, `storage_movements`
- [ ] Hasil produksi masuk unit simpan per produk, grade, fresh/beku, lokasi (F11)
- [ ] Jalur fresh langsung kirim tanpa masuk gudang (F11)
- [ ] Keluar sebagian/penuh dengan berat tercatat dan timbang ulang (F11)
- [ ] Koreksi stok lewat persetujuan Owner

**Gudang dingin dan tarif**

- [ ] Titipan pelanggan masuk dan keluar; cek kapasitas 17.500 kg (F12)
- [ ] `tariff_rules` dengan angka proposal bertanda "belum dikonfirmasi" (F12)
- [ ] Mesin tarif: transit, pembulatan hari, minimum hari, dasar berat, ambil sebagian (F12)
- [ ] Invoice jasa dengan rincian hitungan di `service_charges` (F12)
- [ ] Uji kasus batas tarif: tepat 3 jam, 24 jam, 10 hari, ambil sebagian, berat masuk vs keluar

**Jadwal ABF**

- [ ] Booking produksi dan ABF per hari/jam; giliran mitra (F13)
- [ ] Deteksi bentrok dan pindah ke jam kosong pertama (F13)

**Penutup minggu 2 (titik periksa)**

- [ ] Uji 300+ baris loin saat jaringan putus, klik ganda simpan, dua petugas edit bersamaan
- [ ] Uji 500 loin berdesimal tiga: total grid, rekap, dan CSV identik
- [ ] Masukkan Siklus 1 dan pastikan neraca menampilkan 65,000 kg limbah dan 28,060 kg belum jelas
- [ ] Putuskan titik potong bila syarat keluar belum lulus; kabari owner hari itu juga
- [ ] Demo ke owner di lingkungan uji

### Minggu 3: penjualan, uang masuk, dan laporan

**Penjualan**

- [ ] Migrasi: `sales_orders`, `sale_allocations`, `invoices`
- [ ] Pesanan dari stok; tolak bila melebihi stok tersedia dikurangi pesanan draf lain (F14)
- [ ] Alokasi penjualan ke satu atau beberapa produksi/unit simpan (F14)
- [ ] Kirim: berat kirim dan berat diterima pembeli; stok berkurang (F14)
- [ ] Invoice dari berat yang dikirim/diterima, jatuh tempo bawaan 14 hari (F14)
- [ ] Pembayaran pembeli sebagian dan lunas dengan bukti transfer (F14)
- [ ] Status tagihan: belum jatuh tempo, jatuh tempo, terlambat, lunas; tombol pengingat

**Penelusuran**

- [ ] View `v_rincian_siklus` dan halaman Rincian Siklus/PO dengan semua nota (F15)
- [ ] View `v_ringkasan_harian`: transaksi, nilai beli, hasil produksi, kiriman, uang masuk (F15)
- [ ] Uji N:M: satu lot ke dua produksi, satu penjualan dari dua produksi, telusur dua arah

**Keuangan dan laporan**

- [ ] Ajukan biaya dengan kategori, nota wajib, rujukan PO/produksi/siklus (F16)
- [ ] Unggah nota dan bukti ke Storage privat di `documents` (F16)
- [ ] Kelengkapan dokumen: hitung transaksi tanpa bukti di dashboard
- [ ] Impor 243 transaksi Monitor Dana ke `ledger` (tanpa nomor rekening, tanpa bagian modal)
- [ ] Laporan biaya per siklus, tagihan, pembayaran, dengan klik sampai transaksi (F17)
- [ ] Laba rugi per siklus mengikuti contoh laporan Siklus 1 di docs/laporan: pendapatan per grade dan hasil samping, biaya langsung, laba kotor, angka per kg loin, neraca berat, tren antarsiklus (F17)
- [ ] Ekspor CSV yang sama dengan tampilan (F17)
- [ ] View `v_harga_beli` rata-rata tertimbang dan halaman tabel + grafik per periode, jenis, grade, pemasok (F18)

**Dashboard**

- [ ] View `v_dashboard` dan dashboard owner di HP: ringkasan dulu, rincian saat diketuk (F19)
- [ ] Beranda petugas: hanya menu sesuai izin, halaman lihat tanpa tombol ubah (F19)

**Penutup minggu 3**

- [ ] Uji alur beli sampai uang masuk penuh; satu siklus ditelusuri tanpa input ulang
- [ ] Demo ke owner di lingkungan uji

### Minggu 4: uji siklus nyata dan mulai pakai

**Absensi (ditunda)**

Absensi dan izin ditunda atas keputusan owner 22 Oktober 2026 dan dikerjakan setelah sistem inti dipakai. Waktunya dipakai untuk uji cadangan dan merapikan laporan.

**Asisten AI dan simulasi**

- [ ] Alat baca terbatas: piutang telat, saldo kas, hasil per ekor, jadwal bentrok, perlu persetujuan, isi gudang dingin, kelengkapan dokumen, biaya siklus (F22)
- [ ] Panggilan memakai token pengguna sehingga RLS berlaku; batas pertanyaan per hari; log di `ai_usage` (F22)
- [ ] Slider harga ikan dan dampak laba sesuai lembar asumsi (F23)

**Keamanan dan data**

- [ ] Pulihkan cadangan ke proyek terpisah dan cocokkan angka utama
- [ ] Tinjauan RLS dan bucket Storage
- [ ] Impor Siklus 1: 11 ekor, loin 300,94 kg per grade, hasil samping 87 kg per jenis, limbah 65 kg, biaya Rp37,07 juta

**Uji siklus nyata dan serah terima**

- [ ] Jalankan satu siklus produksi asli di sistem bersama petugas lapangan (owner)
- [ ] Cocokkan hasilnya dengan catatan kertas bersama owner
- [ ] Perbaiki temuan uji
- [ ] Pelatihan per peran: Owner, Finance, Super Admin, Kepala Produksi/QC, Petugas Lapangan
- [ ] Mulai pakai berdampingan dengan catatan lama
- [ ] Serah terima tertulis disetujui owner (owner)

## Keputusan owner dan data yang dibutuhkan

Owner menjawab pada 22 Oktober 2026. Yang masih terbuka: pemilik akun server dan biaya saat naik paket, nama orang untuk tiap peran, minimum hari tarif simpan, serta biaya bulanan dan pajak untuk laba bersih. Tiga hal tetap tidak ditebak: pajak, pemilik server, dan biaya bulanan.

| Keputusan | Jawaban owner (22 Okt) | Yang dipakai sistem |
| --- | --- | --- |
| Satu pembelian ke beberapa produksi, satu penjualan dari beberapa produksi | Pakai usulan developer | Banyak-ke-banyak |
| Nomor penanda siklus | Pakai usulan developer | Kode internal; no. PO pembeli dan no. bongkar tetap bisa dicari |
| Bongkar malam sebelum disetujui | Pakai usulan developer | Boleh dengan tanda; bayar tetap menunggu |
| Pemeriksa dan penyetuju | Pakai usulan developer | Finance memeriksa, Owner menyetujui; hasil produksi: Petugas Lapangan, Kepala Produksi/QC, Owner |
| Arti verifikasi dua tahap | Diperiksa dua orang | Pemeriksa + penyetuju, bukan OTP |
| Angka di belakang koma timbangan | 2 angka | Simpan 3, tampil 2 |
| Nomor ekor pada loin | Pakai usulan developer | Opsional |
| Rencana hasil 60%, batas wajar 40–80% | Pakai usulan developer | Sama untuk semua ikan |
| Limbah dan susut | Ditimbang total saja | Satu angka limbah dan satu angka susut per produksi |
| Tarif cold storage dan ABF | Rp76/kg/hari, ABF tetap | Simpan Rp76/kg/hari, ABF Rp3.500/kg, minimum 10 hari dari proposal (belum dikonfirmasi) |
| Laporan laba rugi | Data historis dan statistik; contoh dibuat developer | Contoh laporan Siklus 1 di docs/laporan |
| Pengguna sistem | Super Admin, Finance, Owner | Ditambah Kepala Produksi/QC dan Petugas Lapangan (usulan); nama orang belum ada |
| Absensi | Ditunda | Tidak masuk versi 1 |
| Server dan biaya bulanan | Belum dibahas; tanyakan owner dan investor | Mulai paket gratis; pemilik akun menunggu |

**Bahan yang perlu dikirim owner**

- [ ] Keputusan pemilik akun server dan siapa yang membayar saat naik paket (owner dan investor)
- [ ] Nama orang untuk Super Admin, Finance, Kepala Produksi/QC, dan Petugas Lapangan
- [ ] Catatan timbang susut Siklus 1, untuk menjelaskan 28,06 kg yang belum jelas
- [ ] Foto formulir produksi dan pembelian yang sudah terisi
- [ ] Dokumen satu siklus: nota beli, catatan timbang, hasil produksi, surat jalan, tagihan, bukti bayar
- [ ] Daftar produk, grade, hasil samping, dan jenis limbah
- [ ] Merek timbangan dan foto layarnya saat menimbang
- [ ] Biaya operasional bulanan (gaji tetap, listrik, sewa) dan aturan pajak, untuk menghitung laba bersih

## Risiko

Risiko terbesar adalah jadwal: semua catatan owner diperkirakan 11 minggu untuk 2 developer, sementara kesepakatannya 4 minggu.

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Jadwal 4 minggu terlalu padat | Kualitas turun atau serah terima mundur | Kedalaman versi pertama; tambah 1 developer di minggu 2–4; titik periksa akhir minggu 2 |
| Jawaban wajib terlambat | Skema berubah di tengah jalan | Nilai bawaan di pengaturan; batas jawaban hari ke-2 minggu 1 |
| Formulir lapangan beda dengan FRM-PRD-01 rev 01 | Grid loin dirombak | Uji grid dengan petugas lapangan sebelum minggu 2 selesai |
| Limbah dan susut tidak pernah ditimbang | Selisih belum jelas selalu besar (Siklus 1: 19,3%) | Tampilkan apa adanya; produksi tidak bisa "diperiksa" tanpa penjelasan atau persetujuan Owner |
| Sinyal lemah di lantai produksi dan ruang dingin | Input hilang | Draft di perangkat, sinkron ulang, indikator status simpan |
| Format laporan finance tidak datang | Laba rugi tertunda | Laporan transaksi dan biaya tetap jalan; laba rugi berlabel sementara |
| GPS tidak akurat di dalam gedung | Absen gagal terus | Catat akurasi, toleransi bisa diatur, alasan gagal jelas, jalur pengajuan manual |
| Permintaan "sekalian" dari pertemuan berikutnya | Cakupan melebar | Dicatat sebagai permintaan perubahan |

**Titik potong.** Bila di akhir minggu 2 grid loin, neraca, dan stok belum lulus, yang digeser lebih dulu (dengan persetujuan owner): Asisten AI dan simulasi, jadwal ABF, grafik harga beli, laba rugi format finance, absensi, lalu setuju massal dan ambil sebagian. Yang tidak pernah digeser: input per loin, neraca dengan selisih terlihat, relasi transaksi, pemisahan setuju dan bayar, bukti transaksi, peran dan RLS, riwayat koreksi, cadangan, dan uji satu siklus nyata.
