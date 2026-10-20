# Rancangan Pembangunan KATALIS ERP

> **Pembaruan 19 Okt 2026:** penawaran sudah disepakati dan catatan owner (rekaman Bungus Barat 5) sudah masuk. Rencana kerja yang berlaku ada di `rencana-eksekusi.md`. Bagian yang diganti di sana: jadwal, peran, model data produksi/stok/tarif, status persetujuan dan pembayaran, serta aturan susut.
>
> **Pembaruan 21 Okt 2026:** bagian produksi di dokumen ini sudah disamakan dengan Formulir Produksi FRM-PRD-01 revisi 01 (`docs/formulir/`): loin per potong, komponen hasil ditimbang, selisih tidak disembunyikan.

Dokumen acuan internal Dar Dev, dari nol sampai serah terima. Mengacu pada demo yang sudah ada (`/demo`, `/demo/desktop`), yaitu `lib/demo/store.ts` (data dan aturan) dan `components/demo/*` (tampilan).

Status: **rancangan awal**. Angka waktu dan biaya adalah estimasi, bukan janji. Keputusan yang masih terbuka ada di bagian 15.

---

## 1. Tujuan dan batas

**Tujuan.** Satu aplikasi untuk mengurus usaha perikanan PT Katalis Lintas Global: beli ikan, cek mutu, produksi, stok, penjualan dan tagihan, gudang dingin, keuangan dan tutup buku, jadwal mitra, laporan, dan Asisten AI. Owner memantau dan memutuskan dari desktop atau ponsel.

**Masalah yang dijawab** (dari data Siklus 1 dan Monitor Dana Fasilitas Bungus):
1. Ongkos kirim 29,9% dari biaya.
2. Hasil tiap ekor beda jauh (52,2%–70,2%, rencana 60%).
3. 65 kg sisa potongan belum laku, enam kelas mutu berharga beda.
4. Tagihan gudang dingin dihitung tangan.
5. Jadwal dua mitra (CV DUS, PT SNS) bisa bentrok dengan pesanan ABF.
6. 55 dari 219 transaksi belum punya bukti transfer.

**Di dalam cakupan:** 12 modul (Dashboard, Persetujuan, Pembelian, Produksi, Mutu & Asal, Stok, Penjualan, Gudang Dingin, Keuangan, Jadwal, Skenario, Akses, Laporan), Asisten AI, tampilan desktop dan ponsel (PWA), unggah nota/bukti, impor data awal, pelatihan, dan serah terima.

**Di luar cakupan** (ditagih terpisah): sensor suhu, timbangan digital, printer label, integrasi akuntansi/pajak pihak ketiga, portal pembeli/pemasok, multi-lokasi, aplikasi native di toko aplikasi, modul investor dan bagi hasil (dikeluarkan atas permintaan).

---

## 2. Arsitektur dan teknologi

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Aplikasi | Next.js (App Router, TypeScript), Tailwind | Sudah dipakai di demo, satu kode untuk desktop dan ponsel |
| Hosting | Vercel (wilayah Singapura, `sin1`) | Cocok dengan Next.js, latensi rendah dari Padang |
| Database | Supabase Postgres (wilayah Singapura) | Relasional, cocok untuk data keuangan dan stok |
| Login | Supabase Auth (email + kata sandi, undangan oleh Owner) | Satu sumber identitas, bisa ditautkan ke peran |
| Izin | Row Level Security (RLS) + fungsi/trigger di database | Aturan dijaga database, bukan hanya tampilan |
| Berkas | Supabase Storage (bucket privat, URL bertanda tangan) | Nota dan bukti transfer |
| Realtime | Supabase Realtime | Menggantikan sinkron `localStorage` di demo |
| Asisten AI | Route handler di Vercel memanggil model AI | Kunci tetap di server |
| ORM/klien | `@supabase/supabase-js` + tipe hasil `supabase gen types` | Tipe aman |
| Uji | Vitest (aturan bisnis), pgTAP/SQL (RLS), Playwright (alur) | Lihat bagian 10 |
| Pemantauan | Log Vercel, log Supabase, pemberitahuan galat (mis. Sentry) | Bagian 11 |

