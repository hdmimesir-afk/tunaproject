/* Isi laporan /update. Semua angka diambil dari repo dan CI per 26 Oktober 2026 (migrasi, berkas tes, riwayat commit,
   daftar task di docs/PRD.md, dan run cadangan di GitHub Actions). Tidak ada angka perkiraan. */

export const TANGGAL = "26 Oktober 2026";

/* ---------------------------------------------------------------- angka */
export const ANGKA = [
  { nilai: "101 dari 123", label: "tugas di daftar PRD sudah selesai (82 persen). Enam butir lain adalah daftar periksa tinjauan kode, bukan tugas." },
  { nilai: "23 dari 23", label: "kebutuhan fitur F01 sampai F23 sudah dibangun dan lulus tes otomatis." },
  { nilai: "15", label: "menu, 5 peran, dan 41 tabel database dengan hak akses yang dijaga di database." },
  { nilai: "463", label: "pemeriksaan di database (pgTAP, 14 berkas), ditambah 94 tes unit dan 24 skenario klik di laptop dan HP." },
] as const;

/* ------------------------------------------------------------ perjalanan */
export const PERJALANAN = [
  { tanggal: "14 Oktober", judul: "Penawaran", isi: "Deck penawaran dan demo aplikasi untuk laptop dan HP, termasuk ekspor PDF dan PPTX." },
  { tanggal: "21 Oktober", judul: "Rancangan dan PRD", isi: "Rancangan final, PRD, Formulir Produksi FRM-PRD-01 revisi 01, dan halaman bagi owner untuk menjawab dengan satu ketukan." },
  { tanggal: "22 Oktober", judul: "Keputusan owner dan fondasi", isi: "Jawaban owner dicatat: lima peran, tarif simpan Rp76 per kg per hari, paket gratis. Fase 0 dan 1 selesai: login, MFA, peran, data master, jejak perubahan, larangan hapus, header keamanan." },
  { tanggal: "23 Oktober", judul: "Fase 2 sampai 6, absensi, dan audit", isi: "Pembelian dan persetujuan, produksi per loin, stok dan gudang dingin, penjualan, keuangan dan laporan, dashboard, Asisten AI. Lalu impor Monitor Dana, tutup buku, absensi, tutup siklus, akun lewat tautan, dan audit terhadap PRD." },
] as const;

