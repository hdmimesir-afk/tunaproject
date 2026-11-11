/* Isi laporan /update. Ditulis dengan suara pengembang yang melapor langsung ke owner: "saya" untuk yang saya kerjakan, "kita" untuk yang
   disepakati bersama, dan "owner" untuk pemilik usaha. Kalimat pendek, bahasa sehari-hari, tanpa istilah teknis.
   Jumlah tes dan catatan kas yang diimpor diambil dari pemeriksaan lengkap per 26 Oktober 2026 (PERIKSA_LENGKAP), jumlah menu dan jabatan
   dihitung ulang per 11 November 2026. Tidak ada angka perkiraan. Pembaruan sesudah 26 Oktober dicatat di PERJALANAN dan TERBARU. */

export const TANGGAL = "11 November 2026";
export const PERIKSA_LENGKAP = "26 Oktober 2026";

/* ---------------------------------------------------------------- angka */
export const ANGKA = [
  { nilai: "23 dari 23", label: "fitur yang kita sepakati sudah selesai saya bangun, dan semuanya lulus uji." },
  { nilai: "15", label: "menu sudah siap dipakai. Ada 5 jabatan, dan tiap jabatan cuma melihat menu yang memang urusannya." },
  { nilai: "235", label: "catatan uang keluar dari Monitor Dana sudah saya masukkan ke buku kas, jadi riwayat lama tidak perlu diketik ulang." },
  { nilai: "581", label: "pemeriksaan otomatis lulus semua pada pemeriksaan lengkap 26 Oktober, termasuk satu putaran penuh dari beli ikan sampai uang masuk." },
] as const;

/* ------------------------------------------------------------ perjalanan */
export const PERJALANAN = [
  { tanggal: "14 Oktober", judul: "Penawaran", isi: "Saya mulai dari penawaran dan contoh aplikasi di laptop dan HP, supaya owner bisa membayangkan dulu seperti apa sistemnya sebelum saya bangun." },
  { tanggal: "21 Oktober", judul: "Rancangan disepakati", isi: "Rancangan akhir dan formulir timbang produksi saya susun. Pertanyaan untuk owner saya buat supaya cukup dijawab dengan satu ketukan." },
  { tanggal: "22 Oktober", judul: "Jawaban owner masuk", isi: "Jawaban owner langsung saya tuangkan ke sistem: lima jabatan, tarif simpan Rp76 per kg per hari, dan pakai paket gratis. Fondasinya saya pasang sekalian: login, pengaturan jabatan, data master, catatan perubahan, dan larangan menghapus data." },
  { tanggal: "23 Oktober", judul: "Seluruh alur kerja jadi", isi: "Hari ini paling padat. Pembelian dan persetujuan, produksi per potong loin, stok dan gudang dingin, penjualan, keuangan dan laporan, dashboard, sampai Asisten AI. Lalu catatan Monitor Dana, tutup buku, absensi, tutup siklus, dan pembuatan akun lewat tautan." },
  { tanggal: "27 Oktober", judul: "Tampilan saya rapikan", isi: "Menu samping saya buat baru, dengan logo dan pengelompokan. Tampilan HP saya bedakan dari laptop. Buku kas jadi per hari, daftar lot dan penjualan lebih jelas, di menu Akses sekarang bisa ganti email dan lepas jabatan, dan saya siapkan data contoh untuk latihan." },
  { tanggal: "31 Oktober", judul: "Gudang per ruangan dan stok penunjang", isi: "Gudang dingin sekarang dicatat per ruangan: ABF 1 sampai 3 dan Cold Storage 1. Ada stok barang penunjang kerja, kotak cari di semua daftar, dan Asisten bisa membuat laporan hari ini, minggu ini, dan bulan ini." },
  { tanggal: "4 November", judul: "Catatan rapat saya kerjakan", isi: "Berat ikan saat penerimaan sekarang diambil dari pesanan. Jam kerja absensi disesuaikan, urutan menu operasional diubah, unduhan laporan jadi Excel yang rapi, dan akun dibuat satu per jabatan lewat tautan undangan." },
  { tanggal: "6 November", judul: "Jawaban tim Katalis", isi: "Berat loin sekarang cukup diisi total per grade; timbang per potong tetap ada sebagai pilihan. Nota nelayan, tanda terima titipan, dan tagihan yang dibuat admin di luar sistem tinggal dilampirkan fotonya." },
  { tanggal: "10 November", judul: "Masukan Mas Bisma, bagian pertama", isi: "Pemasok bisa ditambah langsung dari form pembelian, arti Lulus dan Tahan dijelaskan di layar, hasil produksi yang belum masuk stok muncul di form pesanan, dan kolom harga per kilo di HP saya rapikan." },
  { tanggal: "11 November", judul: "Masukan Mas Bisma, bagian kedua", isi: "Satu lot bisa berisi beberapa grade. Pembelian tidak lagi tertahan nota, yang menyetujui dan lampiran wajib diatur admin, dan Siklus sekarang disebut Proyek, lengkap dengan stok per proyek." },
] as const;