**Prinsip:**
- **Satu sumber kebenaran: database.** Tampilan tidak boleh memutuskan izin atau angka.
- **Aturan penting berupa constraint, trigger, atau fungsi SQL** (tutup buku terkunci, persetujuan sebelum kas berubah, stok tidak negatif).
- **Akun milik klien.** Vercel dan Supabase dibuat atas nama perusahaan klien, Dar Dev diundang sebagai anggota. Tagihan, data, dan serah terima jadi jelas.
- **Tidak ada data nyata di repositori.** Workbook Monitor Dana dan proposal asli tidak di-commit.

```
Browser/PWA (desktop, ponsel)
   │  Next.js (Vercel, sin1)
   │    ├─ Server Components / Route Handlers  ──► Supabase (Postgres, RLS, Storage, Realtime)
   │    └─ /api/asisten ──► Model AI (alat baca terbatas, atas nama pengguna)
```

---

## 3. Peran dan izin

Empat peran. Satu pengguna punya tepat satu peran utama (tabel `profiles.role`). Izin diambil dari `PERMS` di demo.

| Aksi | Owner | Pembelian | Gudang | Keuangan |
|---|:-:|:-:|:-:|:-:|
| Lihat dashboard dan laporan | ✓ | ✓ | ✓ | ✓ |
| Ajukan pembelian ikan (`po.create`) | ✓ | ✓ | | |
| Setujui/tolak persetujuan (`approval.decide`) | ✓ | | | |
| Terima ikan (`po.receive`) | ✓ | | ✓ | |
| Bayar pemasok (`po.pay`) | ✓ | | | ✓ |
| Cek mutu (`lot.qc`) | ✓ | | ✓ | |
| Mulai/selesaikan produksi (`prod.start`, `prod.finish`) | ✓ | | ✓ | |
| Buat pesanan jual (`sale.create`) | ✓ | ✓ | | ✓ |
| Kirim pesanan (`sale.ship`) | ✓ | ✓ | ✓ | |
| Catat pembayaran pembeli (`inv.pay`) | ✓ | | | ✓ |
| Kirim pengingat tagihan (`inv.remind`) | ✓ | ✓ | | ✓ |
| Terima titipan (`tit.in`) | ✓ | | ✓ | |
| Ambil dan tagih titipan (`tit.out`) | ✓ | | ✓ | ✓ |
| Ajukan koreksi stok (`stock.adjust`) | ✓ | | ✓ | |
| Ajukan biaya (`cost.add`) | ✓ | | | ✓ |
| Jadwal: tambah/pindah/hapus (`book.*`) | ✓ | | ✓ | |
| Skenario: simpan/hapus (`scen.*`) | ✓ | | | ✓ |
| Tutup buku (`month.close`) | ✓ | | | ✓ |
| Buka kembali buku (`month.reopen`) | ✓ | | | |
| Kelola pengguna dan peran | ✓ | | | |

Catatan: pembagian ini usulan awal, disesuaikan saat diskusi kebutuhan (bagian 15).

**Penegakan di database.** Fungsi `auth_role()` membaca peran dari `profiles`. Setiap tabel:
- `SELECT`: semua peran yang login (kecuali tabel yang dibatasi, mis. `profiles` hanya baris sendiri dan Owner).
- `INSERT/UPDATE/DELETE`: tidak diberikan langsung. Semua perubahan lewat **fungsi SQL (RPC)** `security definer` yang memeriksa peran, status, dan aturan, lalu menulis ke tabel dan ke `activity_log` dalam satu transaksi.

---

## 4. Model data

