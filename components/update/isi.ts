/* Isi laporan /update. Ditulis dengan suara pengembang yang melapor langsung ke owner: "saya" untuk yang saya kerjakan, "kita" untuk yang
   disepakati bersama, dan "owner" untuk pemilik usaha. Kalimat pendek, bahasa sehari-hari, tanpa istilah teknis.
   Angka diambil dari hasil pemeriksaan sistem per 26 Oktober 2026 (jumlah menu, jabatan, tes, dan catatan kas yang diimpor).
   Tidak ada angka perkiraan. Pembaruan 27 Oktober dicatat terpisah di PERJALANAN. */

export const TANGGAL = "26 Oktober 2026";

/* ---------------------------------------------------------------- angka */
export const ANGKA = [
  { nilai: "23 dari 23", label: "fitur yang kita sepakati sudah selesai saya bangun, dan semuanya lulus uji." },
  { nilai: "15", label: "menu sudah siap dipakai. Ada 5 jabatan, dan tiap jabatan cuma melihat menu yang memang urusannya." },
  { nilai: "235", label: "catatan uang keluar dari Monitor Dana sudah saya masukkan ke buku kas, jadi riwayat lama tidak perlu diketik ulang." },
  { nilai: "581", label: "pemeriksaan otomatis lulus semua, termasuk satu putaran penuh dari beli ikan sampai uang masuk." },
] as const;

/* ------------------------------------------------------------ perjalanan */
export const PERJALANAN = [
  { tanggal: "14 Oktober", judul: "Penawaran", isi: "Saya mulai dari penawaran dan contoh aplikasi di laptop dan HP, supaya owner bisa membayangkan dulu seperti apa sistemnya sebelum saya bangun." },
  { tanggal: "21 Oktober", judul: "Rancangan disepakati", isi: "Rancangan akhir dan formulir timbang produksi saya susun. Pertanyaan untuk owner saya buat supaya cukup dijawab dengan satu ketukan." },
  { tanggal: "22 Oktober", judul: "Jawaban owner masuk", isi: "Jawaban owner langsung saya tuangkan ke sistem: lima jabatan, tarif simpan Rp76 per kg per hari, dan pakai paket gratis. Fondasinya saya pasang sekalian: login, pengaturan jabatan, data master, catatan perubahan, dan larangan menghapus data." },
  { tanggal: "23 Oktober", judul: "Seluruh alur kerja jadi", isi: "Hari ini paling padat. Pembelian dan persetujuan, produksi per potong loin, stok dan gudang dingin, penjualan, keuangan dan laporan, dashboard, sampai Asisten AI. Lalu catatan Monitor Dana, tutup buku, absensi, tutup siklus, dan pembuatan akun lewat tautan." },
  { tanggal: "27 Oktober", judul: "Tampilan saya rapikan", isi: "Menu samping saya buat baru, dengan logo dan pengelompokan. Tampilan HP saya bedakan dari laptop. Buku kas jadi per hari, daftar lot dan penjualan lebih jelas, di menu Akses sekarang bisa ganti email dan lepas jabatan, dan saya siapkan data contoh untuk latihan." },
] as const;