/* -------------------------------------------------------------- terbaru */
/* Laporan terbaru: masukan Mas Bisma (notulen 10 November) dan jawaban perusahaan 11 November. */
export const TERBARU: { judul: string; isi: string }[] = [
  { judul: "Nota boleh menyusul", isi: "Kalau nota belum ada, misalnya bongkar malam, pembelian tetap bisa diajukan dengan tanda \"Nota menyusul\". Persetujuan, penerimaan ikan, dan produksi jalan terus. Notanya dilampirkan belakangan oleh jabatan yang dipilih admin." },
  { judul: "Yang menyetujui dipilih admin", isi: "Di menu Akses ada bagian Tugas per peran. Admin memilih jabatan yang boleh menyetujui pembelian, memeriksanya, dan melampirkan nota susulan. Owner selalu bisa semuanya. Yang mengajukan tidak bisa menyetujui pengajuannya sendiri, dan nama yang bisa menyetujui tampil di layar." },
  { judul: "Lampiran wajib diatur admin", isi: "Di Pengaturan ada tab Lampiran wajib. Bawaannya: nota pembelian, satu foto timbangan untuk setiap penerimaan (termasuk penerimaan bertahap), dan bukti transfer. Lampiran yang belum ada cuma ditandai \"Belum ada\", tidak menghentikan pencatatan." },
  { judul: "Satu lot, beberapa grade", isi: "Saat cek mutu, QC bisa mencatat beberapa grade sekaligus beserta beratnya, misalnya 500 kg B-SO dan 300 kg A-SO. Jumlahnya tidak boleh melebihi berat lot. Laporan harga beli ikut terbagi per grade." },
  { judul: "Siklus sekarang disebut Proyek", isi: "Satu proyek adalah satu batch atau satu bongkaran, dan boleh berisi beberapa pembelian. Pembelian, lot, produksi, stok, penjualan, tagihan, dan biaya bisa ditelusuri per proyek. Stok hasil produksi sekarang ikut tercatat per proyek, dan kode proyek tampil di daftar lot, stok, dan pilihan stok saat membuat pesanan." },
  { judul: "Perbaikan kecil dari rapat", isi: "Pemasok baru bisa ditambah dari form pembelian, arti Lulus dan Tahan dijelaskan di layar, hasil produksi yang belum masuk stok tampil di form pesanan, dan kolom harga per kilo tidak lagi keluar layar di HP." },
];

/* Status sepuluh poin notulen Mas Bisma per 11 November. */
export const NOTULEN: { poin: string; status: "selesai" | "menunggu" }[] = [
  { poin: "1. Tambah pemasok dari form pembelian", status: "selesai" },
  { poin: "2. Nota susulan tidak menahan pencatatan", status: "selesai" },
  { poin: "3. Pemberi persetujuan pembelian jelas", status: "selesai" },
  { poin: "4. Arti Lulus dan Tahan di cek mutu", status: "selesai" },
  { poin: "5. Lampiran dan foto timbang wajib", status: "selesai" },
  { poin: "6. Beberapa grade dalam satu lot", status: "selesai" },
  { poin: "7. Pencatatan per proyek", status: "selesai" },
  { poin: "8. Hasil produksi di form pesanan", status: "selesai" },
  { poin: "9. Kolom harga per kilo di HP", status: "selesai" },
  { poin: "10. Video panduan", status: "menunggu" },
];

