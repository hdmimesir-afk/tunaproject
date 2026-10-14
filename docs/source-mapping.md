# Source-to-Slide Evidence Mapping

Dihasilkan otomatis oleh `npm run docs` dari metadata `sources` pada setiap slide (`data/slides/*.ts`).

**Dokumen sumber:** *Proposal Pendanaan dan Proyeksi Laba Usaha Perikanan Bungus*, PT Katalis Lintas Global, revisi per 1 Oktober 2026, 18 halaman (`docs/source/proposal-pendanaan-bungus-2026-10-01.pdf`; teks hasil ekstraksi di `docs/source/proposal-text-extract.txt`). Rujukan halaman memakai penomoran halaman pada proposal itu sendiri.

## Klasifikasi bukti

- **source** — SUMBER — fakta/angka dari proposal
- **derived** — TURUNAN — dihitung dari angka sumber
- **assumption** — ASUMSI — asumsi proposal atau asumsi proyek ERP
- **proposed** — USULAN — fitur/isi ERP yang diusulkan (bukan kondisi saat ini)
- **commercial** — KOMERSIAL — estimasi harga/jadwal vendor (indikatif)
- **illustrative** — ILUSTRATIF — data contoh pada mockup

## Rekonsiliasi angka kunci

| Angka | Nilai pada proposal | Halaman |
|---|---|---|
| Laba simulasi bulanan pesimis / moderat / optimis (slide 19, simulasi) | Rp275.005.556 / Rp475.675.000 / Rp734.532.223 | 1, 10 |
| Fresh natural: HPP / jual / margin | Rp120.000 / Rp140.000 / Rp20.000 per kg | 6 |
| Fresh CO: HPP / jual / margin | Rp90.000 / Rp115.000 / Rp25.000 per kg | 6 |
| CO frozen: HPP maks. / jual | Rp70.000 / Rp83.000–Rp86.000 per kg | 5 |
| CV DUS: beli / nilai bahan | Rp45.000 / Rp50.000 per kg | 9 |
| Cold storage / ABF | Rp75/kg/hari (min. 10 hari) / Rp3.500/kg | 8 |
| Kapasitas nominal hari penuh / Sabtu | 3.000 kg / 1.333 kg (asumsi) | 4 |
| Pool kas pembelian ikan / setelah komitmen Katalis | Rp1.367.500.000 / Rp1.867.500.000 | 16 |
| Kebutuhan kas 7 / 14 / 21 hari | Rp911.145.833 / Rp1.572.791.667 / Rp2.234.437.500 | 17 |

Nilai turunan yang dihitung deck (bukan angka proposal): total jam operasi mitra 49 jam/minggu (27 + 22); margin natural 14,29% dan CO 21,74% (sama dengan proposal hlm. 6); skenario invoice cold storage/ABF pada slide 14 (Rp35.200.000 total, lihat `scope-assumptions.md`).

## Pemetaan per slide

### Slide 01 — Cover — KATALIS ERP

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| source | Proposal hlm. 1 | Klien: PT Katalis Lintas Global; usaha perikanan; dokumen 1 Oktober 2026 |
| illustrative | Demo interaktif | Tangkapan layar diambil dari demo /demo dan /demo/desktop; semua angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Pembuka. Penawaran awal untuk dibahas bersama; harga dibahas setelah fitur disepakati.

### Slide 02 — Masalah dan jawabannya

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| source | Data Siklus 1 dari owner (ringkasan web) | Ikan utuh 481 kg (11 ekor); hasil olahan 62,6% (rencana 60%); biaya total Rp37,08 jt; ongkos kirim Rp11,08 jt (29,9%); sisa olahan 65 kg; hasil olahan per ekor 63,1; 61,3; 61,4; 63,7; 52,2; 64,4; 70,2; 63,5; 63,3; 63,3; 60,2 |

*Catatan presenter:* Enam masalah yang terlihat dari data Siklus 1 dan Monitor Dana, masing-masing dengan jawabannya di aplikasi. Slide berikutnya menjelaskan satu per satu.

