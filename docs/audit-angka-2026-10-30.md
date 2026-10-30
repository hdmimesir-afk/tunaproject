# Audit angka dan informasi, 30 Okt 2026

Diperiksa: migrasi `20261101000200_ruangan_penunjang.sql` lewat PGlite dengan semua migrasi dan tes pgTAP, serta lapisan aplikasi (tsc, eslint, vitest 94 lulus).

## Yang ditemukan dan sudah diperbaiki
1. **Hasil olahan dibagi ikan yang dipesan, bukan yang diolah.** Di dashboard owner dan tren siklus, persen hasil memakai kg di PO. Kini memakai `kg_diolah` (ikan yang benar-benar masuk produksi) bila ada; harga ikan per kg tetap memakai kg yang dibeli karena biayanya dari PO. File: `v_laba_rugi_siklus` (migrasi), `DashboardOwner.tsx`, `lib/logic/labarugi.ts`.
2. **Ekspor CSV rawan rumus.** Teks yang diawali `= + - @` dibaca Excel sebagai rumus. `buatCsv` kini menambah apostrof di depan teks seperti itu; angka tidak diubah. File: `lib/logic/grid.ts`.
3. **Nama periode laporan.** Pemeriksaan `in` ikut menerima nama bawaan objek; diganti `Object.hasOwn`. File: `lib/asisten/alat.ts`.
4. **Kapasitas gudang** kini dihitung dari ruangan aktif (`private.kapasitas_total()`), jadi angka di dashboard, Gudang, dan Asisten sama.

## Perlu keputusan atau tindak lanjut (belum diubah)
- **Jadwal mesin** masih satu mesin untuk semua ruangan ABF, belum per ruangan.
- **Penulisan kg** masih bercampur dua fungsi (`tampilKg` tiga desimal tetap, `formatKg` yang membuang nol di belakang). Keduanya benar; hanya tampilannya tidak seragam antarhalaman.
- **Buku kas** menampilkan paling banyak 400 baris terakhir; saldo tetap dihitung dari seluruh data di database, bukan dari baris yang tampil.
- **Nomor surat/invoice berurutan tanpa celah** belum dibuat; menunggu keputusan jenis dokumen dan format.
- **Stok awal barang penunjang** adalah contoh. Ganti lewat "Koreksi" setelah daftar asli dikirim.

## Pernyataan di halaman /update
Catatan MFA di `components/update/isi.ts` sudah sesuai kondisi sekarang (MFA dihapus 27 Okt 2026).
