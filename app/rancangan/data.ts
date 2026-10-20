/* Isi halaman Rancangan Final. Sumber: catatan owner (pertemuan Bungus Barat 5) dan docs/rencana-eksekusi.md.
   Bahasa sengaja dibuat sederhana untuk owner. Total pengerjaan 4 minggu. */

export type IconName =
  | "Link2" | "ShieldCheck" | "Scale" | "Fish" | "Snowflake" | "Thermometer"
  | "TrendingUp" | "Wallet" | "Smartphone" | "MapPin" | "Lock" | "FlaskConical";

export const PRINSIP = [
  { icon: "Fish" as const, t: "Data produksi lengkap", d: "Setiap ekor dan loin tercatat beratnya. Angka di belakang koma tidak hilang." },
  { icon: "Link2" as const, t: "Semua catatan nyambung", d: "Dari beli ikan sampai uang masuk, tidak perlu ketik ulang di menu lain." },
  { icon: "Search" as const, t: "Setiap angka ada buktinya", d: "Angka di laporan bisa diklik sampai ke transaksi dan notanya." },
];

export type Ubah = { no: string; icon: IconName; judul: string; kata: string; jadi: string[]; minggu: number };
export const PERUBAHAN: Ubah[] = [
  { no: "01", icon: "Link2", minggu: 3, judul: "Satu PO bisa diikuti sampai selesai", kata: "Ingin melihat satu PO dari beli ikan sampai uangnya diterima. Juga ringkasan per hari.", jadi: ["Ada halaman yang menampilkan seluruh perjalanan satu PO beserta semua notanya.", "Ada ringkasan harian: berapa transaksi, nilai beli, hasil produksi, kiriman, dan uang masuk.", "Satu kali beli ikan boleh dipakai untuk beberapa produksi, dan sebaliknya."] },
  { no: "02", icon: "ShieldCheck", minggu: 1, judul: "Persetujuan simpel dan aman", kata: "Persetujuan jangan ribet, bukti harus terlampir, dan jangan sampai salah pencet.", jadi: ["Nota atau bukti transfer muncul tepat di sebelah tombol Setuju.", "\"Disetujui\" dan \"Sudah dibayar\" dipisah, jadi tidak tertukar.", "Kalau menyetujui banyak sekaligus, sistem menampilkan daftar dan totalnya dulu.", "Tercatat siapa yang mengajukan, memeriksa, dan menyetujui, lengkap dengan jamnya."] },
  { no: "03", icon: "Scale", minggu: 2, judul: "Selisih berat bisa dijelaskan", kata: "Ikan masuk, hasil loin, dan sisa olahan selisihnya perlu dijelaskan.", jadi: ["Berat ikan masuk dipecah: daging loin, hasil samping, limbah, susut, dan sisanya.", "Hasil samping, limbah, dan susut diisi dari timbangan, tidak dihitung dari persen tetap seperti angka 18% di formulir produksi lama.", "Setiap bagian ditampilkan dalam kg dan persen.", "Selisih yang belum jelas tidak disembunyikan. Selisih tetap tampil sampai diperiksa."] },
  { no: "04", icon: "Fish", minggu: 2, judul: "Catat loin satu per satu", kata: "Banyak loin dicatat satu-satu. Berat, grade, dan angka desimal tidak boleh hilang.", jadi: ["Urutan isian mengikuti Formulir Produksi (FRM-PRD-01): identitas produksi, lot yang lulus cek mutu, timbang ikan utuh, timbang loin per potong, lalu neraca hasil.", "Hanya lot yang sudah lulus cek mutu yang bisa masuk produksi.", "Setiap potong loin ditimbang dan diberi grade. Nomor ekor boleh diisi supaya hasil per ekor tetap terlihat.", "Persen hasil dihitung otomatis dari timbangan, tidak diketik. Hasil di luar batas wajar ditandai untuk diperiksa, bukan ditolak.", "Isian tersimpan otomatis. Kalau sinyal putus, data tidak hilang.", "Setiap koreksi tercatat: siapa yang mengubah dan apa yang diubah."] },
  { no: "05", icon: "Snowflake", minggu: 2, judul: "Stok sesuai keadaan gudang", kata: "Fresh langsung dikirim, yang beku disimpan. Barang titipan pelanggan harus bisa dilacak.", jadi: ["Stok dibedakan: fresh atau beku, milik sendiri atau titipan pelanggan.", "Tercatat berat saat masuk, berat saat keluar, dan sisanya.", "Ikan fresh yang langsung dikirim tidak perlu dicatat masuk gudang dulu."] },
  { no: "06", icon: "Thermometer", minggu: 2, judul: "Tarif ABF dan cold storage", kata: "Aturan biaya pembekuan, transit, dan penyimpanan.", jadi: ["Tarif, batas waktu transit, dan minimum hari bisa diubah sendiri tanpa programmer.", "Tagihan jasa menampilkan cara hitungnya, jadi pelanggan paham angkanya dari mana.", "Data yang sama selalu menghasilkan tagihan yang sama."] },
  { no: "07", icon: "TrendingUp", minggu: 3, judul: "Pantau harga ikan per kg", kata: "Ingin melihat naik turunnya harga ikan per kg.", jadi: ["Grafik harga beli per hari atau per minggu, per jenis ikan, grade, dan pemasok.", "Angka di grafik bisa diklik untuk melihat transaksinya.", "Harga baru tidak mengubah harga di transaksi lama."] },
  { no: "08", icon: "Wallet", minggu: 3, judul: "Biaya dan laporan keuangan", kata: "Ingin tahu uang dipakai untuk apa saja, total beli ikan, biaya operasional, dan buktinya.", jadi: ["Setiap pengeluaran masuk kelompoknya: bahan baku, produksi, kirim, operasional, perawatan, atau aset.", "Setiap pengeluaran ada nota dan bisa disambungkan ke PO atau produksinya.", "Laporan laba rugi dan penggunaan dana dibuat mengikuti format finance owner."] },
  { no: "09", icon: "Smartphone", minggu: 3, judul: "Dashboard enak dibaca di HP", kata: "Mudah dibaca di HP, dan ada halaman yang cukup untuk melihat saja.", jadi: ["Dashboard owner: ringkasan dulu, rinciannya muncul kalau diketuk.", "Petugas hanya melihat menu yang sesuai tugasnya.", "Halaman untuk melihat data tidak dipenuhi tombol ubah."] },
  { no: "10", icon: "MapPin", minggu: 4, judul: "Absensi dan izin karyawan", kata: "Absen pakai lokasi dan foto. Izin dan sakit masuk ke dashboard owner.", jadi: ["Absen hanya bisa di sekitar lokasi kerja dan wajib foto langsung dari kamera.", "Karyawan bisa mengajukan izin, sakit, atau libur dari HP.", "Owner melihat rekap: hadir, terlambat, izin, sakit, dan tidak hadir."] },
  { no: "11", icon: "Lock", minggu: 1, judul: "Data aman dan tidak hilang", kata: "Data produksi tidak boleh hilang. Keamanan data dan server.", jadi: ["Setiap orang hanya bisa membuka bagian sesuai tugasnya.", "Data tidak bisa dihapus permanen. Salah input diperbaiki dengan koreksi yang tercatat.", "Data dicadangkan setiap hari, dan cara memulihkannya sudah dicoba.", "Kalau penyimpanan gagal, layar langsung memberi tahu."] },
  { no: "12", icon: "FlaskConical", minggu: 4, judul: "Dicoba dengan satu siklus nyata", kata: "Sistem dikembangkan pelan-pelan sambil menerima masukan.", jadi: ["Sebelum dipakai penuh, developer jalankan satu siklus produksi asli di sistem.", "Hasilnya dicocokkan dengan catatan kertas bersama petugas lapangan dan owner."] },
];

