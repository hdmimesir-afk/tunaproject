# Panduan singkat per peran

Untuk pelatihan sebelum mulai pakai. Tiap peran hanya melihat menu yang sesuai izinnya. Tombol yang berisiko (setuju, tolak, bayar, kirim, selesai) selalu meminta konfirmasi kedua.

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
- **Biaya:** catat biaya, lampirkan nota, ajukan ke Owner. Biaya yang disetujui masuk buku kas otomatis.
- **Laporan:** laba rugi per siklus, tren, harga beli. Ketuk baris untuk melihat transaksinya; Unduh CSV memakai angka yang sama dengan layar.

## Super Admin

- **Akun dan izin:** menu Akses. Owner hanya bisa diberikan oleh Owner.
- **Master dan tarif:** menu Pengaturan; tarif gudang dingin di Gudang Dingin → Tarif.
- **Pesanan jual:** Penjualan → Buat pesanan dari stok. Pesanan tidak bisa melebihi stok tersedia.

## Owner

- **Dashboard:** angka yang butuh keputusan ada di bagian paling atas; ketuk untuk membuka rinciannya.
- **Setujui:** PO (Persetujuan, bisa banyak sekaligus dengan konfirmasi total), biaya (Keuangan), koreksi stok (Stok), produksi (Produksi).
- **Asisten AI:** menjawab dari data sesuai izin Anda. Hanya membaca; tidak bisa mengubah apa pun.
- **Tutup buku:** Keuangan → Tutup buku per bulan. Tutup berurutan dari bulan tertua setelah bulannya berakhir. Bulan yang ditutup terkunci: pembayaran, biaya, dan catatan kas bertanggal di bulan itu tidak bisa ditambah atau diubah. Buka kembali hanya oleh Owner dengan alasan tercatat.