/* ------------------------------------------------------------------ modul */
export type Modul = { slug: string; nama: string; ringkas: string; poin: string[] };
export const MODUL: Modul[] = [
  {
    slug: "dashboard", nama: "Dashboard", ringkas: "Satu halaman untuk owner memantau semuanya.",
    poin: [
      "Di bagian atas ada daftar \"Perlu tindakan Anda\" (tulisan ini memang begitu di layar). Isinya semua yang menunggu keputusan: pembelian yang belum disetujui, biaya, koreksi stok, produksi yang menunggu, ikan yang belum dicek mutunya, tagihan yang telat, dan izin karyawan. Satu urusan satu baris.",
      "Ketuk barisnya, dan owner langsung dibawa ke urusan itu. Untuk pembelian, barisnya sudah saya sorot di antrean persetujuan.",
      "Di bawahnya ada uang kas bulan ini, piutang, utang ke pemasok, stok sendiri dan titipan, arus kas enam bulan, laba rugi siklus terbaru, dan jumlah transaksi yang belum ada notanya.",
      "Tiap jabatan hanya melihat hal yang memang bisa ia kerjakan.",
    ],
  },
  {
    slug: "persetujuan", nama: "Persetujuan", ringkas: "Dua orang memutuskan, dan buktinya ada di samping tombol.",
    poin: [
      "Alurnya: diajukan, diperiksa Finance, lalu disetujui owner. Bisa dikembalikan untuk diperbaiki atau ditolak, dua-duanya harus pakai alasan tertulis.",
      "Setiap kartu menampilkan nota dan harga per kilo. Kalau harga naik dibanding pembelian terakhir dari pemasok yang sama, ada peringatannya.",
      "Mau menyetujui banyak sekaligus? Pilih beberapa kartu. Sistem akan menampilkan daftar, jumlah, dan total nilainya dulu sebelum disetujui.",
      "Disetujui belum berarti dibayar. Pembayaran dicatat terpisah oleh Finance.",
      "Ikan yang datang malam sebelum persetujuan (bongkar malam) saya tampilkan di daftar sendiri, supaya tidak terlewat.",
    ],
  },
  {
    slug: "pembelian", nama: "Pembelian", ringkas: "Pesanan ke pemasok, nota, dan pembayarannya.",
    poin: [
      "Tiap pesanan berisi pemasok, berat, harga per kilo, nota, dan siklusnya. Harganya dikunci saat diajukan, jadi kalau harga naik kemudian, pesanan lama tidak ikut berubah.",
      "Ada tiga hal yang dicatat terpisah: sudah disetujui atau belum, ikannya sudah diterima (belum, sebagian, lengkap), dan sudah dibayar (belum, sebagian, lunas).",
      "Finance bisa mencicil pembayaran. Sistem menolak kalau bayarnya melebihi nilai pesanan, atau pesanannya belum disetujui owner.",
      "Petugas lapangan tidak melihat harga. Mereka cuma melihat pesanan yang siap diterima, tanpa nilainya.",
    ],
  },
  {
    slug: "mutu", nama: "Mutu dan Penerimaan", ringkas: "Dari ikan datang sampai dinyatakan lulus mutu.",
    poin: [
      "Ikan yang diterima dicatat sebagai lot, dan boleh diterima bertahap. Lot dari bongkar malam saya beri tanda khusus.",
      "QC menilai tiap lot: lulus dengan kelas mutunya, atau ditahan dengan catatan.",
      "Hanya lot yang lulus dan masih ada sisanya yang bisa dipakai untuk produksi.",
    ],
  },
  {
    slug: "produksi", nama: "Produksi", ringkas: "Menimbang loin per potong, dan selisih terlihat apa adanya.",
    poin: [
      "Produksi dimulai dari satu atau beberapa lot. Owner bisa menelusuri dua arah: dari lot ke produksinya, dan dari produksi kembali ke lot asalnya.",
      "Tabel timbangnya saya samakan dengan formulir kertas yang sudah dipakai: nomor ekor, nomor loin, grade, dan berat sampai tiga angka di belakang koma. Cukup pakai keyboard, dan total per grade serta per ekor terhitung sendiri.",
      "Kalau sinyal putus, catatan tetap tersimpan di HP dan terkirim sendiri begitu sinyal kembali. Dua petugas yang mengedit baris yang sama tidak saling menimpa, dan setiap koreksi mencatat angka sebelum dan sesudahnya.",
      "Ada neraca berat: ikan masuk harus sama dengan loin, hasil samping, limbah, dan susut yang ditimbang. Sisanya tampil sebagai \"selisih belum jelas\", dan tidak pernah saya isi otomatis. Hasil di luar 40 sampai 80 persen ditandai untuk diperiksa, dengan target 60 persen.",
      "Setelah petugas selesai menimbang, QC memeriksa, lalu owner menyetujui. Yang menimbang tidak boleh memeriksa produksi yang sama. Formulirnya bisa dicetak, dan tabelnya bisa diunduh ke Excel.",
    ],
  },
  {
    slug: "stok", nama: "Stok", ringkas: "Setiap kilo punya pemilik, kondisi, dan lokasi.",
    poin: [
      "Stok dicatat per pemilik (milik sendiri atau titipan pelanggan), produk, grade, segar atau beku, dan lokasinya.",
      "Hasil produksi baru masuk stok setelah produksinya disetujui owner. Ikan segar boleh langsung dikirim tanpa masuk gudang.",
      "Stok bisa diambil sebagian atau seluruhnya, memakai berat hasil timbang ulang. Koreksi stok baru berlaku setelah disetujui owner.",
    ],
  },
  {
    slug: "gudang", nama: "Gudang Dingin", ringkas: "Titipan pelanggan, tarif, dan jadwal mesin.",
    poin: [
      "Titipan pelanggan dicatat masuk dan keluar. Kapasitas 17.500 kg saya jaga: titipan baru ditolak kalau stok sendiri ditambah titipan sudah melewati batas.",
      "Tarifnya saya simpan sebagai pengaturan, bukan angka mati: simpan Rp76 per kg per hari dengan minimum 10 hari, dan ABF Rp3.500 per kg. Minimum 10 hari itu masih usulan saya dan menunggu konfirmasi owner. Data yang sama akan selalu menghasilkan tagihan yang sama.",
      "Tagihan jasa gudang menampilkan cara menghitungnya, jadi pelanggan bisa memeriksa sendiri.",
      "Jadwal mesin ABF dan produksi mitra akan memberi tahu kalau bentrok, dan bisa dipindah ke jam kosong terdekat.",
    ],
  },
  {
    slug: "penjualan", nama: "Penjualan", ringkas: "Pesanan, pengiriman, tagihan, dan uang masuk.",
    poin: [
      "Pesanan diambil dari stok, dan tidak boleh melebihi stok yang tersedia setelah dikurangi pesanan lain yang belum dikirim. Satu pesanan boleh berasal dari beberapa produksi.",
      "Saat dikirim, berat kirim diisi dari hasil timbang. Kalau pembeli menimbang ulang, berat diterima pembeli juga dicatat, dan tagihan memakai berat itu.",
      "Tagihan jatuh tempo 14 hari. Statusnya jelas: belum jatuh tempo, jatuh tempo, terlambat, atau lunas. Pembeli boleh bayar sebagian, dengan bukti transfer.",
    ],
  },
  {
    slug: "keuangan", nama: "Keuangan", ringkas: "Biaya dengan nota, buku kas, dan tutup buku.",
    poin: [
      "Biaya dibagi delapan kategori. Kategori yang mewajibkan nota tidak bisa diajukan tanpa nota. Biaya bisa dikaitkan ke pembelian, produksi, atau siklus, dan ditolak kalau tidak cocok.",
      "Biaya baru berlaku setelah disetujui owner. Pembayaran ke pemasok, uang masuk dari pembeli, dan biaya yang disetujui masuk ke buku kas dengan sendirinya.",
      "Buku kas tampil per hari, bisa disaring uang masuk atau uang keluar, dan bisa diunduh.",
      "Tutup buku dilakukan per bulan: berurutan dari bulan tertua, dan hanya setelah bulannya berakhir. Bulan yang sudah ditutup terkunci, dan cuma owner yang bisa membukanya lagi dengan alasan.",
      "Seperti yang saya sebut di atas, 235 catatan uang keluar dari Monitor Dana sudah ada di buku kas.",
    ],
  },
  {
    slug: "laporan", nama: "Laporan", ringkas: "Laba rugi per siklus yang bisa diketuk sampai ke transaksinya.",
    poin: [
      "Laba rugi per siklus saya buat mengikuti contoh laporan Siklus 1: pendapatan per grade dan hasil samping, biaya langsung, laba kotor, margin, angka per kilo loin, dan harga jual minimal.",
      "Setiap baris bisa diketuk untuk melihat transaksi di baliknya. File unduhannya memakai angka yang sama persis dengan di layar.",
      "Ada juga tren antarsiklus, harga beli rata-rata per periode dan per pemasok, serta simulasi: kalau harga ikan naik atau turun, labanya jadi berapa.",
      "Laba bersih sementara tampil sebagai \"belum bisa dihitung\", karena saya masih butuh biaya bulanan, penyusutan, dan aturan pajak dari owner.",
    ],
  },
  {
    slug: "siklus", nama: "Rincian Siklus", ringkas: "Satu siklus dari beli ikan sampai uang masuk.",
    poin: [
      "Ada enam tahap dalam satu layar: beli ikan, terima dan mutu, produksi, jual dan kirim, tagihan dan uang masuk, biaya lain. Semuanya diambil dari catatan yang sama, jadi tidak ada yang diketik ulang.",
      "Owner bisa menutup siklus yang sudah beres. Sistem menolak kalau masih ada pembelian yang belum diputuskan atau belum lunas, produksi yang belum disetujui, pesanan yang belum dikirim, tagihan yang belum lunas, atau biaya yang belum diputuskan. Siklus yang ditutup tidak menerima transaksi baru sampai owner membukanya lagi dengan alasan.",
    ],
  },
  {
    slug: "asisten", nama: "Asisten AI", ringkas: "Bertanya dengan kalimat biasa, dan hanya membaca.",
    poin: [
      "Bisa ditanya soal: tagihan terlambat, saldo kas, hasil per ekor, jadwal yang bentrok, urusan yang menunggu keputusan, isi gudang dingin, transaksi tanpa nota, serta biaya dan laba satu siklus.",
      "Jawabannya tidak pernah melebihi apa yang boleh dilihat si penanya. Asisten tidak bisa mengubah data apa pun, dan ada batas jumlah pertanyaan per hari.",
      "Jawabannya saya buat ringkas, dengan tabel atau paragraf pendek.",
    ],
  },
  {
    slug: "absensi", nama: "Absensi", ringkas: "Lokasi dari GPS, foto langsung dari kamera, jam dari sistem.",
    poin: [
      "Karyawan absen masuk dan pulang dari HP, dengan GPS dan foto yang diambil langsung (bukan dari galeri). Jarak ke lokasi kerja dihitung sendiri oleh sistem.",
      "Absen ditolak kalau di luar radius atau GPS kurang akurat, lengkap dengan alasannya, dan percobaan yang ditolak tetap tercatat. Satu absen masuk dan satu pulang per hari.",
      "Izin, sakit, dan libur diajukan dari HP, dan owner yang memutuskan. Super Admin dan owner bisa melihat rekap bulanan (hadir, terlambat, izin, sakit, tidak hadir) dan foto absen harian. Hari kerjanya Senin sampai Sabtu.",
      "Super Admin menandai lokasi kerja dengan tombol \"lokasi saya sekarang\", lalu mengatur radius, batas akurasi, jam masuk, dan toleransi terlambat.",
    ],
  },
  {
    slug: "akses", nama: "Akses", ringkas: "Akun, jabatan, dan tautan masuk tanpa email.",
    poin: [
      "Super Admin membuat akun dengan nama, email (sebagai nama masuk), dan jabatan. Sistem membuat tautan sekali pakai yang berlaku 24 jam untuk dikirim lewat WhatsApp, lalu penerimanya membuat kata sandi sendiri.",
      "Lupa kata sandi? Tinggal buat tautan baru. Email masuk bisa diganti, dan jabatan seseorang bisa dilepas (akunnya otomatis nonaktif dan bisa diaktifkan lagi). Akun orang yang keluar dinonaktifkan, tidak dihapus. Akun Owner hanya bisa dibuat dan diatur oleh Owner.",
      "Setiap orang masuk dengan kata sandinya sendiri. Kode kedua (MFA) sempat dibuat lalu dihapus atas keputusan developer, jadi kata sandi yang kuat menjadi satu-satunya penjaga akun. Pendaftaran mandiri saya tutup.",
    ],
  },
  {
    slug: "pengaturan", nama: "Pengaturan", ringkas: "Data master dan target hasil.",
    poin: [
      "Isinya daftar pemasok, pembeli, produk, grade, jenis hasil samping, dan kategori biaya. Datanya tidak dihapus, hanya dinonaktifkan.",
      "Target hasil olahan 60 persen dan batas wajar 40 sampai 80 persen bisa diubah di sini.",
    ],
  },
];