export const ALUR = [
  { icon: "ShoppingCart" as const, t: "Beli ikan", d: "Pemasok, berat, harga, nota" },
  { icon: "Ship" as const, t: "Ikan datang", d: "Bongkar, timbang, cek mutu" },
  { icon: "Fish" as const, t: "Produksi", d: "Timbang setiap loin dan hasil samping" },
  { icon: "Boxes" as const, t: "Simpan / kirim", d: "Fresh dikirim, beku disimpan" },
  { icon: "Receipt" as const, t: "Tagihan", d: "Dibuat dari berat yang dikirim" },
  { icon: "CreditCard" as const, t: "Uang masuk", d: "Lunas atau dicicil, ada bukti transfer" },
  { icon: "ChartColumn" as const, t: "Laporan", d: "Setiap angka bisa dicek buktinya" },
];

export const NERACA = [
  { t: "Daging loin", kg: 260 },
  { t: "Hasil samping yang dijual", kg: 60 },
  { t: "Limbah", kg: 50 },
  { t: "Susut yang tercatat", kg: 20 },
  { t: "Belum ketahuan ke mana", kg: 10 },
];
export const BAHAN = 400;

export const JADWAL = [
  { m: 1, t: "Sepakati aturan, lalu pembelian dan persetujuan", isi: ["2 hari pertama: rapat menyepakati jawaban di halaman ini", "Server, akun login, dan pembagian akses", "Beli ikan, ikan datang, cek mutu", "Persetujuan dengan bukti, bayar pemasok"] },
  { m: 2, t: "Produksi, stok, dan gudang dingin", isi: ["Catat loin satu per satu", "Hitungan berat dan selisih", "Stok fresh, beku, dan titipan pelanggan", "Tarif ABF/cold storage dan jadwal ABF"] },
  { m: 3, t: "Penjualan, uang masuk, dan laporan", isi: ["Pesanan, pengiriman, tagihan, uang masuk", "Halaman satu PO dan ringkasan harian", "Biaya, laporan keuangan, dan harga beli", "Dashboard owner di HP"], flag: "Alur beli sampai uang masuk bisa dicoba" },
  { m: 4, t: "Absensi, uji coba nyata, dan mulai pakai", isi: ["Absensi dan izin karyawan", "Asisten AI dan simulasi harga", "Uji satu siklus produksi asli, lalu perbaikan", "Pelatihan, lalu sistem mulai dipakai"], flag: "Sistem mulai dipakai" },
];