Semua tabel memakai `id uuid` (kunci utama), `created_at`, `created_by`, dan, bila bisa diubah, `updated_at`. Kode manusiawi (mis. `PO-0001`) dibuat dari urutan (`sequence`) per jenis.

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `profiles` | `user_id`, `nama`, `role` (enum Owner/Pembelian/Gudang/Keuangan), `aktif` | Satu baris per pengguna |
| `suppliers` | `nama`, `kontak`, `harga_terakhir_per_kg` | Pemasok ikan |
| `buyers` | `nama`, `kontak`, `tempo_hari` | Pembeli |
| `purchase_orders` | `kode`, `supplier_id`, `kg`, `harga_per_kg`, `status` (menunggu_persetujuan, disetujui, ditolak, diterima, dibayar) | `total = kg × harga` |
| `approvals` | `kode`, `jenis` (pembelian, gudang, keuangan), `judul`, `jumlah_teks`, `status` (pending, approved, rejected), `ref_tabel`, `ref_id`, `diajukan_oleh`, `diputuskan_oleh`, `alasan_tolak`, `payload jsonb` | Menggantikan `Approval` di demo |
| `lots` | `kode`, `po_id`, `supplier_id`, `kg`, `sisa_kg`, `qc` (menunggu, lulus, ditahan), `kelas` (A/B/C) | Satu lot per penerimaan |
| `productions` | `kode`, `lot_id`, `kg_masuk`, `status`, `tanggal` | Loin, hasil samping, limbah, susut, dan persen hasil dihitung dari `production_items` dan `production_components` (lihat `rencana-eksekusi.md`) |
| `production_items` | `production_id`, `no_ekor` (opsional), `no_loin`, `grade`, `kg numeric(12,3)` | Satu baris per potong loin, ganti `production_fish`. Data Siklus 1: 11 ekor |
| `stock_balances` | `jenis` (ikan_segar, loin, sisa_olahan), `kg` | Diperbarui hanya lewat fungsi; ditambah `stock_movements` sebagai catatan |
| `stock_movements` | `jenis`, `kg` (+/−), `alasan`, `ref_tabel`, `ref_id` | Riwayat mutasi, tidak boleh dihapus |
| `cold_deposits` | `kode`, `pelanggan`, `kg`, `tanggal_masuk`, `tanggal_keluar`, `status` | Titipan di gudang dingin |
| `sales_orders` | `kode`, `buyer_id`, `kg`, `harga_per_kg`, `status` (draf, dikirim, lunas), `invoice_id` | |
| `invoices` | `kode`, `buyer/pelanggan`, `jenis` (penjualan, gudang_dingin), `jumlah`, `jatuh_tempo`, `status`, `ref_id` | Status turunan: belum jatuh tempo, jatuh tempo, terlambat, lunas |
| `ledger` | `kode`, `tanggal`, `keterangan`, `jumlah` (+/−), `kategori`, `pemasok/pihak`, `nota_url`, `bukti_transfer_url`, `diperiksa_oleh`, `disetujui_oleh`, `periode` | Buku kas; riwayat tidak dihapus, koreksi lewat baris baru |
| `accounting_periods` | `periode` (yyyy-mm), `status` (terbuka, terkunci), `ditutup_oleh`, `ditutup_pada` | Penentu kunci |
| `bookings` | `hari/tanggal`, `jam_mulai`, `jam_selesai`, `pihak`, `kg`, `jenis` (produksi, abf) | Bentrok dicek di database |
| `partner_slots` | `hari`, `pihak` (CV DUS/PT SNS), `jam_mulai`, `jam_selesai`, `kg_per_hari` | Giliran tetap dari proposal |
| `scenarios` | `nama`, `parameter jsonb`, `dampak` | Simulasi laba |
| `tariffs` | `jenis`, `batas_hari`, `tarif_per_kg`, `berlaku_dari` | Tarif gudang dingin bisa diubah tanpa kode |
| `documents` | `ref_tabel`, `ref_id`, `jenis` (nota, bukti_transfer, surat_jalan), `path`, `diunggah_oleh` | Berkas di Storage |
| `activity_log` | `waktu`, `user_id`, `role`, `aksi`, `ref`, `ringkasan`, `sebelum jsonb`, `sesudah jsonb` | Tidak bisa diubah/dihapus |
| `reminders` | `invoice_id`, `dikirim_oleh`, `waktu` | Pengingat tagihan |

**Indeks:** `ledger(periode, tanggal)`, `invoices(status, jatuh_tempo)`, `lots(qc)`, `bookings(hari, jam_mulai)`, `activity_log(waktu desc)`.

