/* Isi laporan /update. Ditulis dengan suara pengembang yang ngobrol langsung ke owner dan tim: "saya" untuk yang saya kerjakan, "kita" untuk
   yang disepakati bareng, dan "owner" untuk pemilik usaha. Bahasanya santai dan pendek-pendek, tanpa istilah teknis (masukan Mas Bisma:
   jangan kaku). Jumlah tes dan catatan kas yang diimpor diambil dari pemeriksaan lengkap per 26 Oktober 2026 (PERIKSA_LENGKAP), jumlah menu
   dan jabatan dihitung ulang per 11 November 2026. Tidak ada angka perkiraan. Pembaruan sesudah 26 Oktober dicatat di PERJALANAN dan TERBARU. */

export const TANGGAL = "11 November 2026";
export const PERIKSA_LENGKAP = "26 Oktober 2026";

/* ---------------------------------------------------------------- angka */
export const ANGKA = [
  { nilai: "23 dari 23", label: "fitur yang kita sepakati udah jadi semua, dan semuanya lulus uji." },
  { nilai: "15", label: "menu udah siap dipakai. Jabatannya ada 5, dan tiap jabatan cuma lihat menu yang memang urusannya." },
  { nilai: "235", label: "catatan uang keluar dari Monitor Dana udah saya masukin ke buku kas. Riwayat lama nggak perlu diketik ulang." },
  { nilai: "581", label: "pemeriksaan otomatis lulus semua di pemeriksaan lengkap 26 Oktober, termasuk satu putaran penuh dari beli ikan sampai uang masuk." },
] as const;

/* ------------------------------------------------------------ perjalanan */
export const PERJALANAN = [
  { tanggal: "14 Oktober", judul: "Penawaran", isi: "Saya mulai dari penawaran dan contoh aplikasi di laptop dan HP, biar owner kebayang dulu sistemnya kayak apa sebelum saya bangun." },
  { tanggal: "21 Oktober", judul: "Rancangan disepakati", isi: "Rancangan akhir sama formulir timbang produksi saya susun. Pertanyaan buat owner saya bikin supaya cukup dijawab sekali ketuk." },
  { tanggal: "22 Oktober", judul: "Jawaban owner masuk", isi: "Jawaban owner langsung saya masukin ke sistem: lima jabatan, tarif simpan Rp76 per kg per hari, dan pakai paket gratis. Pondasinya juga sekalian saya pasang: login, pengaturan jabatan, data master, catatan perubahan, dan data yang nggak bisa dihapus." },
  { tanggal: "23 Oktober", judul: "Semua alur kerja jadi", isi: "Ini hari paling padat. Pembelian dan persetujuan, produksi per potong loin, stok dan gudang dingin, penjualan, keuangan dan laporan, dashboard, sampai Asisten AI. Habis itu catatan Monitor Dana, tutup buku, absensi, tutup siklus, dan bikin akun lewat tautan." },
  { tanggal: "27 Oktober", judul: "Tampilan saya rapiin", isi: "Menu samping saya bikin ulang, ada logo dan pengelompokannya. Tampilan HP sekarang beda dari laptop. Buku kas jadi per hari, daftar lot dan penjualan lebih jelas, di menu Akses bisa ganti email dan lepas jabatan, dan ada data contoh buat latihan." },
  { tanggal: "31 Oktober", judul: "Gudang per ruangan dan stok penunjang", isi: "Gudang dingin sekarang dicatat per ruangan: ABF 1 sampai 3 dan Cold Storage 1. Ada stok barang penunjang kerja, kotak cari di semua daftar, dan Asisten bisa bikin laporan harian, mingguan, dan bulanan." },
  { tanggal: "4 November", judul: "Catatan rapat saya kerjain", isi: "Berat ikan pas penerimaan sekarang diambil dari pesanan. Jam kerja absensi disesuaikan, urutan menu operasional diubah, unduhan laporan jadi Excel yang rapi, dan akun dibikin satu per jabatan lewat tautan undangan." },
  { tanggal: "6 November", judul: "Jawaban tim Katalis masuk", isi: "Berat loin sekarang cukup diisi total per grade. Kalau mau timbang per potong, masih bisa. Nota nelayan, tanda terima titipan, sama tagihan yang dibuat admin di luar sistem tinggal difoto terus dilampirkan." },
  { tanggal: "10 November", judul: "Masukan Mas Bisma, bagian pertama", isi: "Pemasok baru bisa ditambah langsung dari form pembelian. Arti Lulus dan Tahan sekarang ada keterangannya di layar. Hasil produksi yang belum masuk stok udah muncul di form pesanan, dan kolom harga per kilo di HP udah nggak kepotong lagi." },
  { tanggal: "11 November", judul: "Masukan Mas Bisma, bagian kedua", isi: "Satu lot bisa diisi beberapa grade. Pembelian nggak nunggu nota lagi. Siapa yang menyetujui dan lampiran apa yang wajib, admin yang atur. Siklus juga saya ganti namanya jadi Proyek, dan stoknya ikut kecatat per proyek." },
] as const;