/* ------------------------------------------------------------ jabatan dan menu */
export const PERAN = ["Owner", "Finance", "Super Admin", "Kepala Produksi dan QC", "Petugas Lapangan"] as const;
/* Diturunkan dari tabel izin di database: menu terlihat bila jabatan punya izin baca modulnya. Owner memegang semua izin. */
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
  { peran: "Owner", isi: "Pemilik usaha. Memegang semua izin dan jadi penyetuju akhir pembelian, biaya, koreksi stok, produksi, dan izin karyawan. Cuma owner yang bisa menutup buku dan siklus." },
  { peran: "Finance", isi: "Memeriksa persetujuan, membayar pemasok, menerbitkan tagihan, mencatat uang masuk, dan mengajukan biaya." },
  { peran: "Super Admin", isi: "Mengurus akun, data master, pesanan beli dan jual, lokasi kerja absensi, dan rekap kehadiran." },
  { peran: "Kepala Produksi dan QC", isi: "Menilai mutu lot, memeriksa neraca produksi sebelum sampai ke owner, dan mengajukan koreksi stok." },
  { peran: "Petugas Lapangan", isi: "Menerima dan menimbang ikan, mengisi timbangan loin dan hasil samping, mencatat pengiriman dan titipan. Tidak melihat harga." },
] as const;