**Tampilan baca (views) untuk dashboard dan Asisten AI:** `v_dashboard`, `v_piutang_umur`, `v_hasil_per_ekor`, `v_biaya_siklus`, `v_isi_gudang_dingin`, `v_jadwal_bentrok`, `v_kelengkapan_dokumen`. Views memakai RLS pemanggil (`security_invoker`).

---

## 5. Aturan bisnis yang dijaga database

1. **Pembelian.** `po.create` membuat PO (`menunggu_persetujuan`) **dan** satu baris `approvals`. PO hanya bisa `disetujui` lewat `approval.decide`. Harga dibandingkan dengan `suppliers.harga_terakhir_per_kg`; selisih dicatat di `payload` (peringatan di layar).
2. **Penerimaan.** Hanya PO `disetujui` bisa diterima. Menerima membuat `lots` (`qc = menunggu`) dan menambah stok ikan segar. PO jadi `diterima`.
3. **Cek mutu.** Lot `lulus` wajib punya kelas. Hanya lot `lulus` dengan `sisa_kg > 0` yang bisa diproduksi.
4. **Produksi.** Mulai: `sisa_kg` lot menjadi 0, produksi `berjalan`. Selesai: loin, hasil samping, limbah, dan susut diisi dari timbangan (tidak ada persen tetap). `hasil_persen = kg_loin ÷ kg_masuk`; di luar 40–80% menjadi peringatan, bukan penolakan. Sisanya tampil sebagai **selisih belum jelas** dan tidak pernah diisi otomatis. Total timbangan tidak boleh melebihi `kg_masuk`. Stok loin dan sisa olahan bertambah.
5. **Pembayaran pemasok.** Hanya PO `diterima`. Menulis `ledger` bernilai negatif dan PO jadi `dibayar`. Ditolak bila periode terkunci.
6. **Penjualan.** Pesanan draf tidak boleh melebihi stok loin yang tersedia (stok dikurangi pesanan draf lain). Pengiriman mengurangi stok, menerbitkan `invoices` (jatuh tempo bawaan 14 hari), pesanan jadi `dikirim`. Tagihan mengikuti **berat yang diterima pembeli** bila dicatat.
7. **Pembayaran pembeli.** Menulis `ledger` positif, invoice dan pesanan jadi `lunas`. Ditolak bila periode terkunci.
8. **Gudang dingin.** Kapasitas 17.500 kg; titipan baru ditolak bila melebihi (stok sendiri dan titipan dihitung bersama). **Tarif simpan** per kg: ≤24 jam Rp75, ≤10 hari minimum 10 hari × Rp75, hari ke-11 dan seterusnya +Rp75/hari; ABF Rp3.500/kg dibekukan, ditagih terpisah. Nilai diambil dari `tariffs`, bukan kode. Mengambil titipan menerbitkan invoice jenis `gudang_dingin`.
9. **Koreksi stok dan biaya** tidak langsung berlaku: membuat `approvals`; baru mengubah stok/kas setelah disetujui Owner.
10. **Jadwal.** `bookings` tidak boleh saling tumpang tindih dalam satu hari **kecuali** disimpan dengan penanda bentrok; fungsi `pindah_ke_jam_kosong` mencari slot kosong pertama dalam minggu. Jam kerja 08.00–17.00, Sabtu sampai 12.00.
11. **Tutup buku.** Syarat: tidak ada `approvals` pending, tidak ada PO `diterima` yang belum dibayar, tidak ada invoice `terlambat`. Setelah ditutup, trigger menolak `INSERT/UPDATE/DELETE` pada `ledger` dan pembayaran untuk periode itu. Hanya Owner yang bisa membuka kembali, dan tercatat di `activity_log`.
12. **Riwayat tidak boleh dihapus.** `ledger`, `stock_movements`, `activity_log` hanya menerima `INSERT`. Koreksi lewat baris baru berjenis "Koreksi".
13. **Kelengkapan dokumen.** Transaksi `ledger` bernilai keluar wajib punya nota; bukti transfer wajib kecuali ditandai "tidak perlu". Dashboard menghitung yang belum lengkap.

---

## 6. Modul: layar, aksi, kriteria selesai

