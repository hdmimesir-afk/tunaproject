# KATALIS ERP

Satu aplikasi Next.js untuk PT Katalis Lintas Global, berisi empat bagian:

| Rute | Isi | Status |
| --- | --- | --- |
| `/` (diarahkan ke `/dashboard`) | Sistem KATALIS ERP: pembelian, mutu, produksi, stok, penjualan, keuangan, laporan | Fase 0 selesai: kerangka dan modul placeholder |
| `/penawaran` | Deck penawaran 15 slide | Dibekukan |
| `/rancangan`, `/PRD` | Halaman owner: rancangan final, jawaban lewat WhatsApp, dan PRD | Aktif |
| `/demo` | Demo aplikasi desktop dan HP dengan data contoh | Dibekukan |

Acuan pembangunan sistem: `docs/PRD.md` dan dokumen Fase Pembangunan. Aturan kode untuk developer dan AI coding agent ada di `AGENTS.md`.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # opsional sampai Supabase disiapkan (Fase 1)
npm run dev
```

Buka http://localhost:3100. Tanpa `.env.local`, sistem tetap jalan dan menampilkan kerangka modul.

| Perintah | Isi |
| --- | --- |
| `npm run typecheck` | TypeScript 7 (`@typescript/native`); paket `typescript` berisi API TS 6 untuk ESLint |
| `npm run lint` | ESLint untuk kode sistem ERP (halaman presentasi dikecualikan) |
| `npm test` | Tes logika Vitest, termasuk neraca Siklus 1 |
| `npm run test:db` | Tes pgTAP; perlu `supabase db start` (Docker) |
| `npm run build` | Build produksi (Cache Components aktif) |

## Sistem ERP

Stack: Next.js 16.4.2, React 19.3.1, Tailwind 4.3.3, TypeScript 7.0.2, Supabase (`@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7, CLI 2.121.0), Zod 4.6.7, Dexie 4.4.6, Vitest 5.0.5, Playwright 1.64.1, ESLint 10.13.0.

```
app/(auth)/login          halaman masuk (diisi Fase 1)
app/(app)/<modul>         satu folder per modul ERP
components/ui             komponen tampilan sistem (salinan bersih dari components/demo)
components/shell          menu dan kerangka
lib/env.ts                variabel lingkungan publik (Zod)
lib/supabase              klien server (cookie getAll/setAll) dan browser
lib/logic                 rumus murni + tes
lib/modules.ts            daftar modul dan fasenya
proxy.ts                  menyegarkan sesi Supabase saja, bukan pengaman
supabase/                 konfigurasi CLI, migrasi, tes pgTAP
.github/workflows/ci.yml  typecheck, lint, tes, audit, build, pgTAP
```

Supabase dan Vercel belum disiapkan (ditunda). Saat disiapkan: dua proyek Supabase Free region Singapura (uji dan produksi) dengan kunci `sb_publishable_` dan `sb_secret_`, lalu impor repo ke Vercel dan isi variabel lingkungan per lingkungan.

Context7 untuk Claude Code:

