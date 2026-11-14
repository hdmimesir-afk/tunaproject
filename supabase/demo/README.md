# Data contoh untuk presentasi

Dua skrip SQL yang dijalankan sendiri di **Supabase Dashboard > SQL Editor** (bukan migrasi, tidak ikut `supabase db push`).

| Berkas | Fungsi |
|---|---|
| `seed-demo.sql` | Membuat data contoh: 2 siklus, 5 PO, produksi, stok, titipan gudang dingin, penjualan, invoice, biaya, dan buku kas. |
| `cek-demo.sql` | Cuma membaca. Nampilin jumlah data contoh yang bakal dihapus, dan data asli yang nyangkut ke data contoh. |
| `hapus-demo.sql` | Menghapus semua data contoh, dan hanya itu. Kalau ada data asli yang nyangkut, skrip batal dan tidak menghapus apa pun. |

Semuanya atomik: bila ada galat, tidak ada yang tersimpan.

## Menghapus data contoh
1. Jalankan `cek-demo.sql`. Kalau ada baris **DATA ASLI NYANGKUT** (misalnya produksi asli memakai lot contoh, atau PO asli dimasukkan ke proyek contoh), jangan lanjut: data itu perlu dipindah dulu.
2. Kalau tidak ada, jalankan `hapus-demo.sql`. Tabel hasil di akhir harus semuanya 0.

Data contoh dikenali dari waktu pembuatannya: `seed-demo.sql` membuat semuanya dalam satu transaksi (sama dengan `dibuat_pada` siklus `[DEMO]`; timbangan contoh sengaja dimundurkan).
Baris yang dibuat lebih dari 1 menit setelahnya dianggap data asli dan tidak pernah dihapus.

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