Semua layar punya dua tata letak: **desktop** (sidebar + kartu) dan **ponsel** (tab bawah + lembar bawah), memakai komponen yang sama.

| Modul | Layar utama | Aksi | Selesai bila |
|---|---|---|---|
| Dashboard | Angka utama, perlu keputusan, perlu perhatian, hasil tiap ekor | Tombol ke modul terkait, persetujuan cepat | Angka cocok dengan view dan berubah real-time |
| Persetujuan | Antrean + riwayat | Setujui, tolak (dengan alasan) | Hanya Owner yang bisa memutuskan, dicatat di log |
| Pembelian | Daftar PO, harga pemasok | Buat, terima, bayar | Alur beli → terima → bayar berjalan, ditolak bila periode terkunci |
| Produksi | Siap diproduksi, daftar produksi, hasil per ekor | Mulai, selesaikan (timbang loin per potong dan komponen hasil) | Stok bertambah benar; selisih belum jelas terlihat |
| Mutu & Asal | Daftar lot, penelusuran | Cek mutu, lacak asal | Dari lot bisa ditelusuri sampai pembeli |
| Stok | Ikan segar, loin, sisa olahan, isi gudang dingin | Ajukan koreksi | Koreksi lewat persetujuan, riwayat tersimpan |
| Penjualan | Pesanan, tagihan | Buat, kirim, catat bayar, ingatkan | Stok dan tagihan konsisten |
| Gudang Dingin | Titipan, tarif, aset | Terima, ambil dan tagih | Tagihan sesuai tarif di `tariffs` |
| Keuangan | Buku kas, kelengkapan dokumen, tutup buku | Ajukan biaya, unggah nota/bukti, tutup/buka buku | Syarat tutup buku diperiksa database |
| Jadwal | Garis waktu minggu, pesanan ABF | Tambah, pindahkan, hapus | Bentrok terdeteksi dan bisa dipindah otomatis |
| Skenario | Slider harga, dampak laba | Simpan, muat, hapus | Rumus sesuai lembar asumsi (bagian 15) |
| Akses | Pengguna dan peran | Undang, ubah peran, nonaktifkan | Hanya Owner |
| Laporan | Laba rugi, piutang, stok, hasil per ekor, biaya, pengeluaran, riwayat | Unduh CSV | CSV cocok dengan tampilan |
| Asisten AI | Percakapan | Tanya, buka modul dari jawaban | Bagian 7 |

---

## 7. Asisten AI

**Tujuan.** Menjawab pertanyaan dengan kalimat biasa dari data usaha.

**Desain yang aman:**
- **Alat terbatas, bukan SQL bebas.** Model hanya boleh memanggil fungsi baca yang sudah ditentukan (`piutang_telat`, `saldo_kas`, `hasil_per_ekor`, `jadwal_bentrok`, `perlu_persetujuan`, `isi_gudang_dingin`, `kelengkapan_dokumen`, `biaya_siklus`).
- **Memakai identitas pengguna.** Pemanggilan database membawa token pengguna, jadi RLS berlaku. Peran Gudang tidak akan melihat data kas.
- **Hanya baca di tahap awal.** Tidak ada tindakan yang mengubah data lewat Asisten.
- **Jawaban menyertakan sumber** (modul dan tautan "Buka …") dan label bila datanya contoh.
- **Penolakan jujur** untuk di luar cakupan.
- **Kunci dan batas:** kunci AI di environment server; batas pertanyaan per pengguna per hari; catat pemakaian ke tabel `ai_usage`.
- **Privasi:** isi pertanyaan dan jawaban disimpan di log akses terbatas; data keuangan tidak dikirim lebih dari yang dibutuhkan alat.

**Tahap:** (a) seperti demo, pencocokan niat pada alat yang sama; (b) model bahasa memilih alat dan menyusun jawaban. Pilihan model dan biayanya diputuskan saat minggu 3 (bagian 15).

---

## 8. Data awal dan migrasi