```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

## Penawaran (deck)

> Penawaran atas nama **Dar Dev**, tampilan **monokrom** (hitam, putih, abu).

Deck interaktif 15 slide untuk PT Katalis Lintas Global, usaha perikanan Bungus. Layout dan bahasa telah disusun ulang untuk pembaca awam: fitur yang diusulkan, cara kerja sistem, dan masalah pekerjaan yang ingin dibantu.

Harga, jadwal, dan ketentuan adalah estimasi awal yang perlu disepakati. Fitur bukan bukti sistem sudah diterapkan; contoh bukan transaksi nyata.

Buka http://localhost:3100/penawaran.

Kontrol: panah / PageUp / PageDown / Spasi, Home / End, F untuk layar penuh, G untuk ringkasan, Esc untuk menutup ringkasan. URL #12 membuka slide 12. Rute /print tersedia untuk tampilan cetak.

## Sumber aktif dan dokumentasi

- data/slides/index.ts mengekspor data/slides/redesigned.ts: seluruh 15 slide yang digunakan viewer.
- lib/kit.ts menyimpan warna dan primitif scene graph; kanvas 1920 × 1080.
- DESIGN.md dan .impeccable/design.json mendokumentasikan sistem visual saat ini.
- docs/scope-assumptions.md memuat paket, harga, termin, asumsi, dan contoh hitungan.
- docs/implementation-notes.md menjelaskan batas implementasi.
- docs/source/ menyimpan proposal sumber dan ekstraksi teksnya.

Font Google Sans (Regular 400), navy, biru laut, dan teal dipertahankan. Hierarki memakai ukuran, warna, dan bidang tonal.

## Batas keluaran

File PPTX/PDF dan dokumen sumber otomatis yang sudah ada berasal dari pekerjaan sebelumnya. Tidak dibuat ulang atau diverifikasi ulang untuk redesign ini; jangan gunakan sebagai salinan redesign localhost. Script ekspor tetap tersedia di repositori, tetapi ekspor bukan bagian dari pengiriman ini.

## Font dan tampilan

Deck memakai **Google Sans** (bobot 400, 500, 600, 700; judul besar memakai 700). Untuk PPTX, pasang font dari `output/fonts/` (Google Sans, Medium, SemiBold, Bold); PDF dan viewer web sudah memuat fontnya sendiri.

## Demo aplikasi (terpisah dari deck)

Tiga halaman, satu data bersama (`lib/demo/store.ts`). Aksi di satu tampilan langsung terlihat di tampilan lain, karena data disimpan di perangkat dan disinkronkan antar jendela.

- `/demo` : aplikasi ponsel gaya native (menu bawah kaca, panel geser, notifikasi).
- `/demo/desktop` : versi desktop dengan sidebar dan semua modul.
- `/demo/live` : keduanya berdampingan, untuk dipamerkan ke owner.

Modul lengkap: Dashboard, Persetujuan, Pembelian, Produksi, Mutu & Asal, Stok, Penjualan, Gudang Dingin, Keuangan (tutup buku), Jadwal, Skenario, Akses, dan Laporan (unduh CSV). Semua tombol berfungsi. Alur contoh: buat pembelian, Owner menyetujui, terima ikan, cek mutu, mulai dan selesaikan produksi, buat pesanan, kirim, catat pembayaran, tutup buku.

Peran (Owner, Pembelian, Gudang, Keuangan) membatasi tombol: tombol yang tidak diizinkan dinonaktifkan. Semua angka adalah data contoh, kecuali yang berlabel Siklus 1. Tombol "Ulangi demo" mengembalikan data awal. Lokal: `npm run dev -- -p 3100`.

### Akses demo dari deck

Di viewer web (`/`) ada tombol hijau **Buka demo** di bilah bawah (demo ponsel, desktop, atau berdampingan). Slide 2 (dashboard), slide 3 (ponsel), dan slide penutup juga punya tombol ▶ langsung di atas slide. Tombol hanya ada di viewer web; di PDF dan PPTX tidak ada tautan karena alamat publiknya belum ada.

### Dibuka di ponsel

Di layar ponsel tegak, viewer otomatis berganti ke **mode ponsel**: slide muncul selebar layar dengan tombol **Perbesar** (cubit dan geser), geser kiri-kanan untuk pindah slide, teks isi slide yang mudah dibaca di bawahnya, menu untuk membuka demo, **Unduh PDF**, dan **Lihat semua slide**. Di ponsel mendatar, slide tampil penuh seperti biasa dan bisa digeser. File PDF disajikan dari `public/KATALIS-ERP-Proposal.pdf` (disalin otomatis oleh `npm run export`).

Catatan mode ponsel (diperbarui): tampilan ponsel tegak bukan lagi slide yang dikecilkan, melainkan kartu layar penuh yang dirancang ulang per slide (huruf besar, poin singkat, grafik asli, tangkapan layar demo). Geser ke atas untuk lanjut. Kode: `components/MobileDeck.tsx`; gambar: `public/mobile/`.

### Transisi

Tidak ada transisi: slide dan kartu langsung tampil. PDF dan PPTX tetap statis.

### Demo menurut perangkat

- **Desktop:** menu "Buka demo" menawarkan *Demo desktop* (`/demo/desktop`) dan *Demo dua mode* (`/demo/live`, desktop dan ponsel berdampingan dan sinkron).
- **Ponsel:** hanya demo ponsel. Dari pitch, demo terbuka layar penuh di atas pitch (mencoba layar penuh asli di Android, tombol "Kembali ke pitch" untuk kembali). Tanpa status bar palsu dan mengikuti area aman layar. Untuk iOS, pilih "Tambahkan ke Layar Utama" agar tanpa bilah browser.
- Membuka `/demo` langsung di ponsel juga memakai tampilan layar penuh ini.

- Rancangan pembangunan dari nol sampai serah terima: `docs/rancangan-pembangunan.md` (internal).
