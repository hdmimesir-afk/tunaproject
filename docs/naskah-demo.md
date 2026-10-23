# Naskah demo 15 menit untuk owner

Tujuan: owner paham apa yang berubah dari catatan lama, bisa memakai dashboard sendiri, dan setuju memulai tahap 1 serah terima (`docs/serah-terima.md`).

Prinsip demo: **tunjukkan dari HP owner**, karena owner akan memantau dari HP. Bicara dengan bahasa usaha (ikan, loin, uang), bukan istilah teknis.

## Persiapan (sehari sebelumnya)

- [ ] Satu siklus uji kecil sudah dijalankan di sistem (lihat langkah 1 di "sebelum serah terima"): PO, terima, produksi beberapa loin, stok, pesanan, kirim, invoice, bayar. Beri nama yang jelas uji, misalnya pemasok "UJI COBA". Siklus inilah yang ditelusuri saat demo.
- [ ] Biarkan **satu PO uji berstatus "diperiksa"** (belum disetujui) supaya owner bisa menyetujuinya sendiri saat demo.
- [ ] HP owner: buka https://katalis-erp.vercel.app, sudah masuk dan lolos kode kedua (MFA). Simpan ke layar utama (Tambahkan ke Layar Utama).
- [ ] HP Anda: masuk sebagai akun petugas uji, di halaman Produksi, siklus uji terbuka.
- [ ] Laptop: masuk sebagai Owner, untuk ditampilkan ke layar besar bila ada.
- [ ] Sinyal: cek di ruang rapat. Siapkan hotspot cadangan.
- [ ] Cetak `docs/serah-terima.md` dan `docs/panduan-peran.md`.

**Jangan lakukan saat demo:** jangan membuat transaksi yang terlihat asli (data tidak bisa dihapus), jangan menutup buku bulan apa pun, jangan membuka pengaturan Vercel/Supabase atau kunci rahasia di layar.

---

## 0:00–1:30 · Pembuka: kenapa sistem ini dibuat

**Katakan:**
> "Dari catatan Bapak, ada empat masalah: angka produksi tidak lengkap dan koma hilang, selisih berat tidak kelihatan, catatan beli–produksi–jual–kas diketik ulang di tempat berbeda, dan banyak transaksi tanpa bukti. Contohnya Siklus 1: formulir lama menulis loin 301,0 kg padahal timbangan 300,94 kg, dan 93 kg dianggap susut padahal 65 kg-nya limbah yang dibuang."

> "Sistem ini memegang tiga prinsip Bapak: setiap loin tercatat sampai tiga angka di belakang koma, semua catatan nyambung tanpa ketik ulang, dan setiap angka laporan bisa diketuk sampai notanya."

---

## 1:30–4:30 · Dashboard di HP owner (bagian terpenting)

**Lakukan** (di HP owner, owner yang memegang):
1. Buka Dashboard. Tunjuk bagian paling atas **"Perlu tindakan Anda"**.
2. Ketuk baris PO uji → layar Persetujuan terbuka dan **PO itu disorot**.
3. Tunjukkan nota di sebelah tombol, dan peringatan bila harga naik dari pembelian terakhir.
4. Owner menekan **Setujui** → muncul layar konfirmasi dengan total → owner menekan **Ya, setujui**.

**Katakan:**
> "Bapak cukup buka halaman ini. Semua yang menunggu keputusan Bapak muncul satu per satu: PO, biaya, koreksi stok, hasil produksi, tagihan terlambat, izin karyawan, buku dan siklus yang siap ditutup. Yang merah paling mendesak. Ketuk, langsung dibawa ke tempatnya."

> "Disetujui belum berarti dibayar. Pembayaran dicatat Finance terpisah, jadi Bapak selalu tahu mana yang sudah disetujui tapi belum dibayar."

> "Tombol penting selalu minta konfirmasi kedua, jadi tidak ada yang terpencet tidak sengaja."

---

## 4:30–7:30 · Produksi per loin dan selisih berat

**Lakukan** (di HP Anda sebagai petugas):
1. Buka produksi uji → grid loin. Ketik satu berat, misalnya `12,345`, tekan **Enter** → baris baru muncul, nomor loin dan grade terisi sendiri.
2. **Nyalakan mode pesawat**, ketik satu baris lagi, tekan Simpan → indikator menunjukkan belum terkirim. **Matikan mode pesawat** → tersimpan sendiri.
3. Tunjukkan **neraca**: ikan masuk = loin + hasil samping + limbah + susut + **selisih belum jelas**.

**Katakan:**
> "Petugas menimbang langsung di HP, satu baris per loin. Kalau sinyal di ruang dingin putus, isian aman di HP dan terkirim sendiri saat sinyal kembali."

> "Selisih yang belum jelas tidak lagi disembunyikan sebagai susut. Produksi tidak bisa disetujui sebelum QC menuliskan penjelasannya, lalu Bapak yang menyetujui."

---

## 7:30–9:30 · Satu siklus dari beli sampai uang masuk

**Lakukan** (HP owner atau laptop):
1. Menu **Rincian Siklus** → siklus uji → **Telusuri**.
2. Tunjukkan enam tahap berurutan: beli ikan, terima dan mutu, produksi, jual dan kirim, tagihan dan uang masuk, biaya lain.
3. Ketuk satu baris PO → terbuka PO-nya beserta nota.

