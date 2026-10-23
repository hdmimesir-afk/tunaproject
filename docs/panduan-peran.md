# Panduan singkat per peran

Untuk pelatihan sebelum mulai pakai. Tiap peran hanya melihat menu yang sesuai izinnya. Tombol yang berisiko (setuju, tolak, bayar, kirim, selesai) selalu meminta konfirmasi kedua.

## Semua peran

- **Masuk pertama kali:** buka tautan aktivasi yang dikirim lewat WhatsApp (sekali pakai, berlaku 24 jam), buat kata sandi sendiri, lalu masuk. Owner dan Finance juga mendaftarkan aplikasi autentikator (kode 6 angka). Lupa sandi atau tautan kedaluwarsa: minta **Tautan atur sandi** ke Super Admin.
- **Absen:** menu Absensi → Absen masuk / Absen pulang. Izinkan kamera dan lokasi bila browser bertanya. Harus berada di dalam radius lokasi kerja; foto diambil langsung, bukan dari galeri; jam dicatat server. Bila ditolak, alasannya tampil (misalnya "di luar radius" atau "GPS kurang akurat": pindah ke tempat terbuka lalu coba lagi).
- **Izin, sakit, libur:** Absensi → Izin dan sakit → Ajukan. Owner yang memutuskan; pengajuan yang belum diputuskan bisa dibatalkan sendiri.

## Petugas Lapangan (HP)

- **Terima ikan:** Mutu dan Penerimaan → pilih PO → isi berat timbang → Catat penerimaan. Ikan datang malam sebelum PO disetujui: centang bongkar malam.
- **Timbang loin:** Produksi → Mulai produksi dari lot yang lulus mutu → isi grid. Ketik berat lalu **Enter** untuk baris berikutnya. Nomor loin dan grade terisi otomatis dari baris sebelumnya.
- **Sinyal putus:** teruskan mengetik. Indikator di atas grid menunjukkan "belum disimpan"; isian aman di HP dan terkirim sendiri saat sinyal kembali. Jangan hapus data browser sebelum muncul "Semua tersimpan di server".
- **Komponen hasil:** isi hasil samping, limbah, dan susut (total). Kosong berarti belum ditimbang, bukan nol.
- **Kirim:** Penjualan → buka pesanan → isi berat kirim hasil timbang → Kirim.
- **Titipan:** Gudang Dingin → Terima titipan; keluarnya lewat menu Stok → Ambil.

## Kepala Produksi / QC

- **Cek mutu:** Mutu dan Penerimaan → Cek mutu: lulus (pilih kelas) atau tahan.
- **Periksa produksi:** setelah petugas menekan Selesaikan, buka produksinya dan tandai sudah diperiksa. Bila ada selisih belum jelas, tulis penjelasannya. Orang yang menimbang tidak boleh memeriksa produksi yang sama.
- **Minta perbaikan:** bila timbangan meragukan, kembalikan ke petugas dengan alasan.

## Finance

- **Pembelian:** periksa PO yang diajukan (Persetujuan), bayar PO yang sudah disetujui Owner. Disetujui bukan berarti dibayar.
- **Penjualan:** terbitkan invoice setelah pesanan terkirim; catat berat diterima pembeli sebelum invoice terbit. Catat pembayaran masuk dan lampirkan bukti transfer.
- **Biaya:** catat biaya, pilih PO atau produksi terkait bila ada (siklusnya ikut otomatis), lampirkan nota, ajukan ke Owner. Biaya yang disetujui masuk buku kas otomatis.
- **Laporan:** laba rugi per siklus, tren, harga beli. Ketuk baris untuk melihat transaksinya; Unduh CSV memakai angka yang sama dengan layar.

## Super Admin

- **Akun dan izin:** menu Akses → Buat akun pengguna (nama, email sebagai nama masuk, jabatan) → kirim tautan aktivasi yang muncul lewat tombol WhatsApp. Lupa sandi: tombol **Tautan atur sandi** di baris pengguna. Orang yang keluar: ubah status ke Nonaktif. Akun Owner hanya bisa dibuat dan diatur oleh Owner.
- **Lokasi kerja absensi:** Absensi → Lokasi kerja. Berdiri di tengah tempat kerja lalu tekan **Pakai lokasi saya sekarang**. Radius, batas akurasi GPS, jam masuk, dan toleransi terlambat bisa diubah di sini.
- **Rekap kehadiran:** Absensi → Rekap kehadiran per bulan, dan daftar absen per tanggal beserta fotonya.
- **Master dan tarif:** menu Pengaturan; tarif gudang dingin di Gudang Dingin → Tarif.
- **Pesanan jual:** Penjualan → Buat pesanan dari stok. Pesanan tidak bisa melebihi stok tersedia.

## Owner

- **Dashboard (cukup pantau ini):** bagian paling atas "Perlu tindakan Anda" menampilkan transaksi yang menunggu satu per satu: PO yang perlu disetujui, biaya, koreksi stok, produksi, tagihan terlambat, dan buku yang siap ditutup. Yang mendesak (merah) di depan. Ketuk satu baris atau tombolnya (Setujui, Putuskan, Tagih, ...) dan Anda langsung dibawa ke halaman urusan itu. Peran lain hanya melihat hal yang bisa mereka tindak sendiri.
- **Setujui:** PO (Persetujuan, bisa banyak sekaligus dengan konfirmasi total), biaya (Keuangan), koreksi stok (Stok), produksi (Produksi).
- **Asisten AI:** menjawab dari data sesuai izin Anda. Hanya membaca; tidak bisa mengubah apa pun.
- **Tutup buku:** Keuangan → Tutup buku per bulan. Tutup berurutan dari bulan tertua setelah bulannya berakhir. Bulan yang ditutup terkunci: pembayaran, biaya, dan catatan kas bertanggal di bulan itu tidak bisa ditambah atau diubah. Buka kembali hanya oleh Owner dengan alasan tercatat.
- **Tutup siklus:** Rincian Siklus → buka siklus → Tutup siklus. Hanya bisa bila PO sudah lunas, produksi disetujui, pesanan terkirim, tagihan lunas, dan biaya sudah diputuskan; siklus yang lunas muncul di dashboard. Setelah ditutup, siklus itu tidak bisa dipakai untuk transaksi baru sampai dibuka kembali dengan alasan.
- **Izin karyawan:** pengajuan izin, sakit, dan libur muncul di dashboard; putuskan di Absensi → Izin dan sakit.
