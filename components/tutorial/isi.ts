import type { NamaGambar } from "./gambar";

/* Isi halaman /tutorial. Tulisan mengikuti label tombol di aplikasi; screenshot memakai data contoh. */

export type PeranId = "owner" | "finance" | "admin" | "qc" | "petugas";

export const DAFTAR_PERAN: { id: PeranId; label: string }[] = [
  { id: "owner", label: "Owner" },
  { id: "finance", label: "Finance" },
  { id: "admin", label: "Super Admin" },
  { id: "qc", label: "Kepala Produksi / QC" },
  { id: "petugas", label: "Petugas Lapangan" },
];

const SEMUA: PeranId[] = ["owner", "finance", "admin", "qc", "petugas"];

export type Tugas = {
  judul: string;
  /** Kosong berarti untuk semua jabatan yang melihat menu ini. */
  peran?: PeranId[];
  pengantar?: string;
  langkah?: string[];
  gambar?: NamaGambar;
  keterangan?: string;
  catatan?: string;
};

export type Bab = {
  slug: string;
  judul: string;
  kelompok: "Mulai" | "Operasi" | "Stok" | "Niaga" | "Laporan" | "Lainnya" | "Admin" | "Bantuan";
  ringkas: string;
  peran: PeranId[];
  /** Alamat menu di aplikasi. */
  menu?: string;
  tugas: Tugas[];
};

export const ALUR = ["Pembelian", "Persetujuan", "Mutu", "Produksi", "Stok", "Penjualan", "Keuangan", "Laporan"];

export type LangkahAlur = { peran: PeranId; menu: string; slug: string; kerja: string };

/* Satu putaran dari beli ikan sampai uang masuk, supaya terlihat kapan tugas pindah jabatan. */
export const ALUR_CONTOH: LangkahAlur[] = [
  { peran: "admin", menu: "Pembelian", slug: "pembelian", kerja: "Membuat PO 700 kg, melampirkan nota, lalu menekan Ajukan untuk diperiksa." },
  { peran: "finance", menu: "Persetujuan", slug: "persetujuan", kerja: "Memeriksa nota dan harga, lalu menekan Sudah diperiksa." },
  { peran: "owner", menu: "Persetujuan", slug: "persetujuan", kerja: "Menekan Setujui. PO boleh dibayar." },
  { peran: "petugas", menu: "Mutu dan Penerimaan", slug: "mutu", kerja: "Ikan datang. Memilih PO dan menekan Catat penerimaan. Sistem membuat lot." },
  { peran: "qc", menu: "Mutu dan Penerimaan", slug: "mutu", kerja: "Menekan Cek mutu, memilih Lulus dan kelas mutunya." },
  { peran: "finance", menu: "Pembelian", slug: "pembelian", kerja: "Mencatat pembayaran ke pemasok dan melampirkan bukti transfer." },
  { peran: "petugas", menu: "Produksi", slug: "produksi", kerja: "Memulai produksi dari lot itu, menimbang loin, mengisi komponen, lalu menekan Selesaikan produksi." },
  { peran: "qc", menu: "Produksi", slug: "produksi", kerja: "Mencocokkan timbangan, menjelaskan selisih, lalu menekan Tandai sudah diperiksa (QC)." },
  { peran: "owner", menu: "Produksi", slug: "produksi", kerja: "Menekan Setujui produksi (Owner)." },
  { peran: "petugas", menu: "Stok", slug: "stok", kerja: "Menekan Hasil produksi masuk dan memilih ruangannya." },
  { peran: "admin", menu: "Penjualan", slug: "penjualan", kerja: "Membuat pesanan dari stok yang tersedia." },
  { peran: "petugas", menu: "Penjualan", slug: "penjualan", kerja: "Menimbang saat kirim, lalu menekan Kirim pesanan. Stok berkurang." },
  { peran: "finance", menu: "Penjualan", slug: "penjualan", kerja: "Menerbitkan invoice, lalu mencatat uang masuk saat pembeli membayar." },
  { peran: "finance", menu: "Keuangan", slug: "keuangan", kerja: "Mencatat biaya siklus, melampirkan nota, lalu menekan Ajukan ke Owner." },
  { peran: "owner", menu: "Keuangan", slug: "keuangan", kerja: "Menyetujui biaya. Biaya masuk buku kas." },
  { peran: "owner", menu: "Laporan dan Rincian Siklus", slug: "siklus", kerja: "Membaca laba rugi, lalu menutup siklus bila semuanya sudah beres." },
];

export const ISTILAH: [string, string][] = [
  ["PO", "Pesanan beli ikan ke pemasok."],
  ["Lot", "Satu kelompok ikan yang diterima dari sebuah PO. Satu PO bisa jadi beberapa lot."],
  ["Loin", "Potongan daging tuna hasil produksi. Ditimbang per potong."],
  ["Siklus", "Satu putaran usaha, dari beli ikan sampai uang masuk. Laba rugi dihitung per siklus."],
  ["Grade", "Kelas mutu. A-SO, B-SO, C-SO berarti dengan kulit; A-SL, B-SL, C-SL berarti tanpa kulit."],
  ["Neraca berat", "Perbandingan ikan masuk dengan loin, hasil samping, limbah, dan susut. Sisanya disebut selisih belum jelas."],
  ["ABF", "Ruang pembekuan cepat (air blast freezer)."],
  ["CS", "Cold storage, ruang simpan beku."],
  ["Titipan", "Barang milik pelanggan yang disimpan di gudang kita dan ditagih jasanya."],
  ["Invoice", "Tagihan ke pembeli."],
  ["Piutang", "Uang tagihan yang belum dibayar pembeli."],
];