export const SYARAT = [
  "Pertanyaan bertanda \"Wajib minggu 1\" sudah dijawab paling lambat hari ke-2.",
  "Bahan di bagian bawah halaman ini dikirim di minggu pertama.",
  "Ada satu orang dari tim perusahaan yang bisa developer hubungi untuk pertanyaan cepat.",
  "Di minggu 4, petugas lapangan ikut mencoba satu siklus produksi asli.",
];

/* Hal yang developer minta disetujui owner. */
export const SETUJU = [
  { t: "Jadwal 1 bulan", d: "Pengerjaan 4 minggu dengan urutan seperti di bagian Jadwal. Setiap akhir minggu hasilnya developer tunjukkan." },
  { t: "Selisih berat tidak disembunyikan", d: "Berat yang belum jelas ke mana tetap tampil apa adanya, tidak dimasukkan ke susut supaya totalnya pas." },
  { t: "\"Disetujui\" dan \"Sudah dibayar\" dipisah", d: "Transaksi yang sudah owner setujui belum dianggap lunas sampai pembayarannya dicatat." },
  { t: "Data tidak bisa dihapus", d: "Salah input diperbaiki dengan koreksi. Catatan lama tetap tersimpan supaya bisa dilacak." },
  { t: "Tarif sementara memakai angka proposal", d: "Cold storage Rp75/kg/hari dengan minimum 10 hari, dan ABF Rp3.500/kg, sampai owner mengonfirmasi aturan finalnya." },
  { t: "Absensi pakai foto, tanpa pengenalan wajah", d: "Foto diambil langsung dari kamera. Pengenalan wajah otomatis tidak termasuk karena biaya dan kerumitannya jauh berbeda." },
  { t: "Server dan biaya bulanan atas nama perusahaan", d: "Supaya data dan tagihannya milik perusahaan. Developer diundang sebagai pengelola." },
];