/* -------------------------------------------------------------- terbaru */
/* Laporan terbaru: masukan Mas Bisma (notulen 10 November) dan jawaban perusahaan 11 November. */
export const TERBARU: { judul: string; isi: string }[] = [
  { judul: "Nota boleh nyusul", isi: "Kalau notanya belum ada, misalnya pas bongkar malam, pembelian tetap bisa diajukan. Tinggal centang \"Nota menyusul\". Ikan tetap bisa diterima dan diproduksi, pembeliannya juga tetap bisa disetujui. Notanya dilampirkan belakangan sama orang yang dipilih admin." },
  { judul: "Admin yang milih siapa yang menyetujui", isi: "Di menu Akses sekarang ada bagian Tugas per peran. Di situ admin tinggal pilih jabatan mana yang boleh menyetujui pembelian, memeriksa, dan nambahin nota susulan. Owner tetap bisa semuanya. Orang yang mengajukan nggak bisa menyetujui pengajuannya sendiri, dan nama yang berhak menyetujui kelihatan di layar." },
  { judul: "Lampiran wajib juga diatur admin", isi: "Ada tab Lampiran wajib di Pengaturan. Awalnya saya set begini: nota pembelian, foto timbangan (satu tiap kali terima ikan, jadi kalau nimbangnya bertahap ya satu foto per tahap), sama bukti transfer. Kalau ada yang belum dilampirkan, cuma ditandai \"Belum ada\". Pencatatannya tetap jalan." },
  { judul: "Satu lot bisa beberapa grade", isi: "Waktu cek mutu, QC bisa isi beberapa grade sekaligus sama beratnya, misalnya 500 kg B-SO dan 300 kg A-SO. Totalnya nggak boleh lebih dari berat lot. Laporan harga beli juga ikut dipecah per grade." },
  { judul: "Siklus sekarang namanya Proyek", isi: "Satu proyek itu satu batch atau satu bongkaran, dan isinya boleh beberapa pembelian. Dari pembelian, lot, produksi, stok, penjualan, tagihan, sampai biaya, semuanya bisa ditelusuri per proyek. Stok hasil produksi sekarang ikut kecatat proyeknya, dan kode proyeknya muncul di daftar lot, daftar stok, sama pilihan stok pas bikin pesanan." },
  { judul: "Video panduan", isi: "Ada enam video pendek di halaman Panduan, masing-masing 1 sampai 2 menit: bikin PO, menyetujui, terima ikan dan cek mutu, produksi, periksa dan masuk stok, sampai jual dan tagih. Direkam dari aplikasinya langsung pakai data contoh, penjelasannya berupa tulisan di layar. Kalau nanti tampilannya berubah, videonya bisa saya rekam ulang dengan cepat." },
  { judul: "Perbaikan kecil dari rapat", isi: "Pemasok baru bisa ditambah langsung dari form pembelian. Lulus dan Tahan sekarang ada penjelasannya. Hasil produksi yang belum masuk stok udah kelihatan di form pesanan, dan kolom harga per kilo di HP nggak keluar layar lagi." },
];