### Slide 03 — Hampir sepertiga uang keluar habis buat ongkos kirim

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| source | Data Siklus 1 dari owner (ringkasan web) | Ikan utuh 481 kg (11 ekor); hasil olahan 62,6% (rencana 60%); biaya total Rp37,08 jt; ongkos kirim Rp11,08 jt (29,9%); sisa olahan 65 kg; hasil olahan per ekor 63,1; 61,3; 61,4; 63,7; 52,2; 64,4; 70,2; 63,5; 63,3; 63,3; 60,2 |
| illustrative | Demo interaktif | Layar adalah tangkapan dari /demo/desktop; angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Ongkos kirim Rp11,08 juta dari total biaya Siklus 1 Rp37,08 juta (29,9%). Bila tarif turun ke Rp29.500 per kg dari Rp31.000, hemat sekitar Rp1.840 per kg loin.

### Slide 04 — Dari 100 kg ikan, loin yang jadi bisa 52 kg atau 70 kg

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| source | Data Siklus 1 dari owner (ringkasan web) | Ikan utuh 481 kg (11 ekor); hasil olahan 62,6% (rencana 60%); biaya total Rp37,08 jt; ongkos kirim Rp11,08 jt (29,9%); sisa olahan 65 kg; hasil olahan per ekor 63,1; 61,3; 61,4; 63,7; 52,2; 64,4; 70,2; 63,5; 63,3; 63,3; 60,2 |
| illustrative | Demo interaktif | Layar adalah tangkapan dari /demo/desktop; angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Hasil olahan 11 ekor Siklus 1: terendah ekor 005 (52,2%), tertinggi ekor 007 (70,2%), rata-rata 62,6%, rencana 60%.

### Slide 05 — 65 kg sisa potongan ikan belum laku

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| source | Data Siklus 1 dari owner (ringkasan web) | Ikan utuh 481 kg (11 ekor); hasil olahan 62,6% (rencana 60%); biaya total Rp37,08 jt; ongkos kirim Rp11,08 jt (29,9%); sisa olahan 65 kg; hasil olahan per ekor 63,1; 61,3; 61,4; 63,7; 52,2; 64,4; 70,2; 63,5; 63,3; 63,3; 60,2 |
| illustrative | Demo interaktif | Layar adalah tangkapan dari /demo/desktop; angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Sisa olahan 65 kg dari Siklus 1 belum terjual. Enam kelas mutu dengan harga berbeda.

### Slide 06 — Tagihan gudang dingin dihitung pakai tangan, gampang salah

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| source | Proposal hlm. 8 | Tarif: sampai 24 jam Rp75/kg; sampai 10 hari minimum Rp750/kg; hari ke-11 Rp825/kg; 30 hari Rp2.250/kg |
| illustrative | Contoh hitungan | 10.000 kg × 15 hari = Rp11.250.000 adalah contoh, bukan tagihan nyata |
| illustrative | Demo interaktif | Layar adalah tangkapan dari /demo/desktop; angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Tarif dari proposal hlm. 8. Contoh: 10.000 kg disimpan 15 hari, tarif Rp1.125/kg, total Rp11.250.000 (contoh hitungan).

### Slide 07 — Dua mitra bergantian pakai mesin, jadwal bisa saling tabrak

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| source | Proposal hlm. 4 | Senin CV DUS, Selasa PT SNS, Rabu CV DUS, Kamis PT SNS, Jumat CV DUS, Sabtu PT SNS; 08.00–17.00, Sabtu 08.00–12.00 |
| illustrative | Contoh peringatan | Pesanan ABF jam 10.00 hari Senin adalah contoh |
| illustrative | Demo interaktif | Layar adalah tangkapan dari /demo/desktop; angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Giliran CV DUS (Senin, Rabu, Jumat) dan PT SNS (Selasa, Kamis, Sabtu) dari proposal hlm. 4. Pesanan ABF jam 10.00 adalah contoh peringatan.

### Slide 08 — 55 transaksi belum punya bukti transfer

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| source | Monitor Dana Fasilitas Bungus (JURNAL, CEK DATA) | 243 transaksi; nota lengkap 243; bukti transfer lengkap 164 dari 219 (55 belum ada, 24 tidak perlu) |
| illustrative | Demo interaktif | Layar adalah tangkapan dari /demo/desktop; angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Dari Monitor Dana Fasilitas Bungus: 243 transaksi, nota lengkap 243, bukti transfer lengkap 164 dari 219 (55 belum ada, 24 tidak perlu).