/* ------------------------------------------------------------------ modul */
export type Modul = { slug: string; nama: string; ringkas: string; poin: string[] };
export const MODUL: Modul[] = [
  {
    slug: "dashboard", nama: "Dashboard", ringkas: "Satu halaman untuk owner memantau semuanya.",
    poin: [
      "Di bagian atas ada daftar \"Perlu tindakan Anda\" (tulisan ini memang begitu di layar). Isinya semua yang menunggu keputusan: pembelian yang belum disetujui, biaya, koreksi stok, produksi yang menunggu, ikan yang belum dicek mutunya, tagihan yang telat, dan izin karyawan. Satu urusan satu baris.",
      "Ketuk barisnya, dan owner langsung dibawa ke urusan itu. Untuk pembelian, barisnya sudah saya sorot di antrean persetujuan.",
      "Di bawahnya ada uang kas bulan ini, piutang, utang ke pemasok, stok sendiri dan titipan, isi tiap ruangan gudang dingin, arus kas enam bulan, laba rugi proyek terbaru, dan jumlah transaksi yang belum ada notanya.",
      "Tiap jabatan hanya melihat hal yang memang bisa ia kerjakan.",
    ],
  },
  {
    slug: "pembelian", nama: "Pembelian", ringkas: "Pesanan ke pemasok, nota, dan pembayarannya.",
    poin: [
      "Tiap pesanan berisi pemasok, berat, harga per kilo, nota, dan proyeknya. Pemasok baru bisa ditambah langsung dari form ini. Harganya dikunci saat diajukan, jadi kalau harga naik kemudian, pesanan lama tidak ikut berubah.",
      "Kalau nota belum ada, pesanan tetap bisa diajukan dengan tanda \"Nota menyusul\". Notanya dilampirkan belakangan oleh jabatan yang dipilih admin.",
      "Ada tiga hal yang dicatat terpisah: sudah disetujui atau belum, ikannya sudah diterima (belum, sebagian, lengkap), dan sudah dibayar (belum, sebagian, lunas).",
      "Finance bisa mencicil pembayaran. Sistem menolak kalau bayarnya melebihi nilai pesanan, atau pesanannya belum disetujui owner.",
      "Petugas lapangan tidak melihat harga. Mereka cuma melihat pesanan yang siap diterima, tanpa nilainya.",
    ],
  },
  {
    slug: "persetujuan", nama: "Persetujuan", ringkas: "Yang menyetujui dipilih admin, dan buktinya ada di samping tombol.",
    poin: [
      "Alurnya: diajukan, diperiksa, lalu disetujui. Siapa yang memeriksa dan menyetujui dipilih admin di menu Akses, dan namanya tampil di layar. Bawaannya Finance memeriksa dan owner menyetujui. Yang menyetujui boleh langsung memutuskan tanpa menunggu diperiksa, tapi tidak boleh menyetujui pengajuannya sendiri.",
      "Bisa dikembalikan untuk diperbaiki atau ditolak, dua-duanya harus pakai alasan tertulis.",
      "Setiap kartu menampilkan nota dan harga per kilo. Kalau harga naik dibanding pembelian terakhir dari pemasok yang sama, ada peringatannya.",
      "Mau menyetujui banyak sekaligus? Pilih beberapa kartu. Sistem akan menampilkan daftar, jumlah, dan total nilainya dulu sebelum disetujui.",
      "Disetujui belum berarti dibayar. Pembayaran dicatat terpisah oleh Finance.",
      "Ikan yang datang malam sebelum persetujuan (bongkar malam) saya tampilkan di daftar sendiri, supaya tidak terlewat.",
    ],
  },
  {
    slug: "mutu", nama: "Mutu dan Penerimaan", ringkas: "Dari ikan datang sampai dinyatakan lulus mutu.",
    poin: [
      "Ikan yang diterima dicatat sebagai lot, dan boleh diterima bertahap. Lot dari bongkar malam saya beri tanda khusus.",
      "Berat tidak perlu diketik ulang, karena otomatis memakai sisa berat di pesanan. Kalau kiriman nyata berbeda, petugas mencentang pilihannya lalu mengisi berat aslinya. Penimbangan berikutnya untuk hasil setelah proses, di menu Produksi.",
      "QC menilai tiap lot: lulus dengan satu atau beberapa grade beserta beratnya, atau ditahan dengan catatan. Arti Lulus dan Tahan dijelaskan langsung di layar.",
      "Foto timbangan wajib satu untuk setiap penerimaan. Lot yang belum ada fotonya ditandai \"Belum ada\", tapi tetap bisa dicek mutu dan diproduksi.",
      "Hanya lot yang lulus dan masih ada sisanya yang bisa dipakai untuk produksi.",
    ],
  },
  {
    slug: "produksi", nama: "Produksi", ringkas: "Menimbang loin per potong, dan selisih terlihat apa adanya.",
    poin: [
      "Produksi dimulai dari satu atau beberapa lot. Owner bisa menelusuri dua arah: dari lot ke produksinya, dan dari produksi kembali ke lot asalnya.",
      "Berat loin cukup diisi total per grade. Kalau perlu, bisa ditimbang per potong lewat tabel timbang. Tabel timbangnya saya samakan dengan formulir kertas yang sudah dipakai: nomor ekor, nomor loin, grade, dan berat sampai tiga angka di belakang koma. Cukup pakai keyboard, dan total per grade serta per ekor terhitung sendiri.",
      "Kalau sinyal putus, catatan tetap tersimpan di HP dan terkirim sendiri begitu sinyal kembali. Dua petugas yang mengedit baris yang sama tidak saling menimpa, dan setiap koreksi mencatat angka sebelum dan sesudahnya.",
      "Ada neraca berat: ikan masuk harus sama dengan loin, hasil samping, limbah, dan susut yang ditimbang. Sisanya tampil sebagai \"selisih belum jelas\", dan tidak pernah saya isi otomatis. Hasil di luar 40 sampai 80 persen ditandai untuk diperiksa, dengan target 60 persen.",
      "Setelah petugas selesai menimbang, QC memeriksa, lalu owner menyetujui. Yang menimbang tidak boleh memeriksa produksi yang sama. Formulirnya bisa dicetak, dan tabelnya bisa diunduh ke Excel.",
    ],
  },
  {
    slug: "stok", nama: "Stok", ringkas: "Setiap kilo punya pemilik, kondisi, dan lokasi.",
    poin: [
      "Stok dicatat per pemilik (milik sendiri atau titipan pelanggan), produk, grade, segar atau beku, lokasi, dan proyek asalnya.",
      "Hasil produksi baru masuk stok setelah produksinya disetujui owner. Ikan segar boleh langsung dikirim tanpa masuk gudang.",
      "Stok bisa diambil sebagian atau seluruhnya, memakai berat hasil timbang ulang. Koreksi stok baru berlaku setelah disetujui owner.",
      "Barang penunjang kerja dan pekerja punya catatan sendiri: barang masuk, pemakaian, koreksi, dan batas minimum.",
    ],
  },
  {
    slug: "gudang", nama: "Gudang Dingin", ringkas: "Ruangan, titipan pelanggan, tarif, dan jadwal mesin.",
    poin: [
      "Gudang dicatat per ruangan: ABF 1, ABF 2, ABF 3, dan Cold Storage 1. Isi tiap ruangan terlihat, dan stok bisa dipindah antarruangan, misalnya dari ABF ke cold storage setelah beku.",
      "Titipan pelanggan dicatat masuk dan keluar. Kapasitas 17.500 kg saya jaga: titipan baru ditolak kalau stok sendiri ditambah titipan sudah melewati batas. Pembagian per ruangan masih sementara dan menunggu angka dari owner.",
      "Tarifnya saya simpan sebagai pengaturan, bukan angka mati: simpan Rp76 per kg per hari dengan minimum 10 hari, dan ABF Rp3.500 per kg. Minimum 10 hari itu masih usulan saya dan menunggu konfirmasi owner. Data yang sama akan selalu menghasilkan tagihan yang sama.",
      "Tagihan jasa gudang menampilkan cara menghitungnya, jadi pelanggan bisa memeriksa sendiri.",
      "Jadwal mesin ABF dan produksi mitra akan memberi tahu kalau bentrok, dan bisa dipindah ke jam kosong terdekat.",
    ],
  },
  {
    slug: "penjualan", nama: "Penjualan", ringkas: "Pesanan, pengiriman, tagihan, dan uang masuk.",
    poin: [
      "Pesanan diambil dari stok, dan tidak boleh melebihi stok yang tersedia setelah dikurangi pesanan lain yang belum dikirim. Satu pesanan boleh berasal dari beberapa produksi. Pilihan stok menampilkan proyek dan produksi asalnya, dan hasil produksi yang belum masuk stok juga ditampilkan.",
      "Saat dikirim, berat kirim diisi dari hasil timbang. Kalau pembeli menimbang ulang, berat diterima pembeli juga dicatat, dan tagihan memakai berat itu.",
      "Tagihan jatuh tempo 14 hari. Statusnya jelas: belum jatuh tempo, jatuh tempo, terlambat, atau lunas. Pembeli boleh bayar sebagian, dengan bukti transfer.",
    ],
  },
  {
    slug: "keuangan", nama: "Keuangan", ringkas: "Biaya dengan nota, buku kas, dan tutup buku.",
    poin: [
      "Biaya dibagi delapan kategori. Kategori yang mewajibkan nota tidak bisa diajukan tanpa nota. Biaya bisa dikaitkan ke pembelian, produksi, atau proyek, dan ditolak kalau tidak cocok.",
      "Biaya baru berlaku setelah disetujui owner. Pembayaran ke pemasok, uang masuk dari pembeli, dan biaya yang disetujui masuk ke buku kas dengan sendirinya.",
      "Buku kas tampil per hari, bisa disaring uang masuk atau uang keluar, dan bisa diunduh ke Excel.",
      "Tutup buku dilakukan per bulan: berurutan dari bulan tertua, dan hanya setelah bulannya berakhir. Bulan yang sudah ditutup terkunci, dan cuma owner yang bisa membukanya lagi dengan alasan.",
      "Seperti yang saya sebut di atas, 235 catatan uang keluar dari Monitor Dana sudah ada di buku kas.",
    ],
  },
  {
    slug: "laporan", nama: "Laporan", ringkas: "Laba rugi per proyek yang bisa diketuk sampai ke transaksinya.",
    poin: [
      "Laba rugi per proyek saya buat mengikuti contoh laporan Siklus 1: pendapatan per grade dan hasil samping, biaya langsung, laba kotor, margin, angka per kilo loin, dan harga jual minimal.",
      "Setiap baris bisa diketuk untuk melihat transaksi di baliknya. Unduhannya berupa file Excel yang rapi untuk dibaca, dicetak di kertas A4, dan diarsipkan, dengan angka yang sama persis dengan di layar. Diagram di Excel masih sebatas usulan dan belum saya buat.",
      "Ada juga tren antarproyek, harga beli per grade rata-rata per periode dan per pemasok, serta simulasi: kalau harga ikan naik atau turun, labanya jadi berapa.",
      "Laba bersih sementara tampil sebagai \"belum bisa dihitung\", karena saya masih butuh biaya bulanan, penyusutan, dan aturan pajak dari owner.",
    ],
  },
  {
    slug: "siklus", nama: "Rincian Proyek", ringkas: "Satu proyek (batch atau bongkaran) dari beli ikan sampai uang masuk.",
    poin: [
      "Dulu namanya Siklus. Satu proyek adalah satu batch atau satu bongkaran, dan boleh berisi beberapa pembelian.",
      "Ada tujuh tahap dalam satu layar: beli ikan, terima dan mutu, produksi, stok, jual dan kirim, tagihan dan uang masuk, biaya lain. Semuanya diambil dari catatan yang sama, jadi tidak ada yang diketik ulang.",
      "Owner bisa menutup proyek yang sudah beres. Sistem menolak kalau masih ada pembelian yang belum diputuskan atau belum lunas, produksi yang belum disetujui, pesanan yang belum dikirim, tagihan yang belum lunas, atau biaya yang belum diputuskan. Proyek yang ditutup tidak menerima transaksi baru sampai owner membukanya lagi dengan alasan.",
    ],
  },
  {
    slug: "asisten", nama: "Asisten AI", ringkas: "Bertanya dengan kalimat biasa, dan hanya membaca.",
    poin: [
      "Bisa ditanya soal: tagihan terlambat, saldo kas, hasil per ekor, jadwal yang bentrok, urusan yang menunggu keputusan, isi gudang dingin, transaksi tanpa nota, serta biaya dan laba satu proyek.",
      "Jawabannya tidak pernah melebihi apa yang boleh dilihat si penanya. Asisten tidak bisa mengubah data apa pun, dan ada batas jumlah pertanyaan per hari.",
      "Jawabannya saya buat ringkas, dengan tabel atau paragraf pendek.",
      "Ada laporan hari ini, minggu ini, dan bulan ini. Laporannya bisa dicetak, disimpan sebagai PDF, atau diunduh ke Excel.",
    ],
  },
  {
    slug: "absensi", nama: "Absensi", ringkas: "Lokasi dari GPS, foto langsung dari kamera, jam dari sistem.",
    poin: [
      "Karyawan absen masuk dan pulang dari HP, dengan GPS dan foto yang diambil langsung (bukan dari galeri). Jarak ke lokasi kerja dihitung sendiri oleh sistem.",
      "Absen ditolak kalau di luar radius atau GPS kurang akurat, lengkap dengan alasannya, dan percobaan yang ditolak tetap tercatat. Satu absen masuk dan satu pulang per hari.",
      "Izin, sakit, dan libur diajukan dari HP, dan owner yang memutuskan. Super Admin dan owner bisa melihat rekap bulanan (hadir, terlambat, izin, sakit, tidak hadir) dan foto absen harian.",
      "Jam kerjanya Senin sampai Jumat 08.00 sampai 17.00, dan Sabtu 08.00 sampai 12.00. Pulang lebih awal tetap diterima, dan jumlah menitnya tercatat. Hari Minggu tidak dihitung terlambat atau pulang awal.",
      "Super Admin menandai lokasi kerja dengan tombol \"lokasi saya sekarang\", lalu mengatur radius, batas akurasi, jam kerja hari biasa dan Sabtu, dan toleransi terlambat.",
    ],
  },
  {
    slug: "akses", nama: "Akses", ringkas: "Satu akun per jabatan, dibuat lewat tautan undangan.",
    poin: [
      "Super Admin membuat akun dengan nama, email (sebagai nama masuk), dan jabatan. Satu jabatan hanya untuk satu akun aktif, jadi jabatan yang sudah terisi tidak ditawarkan lagi.",
      "Sistem membuat tautan undangan sekali pakai yang berlaku 24 jam untuk dikirim lewat WhatsApp. Begitu tautan diklik, penerimanya langsung membuat kata sandi. Tautan baru terpakai saat kata sandi disimpan, jadi pratinjau di WhatsApp tidak membuatnya hangus.",
      "Lupa kata sandi? Tinggal buat tautan baru. Email masuk bisa diganti, dan jabatan seseorang bisa dilepas (akunnya otomatis nonaktif dan bisa diaktifkan lagi). Akun orang yang keluar dinonaktifkan, tidak dihapus. Akun Owner hanya bisa dibuat dan diatur oleh Owner.",
      "Di bagian Tugas per peran, admin memilih jabatan yang boleh menyetujui pembelian, memeriksanya, dan melampirkan nota susulan. Tugas untuk jabatan admin sendiri hanya bisa diubah owner.",
      "Setiap akun punya kata sandinya sendiri. Kode kedua (MFA) sempat dibuat lalu dihapus atas keputusan developer, jadi kata sandi yang kuat menjadi satu-satunya penjaga akun. Pendaftaran mandiri saya tutup.",
    ],
  },
  {
    slug: "pengaturan", nama: "Pengaturan", ringkas: "Data master, target hasil, dan lampiran wajib.",
    poin: [
      "Admin menandai lampiran mana yang wajib dan mana yang opsional: nota pembelian, foto timbangan, bukti transfer, dan lainnya.",
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
  { menu: "Pembelian", ada: [true, true, true, false, false] },
  { menu: "Persetujuan", ada: [true, true, true, false, false] },
  { menu: "Mutu dan Penerimaan", ada: SEMUA },
  { menu: "Produksi", ada: SEMUA },
  { menu: "Stok", ada: SEMUA },
  { menu: "Gudang Dingin", ada: SEMUA },
  { menu: "Penjualan", ada: SEMUA },
  { menu: "Keuangan", ada: [true, true, true, false, false] },
  { menu: "Laporan", ada: [true, true, true, false, false] },
  { menu: "Rincian Proyek", ada: SEMUA },
  { menu: "Asisten AI", ada: SEMUA },
  { menu: "Absensi", ada: SEMUA },
  { menu: "Akses", ada: [true, false, true, false, false] },
  { menu: "Pengaturan", ada: SEMUA },
];
export const TUGAS_PERAN = [
  { peran: "Owner", isi: "Pemilik usaha. Memegang semua izin dan jadi penyetuju akhir biaya, koreksi stok, produksi, dan izin karyawan. Selalu bisa menyetujui pembelian. Cuma owner yang bisa menutup buku dan proyek." },
  { peran: "Finance", isi: "Memeriksa pembelian, melampirkan nota susulan, membayar pemasok, menerbitkan tagihan, mencatat uang masuk, dan mengajukan biaya. Bisa juga diberi tugas menyetujui pembelian oleh admin." },
  { peran: "Super Admin", isi: "Mengurus akun, memilih siapa yang menyetujui pembelian, mengatur lampiran wajib, data master, pesanan beli dan jual, lokasi kerja absensi, dan rekap kehadiran." },
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
  { judul: "Diperiksa otomatis setiap ada perubahan", isi: "Setiap kali sistem saya ubah, pemeriksaan otomatis berjalan di laptop dan HP sebelum perubahannya dipakai. Pemeriksaan lengkap 26 Oktober lulus semua. Untuk pembaruan 11 November, aturan database lulus 626 pemeriksaan dan logika lulus 108 pemeriksaan, tapi uji alur lengkapnya belum saya jalankan (lihat bagian yang masih tersisa)." },
  { judul: "Cadangan harian", isi: "Database dicadangkan tiap malam dan dienkripsi. Empat pencadangan tercatat berhasil, tiga di antaranya otomatis terjadwal. Satu hal yang belum saya lakukan: mencoba memulihkan cadangan ke tempat kosong (lihat bagian yang masih tersisa)." },
] as const;

/* ------------------------------------------------------------- sudah hidup */
export const LIVE = [
  "Sistemnya sudah bisa dibuka di internet dan tersambung ke database. Orang yang belum masuk diarahkan ke halaman login.",
  "Seluruh fitur sudah terpasang, termasuk absensi dan perbaikan dari hasil pemeriksaan saya terhadap rancangan.",
  "235 catatan uang keluar dari Monitor Dana sudah ada di buku kas.",
  "Satu lokasi kerja absensi sudah saya tandai, yaitu Cold Storage Bungus. Titiknya saya samakan dengan pin kantor di Google Maps.",
  "Akun owner sudah ada. Akun jabatan lain kita buat bareng saat serah terima, lewat menu Akses.",
] as const;

/* ------------------------------------------------------------ yang tersisa */
export const BELUM = [
  { judul: "Uji lengkap pembaruan 11 November", isi: "Pemeriksaan kode, 108 pemeriksaan logika, dan 626 pemeriksaan aturan database di database uji sementara sudah lulus, dan perubahannya sudah saya coba di browser dengan data contoh. Uji alur dari awal sampai akhir belum saya jalankan, dan belum dicoba langsung di sistem yang sudah dipakai." },
  { judul: "Video panduan", isi: "Poin terakhir dari masukan Mas Bisma. Saya rekam setelah perbaikan dari rapat sudah stabil, supaya videonya tidak cepat basi: alur pembelian, penerimaan dan cek mutu, produksi, sampai penjualan, dengan contoh isian." },
  { judul: "Jawaban lanjutan tim Katalis", isi: "Saya masih menunggu jawaban soal pembayaran nelayan untuk ikan yang datang tanpa pesanan, serta aturan transit dan ikan yang menginap. Penerimaan tanpa pesanan dan aturan tarif gudang yang baru menunggu jawaban ini." },
  { judul: "Gambar panduan diperbarui", isi: "Beberapa gambar di halaman panduan masih menampilkan tampilan lama, misalnya form cek mutu. Dua panduan baru (memilih yang menyetujui, mengatur lampiran wajib) juga belum ada gambarnya." },
  { judul: "Absen GPS dicoba di kantor", isi: "Titik kantor dari Google Maps sudah terpasang di sistem. Masalah absen GPS baru bisa dibilang selesai setelah dicoba dari HP di kantor, karena pin di peta bisa sedikit berbeda dengan tempat orang berdiri saat absen." },
  { judul: "Urutan menu lengkap", isi: "Pembelian, Persetujuan, Mutu dan Penerimaan, lalu Produksi sudah saya susun. Urutan menu lainnya menunggu daftar lengkap dari tim pengguna." },
  { judul: "Konsekuensi satu akun per jabatan", isi: "Semua petugas lapangan memakai satu akun yang sama. Jadi absen masuk dan pulang cuma bisa tercatat satu kali per hari untuk semuanya, dan catatan perubahan cuma menunjukkan jabatannya, bukan orangnya." },
  { judul: "Dicoba orang di lapangan", isi: "Timbangan di HP saat sinyal lemah, serta absen dengan kamera dan GPS di lokasi, baru saya uji pakai perangkat tiruan. Belum dicoba di HP petugas yang asli, dan ini yang paling saya mau segera dicoba." },
  { judul: "Satu proyek asli berdampingan dengan kertas", isi: "Angka loin, neraca, tagihan, dan kas belum saya cocokkan dengan catatan kertas. Ini syarat serah terima akhir." },
  { judul: "Bahan dari owner", isi: "Saya butuh data master yang asli, foto formulir timbang Siklus 1 per potong loin untuk saya masukkan, catatan susut, serta biaya bulanan dan aturan pajak supaya laba bersih bisa dihitung. Daftar barang penunjang yang asli juga saya perlukan, karena stok awalnya sekarang masih contoh." },
  { judul: "Keputusan dari owner", isi: "Mohon konfirmasi kapasitas tiap ruangan gudang, minimum hari tarif simpan, cara mencatat setoran modal investor di dashboard, dan berapa lama foto absen disimpan." },
  { judul: "Uji pulihkan cadangan", isi: "Cadangannya sudah ada, tapi belum saya buktikan bisa dipulihkan. Untuk mencobanya saya butuh satu database kosong." },
  { judul: "Pengamanan akun saat serah terima", isi: "Pembuatan akun semua jabatan dan penggantian kata sandi awal kita selesaikan bareng owner." },
  { judul: "Batas paket gratis", isi: "Hosting dan database memakai paket gratis atas keputusan owner. Ketentuan hosting gratis untuk pemakaian non-komersial, dan database yang sepi tujuh hari bisa dijeda. Risiko ini sudah diterima owner dan tercatat." },
  { judul: "Data contoh", isi: "Kalau masih ada, data contoh bertanda \"(Demo)\" yang saya buat untuk latihan presentasi perlu dihapus sebelum sistem dipakai untuk pembukuan sungguhan. Saya sudah siapkan skrip untuk menghapusnya sampai bersih." },
] as const;

export const BERIKUTNYA = [
  { tahap: "Tahap 1", judul: "Mulai dipakai berdampingan", isi: "Ganti kata sandi awal, buat akun tiap jabatan, isi data master, konfirmasi tarif, simpan frasa sandi cadangan di dua orang, dan saya beri latihan singkat untuk tiap jabatan." },
  { tahap: "Tahap 2", judul: "Serah terima akhir", isi: "Satu proyek asli kita catat berdampingan dengan kertas lalu dicocokkan, absensi dicoba di lokasi, pemulihan cadangan saya uji, dan temuan apa pun saya perbaiki." },
] as const;