/* ------------------------------------------------------------------ modul */
export type Modul = { slug: string; nama: string; ringkas: string; poin: string[] };
export const MODUL: Modul[] = [
  {
    slug: "dashboard", nama: "Dashboard", ringkas: "Pemilik cukup memantau satu halaman ini.",
    poin: [
      "Bagian atas, Perlu tindakan Anda, memuat satu baris untuk setiap transaksi yang menunggu: PO yang diperiksa atau disetujui, biaya, koreksi stok, produksi yang menunggu QC atau Owner, lot menunggu cek mutu, pesanan belum dikirim, tagihan terlambat, buku bulan dan siklus yang siap ditutup, serta izin karyawan.",
      "Ketuk baris atau tombolnya dan halaman urusan itu terbuka. Untuk PO, barisnya disorot langsung di antrean persetujuan.",
      "Di bawahnya: kas bulan ini, piutang, utang ke pemasok, stok sendiri dan titipan, arus kas enam bulan, laba rugi siklus terbaru, dan jumlah transaksi tanpa nota.",
      "Setiap peran hanya melihat hal yang memang bisa ia tindak.",
    ],
  },
  {
    slug: "persetujuan", nama: "Persetujuan", ringkas: "Dua orang memutuskan, dan bukti ada di samping tombol.",
    poin: [
      "Alur: diajukan, diperiksa Finance, disetujui Owner. Bisa dikembalikan untuk revisi atau ditolak, dua-duanya dengan alasan tertulis.",
      "Kartu menampilkan nota, harga per kilo, dan peringatan bila harga naik dibanding PO terakhir yang disetujui untuk pemasok yang sama.",
      "Setuju massal: pilih beberapa kartu, lalu layar konfirmasi menampilkan daftar, jumlah, dan total nilai sebelum disetujui.",
      "Disetujui tidak berarti dibayar. Pembayaran dicatat terpisah oleh Finance.",
      "Ikan yang datang malam sebelum PO disetujui (bongkar malam) tampil sebagai daftar tersendiri.",
    ],
  },
  {
    slug: "pembelian", nama: "Pembelian", ringkas: "PO, nota, dan pembayaran pemasok.",
    poin: [
      "PO berisi pemasok, berat, harga per kilo, nota, dan siklus. Harga tersimpan di PO saat diajukan, jadi harga baru tidak mengubah PO lama.",
      "Tiga status berdiri sendiri: persetujuan, penerimaan (belum, sebagian, selesai), dan pembayaran (belum, sebagian, lunas).",
      "Pembayaran dicatat Finance, bisa dicicil, dan ditolak bila melebihi nilai PO atau PO belum disetujui.",
      "Petugas lapangan tidak melihat harga. Mereka hanya melihat PO yang siap diterima, tanpa nilainya.",
    ],
  },
  {
    slug: "mutu", nama: "Mutu dan Penerimaan", ringkas: "Dari ikan datang sampai lot lulus mutu.",
    poin: [
      "Penerimaan menjadi lot dan boleh sebagian. Lot dari bongkar malam diberi tanda sebelum disetujui.",
      "Cek mutu oleh QC: lulus dengan kelas grade, atau ditahan dengan catatan.",
      "Hanya lot yang lulus dan masih punya sisa berat yang bisa dipakai untuk produksi.",
    ],
  },
  {
    slug: "produksi", nama: "Produksi", ringkas: "Timbang per potong loin dan lihat selisih apa adanya.",
    poin: [
      "Produksi dimulai dari satu atau beberapa lot. Satu lot bisa masuk ke beberapa produksi dan sebaliknya, dan keduanya ditelusuri dua arah.",
      "Grid loin mengikuti FRM-PRD-01: nomor ekor (boleh kosong), nomor loin, grade, berat tiga desimal. Cukup keyboard: Enter pindah ke baris berikutnya, total otomatis per grade dan per ekor.",
      "Draf tersimpan di HP saat sinyal putus dan terkirim sendiri saat kembali. Bila dua petugas mengedit baris yang sama, yang membawa versi lama tidak menimpa. Setiap koreksi tercatat sebelum dan sesudahnya.",
      "Neraca: ikan masuk sama dengan loin ditambah hasil samping, limbah, susut tercatat, dan selisih belum jelas. Selisih itu sisa hitungan dan tidak pernah diisi otomatis. Hasil di luar 40 sampai 80 persen ditandai untuk diperiksa; rencana hasil 60 persen.",
      "Setelah petugas menyelesaikan, QC memeriksa lalu Owner menyetujui. Yang menimbang tidak boleh memeriksa produksi yang sama. Formulir bisa dicetak dan grid bisa diunduh sebagai CSV.",
    ],
  },
  {
    slug: "stok", nama: "Stok", ringkas: "Setiap kilo punya pemilik, kondisi, dan lokasi.",
    poin: [
      "Unit simpan per pemilik (sendiri atau pelanggan), produk, grade, fresh atau beku, dan lokasi.",
      "Hasil produksi masuk stok hanya setelah produksinya disetujui. Ikan fresh boleh langsung dikirim tanpa masuk gudang.",
      "Pengambilan penuh atau sebagian dengan berat timbang ulang. Koreksi stok baru berlaku setelah Owner menyetujui.",
    ],
  },
  {
    slug: "gudang", nama: "Gudang Dingin", ringkas: "Titipan pelanggan, tarif, dan jadwal mesin.",
    poin: [
      "Titipan pelanggan masuk dan keluar. Kapasitas 17.500 kg dijaga: titipan baru ditolak bila stok sendiri ditambah titipan melebihi batas.",
      "Tarif disimpan sebagai pengaturan, bukan rumus tetap: simpan Rp76 per kg per hari dengan minimum 10 hari, dan ABF Rp3.500 per kg. Minimum 10 hari masih angka proposal dan belum dikonfirmasi owner. Data yang sama selalu menghasilkan tagihan yang sama.",
      "Invoice jasa menampilkan cara hitungnya.",
      "Jadwal ABF dan produksi mitra mendeteksi bentrok dan bisa memindah ke jam kosong pertama.",
    ],
  },
  {
    slug: "penjualan", nama: "Penjualan", ringkas: "Pesanan, kirim, tagihan, dan uang masuk.",
    poin: [
      "Pesanan diambil dari stok dan tidak boleh melebihi stok yang tersedia setelah dikurangi pesanan draf lain. Satu pesanan boleh berasal dari beberapa produksi.",
      "Pengiriman mengisi berat kirim hasil timbang dan, bila ada, berat diterima pembeli. Invoice memakai berat diterima bila dicatat.",
      "Invoice jatuh tempo 14 hari. Status tagihan: belum jatuh tempo, jatuh tempo, terlambat, lunas. Pembayaran boleh sebagian dan dilampiri bukti transfer.",
    ],
  },
  {
    slug: "keuangan", nama: "Keuangan", ringkas: "Biaya dengan nota, buku kas, dan tutup buku.",
    poin: [
      "Biaya dibagi delapan kategori. Kategori yang mewajibkan nota tidak bisa diajukan tanpa nota. Biaya bisa dihubungkan ke PO, produksi, atau siklus, dan ditolak bila siklusnya tidak cocok.",
      "Biaya baru berlaku setelah Owner menyetujui. Pembayaran pemasok, uang masuk dari pembeli, dan biaya yang disetujui masuk buku kas otomatis.",
      "Tutup buku per bulan: berurutan dari bulan tertua, hanya setelah bulannya berakhir. Bulan yang ditutup terkunci di database dan hanya Owner yang bisa membukanya dengan alasan.",
      "Sebanyak 235 transaksi uang keluar dari Monitor Dana sudah diimpor ke buku kas.",
    ],
  },
  {
    slug: "laporan", nama: "Laporan", ringkas: "Laba rugi per siklus yang bisa diketuk sampai transaksinya.",
    poin: [
      "Laba rugi per siklus mengikuti contoh laporan Siklus 1: pendapatan per grade dan hasil samping, biaya langsung, laba kotor, margin, angka per kilo loin, dan harga jual minimal.",
      "Setiap baris bisa diketuk untuk melihat transaksinya. Unduhan CSV memakai angka yang sama dengan layar.",
      "Tren antarsiklus, harga beli rata-rata tertimbang per periode, jenis, grade, dan pemasok, serta simulasi harga ikan dan dampaknya pada laba.",
      "Laba bersih tampil sebagai belum bisa dihitung sampai biaya bulanan, penyusutan, dan pajak tersedia.",
    ],
  },
  {
    slug: "siklus", nama: "Rincian Siklus", ringkas: "Satu siklus dari beli ikan sampai uang masuk.",
    poin: [
      "Enam tahap dalam satu layar: beli ikan, terima dan mutu, produksi, jual dan kirim, tagihan dan uang masuk, biaya lain. Semuanya ditarik dari catatan yang sama, tanpa input ulang.",
      "Owner bisa menutup siklus. Database menolak bila masih ada PO belum diputuskan atau belum lunas, produksi belum disetujui, pesanan belum dikirim, tagihan belum lunas, atau biaya belum diputuskan. Siklus yang ditutup tidak bisa menerima PO, pesanan, atau biaya baru sampai dibuka kembali dengan alasan.",
    ],
  },
  {
    slug: "asisten", nama: "Asisten AI", ringkas: "Bertanya dengan kalimat biasa, hanya membaca.",
    poin: [
      "Delapan alat baca: piutang terlambat, saldo kas, hasil per ekor, jadwal bentrok, yang menunggu keputusan, isi gudang dingin, transaksi tanpa nota, dan biaya serta laba satu siklus.",
      "Setiap pertanyaan memakai izin penggunanya, jadi jawabannya tidak melebihi apa yang boleh ia lihat. Asisten tidak bisa mengubah data, dan ada batas pertanyaan per hari.",
      "Jawaban disusun dengan tabel atau paragraf yang ringkas.",
    ],
  },
  {
    slug: "absensi", nama: "Absensi", ringkas: "Lokasi dari GPS, foto dari kamera, waktu dari server.",
    poin: [
      "Absen masuk dan pulang dengan GPS perangkat dan foto yang diambil langsung dari kamera, bukan dari galeri. Tanpa peta pihak ketiga: jarak ke titik kerja dihitung di database.",
      "Ditolak bila di luar radius atau GPS kurang akurat, dengan alasan yang jelas. Percobaan yang ditolak ikut tersimpan. Satu absen masuk dan satu pulang per hari.",
      "Izin, sakit, dan libur diajukan dari HP dan diputuskan Owner. Super Admin dan Owner melihat rekap bulanan (hadir, terlambat, izin, sakit, tidak hadir) dan daftar absen harian beserta foto. Hari kerja Senin sampai Sabtu.",
      "Super Admin menandai lokasi kerja dengan tombol lokasi saya sekarang, lalu mengatur radius, batas akurasi, jam masuk, dan toleransi terlambat.",
    ],
  },
  {
    slug: "akses", nama: "Akses", ringkas: "Akun, peran, dan tautan aktivasi tanpa email.",
    poin: [
      "Super Admin membuat akun dengan nama, email sebagai nama masuk, dan jabatan. Sistem menghasilkan tautan sekali pakai, berlaku 24 jam, yang dikirim lewat WhatsApp. Penerima membuat kata sandinya sendiri.",
      "Lupa sandi: Super Admin membuat tautan atur sandi baru. Akun orang yang keluar dinonaktifkan, tidak dihapus. Akun Owner hanya bisa dibuat dan diatur oleh Owner.",
      "Owner dan Finance wajib memakai kode kedua dari aplikasi autentikator. Pendaftaran mandiri ditutup.",
    ],
  },
  {
    slug: "pengaturan", nama: "Pengaturan", ringkas: "Data master dan target hasil.",
    poin: [
      "Pemasok, pembeli, produk, grade, kategori hasil samping, dan kategori biaya. Data master tidak dihapus, hanya dinonaktifkan.",
      "Target hasil olahan 60 persen dan batas wajar 40 sampai 80 persen disimpan sebagai pengaturan.",
    ],
  },
];

