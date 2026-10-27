# Data contoh untuk presentasi

Dua skrip SQL yang dijalankan sendiri di **Supabase Dashboard > SQL Editor** (bukan migrasi, tidak ikut `supabase db push`).

| Berkas | Fungsi |
|---|---|
| `seed-demo.sql` | Membuat data contoh: 2 siklus, 5 PO, produksi, stok, titipan gudang dingin, penjualan, invoice, biaya, dan buku kas. |
| `hapus-demo.sql` | Menghapus semua data contoh, dan hanya itu. Data asli tidak tersentuh. |

Keduanya atomik: bila ada galat, tidak ada yang tersimpan.

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