export const BAB: Bab[] = [
  {
    slug: "masuk",
    judul: "Masuk ke sistem",
    kelompok: "Mulai",
    ringkas: "Akun dibuat oleh Owner atau Super Admin. Anda menerima tautan, lalu membuat kata sandi sendiri.",
    peran: SEMUA,
    tugas: [
      {
        judul: "Pertama kali: buat kata sandi",
        langkah: [
          "Buka tautan aktivasi yang Anda terima lewat WhatsApp. Tautan berlaku 24 jam dan hanya bisa dipakai sekali.",
          "Isi Kata sandi baru, minimal 10 karakter.",
          "Isi lagi di Ulangi kata sandi.",
          "Tekan Simpan dan masuk.",
        ],
        gambar: "00-sandi",
        keterangan: "Form yang muncul setelah tautan aktivasi dibuka.",
        catatan: "Pengelola akses tidak bisa melihat kata sandi Anda. Simpan baik-baik.",
      },
      {
        judul: "Masuk sehari-hari",
        langkah: ["Buka katalis-erp.vercel.app.", "Isi Email dan Kata sandi.", "Tekan Masuk. Anda langsung dibawa ke Dashboard."],
        gambar: "00-login",
        keterangan: "Halaman masuk.",
      },
      {
        judul: "Lupa kata sandi atau tautan kedaluwarsa",
        langkah: ["Hubungi Super Admin atau Owner.", "Minta dibuatkan Tautan atur sandi dari menu Akses.", "Buka tautannya, lalu buat kata sandi baru."],
      },
    ],
  },
  {
    slug: "menu",
    judul: "Mengenal menu",
    kelompok: "Mulai",
    ringkas: "Menu yang tampil mengikuti jabatan Anda. Bisa melihat menu belum tentu boleh mengubah isinya: tombol ubah hanya muncul bagi yang berwenang.",
    peran: SEMUA,
    tugas: [
      {
        judul: "Di laptop",
        pengantar: "Menu ada di sisi kiri, dikelompokkan mengikuti alur kerja: Operasi, Stok, Niaga, dan Laporan. Tekan Ctrl+B untuk menciutkan menu jadi ikon. Tombol Keluar ada di kiri bawah.",
        gambar: "01-dashboard",
        keterangan: "Tampilan laptop: menu di kiri, isi halaman di kanan.",
      },
      {
        judul: "Di HP",
        pengantar: "Empat menu utama ada di tab bawah. Menu lain ada di tombol Menu, lengkap dengan kotak Cari menu dan tombol Keluar.",
        gambar: "20-hp-menu",
        keterangan: "Lembar Menu di HP Petugas Lapangan.",
      },
      {
        judul: "Hal yang berlaku di semua halaman",
        pengantar: "Tombol yang berisiko, seperti setuju, bayar, kirim, dan selesai, selalu meminta konfirmasi kedua. Data tidak bisa dihapus: kesalahan diperbaiki dengan pembatalan beralasan atau koreksi, dan semua perubahan tercatat.",
      },
    ],
  },
  {
    slug: "dashboard",
    judul: "Dashboard",
    kelompok: "Mulai",
    ringkas: "Halaman pertama setelah masuk. Isinya hal yang perlu Anda kerjakan hari ini dan ringkasan usaha.",
    peran: SEMUA,
    menu: "/dashboard",
    tugas: [
      {
        judul: "Mengerjakan daftar Perlu tindakan Anda",
        pengantar: "Daftar ini berisi transaksi yang menunggu Anda, satu per satu. Yang mendesak tampil lebih dulu. Tiap jabatan hanya melihat hal yang bisa ia kerjakan.",
        langkah: ["Baca baris paling atas.", "Tekan tombolnya, misalnya Periksa, Tagih, atau Putuskan.", "Anda dibawa ke halaman urusan itu. Selesaikan di sana.", "Tekan Lihat lainnya bila ada yang terlipat."],
        gambar: "01-dashboard-tindakan",
        keterangan: "Daftar Perlu tindakan Anda milik Owner.",
      },
      {
        judul: "Membaca ringkasan",
        pengantar: "Di bawah daftar ada kas bulan ini, piutang, utang ke pemasok, stok, isi gudang per ruangan, arus kas enam bulan, dan laba rugi siklus terbaru. Ketuk angkanya untuk membuka rinciannya. Ringkasan yang tampil mengikuti izin jabatan Anda.",
        gambar: "20-hp-owner",
        keterangan: "Dashboard Owner di HP.",
      },
    ],
  },
  {
    slug: "pembelian",
    judul: "Pembelian",
    kelompok: "Operasi",
    ringkas: "Tempat membuat PO, melampirkan nota, mengajukan persetujuan, dan mencatat pembayaran ke pemasok.",
    peran: ["owner", "finance", "admin"],
    menu: "/pembelian",
    tugas: [
      {
        judul: "Membaca daftar PO",
        pengantar: "Tiap baris menunjukkan berat, total, dan tiga status: Persetujuan, Diterima, dan Bayar. Tekan Buka untuk melihat rinciannya.",
        gambar: "02-pembelian",
        keterangan: "Daftar PO dengan status masing-masing.",
      },
      {
        judul: "Membuat PO",
        peran: ["owner", "admin"],
        langkah: ["Tekan Buat PO.", "Pilih Pemasok.", "Isi Berat (kg) dan Harga per kg (Rp).", "Periksa Tanggal, lalu pilih Siklus atau Siklus baru (otomatis).", "Tekan Buat PO (draf)."],
        gambar: "02-pembelian-buat",
        keterangan: "Form Buat PO.",
      },
      {
        judul: "Melampirkan nota dan mengajukan",
        peran: ["owner", "admin"],
        langkah: ["Buka PO yang masih Draf.", "Tekan Lampirkan nota, lalu pilih berkasnya.", "Tekan Ajukan untuk diperiksa."],
        gambar: "02-pembelian-draf",
        keterangan: "PO draf. Tombol Ajukan aktif setelah nota dilampirkan.",
        catatan: "Berat dan harga masih bisa diubah lewat tombol Ubah selama PO masih draf.",
      },
      {
        judul: "Mencatat pembayaran ke pemasok",
        peran: ["owner", "finance"],
        langkah: ["Buka PO yang sudah Disetujui.", "Di bagian Pembayaran, isi Jumlah dan Tanggal.", "Isi Catatan bila perlu, misalnya DP atau pelunasan.", "Tekan Catat pembayaran.", "Tekan Lampirkan bukti transfer."],
        gambar: "02-pembelian-detail",
        keterangan: "Rincian PO: ringkasan, nota, riwayat persetujuan, penerimaan, dan pembayaran.",
        catatan: "Disetujui bukan berarti sudah dibayar. Pembayaran yang dicatat otomatis masuk buku kas.",
      },
    ],
  },
  {
    slug: "persetujuan",
    judul: "Persetujuan",
    kelompok: "Operasi",
    ringkas: "Antrean PO yang menunggu. Finance memeriksa dulu, lalu Owner yang memutuskan.",
    peran: ["owner", "finance", "admin"],
    menu: "/persetujuan",
    tugas: [
      {
        judul: "Memeriksa dan memutuskan",
        peran: ["owner", "finance"],
        pengantar: "Kartu menampilkan nilai, nota, dan peringatan bila harga naik dari pembelian terakhir pemasok itu.",
        langkah: ["Baca nilai dan peringatan harganya.", "Tekan Buka untuk melihat nota.", "Finance: isi catatan bila perlu, lalu tekan Sudah diperiksa.", "Owner: tekan Setujui, Minta revisi, atau Tolak.", "Jawab konfirmasi kedua."],
        gambar: "03-persetujuan",
        keterangan: "Antrean persetujuan dan riwayat terbaru.",
        catatan: "Owner bisa menyetujui beberapa PO sekaligus: centang kartunya, lalu periksa total yang muncul di konfirmasi.",
      },
      {
        judul: "Menyetujui dari HP",
        peran: ["owner"],
        pengantar: "Dari Dashboard, tekan Periksa pada baris PO. Anda langsung dibawa ke kartu PO itu, lengkap dengan notanya.",
        gambar: "20-hp-persetujuan",
        keterangan: "Persetujuan di HP.",
      },
    ],
  },
  {
    slug: "mutu",
    judul: "Mutu dan Penerimaan",
    kelompok: "Operasi",
    ringkas: "Mencatat ikan yang datang dan menilai mutunya. Lot yang lulus bisa dipakai untuk produksi.",
    peran: SEMUA,
    menu: "/mutu",
    tugas: [
      {
        judul: "Menerima ikan",
        peran: ["owner", "qc", "petugas"],
        langkah: [
          "Di bagian Terima ikan, pilih PO. Berat terisi dari PO, jadi tidak perlu ditimbang ulang di sini.",
          "Bila kiriman nyata tidak sama, centang Kiriman nyata berbeda dari PO, lalu isi Berat kiriman (kg).",
          "Isi Catatan bila perlu.",
          "Tekan Catat penerimaan. Sistem membuat lot baru.",
        ],
        gambar: "20-hp-mutu",
        keterangan: "Form Terima ikan dan daftar lot di HP.",
        catatan: "Ikan datang malam sebelum PO disetujui? Centang kotak bongkar malam yang muncul. Pembayaran tetap menunggu persetujuan Owner.",
      },
      {
        judul: "Melihat daftar lot",
        pengantar: "Saring dengan tombol Semua, Menunggu, Lulus, dan Ditahan, atau cari lewat kotak pencarian. Kolom Pemakaian menunjukkan sisa berat tiap lot.",
        gambar: "04-mutu",
        keterangan: "Halaman Mutu dan Penerimaan di laptop.",
      },
      {
        judul: "Cek mutu",
        peran: ["owner", "qc"],
        langkah: ["Pada lot berstatus Menunggu, tekan Cek mutu.", "Pilih Lulus atau Tahan.", "Bila lulus, pilih Kelas mutu.", "Isi Catatan, misalnya suhu, bau, atau alasan menahan.", "Tekan Simpan hasil."],
        gambar: "04-mutu-cek",
        keterangan: "Form Cek mutu.",
        catatan: "Lot yang sudah dipakai produksi tidak bisa diubah mutunya.",
      },
    ],
  },
  {
    slug: "produksi",
    judul: "Produksi",
    kelompok: "Operasi",
    ringkas: "Mengubah ikan utuh jadi loin. Tiap potong ditimbang, lalu neraca berat diperiksa QC dan disetujui Owner.",
    peran: SEMUA,
    menu: "/produksi",
    tugas: [
      {
        judul: "Membaca daftar produksi",
        pengantar: "Tiap baris menunjukkan ikan masuk, loin, persen hasil, selisih belum jelas, dan status. Tekan Buka untuk masuk ke rinciannya.",
        gambar: "05-produksi",
        keterangan: "Daftar produksi.",
      },
      {
        judul: "Memulai produksi",
        peran: ["owner", "qc", "petugas"],
        langkah: ["Tekan Mulai produksi.", "Centang lot yang masuk produksi ini. Hanya lot yang lulus mutu yang muncul.", "Periksa Tanggal.", "Tekan Mulai produksi."],
        gambar: "05-produksi-mulai",
        keterangan: "Form Mulai produksi.",
      },
      {"judul":"Menimbang loin per potong","peran":["owner","qc","petugas"],"langkah":["Buka produksi yang berstatus Berjalan.","Di tabel Loin per potong, ketik beratnya.","Tekan Enter untuk pindah ke baris berikutnya. Nomor loin dan grade terisi dari baris sebelumnya.","Tekan Simpan loin bila belum tersimpan sendiri."],"gambar":"20-hp-produksi","keterangan":"Tabel loin di HP.","catatan":"Sinyal putus? Teruskan mengetik. Isian aman di HP dan terkirim sendiri saat sinyal kembali. Jangan hapus data browser sebelum muncul tulisan Semua tersimpan di server."},
      {"judul":"Membaca neraca berat","pengantar":"Neraca di bagian atas rincian membandingkan ikan masuk dengan loin, hasil samping, limbah, dan susut. Sisanya tampil sebagai Selisih belum jelas. Angka ini hasil hitung dan tidak diisi otomatis. Tombol Cetak formulir dan Unduh Excel tersedia untuk catatan kertas.","gambar":"05-produksi-detail","keterangan":"Rincian produksi di laptop. Kotak merah: tombol Simpan loin."},
      {"judul":"Mengisi komponen hasil","peran":["owner","qc","petugas"],"langkah":["Di bagian komponen, isi berat tiap hasil samping, seperti Toro, Kepala dan rahang, Tetelan coklat, dan Daging kerok.","Isi Limbah, total (kg) dan Susut, total (kg). Kosong berarti belum ditimbang, bukan nol.","Tekan Simpan komponen."],"gambar":"05-produksi-komponen","keterangan":"Form komponen hasil."},
      {"judul":"Menyelesaikan produksi","peran":["owner","qc","petugas"],"langkah":["Periksa lagi Neraca berat.","Tekan Selesaikan produksi.","Baca pesan konfirmasinya, lalu tekan Ya, selesaikan."],"gambar":"05-produksi-konfirmasi","keterangan":"Konfirmasi kedua. Tombol berisiko lain juga meminta konfirmasi seperti ini.","catatan":"Setelah diselesaikan, loin dan komponen terkunci dan masuk pemeriksaan QC."},
      {"judul":"Memeriksa dan menyetujui","peran":["owner","qc"],"langkah":["Kepala Produksi / QC: buka produksi yang selesai dan cocokkan timbangannya.","Bila ada selisih, tulis di Penjelasan selisih.","Tekan Tandai sudah diperiksa (QC), lalu Ya, sudah saya periksa. Bila timbangan meragukan, tekan Minta perbaikan.","Owner: buka produksi yang sudah diperiksa, lalu tekan Setujui produksi (Owner) dan Ya, setujui."],"gambar":"05-produksi-periksa","keterangan":"Form pemeriksaan QC.","catatan":"Orang yang menimbang tidak boleh memeriksa produksi yang sama. Selisih tanpa penjelasan hanya bisa diterima Owner dengan mencentang kotak Terima selisih."},
    ],
  },
  {
    slug: "stok",
    judul: "Stok",
    kelompok: "Stok",
    ringkas: "Ikan fresh dan beku, milik sendiri maupun titipan, serta barang penunjang seperti kemasan dan es.",
    peran: SEMUA,
    menu: "/stok",
    tugas: [
      {
        judul: "Membaca stok ikan",
        pengantar: "Tab Ikan menampilkan stok sendiri, titipan pelanggan, sisa kapasitas, dan koreksi yang menunggu Owner. Tiap unit punya tombol Ambil, Pindah, dan Koreksi.",
        gambar: "06-stok",
        keterangan: "Tab Ikan.",
      },
      {"judul":"Memasukkan hasil produksi","peran":["owner","qc","petugas"],"langkah":["Tekan Hasil produksi masuk.","Pilih Produksi. Hanya produksi yang sudah disetujui yang muncul, lengkap dengan sisa beratnya.","Pilih Produk dan Grade.","Pilih Kondisi dan isi Berat (kg).","Pilih Ruangan. Boleh dikosongkan dan dipindah nanti.","Tekan Masukkan ke stok."],"gambar":"06-stok-masuk","keterangan":"Form Hasil produksi masuk stok.","catatan":"Fresh yang langsung dikirim tidak perlu masuk gudang: pilih Fresh, lalu centang Fresh langsung kirim, tidak masuk gudang."},
      {
        judul: "Mengambil stok",
        peran: ["owner", "qc", "petugas"],
        langkah: ["Tekan Ambil pada unitnya.", "Isi berat keluar hasil timbang ulang.", "Isi Keterangan, misalnya tujuan kirim.", "Tekan Catat pengambilan."],
        gambar: "06-stok-ambil",
        keterangan: "Form Ambil. Bila barangnya titipan, tagihan jasa dibuat otomatis.",
      },
      {
        judul: "Memindah ruangan",
        peran: ["owner", "qc", "petugas"],
        langkah: ["Tekan Pindah pada unitnya.", "Pilih ruangan tujuan. Sisa muatan tiap ruangan tampil di pilihan.", "Tekan Pindahkan."],
        gambar: "06-stok-pindah",
        keterangan: "Form Pindah.",
      },
      {
        judul: "Mengoreksi stok",
        peran: ["owner", "qc", "petugas"],
        langkah: ["Tekan Koreksi pada unitnya.", "Isi selisih berat. Pakai tanda minus untuk mengurangi.", "Tulis Alasan.", "Tekan Ajukan koreksi. Koreksi berlaku setelah disetujui Owner."],
        gambar: "06-stok-koreksi",
        keterangan: "Form Koreksi.",
        catatan: "Owner memutuskannya di bagian atas tab Ikan: Setujui koreksi atau Tolak koreksi.",
      },
      {
        judul: "Mengelola barang penunjang",
        peran: ["owner", "qc", "petugas"],
        pengantar: "Tab Penunjang kerja berisi kemasan, es, dan label. Tab Penunjang pekerja berisi kebutuhan pekerja. Tiap barang punya batas minimum, jadi yang Menipis dan Habis mudah terlihat.",
        langkah: ["Tekan Tambah stok saat barang datang.", "Tekan Pakai saat barang dipakai.", "Tekan Koreksi bila hitungan fisik berbeda.", "Tekan Riwayat untuk melihat keluar masuknya."],
        gambar: "06-stok-penunjang",
        keterangan: "Tab Penunjang kerja.",
      },
    ],
  },
  {
    slug: "gudang",
    judul: "Gudang Dingin",
    kelompok: "Stok",
    ringkas: "Isi tiap ruangan ABF dan CS, titipan pelanggan, tagihan jasa, tarif, dan jadwal mesin.",
    peran: SEMUA,
    menu: "/gudang",
    tugas: [
      {
        judul: "Membaca isi ruangan",
        pengantar: "Tiap kartu ruangan menunjukkan isi, persen terisi, dan sisa muatan. Super Admin dan Owner bisa memastikan kapasitasnya lewat tombol Atur.",
        gambar: "07-gudang",
        keterangan: "Halaman Gudang Dingin.",
      },
      {
        judul: "Menerima titipan",
        peran: ["owner", "admin", "qc", "petugas"],
        langkah: ["Tekan Terima titipan.", "Pilih pelanggan, produk, dan grade.", "Pilih Kondisi dan isi Berat (kg).", "Pilih Ruangan. Boleh dikosongkan dan dipindah nanti.", "Centang Dibekukan di ABF bila perlu. Jasa ini ditagih terpisah.", "Tekan Terima titipan."],
        gambar: "07-gudang-titipan",
        keterangan: "Form Terima titipan.",
        catatan: "Titipan diambil dari menu Stok lewat tombol Ambil.",
      },
      {
        judul: "Melihat rincian tagihan jasa",
        peran: ["owner", "finance", "admin"],
        langkah: ["Di bagian Tagihan jasa gudang, tekan Rincian.", "Baca hitungannya: lama simpan, berat, dan tarif.", "Tekan Cetak rincian bila pelanggan memintanya."],
        gambar: "07-gudang-rincian",
        keterangan: "Rincian hitungan jasa simpan.",
      },
      {"judul":"Mengubah tarif","peran":["owner","admin"],"langkah":["Di bagian Tarif, tekan Ubah pada layanannya.","Isi Tarif dan Berlaku mulai.","Periksa Minimum hari simpan, Masa transit (jam), dan Dasar berat tagihan simpan.","Centang Angka ini sudah dikonfirmasi owner bila sudah pasti.","Tekan Simpan tarif."],"gambar":"07-gudang-ubah-tarif","keterangan":"Form Ubah tarif. Tagihan lama tetap memakai tarif saat ikan masuk."},
      {"judul":"Mengatur kapasitas ruangan","peran":["owner","admin"],"langkah":["Pada kartu ruangan, tekan Atur.","Isi Kapasitas (kg). Kapasitas tidak boleh di bawah isi ruangan.","Centang Kapasitas ini sudah dikonfirmasi owner bila sudah pasti.","Tekan Simpan ruangan."],"gambar":"07-gudang-atur","keterangan":"Form Atur ruangan."},
      {
        judul: "Mengatur jadwal mesin",
        peran: ["owner", "admin", "qc", "petugas"],
        langkah: ["Tekan Tambah jadwal.", "Pilih Jenis dan Mitra.", "Isi waktu Mulai dan Selesai. Bila bentrok, sistem memperingatkan dan menawarkan Pakai jam kosong pertama.", "Isi Keterangan.", "Tekan Simpan jadwal."],
        gambar: "07-gudang-jadwal",
        keterangan: "Form Tambah jadwal.",
      },
    ],
  },
  {
    slug: "penjualan",
    judul: "Penjualan",
    kelompok: "Niaga",
    ringkas: "Dari pesanan, pengiriman, invoice, sampai uang masuk.",
    peran: SEMUA,
    menu: "/penjualan",
    tugas: [
      {
        judul: "Membaca halaman Penjualan",
        pengantar: "Bagian atas menampilkan pesanan jual. Di bawahnya ada Piutang dan invoice, lalu jasa gudang yang belum ditagihkan. Ketuk satu baris untuk membukanya.",
        gambar: "08-penjualan",
        keterangan: "Halaman Penjualan.",
      },
      {
        judul: "Membuat pesanan",
        peran: ["owner", "admin"],
        langkah: ["Tekan Buat pesanan.", "Pilih Pembeli dan Siklus.", "Pilih stok, lalu isi berat dan harga per kg.", "Tekan + Tambah baris bila barangnya lebih dari satu.", "Periksa Perkiraan total.", "Tekan Simpan pesanan (draf)."],
        gambar: "08-penjualan-buat",
        keterangan: "Form Buat pesanan. Pesanan tidak bisa melebihi stok yang tersedia.",
      },
      {
        judul: "Mengirim pesanan",
        peran: ["owner", "admin", "qc", "petugas"],
        langkah: ["Buka pesanan berstatus Draf.", "Isi berat hasil timbang saat kirim. Berat diterima pembeli boleh menyusul.", "Tekan Kirim pesanan, lalu Ya, kirim dan kurangi stok."],
        gambar: "08-penjualan-pesanan",
        keterangan: "Pesanan draf. Stok langsung berkurang sebesar berat kirim.",
      },
      {"judul":"Menerbitkan invoice","peran":["owner","finance","admin"],"langkah":["Buka pesanan yang sudah Terkirim.","Isi berat diterima pembeli bila ada, lalu tekan Simpan berat diterima.","Tekan Terbitkan invoice, lalu Ya, terbitkan invoice."],"gambar":"08-penjualan-terbit","keterangan":"Pesanan terkirim yang siap ditagih.","catatan":"Tagihan memakai berat diterima bila diisi, jadi isi sebelum invoice terbit. Jatuh tempo mengikuti tempo pembeli."},
      {
        judul: "Mencatat uang masuk dan menagih",
        peran: ["owner", "finance"],
        langkah: ["Buka invoice.", "Isi Jumlah dan Tanggal pembayaran.", "Tekan Catat pembayaran masuk.", "Tekan Lampirkan bukti transfer.", "Bila terlambat, tekan Kirim pengingat (WhatsApp)."],
        gambar: "08-penjualan-invoice",
        keterangan: "Rincian invoice: isi tagihan, pembayaran, berkas, dan tombol pengingat.",
      },
      {"judul":"Menagih jasa gudang","peran":["owner","finance","admin"],"langkah":["Di bagian Jasa gudang dingin yang belum ditagihkan, pilih pelanggan.","Centang tagihan yang akan digabung.","Tekan Terbitkan invoice jasa, lalu konfirmasi."],"gambar":"08-penjualan-jasa","keterangan":"Tagihan jasa yang siap diterbitkan."},
    ],
  },
  {
    slug: "keuangan",
    judul: "Keuangan",
    kelompok: "Niaga",
    ringkas: "Mencatat biaya beserta nota, melihat buku kas, dan menutup buku per bulan.",
    peran: ["owner", "finance", "admin"],
    menu: "/keuangan",
    tugas: [
      {
        judul: "Membaca halaman Keuangan",
        pengantar: "Bagian atas menampilkan uang masuk, uang keluar, dan biaya yang menunggu Owner. Di bawahnya ada daftar Biaya.",
        gambar: "09-keuangan",
        keterangan: "Halaman Keuangan.",
      },
      {
        judul: "Mencatat biaya",
        peran: ["owner", "finance", "admin"],
        langkah: ["Tekan Catat biaya.", "Pilih Kategori dan isi Uraian.", "Isi Jumlah (Rp) dan Tanggal.", "Pilih PO atau Produksi terkait bila ada. Siklusnya ikut otomatis.", "Tekan Simpan draf biaya.", "Buka biayanya, tekan Lampirkan nota, lalu tekan Ajukan ke Owner."],
        gambar: "09-keuangan-catat",
        keterangan: "Form Catat biaya.",
      },
      {
        judul: "Memutuskan biaya",
        peran: ["owner"],
        langkah: ["Buka biaya berstatus Menunggu Owner.", "Tekan Buka pada nota untuk memeriksanya.", "Tekan Setujui biaya atau Tolak biaya."],
        gambar: "09-keuangan-biaya",
        keterangan: "Biaya yang disetujui otomatis masuk buku kas.",
      },
      {
        judul: "Melihat buku kas",
        pengantar: "Transaksi dikelompokkan per tanggal. Saring dengan Semua, Uang masuk, dan Uang keluar, atau cari lewat kotak pencarian. Tekan Unduh Excel untuk menyimpannya.",
        gambar: "09-keuangan-kas",
        keterangan: "Buku kas.",
      },
      {
        judul: "Menutup buku bulanan",
        peran: ["owner"],
        langkah: ["Pastikan tidak ada biaya yang masih menunggu keputusan.", "Di bagian Tutup buku per bulan, mulai dari bulan tertua.", "Tekan Tutup buku, lalu konfirmasi."],
        gambar: "09-keuangan-tutup",
        keterangan: "Daftar bulan dan statusnya.",
        catatan: "Bulan yang ditutup terkunci: transaksi bertanggal di bulan itu tidak bisa ditambah atau diubah. Membukanya kembali hanya bisa oleh Owner, dengan alasan yang tercatat.",
      },
    ],
  },
  {
    slug: "laporan",
    judul: "Laporan",
    kelompok: "Laporan",
    ringkas: "Laba rugi per siklus, perbandingan antarsiklus, simulasi harga, dan riwayat harga beli.",
    peran: ["owner", "finance", "admin"],
    menu: "/laporan",
    tugas: [
      {
        judul: "Laba rugi siklus",
        langkah: ["Pilih siklus.", "Baca pendapatan, biaya langsung, laba kotor, dan hasil olahan.", "Ketuk nama baris yang bergaris putus-putus untuk melihat transaksinya.", "Tekan Unduh Excel bila perlu."],
        gambar: "10-laporan",
        keterangan: "Tab Laba rugi siklus.",
        catatan: "Yang dihitung baru laba kotor. Laba bersih menunggu biaya bulanan, penyusutan, dan pajak.",
      },
      {
        judul: "Tren antarsiklus",
        pengantar: "Membandingkan hasil olahan, harga ikan, pendapatan, biaya, dan laba antarsiklus. Baris terisi otomatis dari data yang sudah tercatat.",
        gambar: "10-laporan-tren",
        keterangan: "Tab Tren antarsiklus.",
      },
      {
        judul: "Simulasi harga",
        pengantar: "Geser harga ikan, hasil olahan, dan harga jual untuk melihat pengaruhnya ke laba, harga jual minimal, dan harga ikan tertinggi. Ini perkiraan dan tidak mengubah data apa pun. Tekan Kembalikan ke angka siklus untuk mengulang.",
        gambar: "10-laporan-simulasi",
        keterangan: "Tab Simulasi harga.",
      },
      {
        judul: "Harga beli",
        pengantar: "Riwayat harga beli rata-rata tertimbang. Saring per minggu atau per hari, per pemasok, dan per grade.",
        gambar: "10-laporan-harga",
        keterangan: "Tab Harga beli.",
      },
    ],
  },
  {
    slug: "siklus",
    judul: "Rincian Siklus",
    kelompok: "Laporan",
    ringkas: "Satu siklus dari beli ikan sampai uang masuk, dalam enam tahap di satu layar.",
    peran: SEMUA,
    menu: "/siklus",
    tugas: [
      {
        judul: "Menelusuri satu siklus",
        langkah: ["Tekan Telusuri pada siklusnya.", "Baca enam tahapnya: beli ikan, terima dan cek mutu, produksi, jual dan kirim, tagihan dan uang masuk, biaya lain.", "Ketuk satu baris untuk membuka transaksinya."],
        gambar: "11-siklus-detail",
        keterangan: "Rincian satu siklus. Angka yang tampil mengikuti izin jabatan Anda.",
      },
      {
        judul: "Menutup siklus",
        peran: ["owner"],
        pengantar: "Tutup siklus bisa dilakukan bila PO sudah lunas, produksi disetujui, pesanan terkirim, tagihan lunas, dan biaya sudah diputuskan. Siklus yang sudah ditutup tidak bisa dipakai untuk transaksi baru sampai dibuka kembali dengan alasan.",
        gambar: "11-siklus",
        keterangan: "Daftar siklus.",
      },
    ],
  },
  {
    slug: "asisten",
    judul: "Asisten AI",
    kelompok: "Lainnya",
    ringkas: "Tanya jawab dari data sesuai izin Anda. Asisten hanya membaca dan tidak bisa mengubah apa pun.",
    peran: SEMUA,
    menu: "/asisten",
    tugas: [
      {
        judul: "Memakai pertanyaan cepat",
        pengantar: "Pertanyaan cepat menampilkan data apa adanya, tanpa menebak, dan tidak memakai jatah harian.",
        langkah: ["Tekan salah satu tombol, misalnya Piutang yang terlambat.", "Baca jawabannya.", "Ketuk tautan di bawah jawaban untuk membuka transaksinya."],
        gambar: "12-asisten-jawab",
        keterangan: "Jawaban dari pertanyaan cepat.",
      },
      {
        judul: "Bertanya dengan kalimat biasa",
        langkah: ["Ketik pertanyaan di kotak bawah, misalnya: Berapa saldo kas bulan ini?", "Tekan Tanya."],
        gambar: "12-asisten",
        keterangan: "Jatah pertanyaan harian tertulis di bawah kotak.",
        catatan: "Periksa lagi angka penting di halaman asalnya sebelum mengambil keputusan.",
      },
    ],
  },
  {
    slug: "absensi",
    judul: "Absensi",
    kelompok: "Lainnya",
    ringkas: "Absen masuk dan pulang dengan lokasi dan foto langsung, pengajuan izin, dan rekap kehadiran.",
    peran: SEMUA,
    menu: "/absensi",
    tugas: [
      {"judul":"Absen masuk dan pulang","peran":["finance","admin","qc","petugas"],"langkah":["Buka menu Absensi di HP.","Tekan Absen masuk atau Absen pulang.","Izinkan lokasi dan kamera bila browser bertanya.","Tunggu sampai lokasi didapat dan kamera tampil.","Tekan Ambil foto dan absen masuk."],"gambar":"20-hp-absen","keterangan":"Form absen di HP. Kotak hijau adalah gambar kamera contoh; di HP Anda yang tampil gambar kamera asli.","catatan":"Anda harus berada di dalam radius lokasi kerja. Foto diambil langsung, bukan dari galeri, dan jam dicatat server."},
      {"judul":"Kalau absen ditolak","peran":["finance","admin","qc","petugas"],"pengantar":"Alasannya tampil dengan latar merah, misalnya jarak Anda dari lokasi kerja. Percobaan yang ditolak tetap tersimpan di riwayat. Masuk ke area kerja, lalu tekan tombolnya lagi.","gambar":"20-hp-absen-tolak","keterangan":"Contoh absen ditolak karena di luar radius."},
      {
        judul: "Melihat absen sendiri",
        peran: ["finance", "admin", "qc", "petugas"],
        pengantar: "Bagian Absen hari ini menunjukkan jam masuk dan pulang Anda. Riwayat absen saya ada di bagian bawah.",
        gambar: "20-hp-absensi",
        keterangan: "Halaman Absensi di HP.",
      },
      {
        judul: "Mengajukan izin, sakit, atau libur",
        peran: ["finance", "admin", "qc", "petugas"],
        langkah: ["Di bagian Izin dan sakit, tekan Ajukan.", "Pilih Jenis.", "Isi tanggal Dari dan Sampai.", "Tulis Alasan.", "Tekan Kirim pengajuan."],
        gambar: "13-absensi-ajukan",
        keterangan: "Form pengajuan. Yang belum diputuskan bisa dibatalkan sendiri lewat tombol Batalkan.",
      },
      {
        judul: "Memutuskan pengajuan",
        peran: ["owner"],
        langkah: ["Buka bagian Izin dan sakit. Pengajuan baru juga muncul di Dashboard.", "Tekan Setujui atau Tolak."],
        gambar: "13-absensi-izin",
        keterangan: "Daftar pengajuan.",
      },
      {
        judul: "Melihat rekap kehadiran",
        peran: ["owner", "admin"],
        langkah: ["Pilih Bulan dan Tanggal rincian.", "Tekan Tampilkan.", "Baca hari kerja, hadir, terlambat, izin, sakit, libur, dan tidak hadir per orang."],
        gambar: "13-absensi-rekap",
        keterangan: "Rekap kehadiran. Di bawahnya ada daftar absen per tanggal beserta fotonya.",
      },
      {"judul":"Mengatur lokasi kerja","peran":["owner","admin"],"langkah":["Tekan Ubah pada lokasinya, atau Tambah untuk lokasi baru.","Bila titiknya perlu diganti, berdiri di tengah tempat kerja lalu tekan Pakai lokasi saya sekarang.","Atur Radius (meter) dan Batas akurasi GPS (m).","Atur jam masuk dan pulang untuk Senin-Jumat dan Sabtu, serta Toleransi terlambat (menit).","Tekan Simpan lokasi."],"gambar":"13-absensi-ubah-lokasi","keterangan":"Form Ubah lokasi kerja."},
    ],
  },
  {
    slug: "akses",
    judul: "Akses",
    kelompok: "Admin",
    ringkas: "Membuat akun dan mengatur jabatan. Satu jabatan hanya untuk satu akun aktif.",
    peran: ["owner", "admin"],
    menu: "/akses",
    tugas: [
      {
        judul: "Membuat akun",
        langkah: ["Di bagian Buat akun pengguna, isi Nama dan Email. Email hanya dipakai sebagai nama masuk.", "Pilih Peran. Hanya jabatan yang masih kosong yang bisa dipilih.", "Tekan Buat akun."],
        gambar: "14-akses-buat",
        keterangan: "Form Buat akun pengguna.",
      },
      {
        judul: "Mengirim tautan aktivasi",
        langkah: ["Setelah akun dibuat, tautan muncul di layar.", "Tekan Kirim lewat WhatsApp atau Salin tautan.", "Pastikan orangnya membuka tautan dalam 24 jam."],
        gambar: "14-akses-tautan",
        keterangan: "Tautan aktivasi. Tidak ada email yang dikirim sistem.",
      },
      {
        judul: "Mengelola akun yang ada",
        pengantar: "Tiap baris punya tombol Ubah email, Tautan atur sandi, dan Lepas peran. Untuk mengganti pemegang jabatan, ubah akun lamanya ke Nonaktif, tekan Simpan, lalu buat akun baru. Akun Owner hanya bisa diatur oleh Owner.",
        gambar: "14-akses",
        keterangan: "Daftar pengguna.",
        catatan: "Orang yang keluar dinonaktifkan, tidak dihapus, supaya riwayat kerjanya tetap ada.",
      },
    ],
  },
  {
    slug: "pengaturan",
    judul: "Pengaturan",
    kelompok: "Admin",
    ringkas: "Data master yang dipakai di menu lain: target hasil, pemasok, pembeli, produk, grade, hasil samping dan limbah, serta kategori biaya.",
    peran: SEMUA,
    menu: "/pengaturan",
    tugas: [
      {
        judul: "Mengatur target hasil",
        peran: ["owner", "admin"],
        langkah: ["Buka tab Target hasil.", "Ubah Rencana hasil olahan atau batasnya.", "Tekan Simpan di baris itu."],
        gambar: "15-pengaturan",
        keterangan: "Target dipakai untuk menandai produksi yang hasilnya di bawah rencana atau di luar batas wajar.",
      },
      {"judul":"Menambah pemasok","peran":["owner","admin"],"langkah":["Buka tab Pemasok.","Tekan Tambah.","Isi Nama, Kontak, dan Catatan.","Tekan Simpan."],"gambar":"15-pengaturan-tambah","keterangan":"Form Tambah pemasok. Data yang tidak dipakai lagi dinonaktifkan lewat tombol Nonaktifkan."},
      {
        judul: "Menambah pembeli",
        peran: ["owner", "admin"],
        pengantar: "Isi Tempo bayar (hari), karena dipakai untuk menghitung jatuh tempo invoice. Isi juga kontaknya, karena dipakai untuk mengirim pengingat tagihan.",
        gambar: "15-pengaturan-pembeli",
        keterangan: "Tab Pembeli.",
      },
      {
        judul: "Grade dan kategori biaya",
        peran: ["owner", "admin"],
        pengantar: "Cara mengubahnya sama: tekan Tambah, Ubah, atau Nonaktifkan di tab masing-masing. Urutannya menentukan urutan pilihan di form.",
        gambar: "15-pengaturan-grade",
        keterangan: "Tab Grade.",
      },
      {
        judul: "Kategori biaya",
        peran: ["owner", "admin"],
        pengantar: "Kategori menentukan pengelompokan biaya di buku kas dan laporan.",
        gambar: "15-pengaturan-kategori",
        keterangan: "Tab Kategori biaya.",
      },
    ],
  },
  {
    slug: "masalah",
    judul: "Kalau ada masalah",
    kelompok: "Bantuan",
    ringkas: "Masalah yang paling mungkin ditemui dan cara mengatasinya.",
    peran: SEMUA,
    tugas: [
      { judul: "Absen ditolak: di luar radius", pengantar: "Anda terlalu jauh dari titik lokasi kerja. Pesannya menyebut jarak Anda. Masuk ke area kerja, lalu coba lagi. Bila yakin sudah di dalam, minta Super Admin memeriksa titik lokasinya." },
      { judul: "Absen ditolak: GPS kurang akurat", pengantar: "Pindah ke tempat terbuka, tunggu sebentar, lalu coba lagi." },
      { judul: "Kamera atau lokasi tidak muncul", pengantar: "Izinkan kamera dan lokasi untuk situs ini di pengaturan browser, lalu muat ulang halaman." },
      { judul: "Tautan aktivasi tidak bisa dibuka", pengantar: "Tautan mungkin sudah lewat 24 jam atau sudah pernah dipakai. Minta Tautan atur sandi yang baru ke Super Admin." },
      { judul: "Sebuah menu atau tombol tidak ada", pengantar: "Menu dan tombol mengikuti izin jabatan. Bila menurut Anda seharusnya ada, tanyakan ke Super Admin." },
      { judul: "Tombol berwarna abu-abu", pengantar: "Syaratnya belum lengkap. Biasanya ada tulisan di dekat tombol, misalnya Lampirkan nota dulu supaya bisa diajukan." },
      { judul: "Isian belum tersimpan di HP", pengantar: "Biarkan halaman terbuka sampai sinyal kembali dan muncul tulisan Semua tersimpan di server. Jangan hapus data browser sebelum itu." },
      { judul: "Tampilan masih yang lama", pengantar: "Muat ulang halaman. Bila masih sama, tutup browser lalu buka lagi." },
    ],
  },
];