/* Pertanyaan untuk owner: pertanyaan, kenapa ditanya, pilihan, dan apa yang developer pakai kalau belum dijawab. */
export type Tanya = { t: string; kenapa: string; pilih?: string[]; bawaan: string; wajib: boolean };
export const PERTANYAAN: Tanya[] = [
  { t: "Apakah satu kali beli ikan bisa diolah di beberapa produksi? Dan satu pesanan pembeli bisa diambil dari beberapa produksi?", kenapa: "Ini menentukan cara sistem menyambungkan catatan.", pilih: ["Ya, bisa campur", "Tidak, selalu satu-satu"], bawaan: "Developer menyiapkan sistem supaya bisa campur. Kalau ternyata selalu satu-satu, tetap bisa dipakai.", wajib: true },
  { t: "Nomor apa yang dipakai untuk menandai satu siklus?", kenapa: "Nomor ini dipakai untuk mencari dan melacak satu siklus dari awal sampai akhir. Di formulir produksi, kolom Asal PO masih diisi \"Siklus 1\".", pilih: ["Nomor PO pembeli", "Nomor pembelian ikan", "Nomor bongkaran"], bawaan: "Sistem membuat nomor sendiri, dan ketiga nomor tadi tetap bisa dicari.", wajib: true },
  { t: "Kalau ikan datang malam dan owner belum sempat menyetujui, apakah ikan boleh dibongkar dan dicatat dulu?", kenapa: "Supaya pekerjaan malam tidak tertahan, tapi uang tetap terkontrol.", pilih: ["Boleh dicatat dulu", "Harus tunggu disetujui"], bawaan: "Boleh dicatat dulu dan diberi tanda. Pembayarannya tetap menunggu persetujuan owner.", wajib: true },
  { t: "Siapa yang memeriksa dan siapa yang menyetujui? Untuk beli ikan, biaya operasional, hasil produksi, dan koreksi stok.", kenapa: "Supaya tombol Setuju hanya muncul di orang yang berhak.", bawaan: "Bagian keuangan memeriksa, owner yang menyetujui. Tidak ada batas nilai. Hasil produksi mengikuti formulir: petugas membuat, QC memeriksa, owner menyetujui.", wajib: true },
  { t: "Maksud \"verifikasi dua tahap\" yang dibahas di pertemuan itu yang mana?", kenapa: "Dua hal ini cara membuatnya berbeda.", pilih: ["Diperiksa dua orang", "Kode OTP lewat HP"], bawaan: "Diperiksa dua orang: petugas memeriksa, owner menyetujui.", wajib: true },
  { t: "Timbangan yang dipakai menunjukkan berapa angka di belakang koma?", kenapa: "Supaya angka di sistem sama persis dengan timbangan. Formulir produksi lama hanya menampilkan 1 angka: total loin Siklus 1 tertulis 301,0 kg, padahal catatan owner 300,94 kg.", pilih: ["2 angka (12,35 kg)", "3 angka (12,350 kg)"], bawaan: "Sistem menyimpan 3 angka, jadi tidak ada yang terpotong.", wajib: true },
  { t: "Apakah setiap loin perlu dicatat berasal dari ikan nomor berapa?", kenapa: "Formulir produksi lama mencatat hasil per ekor. Di sistem baru loin ditimbang per potong, dan nomor ekor dipakai kalau owner tetap ingin melihat hasil per ekor.", pilih: ["Ya, wajib", "Tidak perlu"], bawaan: "Kolom nomor ekor disediakan tapi boleh dikosongkan.", wajib: false },
  { t: "Rencana hasil olahan 60% dan batas wajar 40%–80% di formulir produksi: apakah angka ini sudah benar? Apakah berbeda per grade atau ukuran ikan?", kenapa: "Angka ini dipakai untuk menandai ekor dan produksi yang hasilnya di bawah rencana atau tidak wajar.", bawaan: "60% dan 40%–80% untuk semua ikan. Owner bisa mengubahnya sendiri.", wajib: false },
  { t: "Hasil samping Siklus 1 (87 kg) sudah dipisah per jenis. Apakah limbah yang dibuang dan susut juga ditimbang?", kenapa: "481 kg ikan masuk dikurangi 300,94 kg loin dan 87 kg hasil samping masih menyisakan 93,06 kg. Formulir produksi lama menyebut semuanya susut.", pilih: ["Ditimbang per jenis", "Ditimbang total saja", "Belum ditimbang"], bawaan: "Limbah dan susut diisi dari timbangan. Kalau belum ditimbang, beratnya tampil sebagai \"belum jelas\".", wajib: false },
  { t: "Aturan tarif cold storage dan ABF: batas transit 1 jam atau 3 jam? Kapan mulai dihitung 1 hari? Minimum 10 hari berlaku untuk siapa? Tagihan pakai berat masuk atau berat keluar?", kenapa: "Di proposal dan di pertemuan angkanya berbeda.", bawaan: "Memakai angka proposal sampai owner mengonfirmasi.", wajib: false },
  { t: "Bentuk laporan laba rugi seperti apa yang dipakai finance atau direksi?", kenapa: "Developer tidak ingin menebak cara hitung HPP dan pajak perusahaan.", bawaan: "Belum ada. Developer butuh contoh laporannya.", wajib: false },
  { t: "Siapa saja yang akan memakai sistem, dan apa tugas masing-masing?", kenapa: "Untuk membuat akun dan membatasi menu setiap orang.", bawaan: "Belum ada. Developer butuh daftar nama dan tugasnya.", wajib: true },
  { t: "Untuk absensi: di mana titik lokasinya, berapa jarak maksimal, jam masuk, dan batas terlambat?", kenapa: "Supaya absen hanya bisa dilakukan di tempat kerja.", bawaan: "Jarak maksimal 50 meter dari titik lokasi.", wajib: false },
  { t: "Server dan biaya bulanannya atas nama siapa?", kenapa: "Menentukan siapa pemilik data dan siapa yang membayar tagihan server.", pilih: ["Atas nama perusahaan", "Dikelola Dar Dev"], bawaan: "Atas nama perusahaan, developer diundang sebagai pengelola.", wajib: true },
];

export const BAHAN_KIRIM = [
  { icon: "FileText" as const, t: "Foto formulir produksi dan pembelian yang sudah terisi" },
  { icon: "Layers" as const, t: "Semua dokumen dari satu siklus: nota beli, catatan timbang, hasil produksi, surat jalan, tagihan, bukti bayar" },
  { icon: "Fish" as const, t: "Daftar produk, grade, hasil samping, dan jenis limbah" },
  { icon: "Scale" as const, t: "Catatan timbang Siklus 1: berat loin per potong atau per ekor (kg), limbah, dan susut, untuk menjelaskan 93,06 kg yang belum jelas" },
  { icon: "Scale" as const, t: "Merek timbangan dan foto layarnya saat menimbang" },
  { icon: "Receipt" as const, t: "Daftar harga atau contoh tagihan ABF/cold storage" },
  { icon: "ChartColumn" as const, t: "Contoh laporan keuangan dari finance atau direksi" },
  { icon: "Users" as const, t: "Daftar nama pengguna sistem dan tugasnya" },
  { icon: "MapPin" as const, t: "Aturan absensi dan titik lokasi kerja (link Google Maps)" },
];