/* ------------------------------------------------------------ keamanan */
export const KUALITAS = [
  { judul: "Data tidak bisa dihapus", isi: "Tidak ada tombol hapus di mana pun. Yang salah dibatalkan atau dikoreksi dengan alasan, dan setiap perubahan mencatat siapa, kapan, serta angka sebelum dan sesudahnya. Jadi riwayatnya selalu utuh." },
  { judul: "Aturan dijaga sistem, bukan cuma tampilan", isi: "Aturan seperti setuju, kirim, bayar, dan tutup buku saya pasang di dalam database. Walau ada yang mencoba lewat jalan lain, pelanggarannya tetap ditolak." },
  { judul: "Akses berlapis", isi: "Izin dicek di halaman, di setiap aksi, dan di database. Nota dan foto absen disimpan di tempat tertutup, dan hanya bisa dibuka lewat tautan yang hangus dalam 60 detik. Percobaan masuk juga dibatasi supaya kata sandi tidak bisa ditebak-tebak." },
  { judul: "Angka tidak bergeser", isi: "Berat dihitung sampai tiga angka di belakang koma dan uang sampai dua angka, tanpa pembulatan diam-diam. Saya uji dengan 500 potong loin: total di layar, rekap per grade dan per ekor, neraca, dan file unduhan hasilnya sama persis." },
  { judul: "Satu putaran penuh sudah diuji", isi: "Saya jalankan pembelian sampai uang masuk lewat kelima jabatan, lalu mencocokkan angka di neraca, stok, tagihan, rincian siklus, laba rugi, dashboard, dan buku kas. Perubahan saldo kas harus sama dengan laba kotor." },
  { judul: "Diperiksa otomatis setiap ada perubahan", isi: "Setiap kali sistem saya ubah, pemeriksaan otomatis berjalan di laptop dan HP sebelum perubahannya dipakai. Pemeriksaan terakhir lulus semua." },
  { judul: "Cadangan harian", isi: "Database dicadangkan tiap malam dan dienkripsi. Empat pencadangan tercatat berhasil, tiga di antaranya otomatis terjadwal. Satu hal yang belum saya lakukan: mencoba memulihkan cadangan ke tempat kosong (lihat bagian yang masih tersisa)." },
] as const;