**Katakan:**
> "Ini satu siklus utuh tanpa ketik ulang. Angka di sini ditarik dari catatan yang sama: dari berat yang ditimbang petugas sampai uang yang masuk. Kalau Bapak ragu dengan satu angka, ketuk saja sampai ketemu notanya."

---

## 9:30–11:30 · Uang: buku kas, laba rugi, tutup buku

**Lakukan:**
1. Menu **Keuangan** → buku kas. Tunjukkan bahwa **235 transaksi dari Monitor Dana** sudah masuk.
2. Menu **Laporan** → laba rugi per siklus (siklus uji). Ketuk satu baris biaya → transaksinya terbuka. Tunjukkan tombol **Unduh CSV**.
3. Tunjukkan bagian **Tutup buku** (jangan menutup apa pun), jelaskan saja.

**Katakan:**
> "Pembayaran pemasok, uang masuk dari pembeli, dan biaya yang Bapak setujui masuk buku kas otomatis. Laba kotor per siklus dihitung dengan format contoh laporan Siklus 1."

> "Kas di dashboard sekarang tampil minus karena setoran modal investor sengaja tidak diimpor. Ini perlu keputusan Bapak: dicatat sebagai modal masuk, atau diberi keterangan saja."

> "Akhir bulan, Bapak menutup buku. Setelah ditutup, transaksi bulan itu terkunci dan tidak bisa diubah siapa pun."

---

## 11:30–13:00 · Absensi

**Lakukan** (HP Anda, bila demo di Bungus; bila tidak, cukup tunjukkan layarnya):
1. Menu **Absensi** → **Absen masuk** → izinkan kamera dan lokasi → ambil foto.
2. Di HP owner: Absensi → **Rekap kehadiran** dan daftar absen hari ini dengan fotonya.

**Katakan:**
> "Absen memakai lokasi HP dan foto langsung, bukan dari galeri, dan jamnya dari server, jadi jam HP yang diubah tidak berpengaruh. Kalau di luar area kerja, absen ditolak dengan alasan yang jelas dan percobaannya tetap tercatat."

> "Izin, sakit, dan libur diajukan dari HP dan muncul di dashboard Bapak untuk diputuskan."

---

## 13:00–14:00 · Keamanan data

**Katakan** (tidak perlu layar):
> "Tidak ada data yang bisa dihapus. Salah catat dibatalkan dengan alasan, dan semua perubahan tercatat siapa dan kapan."

> "Setiap orang hanya melihat menu sesuai jabatannya. Petugas tidak melihat harga beli. Aturan ini dijaga di database, bukan hanya disembunyikan di layar."

> "Akun Bapak dan Finance memakai kode kedua di HP. Data dicadangkan otomatis setiap malam dan dienkripsi."

---

## 14:00–15:00 · Langkah berikutnya

**Katakan:**
> "Supaya bisa mulai dipakai, ada beberapa hal yang kita selesaikan sekarang juga."

**Lakukan bersama** (buka `docs/serah-terima.md`, tahap 1):
1. Owner **mengganti kata sandi sementara** sekarang juga.
2. **Buat akun tiap jabatan** di Akses dan kirim tautannya lewat WhatsApp.
3. Sepakati: data master (pemasok, pembeli, produk, grade), konfirmasi tarif simpan, dan keputusan setoran modal.
4. Sepakati siklus berikutnya **dicatat berdampingan dengan kertas**; di akhir siklus angkanya dicocokkan, lalu serah terima akhir (tahap 2).
5. Tanda tangan baris tahap 1.

---

## Pertanyaan yang mungkin muncul

| Pertanyaan | Jawaban |
| --- | --- |
| "Kalau internet mati?" | Timbang loin tetap bisa diisi dan tersimpan di HP, terkirim sendiri saat sinyal kembali. Menu lain butuh sinyal. |
| "Bisa dihapus kalau salah?" | Tidak dihapus, tapi dibatalkan dengan alasan atau dikoreksi. Riwayatnya tetap ada, supaya tidak ada yang hilang diam-diam. |
| "Berapa biaya bulanannya?" | Sekarang paket gratis. Batasnya: proyek database dijeda bila 7 hari tidak dipakai, dan ketentuan paket gratis Vercel untuk pemakaian non-komersial. Bila usaha makin besar, naik paket bisa diputuskan nanti. |
| "Kalau karyawan keluar?" | Akunnya dinonaktifkan di menu Akses, langsung tidak bisa masuk. Datanya tetap tersimpan. |
| "Laba bersihnya mana?" | Laba kotor per siklus sudah ada. Laba bersih butuh biaya bulanan (gaji tetap, listrik, sewa), penyusutan, dan aturan pajak dari Bapak. |
| "Kalau data hilang?" | Cadangan dibuat otomatis setiap malam. Kita juga akan melakukan uji pemulihan sekali sebelum serah terima akhir. |
| "Bisa tanya ke sistem?" | Bisa, lewat Asisten AI: misalnya "piutang mana yang terlambat?" atau "berapa hasil per ekor produksi terakhir?". Asisten hanya membaca, tidak bisa mengubah data. |
