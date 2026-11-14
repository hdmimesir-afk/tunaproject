# Data contoh untuk presentasi

Dua skrip SQL yang dijalankan sendiri di **Supabase Dashboard > SQL Editor** (bukan migrasi, tidak ikut `supabase db push`).

| Berkas | Fungsi |
|---|---|
| `seed-demo.sql` | Membuat data contoh: 2 siklus, 5 PO, produksi, stok, titipan gudang dingin, penjualan, invoice, biaya, dan buku kas. |
| `hapus-demo.sql` | Menghapus data contoh. Data yang diisi tim tidak pernah dihapus. Ada mode coba (cuma nampilin rencana) dan mode hapus. |
| `samakan-nama-demo.sql` | Setelah nama pemasok/pembeli "(Demo)" diganti di Pengaturan, nyamain nama lama yang masih kesimpen di pesanan, invoice, stok titipan, dan tagihan jasa. |
| `rincian-nyangkut.sql` | Cuma membaca. Nampilin data tim yang dibangun di atas data contoh (produksi, lot, stok, penjualan) beserta siapa yang input. |

Semuanya atomik: bila ada galat, tidak ada yang tersimpan.

## Menghapus data contoh
1. Tempel `hapus-demo.sql` di SQL Editor > Run. Mode awalnya **coba**: tidak ada yang berubah, cuma tampil rencananya.
2. Cek rencananya: **Dihapus** (data contoh), **Dipertahankan** (data contoh yang wajib ada karena dipakai data tim, misalnya PO dari lot yang diterima tim), dan **Dilepas** (sambungan data tim ke proyek atau produksi contoh yang dihapus).
3. Kalau udah benar, ganti `'coba'` jadi `'hapus'` di baris `set_config` > Run lagi.

Data contoh dikenali dari waktu pembuatannya: `seed-demo.sql` membuat semuanya dalam satu transaksi (sama dengan `dibuat_pada` siklus `[DEMO]`; timbangan contoh sengaja dimundurkan).
Baris yang dibuat lebih dari 1 menit setelahnya dianggap data tim dan tidak pernah dihapus. Grade lot hasil migrasi (tanpa pengisi) bukan data tim.

## Prasyarat
- Ada minimal satu akun **Owner aktif** (skrip bertindak sebagai Owner itu).
- Data acuan bawaan masih ada: grade `A-SO`, `B-SO`, `C-SO` dan produk `Loin tuna`.

## Yang terjadi di aplikasi
- Semua alur memakai fungsi asli (`ajukan_po`, `setujui_persetujuan`, `terima_po`, `mulai_produksi`, `kirim_pesanan`, `terima_pembayaran`, ...),
  jadi persetujuan, stok, buku kas, dan jejak perubahan terisi seperti pemakaian sungguhan.
- Tanggal digeser relatif terhadap hari menjalankan skrip (18 hari terakhir).
- Ada contoh yang sengaja menunggu tindakan Owner: 1 PO menunggu persetujuan, 1 biaya menunggu, 1 koreksi stok, 1 lot menunggu cek mutu,
  1 pesanan draf, 1 produksi berjalan, dan 1 piutang terlambat.
- Data contoh bercampur dengan data asli di laporan dan dashboard selama masih ada. Hapus sebelum dipakai untuk pembukuan sungguhan.
- Nota dan bukti transfer contoh hanya baris dokumen; berkasnya tidak ada di penyimpanan sehingga tidak bisa dibuka.
- Jejak perubahan (`activity_log`) tidak ikut terhapus karena sengaja tidak bisa diubah.

## Penanda
Pemasok dan pembeli berakhiran `(Demo)`, catatan siklus diawali `[DEMO]`, uraian biaya dan label jadwal berakhiran `(Demo)`, dokumen berawalan `demo/`.