1. **Master data:** pemasok, pembeli, mitra dan giliran (CV DUS, PT SNS), tarif gudang dingin, daftar pengguna.
2. **Siklus 1:** 11 ekor (berat dan hasil), loin 300,94 kg (B-SO 203,51; C-SO 97,43), hasil samping 87 kg (toro 14, kepala 63, tetelan coklat 7, daging kerok 3), biaya Rp37,08 juta menurut kategori. Limbah dan susut tidak ada datanya, jadi 93,06 kg tampil sebagai selisih belum jelas. Tandai **data nyata Siklus 1**.
3. **Monitor Dana:** impor 243 transaksi ke `ledger` lewat skrip sekali jalan (CSV bersih tanpa nomor rekening). Nota dan bukti: hanya tautan/berkas yang memang diserahkan klien. Bagian modal, investor, dan bagi hasil **tidak diimpor**.
4. **Pembersihan:** daftar duplikat ID, transaksi tanpa tanggal, dan 55 bukti kosong ditampilkan untuk diselesaikan klien, bukan ditebak.
5. **Dua lingkungan data:** `produksi` (data klien) dan `demo` (data contoh) terpisah, supaya demo tidak menyentuh data nyata.

---

## 9. Jadwal 4 minggu

Asumsi: 2 pengembang, data dan akses dari klien lengkap di hari pertama, keputusan di bagian 15 diambil di minggu 1. **Jadwal ini ketat**; titik potong ada di bawah.

**Minggu 1: Rancang dan fondasi**
- Hari 1–2: diskusi kebutuhan, pastikan peran, tarif, dan hak akses; kumpulkan data dan akses. Putuskan bagian 15.
- Hari 2–3: proyek Supabase (Singapura) dan Vercel di akun klien; skema tabel, enum, urutan kode, `tariffs`, `profiles`.
- Hari 3–5: login dan undangan pengguna, fungsi `auth_role()`, RLS dasar, kerangka aplikasi (tata letak desktop/ponsel dari demo), `activity_log`.
- **Hasil:** rancangan disetujui, login dan peran berjalan di lingkungan uji.

**Minggu 2: Alur harian**
- Pembelian, persetujuan, penerimaan, cek mutu (RPC + layar).
- Produksi dengan hasil per ekor, stok dan mutasi stok.
- Penjualan, pengiriman, tagihan, pembayaran.
- Unggah nota dan bukti ke Storage.
- **Hasil:** alur beli → terima → mutu → produksi → jual → bayar bisa dicoba penuh.

**Minggu 3: Gudang dingin, jadwal, keuangan, AI**
- Gudang dingin (titipan, tarif dari `tariffs`, tagihan), jadwal dan pencarian bentrok.
- Buku kas, kelengkapan dokumen, tutup buku dengan trigger kunci, laporan dan CSV.
- Impor Monitor Dana dan Siklus 1.
- Asisten AI tahap (a) lalu sambung ke model (tahap b) bila diputuskan.
- Skenario.
- **Hasil:** laporan keuangan berjalan, Asisten AI menjawab dari data nyata.

**Minggu 4: Uji dan mulai pakai**
- Uji bersama pengguna (UAT) dengan skenario di bagian 10, perbaikan.
- Uji RLS menyeluruh dan uji pemulihan cadangan.
- PWA (ikon, mode layar penuh), kinerja ponsel, aksesibilitas dasar.
- Pelatihan per peran, panduan singkat, serah terima akun dan dokumentasi.
- Peluncuran bertahap: satu minggu data nyata berdampingan dengan catatan lama.
- **Hasil:** siap dipakai, serah terima selesai.

**Titik potong bila terlambat** (urutan yang dikorbankan lebih dulu): Skenario → Asisten AI tahap (b) → laporan tambahan → PWA tingkat lanjut. Yang **tidak** dikorbankan: login/peran, RLS, tutup buku, cadangan.

---

## 10. Pengujian dan penerimaan

**Otomatis**
- **Unit (Vitest):** rumus tarif gudang dingin, hasil olahan, bentrok jadwal, kelas mutu.
- **Database (SQL/pgTAP):** untuk tiap tabel dan fungsi, uji per peran: yang diizinkan berhasil, yang tidak diizinkan ditolak (matriks bagian 3). Uji trigger kunci periode dan larangan hapus riwayat.
- **Alur (Playwright):** siklus penuh dari bagian 9 minggu 2, tutup buku diblokir lalu berhasil setelah syarat dipenuhi, sinkron dua perangkat.