/* ------------------------------------------------------------ peran dan menu */
export const PERAN = ["Owner", "Finance", "Super Admin", "Kepala Produksi dan QC", "Petugas Lapangan"] as const;
/* Diturunkan dari tabel role_permissions di migrasi: menu terlihat bila peran punya izin baca modulnya. Owner memegang semua izin. */
const SEMUA = [true, true, true, true, true];
export const MATRIKS: { menu: string; ada: boolean[] }[] = [
  { menu: "Dashboard", ada: SEMUA },
  { menu: "Persetujuan", ada: [true, true, true, false, false] },
  { menu: "Pembelian", ada: [true, true, true, false, false] },
  { menu: "Mutu dan Penerimaan", ada: SEMUA },
  { menu: "Produksi", ada: SEMUA },
  { menu: "Stok", ada: SEMUA },
  { menu: "Gudang Dingin", ada: SEMUA },
  { menu: "Penjualan", ada: SEMUA },
  { menu: "Keuangan", ada: [true, true, true, false, false] },
  { menu: "Laporan", ada: [true, true, true, false, false] },
  { menu: "Rincian Siklus", ada: SEMUA },
  { menu: "Asisten AI", ada: SEMUA },
  { menu: "Absensi", ada: SEMUA },
  { menu: "Akses", ada: [true, false, true, false, false] },
  { menu: "Pengaturan", ada: SEMUA },
];
export const TUGAS_PERAN = [
  { peran: "Owner", isi: "Memegang semua izin. Penyetuju akhir PO, biaya, koreksi stok, produksi, dan izin karyawan; menutup buku dan siklus. Wajib kode kedua." },
  { peran: "Finance", isi: "Memeriksa persetujuan, membayar pemasok, menerbitkan invoice, mencatat uang masuk, dan mengajukan biaya. Wajib kode kedua." },
  { peran: "Super Admin", isi: "Mengurus akun, data master, pembuatan PO dan pesanan jual, lokasi kerja absensi, dan rekap kehadiran." },
  { peran: "Kepala Produksi dan QC", isi: "Cek mutu lot, memeriksa neraca produksi sebelum Owner, dan mengajukan koreksi stok." },
  { peran: "Petugas Lapangan", isi: "Menerima dan menimbang ikan, mengisi grid loin dan komponen hasil, mencatat kirim dan titipan. Tidak melihat harga." },
] as const;