/* Status sepuluh poin notulen Mas Bisma per 11 November. */
export const NOTULEN: { poin: string; status: "selesai" | "menunggu" }[] = [
  { poin: "1. Tambah pemasok dari form pembelian", status: "selesai" },
  { poin: "2. Nota boleh nyusul", status: "selesai" },
  { poin: "3. Jelas siapa yang menyetujui pembelian", status: "selesai" },
  { poin: "4. Penjelasan Lulus dan Tahan", status: "selesai" },
  { poin: "5. Lampiran dan foto timbangan wajib", status: "selesai" },
  { poin: "6. Satu lot beberapa grade", status: "selesai" },
  { poin: "7. Pencatatan per proyek", status: "selesai" },
  { poin: "8. Hasil produksi muncul di form pesanan", status: "selesai" },
  { poin: "9. Kolom harga per kilo di HP", status: "selesai" },
  { poin: "10. Video panduan", status: "selesai" },
];

/* ------------------------------------------------------------------ modul */
export type Modul = { slug: string; nama: string; ringkas: string; poin: string[] };
export const MODUL: Modul[] = [
  {
    slug: "dashboard", nama: "Dashboard", ringkas: "Satu halaman buat owner mantau semuanya.",
    poin: [
      "Paling atas ada daftar \"Perlu tindakan Anda\" (tulisannya memang begitu di layar). Isinya semua yang nunggu keputusan: pembelian yang belum disetujui, biaya, koreksi stok, produksi yang nunggu, ikan yang belum dicek mutunya, tagihan yang telat, dan izin karyawan. Satu urusan satu baris.",
      "Ketuk barisnya, owner langsung dibawa ke urusan itu. Kalau pembelian, kartunya udah langsung disorot di antrean persetujuan.",
      "Di bawahnya ada kas bulan ini, piutang, utang ke pemasok, stok sendiri dan titipan, isi tiap ruangan gudang dingin, arus kas enam bulan, laba rugi proyek terbaru, dan berapa transaksi yang belum ada notanya.",
      "Tiap jabatan cuma lihat yang memang bisa dia kerjain.",
    ],
  },
  {
    slug: "pembelian", nama: "Pembelian", ringkas: "Pesanan ke pemasok, notanya, dan pembayarannya.",
    poin: [
      "Tiap pesanan isinya pemasok, berat, harga per kilo, nota, dan proyeknya. Pemasok baru bisa langsung ditambah dari form ini. Harganya dikunci pas diajukan, jadi kalau nanti harga naik, pesanan lama nggak ikut berubah.",
      "Kalau nota belum ada, pesanan tetap bisa diajukan dengan tanda \"Nota menyusul\". Notanya dilampirkan belakangan sama jabatan yang dipilih admin.",
      "Ada tiga status yang dicatat sendiri-sendiri: udah disetujui atau belum, ikannya udah diterima (belum, sebagian, lengkap), dan udah dibayar (belum, sebagian, lunas).",
      "Finance bisa nyicil pembayaran. Sistem nolak kalau bayarnya lebih dari nilai pesanan, atau pesanannya belum disetujui.",
      "Petugas lapangan nggak lihat harga. Mereka cuma lihat pesanan yang siap diterima, tanpa nilainya.",
    ],
  },
  {
    slug: "persetujuan", nama: "Persetujuan", ringkas: "Yang menyetujui dipilih admin, dan notanya ada di sebelah tombol.",
    poin: [
      "Alurnya: diajukan, diperiksa, terus disetujui. Siapa yang meriksa dan siapa yang menyetujui dipilih admin di menu Akses, dan namanya kelihatan di layar. Awalnya Finance yang meriksa dan owner yang menyetujui. Yang menyetujui boleh langsung mutusin tanpa nunggu diperiksa, tapi nggak boleh menyetujui pengajuannya sendiri.",
      "Pengajuan bisa dibalikin buat diperbaiki atau ditolak. Dua-duanya wajib nulis alasan.",
      "Tiap kartu nampilin nota dan harga per kilo. Kalau harganya naik dibanding pembelian terakhir dari pemasok yang sama, ada peringatannya.",
      "Mau setujuin banyak sekaligus? Pilih beberapa kartu. Sistem nampilin daftar, jumlah, dan total nilainya dulu sebelum disetujui.",
      "Disetujui belum tentu udah dibayar. Pembayarannya dicatat terpisah sama Finance.",
      "Ikan yang datang malam sebelum disetujui (bongkar malam) saya taruh di daftar sendiri, biar nggak kelewat.",
    ],
  },
  {
    slug: "mutu", nama: "Mutu dan Penerimaan", ringkas: "Dari ikan datang sampai lulus cek mutu.",
    poin: [
      "Ikan yang diterima dicatat jadi lot, dan boleh diterima bertahap. Lot dari bongkar malam dikasih tanda khusus.",
      "Beratnya nggak perlu diketik ulang, otomatis pakai sisa berat di pesanan. Kalau kiriman aslinya beda, petugas tinggal centang terus isi berat aslinya. Timbangan berikutnya buat hasil olahan, di menu Produksi.",
      "QC nilai tiap lot: lulus dengan satu atau beberapa grade plus beratnya, atau ditahan dengan catatan. Arti Lulus dan Tahan dijelasin langsung di layar.",
      "Foto timbangan wajib satu tiap kali terima ikan. Lot yang belum ada fotonya ditandai \"Belum ada\", tapi tetap bisa dicek mutu dan diproduksi.",
      "Cuma lot yang lulus dan masih ada sisanya yang bisa dipakai produksi.",
    ],
  },
  {
    slug: "produksi", nama: "Produksi", ringkas: "Nimbang loin, dan selisihnya kelihatan apa adanya.",
    poin: [
      "Produksi dimulai dari satu atau beberapa lot. Owner bisa nelusurin dua arah: dari lot ke produksinya, atau dari produksi balik ke lot asalnya.",
      "Berat loin cukup diisi total per grade. Kalau perlu, bisa juga ditimbang per potong lewat tabel timbang. Tabelnya saya samain sama formulir kertas yang biasa dipakai: nomor ekor, nomor loin, grade, dan berat sampai tiga angka di belakang koma. Cukup pakai keyboard, total per grade dan per ekor kehitung sendiri.",
      "Kalau sinyal putus, catatannya tetap aman di HP dan kekirim sendiri begitu sinyal balik. Dua petugas yang ngedit baris yang sama nggak saling nimpa, dan tiap koreksi nyatet angka sebelum dan sesudahnya.",
      "Ada neraca berat: ikan masuk harus sama dengan loin, hasil samping, limbah, dan susut yang ditimbang. Sisanya tampil sebagai \"selisih belum jelas\", dan nggak pernah saya isi otomatis. Hasil di luar 40 sampai 80 persen ditandai buat dicek, targetnya 60 persen.",
      "Habis petugas selesai nimbang, QC meriksa, terus owner menyetujui. Yang nimbang nggak boleh meriksa produksi yang sama. Formulirnya bisa dicetak, tabelnya bisa diunduh ke Excel.",
    ],
  },
  {
    slug: "stok", nama: "Stok", ringkas: "Tiap kilo jelas punya siapa, kondisinya, dan di mana.",
    poin: [
      "Stok dicatat per pemilik (punya sendiri atau titipan pelanggan), produk, grade, segar atau beku, lokasi, dan proyek asalnya.",
      "Hasil produksi baru masuk stok setelah produksinya disetujui owner. Ikan segar boleh langsung dikirim tanpa masuk gudang.",
      "Stok bisa diambil sebagian atau semuanya, pakai berat hasil timbang ulang. Koreksi stok baru berlaku setelah disetujui owner.",
      "Barang penunjang kerja punya catatan sendiri: barang masuk, pemakaian, koreksi, dan batas minimum.",
    ],
  },
  {
    slug: "gudang", nama: "Gudang Dingin", ringkas: "Ruangan, titipan pelanggan, tarif, dan jadwal mesin.",
    poin: [
      "Gudang dicatat per ruangan: ABF 1, ABF 2, ABF 3, dan Cold Storage 1. Isi tiap ruangan kelihatan, dan stok bisa dipindah antarruangan, misalnya dari ABF ke cold storage setelah beku.",
      "Titipan pelanggan dicatat masuk keluarnya. Kapasitas 17.500 kg saya jaga: titipan baru ditolak kalau stok sendiri plus titipan udah lewat batas. Pembagian per ruangan masih sementara, nunggu angka dari owner.",
      "Tarifnya saya simpan di pengaturan, jadi gampang diubah: simpan Rp76 per kg per hari minimum 10 hari, dan ABF Rp3.500 per kg. Minimum 10 hari itu masih usulan saya, nunggu konfirmasi owner. Data yang sama selalu ngasilin tagihan yang sama.",
      "Tagihan jasa gudang nampilin cara ngitungnya, jadi pelanggan bisa ngecek sendiri.",
      "Jadwal mesin ABF dan produksi mitra ngasih tahu kalau bentrok, dan bisa dipindah ke jam kosong terdekat.",
    ],
  },
  {
    slug: "penjualan", nama: "Penjualan", ringkas: "Pesanan, pengiriman, tagihan, dan uang masuk.",
    poin: [
      "Pesanan diambil dari stok, dan nggak boleh lebih dari stok yang ada setelah dikurangi pesanan lain yang belum dikirim. Satu pesanan boleh dari beberapa produksi. Pilihan stoknya nampilin proyek dan produksi asalnya, dan hasil produksi yang belum masuk stok juga kelihatan.",
      "Pas dikirim, berat kirim diisi dari hasil timbang. Kalau pembeli nimbang ulang, berat versi pembeli juga dicatat, dan tagihannya pakai berat itu.",
      "Tagihan jatuh tempo 14 hari. Statusnya jelas: belum jatuh tempo, jatuh tempo, telat, atau lunas. Pembeli boleh bayar sebagian, pakai bukti transfer.",
    ],
  },
  {
    slug: "keuangan", nama: "Keuangan", ringkas: "Biaya pakai nota, buku kas, dan tutup buku.",
    poin: [
      "Biaya dibagi delapan kategori. Kategori yang wajib nota nggak bisa diajukan tanpa nota. Biaya bisa dikaitin ke pembelian, produksi, atau proyek, dan ditolak kalau nggak nyambung.",
      "Biaya baru berlaku setelah disetujui owner. Bayar ke pemasok, uang masuk dari pembeli, dan biaya yang disetujui otomatis masuk buku kas.",
      "Buku kas tampil per hari, bisa disaring uang masuk atau keluar, dan bisa diunduh ke Excel.",
      "Tutup buku per bulan, urut dari bulan paling lama, dan cuma bisa setelah bulannya lewat. Bulan yang udah ditutup kekunci, dan cuma owner yang bisa buka lagi, pakai alasan.",
      "235 catatan uang keluar dari Monitor Dana yang saya sebut di atas udah ada di buku kas.",
    ],
  },
  {
    slug: "laporan", nama: "Laporan", ringkas: "Laba rugi per proyek, bisa diketuk sampai ke transaksinya.",
    poin: [
      "Laba rugi per proyek saya bikin ngikutin contoh laporan Siklus 1: pendapatan per grade dan hasil samping, biaya langsung, laba kotor, margin, angka per kilo loin, dan harga jual minimal.",
      "Tiap baris bisa diketuk buat lihat transaksi di baliknya. Unduhannya file Excel yang rapi, enak dibaca, bisa dicetak di A4, dan angkanya persis sama dengan di layar. Diagram di Excel masih usulan, belum saya bikin.",
      "Ada juga tren antarproyek, harga beli rata-rata per grade, per periode, dan per pemasok, plus simulasi: kalau harga ikan naik atau turun, labanya jadi berapa.",
      "Laba bersih sementara masih tertulis \"belum bisa dihitung\", soalnya saya masih butuh biaya bulanan, penyusutan, dan aturan pajak dari owner.",
    ],
  },
  {
    slug: "siklus", nama: "Rincian Proyek", ringkas: "Satu proyek (batch atau bongkaran) dari beli ikan sampai uang masuk.",
    poin: [
      "Dulu namanya Siklus. Satu proyek itu satu batch atau satu bongkaran, dan isinya boleh beberapa pembelian.",
      "Ada tujuh tahap di satu layar: beli ikan, terima dan cek mutu, produksi, stok, jual dan kirim, tagihan dan uang masuk, biaya lain. Semuanya ditarik dari catatan yang sama, jadi nggak ada yang diketik ulang.",
      "Owner bisa nutup proyek yang udah beres. Sistem nolak kalau masih ada pembelian yang belum diputusin atau belum lunas, produksi yang belum disetujui, pesanan yang belum dikirim, tagihan yang belum lunas, atau biaya yang belum diputusin. Proyek yang udah ditutup nggak bisa nerima transaksi baru sampai owner buka lagi, pakai alasan.",
    ],
  },
  {
    slug: "asisten", nama: "Asisten AI", ringkas: "Tanya pakai kalimat biasa. Asistennya cuma bisa baca.",
    poin: [
      "Bisa ditanya soal tagihan telat, saldo kas, hasil per ekor, jadwal yang bentrok, urusan yang nunggu keputusan, isi gudang dingin, transaksi tanpa nota, dan biaya serta laba satu proyek.",
      "Jawabannya nggak pernah lebih dari yang boleh dilihat si penanya. Asisten nggak bisa ngubah data apa pun, dan jumlah pertanyaan per hari ada batasnya.",
      "Jawabannya saya bikin singkat, pakai tabel atau paragraf pendek.",
      "Ada laporan harian, mingguan, dan bulanan. Bisa dicetak, disimpan jadi PDF, atau diunduh ke Excel.",
    ],
  },
  {
    slug: "absensi", nama: "Absensi", ringkas: "Lokasi dari GPS, foto langsung dari kamera, jam dari sistem.",
    poin: [
      "Karyawan absen masuk dan pulang dari HP, pakai GPS dan foto yang diambil langsung (nggak bisa dari galeri). Jarak ke lokasi kerja dihitung sendiri sama sistem.",
      "Absen ditolak kalau di luar radius atau GPS-nya kurang akurat, lengkap dengan alasannya, dan percobaan yang ditolak tetap kecatat. Sehari satu absen masuk dan satu absen pulang.",
      "Izin, sakit, dan libur diajukan dari HP, owner yang mutusin. Super Admin dan owner bisa lihat rekap bulanan (hadir, telat, izin, sakit, nggak hadir) dan foto absen harian.",
      "Jam kerjanya Senin sampai Jumat 08.00 sampai 17.00, Sabtu 08.00 sampai 12.00. Pulang lebih awal tetap bisa, dan menitnya dicatat. Hari Minggu nggak dihitung telat atau pulang awal.",
      "Super Admin nandain lokasi kerja pakai tombol \"lokasi saya sekarang\", terus ngatur radius, batas akurasi, jam kerja hari biasa dan Sabtu, dan toleransi telat.",
    ],
  },
  {
    slug: "akses", nama: "Akses", ringkas: "Satu akun per jabatan, dibikin lewat tautan undangan.",
    poin: [
      "Super Admin bikin akun pakai nama, email (buat masuk), dan jabatan. Satu jabatan cuma buat satu akun aktif, jadi jabatan yang udah ada orangnya nggak muncul lagi di pilihan.",
      "Sistem bikin tautan undangan sekali pakai yang berlaku 24 jam, tinggal kirim lewat WhatsApp. Begitu diklik, penerimanya langsung bikin kata sandi. Tautannya baru kepakai pas kata sandi disimpan, jadi pratinjau WhatsApp nggak bikin tautannya hangus.",
      "Lupa kata sandi? Tinggal bikin tautan baru. Email masuk bisa diganti, dan jabatan seseorang bisa dilepas (akunnya otomatis nonaktif, bisa diaktifin lagi). Akun orang yang keluar dinonaktifin, nggak dihapus. Akun Owner cuma bisa dibikin dan diatur sama Owner.",
      "Di bagian Tugas per peran, admin milih jabatan yang boleh menyetujui pembelian, meriksa, dan nambahin nota susulan. Tugas buat jabatan admin sendiri cuma bisa diubah owner.",
      "Tiap akun punya kata sandi sendiri. Kode kedua (MFA) sempat dipasang terus dicabut atas keputusan developer, jadi kata sandi yang kuat satu-satunya pengaman akun. Daftar sendiri tanpa undangan saya tutup.",
    ],
  },
  {
    slug: "pengaturan", nama: "Pengaturan", ringkas: "Data master, target hasil, dan lampiran wajib.",
    poin: [
      "Admin nentuin lampiran mana yang wajib dan mana yang opsional: nota pembelian, foto timbangan, bukti transfer, dan lainnya.",
      "Isinya daftar pemasok, pembeli, produk, grade, jenis hasil samping, dan kategori biaya. Datanya nggak dihapus, cuma dinonaktifin.",
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
  { peran: "Owner", isi: "Pemilik usaha. Pegang semua izin, dan jadi yang terakhir menyetujui biaya, koreksi stok, produksi, dan izin karyawan. Selalu bisa menyetujui pembelian. Cuma owner yang bisa tutup buku dan tutup proyek." },
  { peran: "Finance", isi: "Meriksa pembelian, nambahin nota susulan, bayar pemasok, nerbitin tagihan, nyatet uang masuk, dan ngajuin biaya. Bisa juga dikasih tugas menyetujui pembelian sama admin." },
  { peran: "Super Admin", isi: "Ngurus akun, milih siapa yang menyetujui pembelian, ngatur lampiran wajib, data master, pesanan beli dan jual, lokasi kerja absensi, dan rekap kehadiran." },
  { peran: "Kepala Produksi dan QC", isi: "Nilai mutu lot, meriksa neraca produksi sebelum sampai ke owner, dan ngajuin koreksi stok." },
  { peran: "Petugas Lapangan", isi: "Nerima dan nimbang ikan, ngisi timbangan loin dan hasil samping, nyatet pengiriman dan titipan. Nggak lihat harga." },
] as const;

/* ------------------------------------------------------------ keamanan */
export const KUALITAS = [
  { judul: "Data nggak bisa dihapus", isi: "Nggak ada tombol hapus di mana pun. Yang salah dibatalin atau dikoreksi pakai alasan, dan tiap perubahan nyatet siapa, kapan, sama angka sebelum dan sesudahnya. Jadi riwayatnya selalu utuh." },
  { judul: "Aturannya dijaga sampai ke database", isi: "Aturan kayak setuju, kirim, bayar, dan tutup buku saya pasang sampai ke database. Jadi kalaupun ada yang nyoba lewat jalan lain, tetap ditolak." },
  { judul: "Akses berlapis", isi: "Izin dicek di halaman, di tiap tombol, dan di database. Nota dan foto absen disimpan di tempat tertutup, cuma bisa dibuka lewat tautan yang hangus dalam 60 detik. Percobaan masuk juga dibatasi, jadi kata sandi nggak bisa ditebak-tebak." },
  { judul: "Angkanya nggak geser", isi: "Berat dihitung sampai tiga angka di belakang koma dan uang sampai dua angka, tanpa dibulatin diam-diam. Saya udah uji pakai 500 potong loin: total di layar, rekap per grade dan per ekor, neraca, dan file unduhannya hasilnya sama persis." },
  { judul: "Satu putaran penuh udah diuji", isi: "Saya jalanin pembelian sampai uang masuk pakai kelima jabatan, terus nyocokin angka di neraca, stok, tagihan, rincian proyek, laba rugi, dashboard, dan buku kas. Perubahan saldo kas harus sama dengan laba kotor." },
  { judul: "Dicek otomatis tiap ada perubahan", isi: "Tiap kali sistem saya ubah, pemeriksaan otomatis jalan di laptop dan HP sebelum perubahannya dipakai. Pemeriksaan lengkap 26 Oktober lulus semua. Pembaruan 11 November juga lulus semua: 626 pemeriksaan aturan database, 108 pemeriksaan logika, dan tes klik-klik." },
  { judul: "Cadangan tiap hari", isi: "Database dicadangin tiap malam dan dienkripsi. Udah empat kali berhasil, tiga di antaranya otomatis terjadwal. Yang belum saya lakuin: nyoba mulihin cadangan ke tempat kosong (ada di bagian yang masih tersisa)." },
] as const;

/* ------------------------------------------------------------- sudah hidup */
export const LIVE = [
  "Sistemnya udah bisa dibuka di internet dan nyambung ke database. Yang belum masuk diarahin ke halaman login.",
  "Semua fitur udah terpasang, termasuk absensi dan perbaikan dari hasil pemeriksaan saya ke rancangan.",
  "235 catatan uang keluar dari Monitor Dana udah ada di buku kas.",
  "Satu lokasi kerja absensi udah saya tandai, yaitu Cold Storage Bungus. Titiknya saya samain sama pin kantor di Google Maps.",
  "Akun owner udah ada. Akun jabatan lain kita bikin bareng pas serah terima, lewat menu Akses.",
] as const;

/* ------------------------------------------------------------ yang tersisa */
export const BELUM = [
  { judul: "Dicoba di sistem yang udah jalan", isi: "Pembaruan 11 November udah lulus semua pemeriksaan otomatis, termasuk 626 pemeriksaan aturan database dan tes klik-klik. Saya juga udah coba sendiri pakai data contoh. Yang belum: nyoba langsung di sistem yang udah dipakai." },
  { judul: "Jawaban lanjutan tim Katalis", isi: "Masih nunggu jawaban soal bayar nelayan kalau ikannya datang tanpa pesanan, sama aturan transit dan ikan yang nginep. Fitur terima ikan tanpa pesanan dan tarif gudang yang baru nunggu jawaban ini." },
  { judul: "Gambar panduan", isi: "Beberapa gambar di halaman panduan masih pakai tampilan lama, misalnya form cek mutu. Dua panduan baru (milih yang menyetujui, atur lampiran wajib) juga belum ada gambarnya." },
  { judul: "Absen GPS dicoba di kantor", isi: "Titik kantor dari Google Maps udah kepasang di sistem. Tapi baru bisa dibilang beres kalau udah dicoba dari HP di kantor, soalnya pin di peta bisa agak beda sama tempat orang berdiri pas absen." },
  { judul: "Urutan menu lengkap", isi: "Pembelian, Persetujuan, Mutu dan Penerimaan, terus Produksi udah saya urutin. Menu lainnya nunggu daftar lengkap dari tim pengguna." },
  { judul: "Efek satu akun per jabatan", isi: "Semua petugas lapangan pakai satu akun yang sama. Jadi absen masuk dan pulang cuma kecatat sekali sehari buat semuanya, dan catatan perubahan cuma nunjukin jabatannya, orangnya nggak kelihatan." },
  { judul: "Dicoba orang di lapangan", isi: "Timbangan di HP pas sinyal jelek, sama absen pakai kamera dan GPS di lokasi, baru saya uji pakai perangkat tiruan. Belum dicoba di HP petugas yang asli, dan ini yang paling pengin saya coba duluan." },
  { judul: "Satu proyek asli dibandingin sama kertas", isi: "Angka loin, neraca, tagihan, dan kas belum saya cocokin sama catatan kertas. Ini syarat serah terima akhir." },
  { judul: "Bahan dari owner", isi: "Saya butuh data master yang asli, foto formulir timbang Siklus 1 per potong loin buat saya masukin, catatan susut, plus biaya bulanan dan aturan pajak biar laba bersih bisa dihitung. Daftar barang penunjang yang asli juga saya perlu, soalnya stok awalnya sekarang masih contoh." },
  { judul: "Keputusan dari owner", isi: "Tolong dikonfirmasi: kapasitas tiap ruangan gudang, minimum hari tarif simpan, cara nyatet setoran modal investor di dashboard, dan foto absen disimpan berapa lama." },
  { judul: "Uji mulihin cadangan", isi: "Cadangannya udah ada, tapi belum saya buktiin bisa dipulihin. Buat nyobanya saya butuh satu database kosong." },
  { judul: "Ngamanin akun pas serah terima", isi: "Bikin akun semua jabatan dan ganti kata sandi awal kita beresin bareng owner." },
  { judul: "Batas paket gratis", isi: "Hosting dan database pakai paket gratis, sesuai keputusan owner. Hosting gratis aturannya buat pemakaian non-komersial, dan database yang sepi tujuh hari bisa dijeda. Risikonya udah diterima owner dan udah dicatat." },
  { judul: "Data contoh", isi: "Kalau masih ada, data contoh bertanda \"(Demo)\" yang saya bikin buat latihan presentasi perlu dihapus dulu sebelum sistemnya dipakai buat pembukuan beneran. Skrip buat ngehapusnya udah saya siapin." },
] as const;

export const BERIKUTNYA = [
  { tahap: "Tahap 1", judul: "Mulai dipakai bareng kertas", isi: "Ganti kata sandi awal, bikin akun tiap jabatan, isi data master, konfirmasi tarif, simpan frasa sandi cadangan di dua orang, terus saya kasih latihan singkat buat tiap jabatan." },
  { tahap: "Tahap 2", judul: "Serah terima akhir", isi: "Satu proyek asli kita catat bareng kertas terus dicocokin, absensi dicoba di lokasi, pemulihan cadangan saya uji, dan apa pun yang ketemu saya perbaiki." },
] as const;