**Skenario penerimaan oleh klien (UAT)**
1. Pembelian harga naik → peringatan → Owner tolak dan setujui.
2. Terima ikan → tahan mutu → lulus → produksi dengan 3 ekor → stok bertambah.
3. Jual melebihi stok → ditolak; jual wajar → kirim → tagihan → bayar.
4. Titipan 8.000 kg diambil hari ke-6 → tagihan memakai minimum 10 hari.
5. Pesanan ABF bentrok → dipindah otomatis.
6. Tutup buku diblokir karena persetujuan tertunda → selesaikan → tutup → coba ubah kas → ditolak.
7. Peran Gudang mencoba setujui atau bayar → tombol terkunci dan ditolak di database.
8. Asisten AI menjawab lima pertanyaan contoh dari data nyata.

**Kriteria diterima:** semua skenario lulus, tidak ada cacat tingkat tinggi terbuka, uji RLS hijau, pemulihan cadangan berhasil diuji.

---

## 11. Lingkungan, keamanan, dan operasional

- **Lingkungan:** `lokal` → `preview` (cabang) → `produksi`. Supabase: satu proyek uji dan satu produksi. Migrasi skema berupa berkas SQL di repositori (`supabase/migrations`), diterapkan lewat CLI; tidak ada perubahan skema manual di produksi.
- **Rahasia:** kunci di environment Vercel/Supabase. Kunci `service_role` **tidak pernah** dipakai di sisi klien.
- **Keamanan:** RLS aktif di semua tabel; bucket privat; kata sandi dan sesi dikelola Supabase; hanya Owner yang mengundang; log akses; batas laju pada `/api/asisten`.
- **Cadangan:** paket Supabase berbayar dengan cadangan harian. Uji pemulihan sebelum peluncuran dan tiap kuartal. Ekspor berkala (CSV buku kas) disimpan klien.
- **Pemantauan:** pemberitahuan galat, log fungsi, pengecekan ketersediaan; siapa menerima notifikasi ditentukan.
- **Kepatuhan data:** data keuangan dan nama pihak ketiga. Akses dibatasi peran, tidak ada data nyata di lingkungan demo.
- **Biaya berjalan (perkiraan, cek ulang harga resmi):** hosting dan database berbayar, domain, penyimpanan berkas, dan pemakaian AI. Masuk ke biaya pemeliharaan atau ditagih terpisah.

---

## 12. Serah terima dan pemeliharaan

**Serah terima:**
- Akun Vercel, Supabase, domain, dan repositori atas nama klien; Dar Dev sebagai anggota.
- Dokumentasi: panduan pengguna per peran, panduan admin (undang pengguna, ubah tarif, buka/tutup buku), panduan teknis (skema, migrasi, cara deploy, cara pulihkan).
- Pelatihan: sesi per peran (sekitar 1–1,5 jam), rekaman layar singkat.
- Daftar kredensial dan pemilik, disimpan di pengelola kata sandi klien.

**Garansi dan pemeliharaan:**
- **Garansi:** perbaikan cacat selama jangka yang disepakati (usulan 60 hari) setelah mulai dipakai.
- **Pemeliharaan tahunan** (usulan 12–18% dari nilai pengembangan): pembaruan keamanan, pemantauan, cadangan, dukungan dengan batas waktu respons.
- **Permintaan baru:** perubahan kecil ditagih per jam atau paket; fitur baru dengan penawaran terpisah.

---