### Slide 09 — Dashboard Owner

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| proposed | Brief — dashboard owner | Dashboard sebagai pusat kendali; akses per peran |
| illustrative | Demo interaktif | Tangkapan layar diambil dari demo /demo dan /demo/desktop; semua angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Dashboard Owner: angka utama, persetujuan, dan peringatan dalam satu layar. Gambar adalah tangkapan layar demo (data contoh).

### Slide 10 — Aplikasi ponsel

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| proposed | Permintaan penyaji — demo ponsel | Tampilan ponsel untuk beranda, persetujuan, dan modul |
| illustrative | Demo interaktif | Tangkapan layar diambil dari demo /demo dan /demo/desktop; semua angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Aplikasi ponsel: beranda, persetujuan, dan modul. Gambar adalah tangkapan layar demo (data contoh).

### Slide 11 — Peran dan cara kerja

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| proposed | Demo interaktif (lib/demo/store.ts, PERMS) | Empat peran dengan izin berbeda: Owner menyetujui dan membuka kembali buku; Pembelian mengajukan beli dan menjual; Gudang menerima, cek mutu, produksi, titipan, koreksi stok; Keuangan membayar, mencatat pembayaran, ajukan biaya, tutup buku |
| assumption | Akses | Pembagian peran adalah usulan awal; peran dan izin disesuaikan saat diskusi kebutuhan |

*Catatan presenter:* Empat peran (Owner, Pembelian, Gudang, Keuangan) dan tugas masing-masing. Satu siklus: Pembelian mengajukan, Owner menyetujui, Gudang menerima, mengecek mutu, dan mengolah, Pembelian menjual dan mengirim, Keuangan mencatat pembayaran dan menutup buku. Tombol di luar tugas sebuah peran otomatis terkunci.

### Slide 12 — Asisten AI

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| assumption | Asisten AI | Asisten AI menjawab dari data di aplikasi; di demo jawabannya disusun dari data contoh dan data Siklus 1; cakupan versi sebenarnya dibahas saat diskusi kebutuhan |
| source | Data Siklus 1 dari owner (ringkasan web) | Ikan utuh 481 kg (11 ekor); hasil olahan 62,6% (rencana 60%); biaya total Rp37,08 jt; ongkos kirim Rp11,08 jt (29,9%); sisa olahan 65 kg; hasil olahan per ekor 63,1; 61,3; 61,4; 63,7; 52,2; 64,4; 70,2; 63,5; 63,3; 63,3; 60,2 |
| illustrative | Demo interaktif | Layar adalah tangkapan dari /demo/desktop; angka contoh kecuali yang berlabel Siklus 1 |

*Catatan presenter:* Asisten AI menjawab pertanyaan dengan kalimat biasa, berdasarkan data di aplikasi. Di demo, jawaban disusun dari data contoh; versi sebenarnya membaca data asli usaha.

### Slide 13 — Paket

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| proposed | Keputusan penyaji | Penawaran satu paket (Paket Lengkap) dengan semua fitur dan Asisten AI; tidak ada paket lebih rendah |
| assumption | Brief — Pricing rules | Harga perkiraan awal, tidak mengikat, dibahas setelah fitur disepakati |
| assumption | Asisten AI | Asisten AI menjawab pertanyaan dari data di aplikasi; belum ada di demo, cakupan dibahas saat diskusi kebutuhan |

*Catatan presenter:* Satu paket lengkap: semua fitur sudah termasuk, ditambah Asisten AI. Tidak ada harga; harga dibahas setelah fitur disepakati.

### Slide 14 — Jadwal pengerjaan

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| commercial | Keputusan penyaji | Estimasi penyelesaian 1 bulan (4 minggu) dengan tahap dikerjakan bersamaan; menggantikan perkiraan awal proposal 18–26 minggu; bukan janji tenggat tanpa syarat |

*Catatan presenter:* Estimasi selesai dalam 1 bulan (4 minggu): enam tahap dikerjakan bersamaan, dipetakan per minggu (Asisten AI di minggu 3–4), lalu lima langkah sebelum proyek berjalan. Estimasi awal; jadwal pasti disepakati setelah diskusi kebutuhan.

### Slide 15 — Penutup

| Jenis | Rujukan | Klaim yang didukung |
|---|---|---|
| proposed | Brief — Slide 28 | Pesan penutup dan ajakan |

*Catatan presenter:* Tutup dengan ajakan konkret: jadwalkan diskusi kebutuhan.