/* ------------------------------------------------------------ kualitas */
export const KUALITAS = [
  { judul: "Database yang menjaga aturan", isi: "Semua 41 tabel memakai keamanan tingkat baris yang dipaksa. Tidak ada hak hapus di tabel mana pun, dan setiap perubahan tercatat siapa, kapan, sebelum dan sesudahnya. Aturan bisnis seperti setuju, kirim, bayar, dan tutup buku berjalan di 58 fungsi database, bukan hanya di tampilan." },
  { judul: "Akses berlapis", isi: "Izin dicek di halaman, di setiap aksi di server, dan di database. Kunci rahasia hanya ada di server. Nota dan foto absen disimpan di penyimpanan privat dan dibuka lewat tautan yang hangus dalam 60 detik. Login dibatasi 30 percobaan per 5 menit per alamat." },
  { judul: "Angka yang tidak bergeser", isi: "Berat disimpan tiga desimal dan dihitung dalam gram bulat, uang dua desimal, tanpa bilangan pecahan biner. Tes memeriksa 500 loin berdesimal tiga: total di grid, rekap per grade dan ekor, neraca, dan CSV sama persis." },
  { judul: "Satu siklus diuji dari awal sampai akhir", isi: "Tes database menjalankan PO sampai uang masuk lewat lima peran, lalu mencocokkan angka di neraca, stok, invoice, rincian siklus, laba rugi, dashboard, dan buku kas. Perubahan saldo kas harus sama dengan laba kotor." },
  { judul: "Pemeriksaan otomatis di setiap perubahan", isi: "Tiga pekerjaan berjalan di GitHub pada setiap push: pemeriksaan tipe, lint, tes unit, dan audit paket; tes database; dan tes klik di laptop dan HP dengan database lokal. Pemeriksaan terakhir hijau. Dependabot menyiapkan pembaruan paket tiap Senin." },
  { judul: "Cadangan harian", isi: "Database dicadangkan tiap malam dan dienkripsi AES-256. Empat run tercatat berhasil, tiga di antaranya terjadwal otomatis, dan cadangan terbaru berukuran sekitar 90 KB. Uji pemulihan ke proyek kosong belum dilakukan." },
] as const;