## 13. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| 1 bulan terlalu ketat | Terlambat, margin habis | Titik potong jelas (bagian 9); definisi "selesai" tertulis; mulai setelah data dan akses lengkap |
| Data awal kotor atau tidak lengkap | Impor tersendat | Daftar masalah diserahkan ke klien; tidak menebak |
| Aturan tarif atau peran berubah di tengah jalan | Pengerjaan ulang | Tarif di tabel `tariffs`; peran dikunci saat rancangan disetujui; perubahan lewat permintaan perubahan |
| Cakupan melebar ("sekalian") | Waktu dan biaya | Daftar di luar cakupan (bagian 1); tarif per hari untuk tambahan |
| Asisten AI salah menjawab | Keputusan keliru | Alat terbatas, sumber disertakan, hanya baca, label data contoh |
| Biaya AI melonjak | Tagihan tak terduga | Batas harian, pencatatan `ai_usage`, ditagih sesuai pemakaian |
| Paket gratis dipakai di produksi | Proyek terhenti, tidak ada cadangan | Paket berbayar sejak peluncuran |
| Kebocoran data (kunci, bucket) | Data keuangan terbuka | RLS, bucket privat, tanpa `service_role` di klien, tinjauan sebelum rilis |
| Pengguna sulit beralih dari cara lama | Sistem tidak dipakai | Pelatihan, minggu berdampingan, panduan singkat, satu pemilik di sisi klien |
| Ketergantungan pada satu orang | Pengerjaan berhenti | Dokumentasi, migrasi di repositori, akses ganda |

---

## 14. Definisi selesai (checklist)

- [ ] Semua modul di bagian 6 berjalan di desktop dan ponsel dengan data nyata.
- [ ] RLS aktif di semua tabel; uji peran lulus.
- [ ] Tutup buku, penolakan pembayaran di periode terkunci, dan larangan hapus riwayat teruji.
- [ ] Nota dan bukti transfer bisa diunggah dan dilihat sesuai peran.
- [ ] Impor Monitor Dana dan Siklus 1 selesai, selisih dilaporkan.
- [ ] Asisten AI menjawab skenario UAT, dengan batas pemakaian aktif.
- [ ] Cadangan harian aktif dan pemulihan sudah diuji.
- [ ] PWA terpasang dan layar penuh di ponsel diuji (Android dan iOS).
- [ ] Pelatihan per peran selesai, dokumentasi diserahkan.
- [ ] Akun dan domain atas nama klien, kredensial diserahkan.
- [ ] UAT disetujui tertulis oleh Owner.

---

## 15. Keputusan dan informasi yang masih dibutuhkan

**Dari klien**
1. Daftar pengguna awal dan peran masing-masing (nama, email).
2. Konfirmasi pembagian izin di bagian 3 (khususnya siapa boleh membayar pemasok dan mengirim pesanan).
3. Tarif gudang dingin resmi, tarif transit ≤1 jam (belum ada di proposal), dan aturan pembulatan hari.
4. Rumus laba di Skenario (asumsi yang dipakai) dan angka dasar.
5. Aturan jatuh tempo tagihan (bawaan demo 14 hari) per pembeli.
6. Data master pemasok dan pembeli, serta daftar kelas mutu beserta harganya.
7. Apakah nomor rekening dan nama investor boleh ada di sistem (saran: tidak).
8. Kebijakan simpan data dan siapa menerima laporan bulanan.

**Dari Dar Dev (internal)**
1. Model AI dan batas biaya untuk Asisten (tahap a atau b dari awal).
2. Siapa yang menerima notifikasi galat dan pemantauan.
3. Harga, termin, garansi, dan pemeliharaan final (lihat `scope-assumptions.md`).
4. Apakah satu pengguna boleh punya lebih dari satu peran.
5. Cara menangani data demo vs produksi di domain yang sama.

---

## 16. Pemetaan dari demo ke produksi

| Demo sekarang | Produksi |
|---|---|
| `lib/demo/store.ts` (state + `localStorage`) | Tabel Postgres + fungsi RPC |
| `PERMS` + `can()` | `profiles.role` + RLS + pemeriksaan di RPC |
| `act()` | RPC `security definer` per aksi |
| Sinkron `storage` event | Supabase Realtime |
| `useDemoState` | Hook data (`useSWR`/Realtime) membaca view |
| `MONITOR`, `SIKLUS1` (konstanta) | Tabel hasil impor |
| `AsistenAI` (kata kunci) | `/api/asisten` + alat baca terbatas |
| Tangkapan layar demo di deck | Tetap, dari lingkungan `demo` |

Tampilan (`components/demo/*`) dipertahankan; yang diganti adalah sumber data dan aksinya.
