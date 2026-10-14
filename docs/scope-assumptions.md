# Scope, Pricing & Assumptions

> **Catatan 14 Okt 2026:** deck penawaran **tidak mencantumkan harga, termin pembayaran, garansi, atau persentase pemeliharaan** (fokus ke fitur dulu). Angka di dokumen ini hanya untuk internal Dar Dev dan belum final. Paket di deck bernama Dasar, Lengkap, dan Penuh (sebelumnya Essential, Professional, Enterprise).

> **Pembaruan 14 Okt 2026 (arah deck):** deck adalah **penawaran mandiri dari kita**, bukan lanjutan sistem yang sudah dibuat tim Katalis. Fitur dikembangkan agar menutup masalah operasional yang terlihat dari (a) proposal Katalis 1 Okt 2026 dan (b) data nyata **Siklus 1 (3 Okt 2026)** yang dibagikan owner lewat ringkasan web (kargo 29,9% dari biaya, 65 kg hasil samping dibuang, hasil olahan per ekor 52,2%–70,2%, enam kelas mutu, biaya di luar siklus belum termasuk). Pemetaan masalah ke fitur ada di slide 5; contoh data nyata di slide 11. Konten pendanaan/investor tetap dikeluarkan. Rujukan nomor slide dan modul pada dokumen ini mengikuti deck terbaru (11 fitur); jika ada selisih, `source-mapping.md` (otomatis) yang benar. Harga/scope paket belum diubah dan perlu ditinjau karena fitur bertambah dalam (hasil samping, biaya kirim, hasil per ekor/ukuran).


> **Semua harga dan jadwal di dokumen ini adalah estimasi awal vendor pada tahap discovery.** Bukan penawaran yang mengikat secara hukum dan bukan persetujuan klien. Harga final baru ditetapkan setelah Discovery (Phase 0) dan persetujuan blueprint.

## 1. Paket komersial (indikatif)

| Paket | Estimasi harga | Estimasi implementasi | Posisi |
|---|---|---|---|
| ERP Essential | Rp45.000.000 – Rp70.000.000 | 10–14 minggu | Digitalisasi pencatatan operasional inti |
| **ERP Professional** *(Recommended Solution)* | Rp90.000.000 – Rp150.000.000 | 18–26 minggu | Platform operasional dan keuangan terintegrasi |
| ERP Enterprise | Rp175.000.000 – Rp300.000.000+ | 28–40+ minggu | Otomasi, integrasi, dan analitik lanjutan |

### Cakupan per paket

- **Essential:** executive dashboard; supplier & pengadaan; produksi & batch dasar; inventori & gudang; penjualan & invoice; kas & biaya dasar; laporan operasional dasar; akses pengguna & audit dasar.
- **Professional (semua Essential, plus):** produksi lanjutan; QC & ketertelusuran batch; cold storage; penagihan ABF; penjadwalan produksi; batch costing; akuntansi keuangan lanjutan; alur persetujuan; laporan eksekutif.
- **Enterprise (semua Professional, plus):** business intelligence lanjutan; simulasi skenario & forecasting; integrasi suhu IoT; integrasi timbangan digital (jika kompatibel); portal buyer & supplier; otomasi proses lanjutan; integrasi kustom; kesiapan multi-lokasi; pelaporan manajemen lanjutan. Hardware dan integrasi dinilai terpisah.

### Catatan pemetaan modul → paket

Brief menempatkan *Scenario Simulation* dan *Forecasting* pada paket Enterprise. Karena itu slide 8 dan 19 menempatkan fitur 10 pada Enterprise. Modul 09 (Perencanaan Produksi) dan Modul 08 (Cold Storage & ABF) berada pada Professional sesuai daftar cakupan. Jika klien ingin versi dasar simulator (tampilan asumsi dan sensitivitas statis) pada Professional, hal ini dibahas saat Discovery dan dapat mengubah estimasi.

## 2. Faktor yang menentukan harga final

Kebutuhan terkonfirmasi · jumlah pengguna · jumlah fasilitas · migrasi data · integrasi · hardware · kompleksitas akuntansi keuangan · kebutuhan infrastruktur · keamanan dan kepatuhan yang diminta · kriteria penerimaan.

Deck ini **tidak** memakai proyeksi laba perusahaan untuk membenarkan ROI perangkat lunak; tidak ada angka ROI yang dijanjikan.

## 3. Termin pembayaran (usulan)

| Termin | Persentase | Contoh pada Professional (Rp90–150 juta) |
|---|---|---|
| Inisiasi proyek | 30% | Rp27–45 juta |
| Milestone pengembangan inti | 30% | Rp27–45 juta |
| Milestone User Acceptance Testing | 30% | Rp27–45 juta |
| Serah terima akhir | 10% | Rp9–15 juta |