/* ------------------------------------------------------------- produksi */
export const LIVE = [
  "Situs sistem hidup di internet dan tersambung ke database. Tamu yang membuka menu dialihkan ke halaman masuk.",
  "Semua 15 migrasi database sudah terpasang, termasuk absensi dan perbaikan hasil audit.",
  "Monitor Dana: 235 transaksi uang keluar sudah ada di buku kas.",
  "Satu lokasi kerja absensi sudah ditandai untuk Cold Storage Bungus.",
  "Akun Owner sudah memakai kode kedua. Akun peran lain dibuat saat serah terima lewat menu Akses.",
] as const;

/* ------------------------------------------------------------ yang belum */
export const BELUM = [
  { judul: "Dicoba orang di lapangan", isi: "Grid loin di HP petugas saat sinyal lemah, serta absen dengan kamera dan GPS di lokasi, baru diuji dengan perangkat tiruan di CI. Belum ada uji di perangkat asli." },
  { judul: "Satu siklus asli berdampingan dengan kertas", isi: "Angka loin, neraca, tagihan, dan kas belum dicocokkan dengan catatan kertas. Ini syarat serah terima akhir." },
  { judul: "Bahan dari owner", isi: "Data master asli, foto formulir timbang Siklus 1 per loin untuk impor, catatan susut, dan biaya bulanan serta aturan pajak agar laba bersih bisa dihitung." },
  { judul: "Keputusan owner", isi: "Konfirmasi minimum hari tarif simpan, cara mencatat setoran modal investor di dashboard, dan berapa lama foto absen disimpan." },
  { judul: "Uji pemulihan cadangan", isi: "Cadangan sudah ada, tetapi belum dibuktikan bisa dipulihkan. Butuh satu proyek database kosong." },
  { judul: "Pengamanan akun saat serah terima", isi: "Pembuatan akun semua jabatan dan penggantian kata sandi awal diselesaikan bersama owner." },
  { judul: "Batas paket gratis", isi: "Hosting dan database memakai paket gratis atas keputusan pemilik. Ketentuan paket gratis hosting untuk pemakaian non-komersial, dan proyek database yang sepi tujuh hari bisa dijeda. Risiko ini diterima dan dicatat di PRD." },
  { judul: "Pekerjaan teknis kecil", isi: "Pembatasan skrip pada kebijakan keamanan konten, dan satu peringatan mode pengembangan yang tidak muncul di situs hidup." },
] as const;

export const BERIKUTNYA = [
  { tahap: "Tahap 1", judul: "Mulai dipakai berdampingan", isi: "Ganti kata sandi awal, buat akun tiap jabatan, isi data master, konfirmasi tarif, simpan frasa sandi cadangan di dua orang, dan latihan singkat per peran." },
  { tahap: "Tahap 2", judul: "Serah terima akhir", isi: "Satu siklus asli dicatat berdampingan dengan kertas dan dicocokkan, absensi dicoba di lokasi, uji pemulihan cadangan dijalankan, dan temuan diperbaiki." },
] as const;
