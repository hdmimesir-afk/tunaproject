# Memulihkan cadangan dan mencocokkan angka

Cadangan dibuat tiap malam oleh `.github/workflows/backup.yml` (skema dan data, dienkripsi AES-256). Cadangan baru berguna kalau pernah dicoba dipulihkan. Lakukan uji ini sebelum dipakai sungguhan, lalu ulangi tiap kuartal.

## Yang disiapkan sekali

1. Variabel repo `BACKUP_AKTIF = true`; rahasia `SUPABASE_DB_URL` dan `BACKUP_PASSPHRASE` (simpan frasa sandi di tempat terpisah dari repo, dipegang minimal dua orang). Isi lewat GitHub: Settings > Secrets and variables > Actions. `SUPABASE_DB_URL` memakai tautan **Session pooler** dari tombol Connect di dashboard Supabase (bukan Direct connection, karena server GitHub tidak punya IPv6), dengan kata sandi database di dalamnya. Jangan ditempel ke chat.
2. Satu proyek Supabase kosong untuk uji pulih (jangan proyek asli). Paket gratis cukup.

## Langkah uji

1. Jalankan workflow **Cadangan harian** secara manual (Actions, Run workflow). Unduh artefak `cadangan-*.tar.gz.gpg`.
2. Buka enkripsi di komputer sendiri:

   ```bash
   gpg --batch --pinentry-mode loopback --passphrase "FRASA_SANDI" -o cadangan.tar.gz -d cadangan-TANGGAL.tar.gz.gpg
   tar xzf cadangan.tar.gz
   ```

3. Pulihkan ke proyek uji. Skema dulu, lalu data:

   ```bash
   psql "$PULIH_DB_URL" -f skema.sql
   psql "$PULIH_DB_URL" -f data.sql
   ```

4. Cocokkan angka utama. Isi di `.env.local`: `SUMBER_URL`, `SUMBER_SECRET_KEY`, `PULIH_URL`, `PULIH_SECRET_KEY`, lalu:

   ```bash
   npm run cocokkan-pulih
   ```

   Skrip hanya membaca. Ia membandingkan jumlah baris tiap tabel utama dan total uang serta berat (PO, bayar pemasok, invoice, uang masuk, buku kas, lot, loin, stok). Semua baris harus berstatus `OK`.
5. Catat tanggal uji, hasil, dan siapa yang menjalankan di bagian bawah berkas ini.
6. Hapus proyek uji bila tidak dipakai lagi, dan hapus berkas `skema.sql` / `data.sql` hasil buka enkripsi dari komputer.

## Bila ada angka yang beda

Jangan anggap cadangan sah. Periksa dulu apakah ada transaksi baru antara cadangan dan pembacaan angka asli (jalankan ulang cadangan lalu langsung cocokkan). Bila tetap beda, simpan keluaran skrip dan hubungi developer.

## Catatan uji

| Tanggal | Dijalankan oleh | Hasil |
| --- | --- | --- |
| (belum pernah) | | |