- Garansi: 60–90 hari untuk cacat perangkat lunak yang disepakati.
- Pemeliharaan: 12–18% dari nilai pengembangan per tahun, bergantung cakupan dukungan.
- Ditagih terpisah: infrastruktur cloud, domain & hosting, penyimpanan dokumen, backup, API pihak ketiga, layanan pesan, hardware, integrasi tambahan, permintaan fitur baru, perubahan besar.
- Pembedaan: perbaikan cacat (garansi) · pemeliharaan sistem (biaya tahunan) · dukungan (SLA) · peningkatan (change request kecil) · pengembangan tambahan (penawaran terpisah).

## 4. Roadmap

| Fase | Durasi indikatif |
|---|---|
| Phase 0 — Discovery & System Blueprint | 2–3 minggu |
| Phase 1 — Core ERP Development | 6–8 minggu |
| Phase 2 — Seafood Operations | 5–7 minggu |
| Phase 3 — Financial Intelligence | 4–6 minggu |
| Phase 4 — Testing, Training & Go-Live | 2–3 minggu |

Dijalankan berurutan: 19–27 minggu. Slide 22 menjelaskan lima tahap dan durasinya. Dengan sebagian pekerjaan berjalan bersamaan setelah kebutuhan jelas, target Professional adalah 18–26 minggu; ini estimasi awal, bukan komitmen tenggat.

## 5. Asumsi proyek untuk estimasi saat ini

1. Satu fasilitas operasi (Bungus).
2. Jumlah pengguna dan peran akses belum ditetapkan.
3. Migrasi data historis tidak termasuk.
4. Sensor suhu, timbangan digital, printer label: kompatibilitas dan biaya dinilai terpisah sebelum kuotasi.
5. Kebijakan akuntansi dan pajak divalidasi saat implementasi; alur penjualan → biaya produk → biaya usaha pada slide 16 adalah penjelasan usulan.
6. Tidak ada klaim sertifikasi, kepatuhan regulasi otomatis, atau jaminan keamanan. Dokumentasi HACCP/ekspor/sertifikasi bersifat opsional dan ditentukan saat discovery.

## 6. Perhitungan yang dibuat deck ini (bukan angka proposal)

**Slide 11 — hasil olahan (proposal hlm. 6):** 3.000 kg bahan × asumsi hasil 50% = 1.500 kg loin. Persentase ini adalah asumsi contoh; hasil nyata mengikuti timbang produksi. Deck saat ini tidak menampilkan rincian omzet atau kontribusi grade dari versi sebelumnya.

**Slide 14 — tagihan gudang dingin (tarif proposal hlm. 8):** 8.000 kg disimpan 5 hari, ditagih minimum 10 hari × Rp75/kg/hari = **Rp6.000.000**. Pembekuan cepat (ABF) ditagih terpisah **Rp3.500/kg yang dibekukan**; slide tidak menampilkan berat ABF atau jumlah invoice gabungan.

Aturan CS: >1 jam–24 jam dihitung 1 hari; >24 jam–10 hari ditagih minimum 10 hari; hari ke-11 dan berikutnya menambah Rp75/kg/hari. Hari lanjutan dihitung penuh. Tarif transit ≤1 jam belum ditetapkan pada proposal.

**Contoh penjelasan:** slide 9 menampilkan kondisi yang perlu ditindaklanjuti, slide 10 alur penerimaan, slide 15 satu tagihan contoh dan statusnya, slide 18 peringatan benturan jadwal, serta slide 20 pembagian izin contoh. Ini bukan transaksi atau temuan nyata. Slide 13 menjelaskan pemisahan kepemilikan stok tanpa angka stok/suhu ilustratif; slide 16 menjelaskan urutan biaya tanpa mockup penutupan bulanan.
## 7. Hal yang sengaja tidak dimasukkan

- **Pendanaan, modal, investor, dan bagi hasil** (atas permintaan): angka modal rencana/realisasi, rasio 65/35, dan modul Investor & Capital Management dikeluarkan. Deck kini 11 modul; slide 4 menjelaskan risiko catatan terpisah dan slide 17 pembagian tugas per peran. Rentang harga paket belum disesuaikan dan perlu ditinjau karena cakupan Professional berkurang satu modul.
- Skenario alternatif kakap merah dan kerapu tidak dijumlahkan dengan portofolio utama (proposal hlm. 11–15 menyatakan keduanya saling menggantikan dan memakai pool modal yang sama).
- Testimoni, proyek sebelumnya, pencapaian perusahaan vendor, logo asli, dan foto fasilitas klien: tidak ada karena tidak disediakan. Deck localhost saat ini memakai teks, bentuk, tabel, dan diagram penjelasan; tidak memakai foto fasilitas atau latar ilustrasi cover lama.

## 8. Item yang membutuhkan persetujuan komersial sebelum dikirim ke klien

1. Harga dan rentang untuk tiga paket, termasuk apakah simulator skenario masuk Professional.
2. Persentase pemeliharaan (12–18%) dan lama garansi (60–90 hari).
3. Termin pembayaran 30/30/30/10.
4. Identitas vendor: nama, logo, presenter, kontak (belum ditetapkan untuk pengiriman komersial).
5. Pernyataan teknologi (stack) dan tingkat layanan dukungan.