/* ------------------------------------------------------------- sudah hidup */
export const LIVE = [
  "Sistemnya sudah bisa dibuka di internet dan tersambung ke database. Orang yang belum masuk diarahkan ke halaman login.",
  "Seluruh fitur sudah terpasang, termasuk absensi dan perbaikan dari hasil pemeriksaan saya terhadap rancangan.",
  "235 catatan uang keluar dari Monitor Dana sudah ada di buku kas.",
  "Satu lokasi kerja absensi sudah saya tandai, yaitu Cold Storage Bungus.",
  "Akun owner sudah ada. Akun jabatan lain kita buat bareng saat serah terima, lewat menu Akses.",
] as const;

/* ------------------------------------------------------------ yang tersisa */
export const BELUM = [
  { judul: "Dicoba orang di lapangan", isi: "Timbangan di HP saat sinyal lemah, serta absen dengan kamera dan GPS di lokasi, baru saya uji pakai perangkat tiruan. Belum dicoba di HP petugas yang asli, dan ini yang paling saya mau segera dicoba." },
  { judul: "Satu siklus asli berdampingan dengan kertas", isi: "Angka loin, neraca, tagihan, dan kas belum saya cocokkan dengan catatan kertas. Ini syarat serah terima akhir." },
  { judul: "Bahan dari owner", isi: "Saya butuh data master yang asli, foto formulir timbang Siklus 1 per potong loin untuk saya masukkan, catatan susut, serta biaya bulanan dan aturan pajak supaya laba bersih bisa dihitung." },
  { judul: "Keputusan dari owner", isi: "Mohon konfirmasi minimum hari tarif simpan, cara mencatat setoran modal investor di dashboard, dan berapa lama foto absen disimpan." },
  { judul: "Uji pulihkan cadangan", isi: "Cadangannya sudah ada, tapi belum saya buktikan bisa dipulihkan. Untuk mencobanya saya butuh satu database kosong." },
  { judul: "Pengamanan akun saat serah terima", isi: "Pembuatan akun semua jabatan dan penggantian kata sandi awal kita selesaikan bareng owner." },
  { judul: "Batas paket gratis", isi: "Hosting dan database memakai paket gratis atas keputusan owner. Ketentuan hosting gratis untuk pemakaian non-komersial, dan database yang sepi tujuh hari bisa dijeda. Risiko ini sudah diterima owner dan tercatat." },
  { judul: "Data contoh", isi: "Kalau masih ada, data contoh bertanda \"(Demo)\" yang saya buat untuk latihan presentasi perlu dihapus sebelum sistem dipakai untuk pembukuan sungguhan. Saya sudah siapkan skrip untuk menghapusnya sampai bersih." },
] as const;

export const BERIKUTNYA = [
  { tahap: "Tahap 1", judul: "Mulai dipakai berdampingan", isi: "Ganti kata sandi awal, buat akun tiap jabatan, isi data master, konfirmasi tarif, simpan frasa sandi cadangan di dua orang, dan saya beri latihan singkat untuk tiap jabatan." },
  { tahap: "Tahap 2", judul: "Serah terima akhir", isi: "Satu siklus asli kita catat berdampingan dengan kertas lalu dicocokkan, absensi dicoba di lokasi, pemulihan cadangan saya uji, dan temuan apa pun saya perbaiki." },
] as const;
