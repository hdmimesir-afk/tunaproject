# Implementation Notes

> **Pembaruan 14 Okt 2026 (arah deck):** deck adalah **penawaran mandiri dari kita**, bukan lanjutan sistem yang sudah dibuat tim Katalis. Fitur dikembangkan agar menutup masalah operasional yang terlihat dari (a) proposal Katalis 1 Okt 2026 dan (b) data nyata **Siklus 1 (3 Okt 2026)** yang dibagikan owner lewat ringkasan web (kargo 29,9% dari biaya, 65 kg hasil samping dibuang, hasil olahan per ekor 52,2%–70,2%, enam kelas mutu, biaya di luar siklus belum termasuk). Pemetaan masalah ke fitur ada di slide 5; contoh data nyata di slide 11. Konten pendanaan/investor tetap dikeluarkan. Rujukan nomor slide dan modul pada dokumen ini mengikuti deck terbaru (11 fitur); jika ada selisih, `source-mapping.md` (otomatis) yang benar. Harga/scope paket belum diubah dan perlu ditinjau karena fitur bertambah dalam (hasil samping, biaya kirim, hasil per ekor/ukuran).


## Implementasi saat ini

Viewer localhost memakai 28 slide dari data/slides/redesigned.ts melalui data/slides/index.ts. Seluruh layout dan copy disusun ulang untuk pembaca awam, dengan fokus pada fitur, cara kerja, dan risiko pekerjaan yang bisa dibantu.

Kanvas scene graph tetap 1920 × 1080. components/SlideCanvas.tsx merender slide; components/Deck.tsx menangani navigasi, hash, ringkasan, layar penuh, dan skala viewport. Plus Jakarta Sans memakai semibold (600) untuk judul, heading fitur, header tabel, dan angka utama; regular (400) untuk penjelasan dan catatan. Renderer juga mendukung penekanan bold (700) per frasa. Warna tetap sama.

## Batas bukti dan perhitungan

Fitur selalu diposisikan sebagai usulan. Kondisi kerja tim belum diperiksa langsung. Contoh status, jadwal peringatan, dokumen, dan izin bukan transaksi nyata. Harga serta jadwal adalah estimasi vendor yang tidak mengikat; tidak ada ROI atau keuntungan yang dijanjikan.

Slide 11: 3.000 kg × asumsi hasil 50% = 1.500 kg loin. Slide 14: 8.000 kg, disimpan 5 hari, minimum tagihan 10 hari × Rp75/kg/hari = Rp6.000.000. ABF terpisah Rp3.500/kg yang dibekukan. Rincian sumber dan ketentuan komersial ada di docs/scope-assumptions.md.

Sebelas kelompok fitur tetap terwakili. Simulasi/perkiraan ada pada Enterprise; gudang dingin, pembekuan, dan perencanaan ada pada Professional. Konten pendanaan, investor, modal, dan bagi hasil tetap dikeluarkan.

## Sistem visual

Margin horizontal 100 px. Judul umum 64 px; pembuka/penutup 84–88 px; isi umumnya 30–38 px dan footer 20–22 px. Layout memakai perbandingan terbuka, alur, ledger, kalender, dan penjelasan hitungan. Bidang tonal memisahkan catatan atau hasil; panah menunjukkan penerusan informasi.

Slide memakai bidang datar. Viewer memberi bayangan di luar kanvas. Tidak ada foto fasilitas, mockup aplikasi mini, atau gambar cover lama pada sumber slide aktif. DESIGN.md dan sidecar .impeccable/design.json mencatat token serta pola yang digunakan.

## Status peninjauan dan keluaran

Peninjauan redesign menetapkan SHIP untuk seluruh 28 slide. Pembaruan dokumentasi ini menyelaraskan rujukan dengan sumber slide aktif; tidak menjalankan build, tes, atau ekspor tambahan.

Pengiriman hanya localhost. File PPTX/PDF lama tidak dibuat ulang dan hasil QA ekspor sebelumnya tidak membuktikan keluaran redesign. Rute /print tetap tersedia, tetapi tidak ada klaim PDF baru telah dibuat.

## Keterbatasan

Tidak ada aplikasi ERP operasional di dalam deck. Slide 19 menjelaskan usulan simulator, bukan kalkulator interaktif. Detail akses, aturan akuntansi/pajak, kapasitas fasilitas, hardware, migrasi data, dan harga akhir perlu disepakati saat discovery.


## Pembaruan tampilan (monokrom, Dar Dev)
- Penawaran ini atas nama **Dar Dev** (nama teks; belum ada logo). Kontak presenter tidak dicantumkan di slide.
- **Warna monokrom:** teks `#161616`, permukaan `#FAFAFA / #F4F4F4 / #ECECEC / #E4E4E4`, garis `#D0D0D0`, aksen abu `#3A3A3A / #707070`. Warna apa pun yang tersisa otomatis dikonversi ke abu oleh `mono()` di `data/slides/index.ts`; status dibedakan lewat tingkat abu dan teks. Bagian "Warna" pada sistem desain di atas sudah tidak berlaku.
- Cover dan penutup kini hanya garis kontur gelombang abu pada latar hitam (siluet ikan dihapus).

## Data dari Monitor Dana Fasilitas Bungus dan logo

- Contoh data di mockup (kelengkapan nota 243 dari 243, bukti transfer 164 dari 219, rekap pengeluaran per bulan, kategori biaya, daftar aset, beberapa transaksi seperti Locker VIP VG-420 dan Rak Italiano) diambil dari workbook "Monitor Dana Fasilitas Bungus" (salinan di `docs/source/monitor-dana-bungus.xlsx`). Bagian modal, investor, dan bagi hasil di workbook sengaja tidak dipakai.
- Nomor rekening dan referensi transfer tidak ditampilkan di mockup.
- Logo PT Katalis Lintas Global dari `Katalis Lintas Global Logo.png` (putih, transparan). Varian putih, hijau, dan hitam dibuat di `public/brand/`. Dipakai di cover, penutup, footer slide terang, sidebar dashboard, dan aplikasi demo (ikon aplikasi memakai simbol globenya).
