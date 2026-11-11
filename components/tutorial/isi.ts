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
  { peran: "admin", menu: "Pembelian", slug: "pembelian", kerja: "Bikin PO 700 kg, lampirin nota (atau centang Nota menyusul kalau notanya belum ada), terus tekan Ajukan untuk disetujui." },
  { peran: "finance", menu: "Persetujuan", slug: "persetujuan", kerja: "Cek nota dan harganya, terus tekan Sudah diperiksa." },
  { peran: "owner", menu: "Persetujuan", slug: "persetujuan", kerja: "Tekan Setujui. PO udah boleh dibayar. Siapa yang boleh menyetujui, admin yang milih di menu Akses." },
  { peran: "petugas", menu: "Mutu dan Penerimaan", slug: "mutu", kerja: "Ikan datang. Pilih PO, terus tekan Catat penerimaan. Sistem bikin lot." },
  { peran: "qc", menu: "Mutu dan Penerimaan", slug: "mutu", kerja: "Tekan Cek mutu, pilih Lulus, terus pilih grade sama beratnya (satu lot bisa beberapa grade)." },
  { peran: "finance", menu: "Pembelian", slug: "pembelian", kerja: "Catat pembayaran ke pemasok, terus lampirin bukti transfer." },
  { peran: "petugas", menu: "Produksi", slug: "produksi", kerja: "Mulai produksi dari lot itu, isi berat loin per grade, isi komponen, terus tekan Selesaikan produksi." },
  { peran: "qc", menu: "Produksi", slug: "produksi", kerja: "Cocokin timbangan, jelasin selisihnya, terus tekan Tandai sudah diperiksa (QC)." },
  { peran: "owner", menu: "Produksi", slug: "produksi", kerja: "Tekan Setujui produksi (Owner)." },
  { peran: "petugas", menu: "Stok", slug: "stok", kerja: "Tekan Hasil produksi masuk, terus pilih ruangannya." },
  { peran: "admin", menu: "Penjualan", slug: "penjualan", kerja: "Bikin pesanan dari stok yang ada." },
  { peran: "petugas", menu: "Penjualan", slug: "penjualan", kerja: "Timbang pas kirim, terus tekan Kirim pesanan. Stok berkurang." },
  { peran: "finance", menu: "Penjualan", slug: "penjualan", kerja: "Terbitin invoice, terus catat uang masuk pas pembeli bayar." },
  { peran: "finance", menu: "Keuangan", slug: "keuangan", kerja: "Catat biaya proyek, lampirin nota, terus tekan Ajukan ke Owner." },
  { peran: "owner", menu: "Keuangan", slug: "keuangan", kerja: "Setujui biayanya. Biaya masuk buku kas." },
  { peran: "owner", menu: "Laporan dan Rincian Proyek", slug: "siklus", kerja: "Baca laba rugi, terus tutup proyek kalau semuanya udah beres." },
];

export const ISTILAH: [string, string][] = [
  ["PO", "Pesanan beli ikan ke pemasok."],
  ["Lot", "Satu kelompok ikan yang diterima dari satu PO. Satu PO bisa jadi beberapa lot."],
  ["Loin", "Potongan daging tuna hasil produksi. Biasanya yang dicatat berat totalnya per grade, tapi boleh juga ditimbang per potong."],
  ["Proyek", "Satu batch atau satu bongkaran, dari beli ikan sampai uang masuk. Isinya boleh beberapa PO. Laba rugi dihitung per proyek. Kodenya tetap SIK-0001 dan seterusnya."],
  ["Nota menyusul", "PO yang diajukan pas notanya belum ada. Penerimaan dan produksi tetap jalan. Notanya dilampirkan belakangan sama jabatan yang dipilih admin."],
  ["Grade", "Kelas mutu. A-SO, B-SO, C-SO artinya pakai kulit. A-SL, B-SL, C-SL artinya tanpa kulit."],
  ["Neraca berat", "Perbandingan ikan masuk dengan loin, hasil samping, limbah, dan susut. Sisanya disebut selisih belum jelas."],
  ["ABF", "Ruang pembekuan cepat (air blast freezer)."],
  ["CS", "Cold storage, ruang simpan beku."],
  ["Titipan", "Barang punya pelanggan yang disimpan di gudang kita. Jasanya kita tagih."],
  ["Invoice", "Tagihan ke pembeli."],
  ["Piutang", "Tagihan yang belum dibayar pembeli."],
];

export const BAB: Bab[] = [
  {
    slug: "masuk",
    judul: "Masuk ke sistem",
    kelompok: "Mulai",
    ringkas: "Akunnya dibikin Owner atau Super Admin. Nanti dapat tautan, terus bikin kata sandi sendiri.",
    peran: SEMUA,
    tugas: [
      {
        judul: "Pertama kali: buat kata sandi",
        langkah: [
          "Buka tautan aktivasi yang dikirim lewat WhatsApp. Tautannya cuma berlaku 24 jam dan cuma bisa dipakai sekali.",
          "Isi Kata sandi baru, minimal 10 karakter.",
          "Ketik sekali lagi di Ulangi kata sandi.",
          "Tekan Simpan dan masuk.",
        ],
        gambar: "00-sandi",
        keterangan: "Form yang muncul pas tautan aktivasi dibuka.",
        catatan: "Kata sandinya nggak bisa dilihat pengelola akses, jadi simpan baik-baik.",
      },
      {
        judul: "Masuk sehari-hari",
        langkah: ["Buka katalis-erp.vercel.app.", "Isi Email dan Kata sandi.", "Tekan Masuk. Langsung dibawa ke Dashboard."],
        gambar: "00-login",
        keterangan: "Halaman masuk.",
      },
      {
        judul: "Lupa kata sandi atau tautan kedaluwarsa",
        langkah: ["Hubungi Super Admin atau Owner.", "Minta dibikinin Tautan atur sandi dari menu Akses.", "Buka tautannya, terus bikin kata sandi baru."],
      },
    ],
  },
  {
    slug: "menu",
    judul: "Mengenal menu",
    kelompok: "Mulai",
    ringkas: "Menu yang muncul ikut jabatan masing-masing. Bisa lihat menu belum tentu boleh ngubah isinya. Tombol ubah cuma muncul buat yang berwenang.",
    peran: SEMUA,
    tugas: [
      {
        judul: "Di laptop",
        pengantar: "Menu ada di sebelah kiri, dikelompokkan ikut alur kerja: Operasi, Stok, Niaga, dan Laporan. Tekan Ctrl+B buat ngecilin menu jadi ikon. Tombol Keluar ada di kiri bawah.",
        gambar: "01-dashboard",
        keterangan: "Tampilan laptop: menu di kiri, isi halaman di kanan.",
      },
      {
        judul: "Di HP",
        pengantar: "Empat menu utama ada di tab bawah. Sisanya ada di tombol Menu, lengkap sama kotak Cari menu dan tombol Keluar.",
        gambar: "20-hp-menu",
        keterangan: "Lembar Menu di HP Petugas Lapangan.",
      },
      {
        judul: "Berlaku di semua halaman",
        pengantar: "Tombol yang berisiko, kayak setuju, bayar, kirim, dan selesai, selalu minta konfirmasi kedua. Data nggak bisa dihapus. Kalau ada yang salah, dibatalin pakai alasan atau dikoreksi, dan semua perubahan kecatat.",
      },
    ],
  },
  {
    slug: "dashboard",
    judul: "Dashboard",
    kelompok: "Mulai",
    ringkas: "Halaman pertama setelah masuk. Isinya kerjaan yang perlu diberesin hari ini plus ringkasan usaha.",
    peran: SEMUA,
    menu: "/dashboard",
    tugas: [
      {
        judul: "Mengerjakan daftar Perlu tindakan Anda",
        pengantar: "Isinya transaksi yang lagi nunggu dikerjain, satu per satu. Yang mendesak ada di paling atas. Tiap jabatan cuma lihat yang bisa dia kerjain.",
        langkah: ["Baca baris paling atas.", "Tekan tombolnya, misalnya Periksa, Tagih, atau Putuskan.", "Halaman urusan itu langsung kebuka. Beresin di sana.", "Kalau ada yang terlipat, tekan Lihat lainnya."],
        gambar: "01-dashboard-tindakan",
        keterangan: "Daftar Perlu tindakan Anda punya Owner.",
      },
      {
        judul: "Membaca ringkasan",
        pengantar: "Di bawah daftar ada kas bulan ini, piutang, utang ke pemasok, stok, isi gudang per ruangan, arus kas enam bulan, dan laba rugi proyek terbaru. Ketuk angkanya buat buka rinciannya. Ringkasan yang muncul ikut izin jabatan masing-masing.",
        gambar: "20-hp-owner",
        keterangan: "Dashboard Owner di HP.",
      },
    ],
  },
  {
    slug: "pembelian",
    judul: "Pembelian",
    kelompok: "Operasi",
    ringkas: "Di sini PO dibikin, notanya dilampirin, diajukan buat disetujui, dan pembayaran ke pemasok dicatat.",
    peran: ["owner", "finance", "admin"],
    menu: "/pembelian",
    tugas: [
      {
        judul: "Membaca daftar PO",
        pengantar: "Tiap baris nunjukin berat, total, dan tiga status: Persetujuan, Diterima, dan Bayar. Tekan Buka buat lihat rinciannya.",
        gambar: "02-pembelian",
        keterangan: "Daftar PO sama statusnya masing-masing.",
      },
      {
        judul: "Membuat PO",
        peran: ["owner", "admin"],
        langkah: ["Tekan Buat PO.", "Pilih Pemasok. Kalau belum ada di daftar, tekan Pemasok belum ada di daftar, isi namanya, terus tekan Simpan pemasok.", "Isi Berat (kg) dan Harga per kg (Rp).", "Cek Tanggal, terus pilih Proyek atau Proyek baru (otomatis). Satu proyek itu satu batch atau bongkaran, isinya boleh beberapa PO.", "Tekan Buat PO (draf)."],
        gambar: "02-pembelian-buat",
        keterangan: "Form Buat PO.",
      },
      {
        judul: "Melampirkan nota dan mengajukan",
        peran: ["owner", "admin"],
        langkah: ["Buka PO yang masih Draf.", "Tekan Lampirkan nota, terus pilih berkasnya. Kalau notanya belum ada, centang Nota menyusul.", "Tekan Ajukan untuk disetujui."],
        gambar: "02-pembelian-draf",
        keterangan: "PO draf. Tombol Ajukan baru aktif kalau nota udah dilampirin atau Nota menyusul udah dicentang.",
        catatan: "Selama PO masih draf, berat dan harga masih bisa diubah lewat tombol Ubah. PO yang ditandai Nota menyusul tetap bisa disetujui, dan ikannya tetap bisa diterima. Notanya nanti dilampirin lewat Lampirkan nota susulan sama jabatan yang dipilih admin.",
      },
      {
        judul: "Mencatat pembayaran ke pemasok",
        peran: ["owner", "finance"],
        langkah: ["Buka PO yang udah Disetujui.", "Di bagian Pembayaran, isi Jumlah dan Tanggal.", "Kalau perlu, isi Catatan, misalnya DP atau pelunasan.", "Tekan Catat pembayaran.", "Tekan Lampirkan bukti transfer."],
        gambar: "02-pembelian-detail",
        keterangan: "Rincian PO: ringkasan, nota, riwayat persetujuan, penerimaan, dan pembayaran.",
        catatan: "Disetujui belum tentu udah dibayar. Pembayaran yang dicatat otomatis masuk buku kas.",
      },
    ],
  },
  {
    slug: "persetujuan",
    judul: "Persetujuan",
    kelompok: "Operasi",
    ringkas: "Antrean PO yang lagi nunggu. Finance periksa dulu, habis itu Owner yang mutusin.",
    peran: ["owner", "finance", "admin"],
    menu: "/persetujuan",
    tugas: [
      {
        judul: "Memeriksa dan memutuskan",
        peran: ["owner", "finance"],
        pengantar: "Kartunya nampilin nilai, nota, dan peringatan kalau harganya naik dari pembelian terakhir ke pemasok itu.",
        langkah: ["Baca nilai sama peringatan harganya.", "Tekan Buka buat lihat nota.", "Pemeriksa: isi catatan kalau perlu, terus tekan Sudah diperiksa.", "Penyetuju: tekan Setujui, Minta revisi, atau Tolak. Penyetuju boleh langsung mutusin tanpa nunggu diperiksa.", "Jawab konfirmasi kedua."],
        gambar: "03-persetujuan",
        keterangan: "Antrean persetujuan dan riwayat terbaru.",
        catatan: "Owner bisa setujuin beberapa PO sekaligus. Centang kartunya, terus cek total yang muncul di konfirmasi.",
      },
      {
        judul: "Menyetujui dari HP",
        peran: ["owner"],
        pengantar: "Dari Dashboard, tekan Periksa di baris PO. Kartu PO itu langsung kebuka, lengkap sama notanya.",
        gambar: "20-hp-persetujuan",
        keterangan: "Persetujuan di HP.",
      },
    ],
  },
  {
    slug: "mutu",
    judul: "Mutu dan Penerimaan",
    kelompok: "Operasi",
    ringkas: "Nyatet ikan yang datang dan nilai mutunya. Lot yang lulus bisa dipakai produksi.",
    peran: SEMUA,
    menu: "/mutu",
    tugas: [
      {
        judul: "Menerima ikan",
        peran: ["owner", "qc", "petugas"],
        langkah: [
          "Di bagian Terima ikan, pilih PO. Beratnya udah keisi dari PO, jadi nggak perlu ditimbang ulang di sini.",
          "Kalau kiriman aslinya beda, centang Kiriman nyata berbeda dari PO, terus isi Berat kiriman (kg).",
          "Isi Catatan kalau perlu.",
          "Tekan Catat penerimaan. Sistem bikin lot baru.",
        ],
        gambar: "20-hp-mutu",
        keterangan: "Form Terima ikan dan daftar lot di HP.",
        catatan: "Ikan datang malam sebelum PO disetujui? Centang kotak bongkar malam yang muncul. Pembayarannya tetap nunggu persetujuan Owner.",
      },
      {
        judul: "Melihat daftar lot",
        pengantar: "Saring pakai tombol Semua, Menunggu, Lulus, dan Ditahan, atau cari lewat kotak pencarian. Kolom Pemakaian nunjukin sisa berat tiap lot.",
        gambar: "04-mutu",
        keterangan: "Halaman Mutu dan Penerimaan di laptop.",
      },
      {
        judul: "Cek mutu",
        peran: ["owner", "qc"],
        langkah: [
          "Di lot yang statusnya Menunggu, tekan Cek mutu.",
          "Pilih Lulus atau Tahan.",
          "Kalau lulus, pilih grade. Beratnya udah keisi berat lot penuh.",
          "Kalau lotnya campur, tekan + Tambah grade, terus isi berat tiap grade. Contohnya 500 kg B-SO dan 300 kg A-SO.",
          "Isi Catatan, misalnya suhu, bau, atau alasan ditahan.",
          "Tekan Simpan hasil.",
        ],
        gambar: "04-mutu-cek",
        keterangan: "Form Cek mutu.",
        catatan: "Total berat semua grade nggak boleh lebih dari berat lot. Kalau kurang, sisanya kecatat tanpa grade. Lot yang udah dipakai produksi nggak bisa diubah mutunya.",
      },
      {
        judul: "Melampirkan nota nelayan",
        peran: ["owner", "finance", "admin", "qc", "petugas"],
        langkah: ["Di baris lot, tekan Lampiran.", "Tekan Lampirkan foto timbangan (wajib), atau Lampirkan nota nelayan, terus pilih berkasnya.", "Tekan Buka buat ngecek berkas yang udah masuk."],
        catatan: "Nota nelayan dibikin bagian admin di luar sistem. Di sini tinggal simpan foto atau PDF-nya. Foto timbangan cukup satu tiap penerimaan, jadi kalau terimanya bertahap ya satu foto per penerimaan. Lot yang belum lengkap ditandai Belum ada, tapi tetap bisa dicek mutu dan diproduksi.",
      },
    ],
  },
  {
    slug: "produksi",
    judul: "Produksi",
    kelompok: "Operasi",
    ringkas: "Ikan utuh diolah jadi loin. Berat loin diisi total per grade (atau per potong kalau perlu). Habis itu neraca berat diperiksa QC dan disetujui Owner.",
    peran: SEMUA,
    menu: "/produksi",
    tugas: [
      {
        judul: "Membaca daftar produksi",
        pengantar: "Tiap baris nunjukin ikan masuk, loin, persen hasil, selisih belum jelas, dan status. Tekan Buka buat masuk ke rinciannya.",
        gambar: "05-produksi",
        keterangan: "Daftar produksi.",
      },
      {
        judul: "Memulai produksi",
        peran: ["owner", "qc", "petugas"],
        langkah: ["Tekan Mulai produksi.", "Centang lot yang mau masuk produksi ini. Yang muncul cuma lot yang lulus mutu.", "Cek Tanggal.", "Tekan Mulai produksi."],
        gambar: "05-produksi-mulai",
        keterangan: "Form Mulai produksi.",
      },
      {
        judul: "Mengisi berat loin per grade",
        peran: ["owner", "qc", "petugas"],
        langkah: ["Buka produksi yang statusnya Berjalan.", "Di bagian Loin total per grade, isi berat total tiap grade. Grade yang nggak ada biarin kosong.", "Cek angka Total di bawahnya.", "Tekan Simpan total loin."],
        catatan: "Satu produksi cuma pakai satu cara. Kalau mau nimbang per potong, tekan Timbang per potong sebelum ngisi total.",
      },
      {"judul":"Menimbang loin per potong (pilihan)","peran":["owner","qc","petugas"],"langkah":["Buka produksi yang statusnya Berjalan dan belum diisi total per grade.","Tekan Timbang per potong.","Di tabel Loin per potong, ketik beratnya.","Tekan Enter buat pindah ke baris berikutnya. Nomor loin dan grade ikut keisi dari baris sebelumnya.","Kalau belum kesimpan sendiri, tekan Simpan loin."],"gambar":"20-hp-produksi","keterangan":"Tabel loin di HP.","catatan":"Sinyal putus? Terus aja ngetik. Isiannya aman di HP dan kekirim sendiri begitu sinyal balik. Jangan hapus data browser sebelum muncul tulisan Semua tersimpan di server."},
      {"judul":"Membaca neraca berat","pengantar":"Neraca di bagian atas rincian ngebandingin ikan masuk dengan loin, hasil samping, limbah, dan susut. Sisanya muncul sebagai Selisih belum jelas. Angka ini hasil hitungan, nggak diisi otomatis. Buat catatan kertas, ada tombol Cetak formulir dan Unduh Excel.","gambar":"05-produksi-detail","keterangan":"Rincian produksi di laptop. Kotak merah itu tombol Simpan loin."},
      {"judul":"Mengisi komponen hasil","peran":["owner","qc","petugas"],"langkah":["Di bagian komponen, isi berat tiap hasil samping, misalnya Toro, Kepala dan rahang, Tetelan coklat, dan Daging kerok.","Isi Limbah, total (kg) dan Susut, total (kg). Kalau dikosongin, artinya belum ditimbang. Itu beda sama nol.","Tekan Simpan komponen."],"gambar":"05-produksi-komponen","keterangan":"Form komponen hasil."},
      {"judul":"Menyelesaikan produksi","peran":["owner","qc","petugas"],"langkah":["Cek lagi Neraca berat.","Tekan Selesaikan produksi.","Baca pesan konfirmasinya, terus tekan Ya, selesaikan."],"gambar":"05-produksi-konfirmasi","keterangan":"Konfirmasi kedua. Tombol berisiko lainnya juga minta konfirmasi kayak gini.","catatan":"Begitu diselesaikan, loin dan komponen kekunci dan masuk pemeriksaan QC."},
      {"judul":"Memeriksa dan menyetujui","peran":["owner","qc"],"langkah":["Kepala Produksi / QC: buka produksi yang udah selesai, terus cocokin timbangannya.","Kalau ada selisih, tulis di Penjelasan selisih.","Tekan Tandai sudah diperiksa (QC), terus Ya, sudah saya periksa. Kalau timbangannya meragukan, tekan Minta perbaikan.","Owner: buka produksi yang udah diperiksa, terus tekan Setujui produksi (Owner) dan Ya, setujui."],"gambar":"05-produksi-periksa","keterangan":"Form pemeriksaan QC.","catatan":"Yang nimbang nggak boleh meriksa produksi yang sama. Selisih yang nggak ada penjelasannya cuma bisa diterima Owner, caranya centang kotak Terima selisih."},
    ],
  },
  {
    slug: "stok",
    judul: "Stok",
    kelompok: "Stok",
    ringkas: "Ikan fresh dan beku, punya sendiri atau titipan, plus barang penunjang kayak kemasan dan es.",
    peran: SEMUA,
    menu: "/stok",
    tugas: [
      {
        judul: "Membaca stok ikan",
        pengantar: "Tab Ikan nampilin stok sendiri, titipan pelanggan, sisa kapasitas, dan koreksi yang lagi nunggu Owner. Tiap unit punya tombol Ambil, Pindah, dan Koreksi.",
        gambar: "06-stok",
        keterangan: "Tab Ikan.",
      },
      {"judul":"Memasukkan hasil produksi","peran":["owner","qc","petugas"],"langkah":["Tekan Hasil produksi masuk.","Pilih Produksi. Yang muncul cuma produksi yang udah disetujui, lengkap sama sisa beratnya.","Pilih Produk dan Grade.","Pilih Kondisi dan isi Berat (kg).","Pilih Ruangan. Boleh dikosongin dulu, dipindah nanti.","Tekan Masukkan ke stok."],"gambar":"06-stok-masuk","keterangan":"Form Hasil produksi masuk stok.","catatan":"Fresh yang langsung dikirim nggak perlu masuk gudang. Pilih Fresh, terus centang Fresh langsung kirim, tidak masuk gudang."},
      {
        judul: "Mengambil stok",
        peran: ["owner", "qc", "petugas"],
        langkah: ["Tekan Ambil di unitnya.", "Isi berat keluar dari hasil timbang ulang.", "Isi Keterangan, misalnya tujuan kirim.", "Tekan Catat pengambilan."],
        gambar: "06-stok-ambil",
        keterangan: "Form Ambil. Kalau barangnya titipan, tagihan jasanya kebikin otomatis.",
      },
      {
        judul: "Memindah ruangan",
        peran: ["owner", "qc", "petugas"],
        langkah: ["Tekan Pindah di unitnya.", "Pilih ruangan tujuan. Sisa muatan tiap ruangan kelihatan di pilihannya.", "Tekan Pindahkan."],
        gambar: "06-stok-pindah",
        keterangan: "Form Pindah.",
      },
      {
        judul: "Mengoreksi stok",
        peran: ["owner", "qc", "petugas"],
        langkah: ["Tekan Koreksi di unitnya.", "Isi selisih berat. Pakai tanda minus buat ngurangin.", "Tulis Alasan.", "Tekan Ajukan koreksi. Koreksinya baru berlaku setelah disetujui Owner."],
        gambar: "06-stok-koreksi",
        keterangan: "Form Koreksi.",
        catatan: "Owner mutusinnya di bagian atas tab Ikan: Setujui koreksi atau Tolak koreksi.",
      },
      {
        judul: "Mengelola barang penunjang",
        peran: ["owner", "qc", "petugas"],
        pengantar: "Tab Penunjang kerja isinya kemasan, es, dan label. Tab Penunjang pekerja isinya kebutuhan pekerja. Tiap barang punya batas minimum, jadi yang Menipis dan Habis gampang kelihatan.",
        langkah: ["Tekan Tambah stok pas barang datang.", "Tekan Pakai pas barang dipakai.", "Tekan Koreksi kalau hitungan fisiknya beda.", "Tekan Riwayat buat lihat keluar masuknya."],
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
        pengantar: "Tiap kartu ruangan nunjukin isi, persen terisi, dan sisa muatan. Super Admin dan Owner bisa mastiin kapasitasnya lewat tombol Atur.",
        gambar: "07-gudang",
        keterangan: "Halaman Gudang Dingin.",
      },
      {
        judul: "Menerima titipan",
        peran: ["owner", "admin", "qc", "petugas"],
        langkah: ["Tekan Terima titipan.", "Pilih pelanggan, produk, dan grade.", "Pilih Kondisi dan isi Berat (kg).", "Pilih Ruangan. Boleh dikosongin dulu, dipindah nanti.", "Kalau perlu, centang Dibekukan di ABF. Jasa ini ditagih terpisah.", "Tekan Terima titipan."],
        gambar: "07-gudang-titipan",
        keterangan: "Form Terima titipan.",
        catatan: "Titipan diambilnya dari menu Stok, lewat tombol Ambil.",
      },
      {
        judul: "Melampirkan tanda terima dan tagihan",
        peran: ["owner", "finance", "admin", "qc", "petugas"],
        langkah: ["Di baris titipan, tekan Lampiran.", "Tekan Lampirkan tanda terima atau Lampirkan tagihan, terus pilih berkasnya.", "Tekan Buka buat ngecek berkas yang udah masuk."],
        catatan: "Tanda terima dan tagihan penitipan dibikin bagian admin di luar sistem. Di sini tinggal simpan foto atau PDF-nya.",
      },
      {
        judul: "Melihat rincian tagihan jasa",
        peran: ["owner", "finance", "admin"],
        langkah: ["Di bagian Tagihan jasa gudang, tekan Rincian.", "Baca hitungannya: lama simpan, berat, dan tarif.", "Kalau pelanggan minta, tekan Cetak rincian."],
        gambar: "07-gudang-rincian",
        keterangan: "Rincian hitungan jasa simpan.",
      },
      {"judul":"Mengubah tarif","peran":["owner","admin"],"langkah":["Di bagian Tarif, tekan Ubah di layanannya.","Isi Tarif dan Berlaku mulai.","Cek Minimum hari simpan, Masa transit (jam), dan Dasar berat tagihan simpan.","Kalau udah pasti, centang Angka ini sudah dikonfirmasi owner.","Tekan Simpan tarif."],"gambar":"07-gudang-ubah-tarif","keterangan":"Form Ubah tarif. Tagihan lama tetap pakai tarif waktu ikan masuk."},
      {"judul":"Mengatur kapasitas ruangan","peran":["owner","admin"],"langkah":["Di kartu ruangan, tekan Atur.","Isi Kapasitas (kg). Kapasitasnya nggak boleh di bawah isi ruangan.","Kalau udah pasti, centang Kapasitas ini sudah dikonfirmasi owner.","Tekan Simpan ruangan."],"gambar":"07-gudang-atur","keterangan":"Form Atur ruangan."},
      {
        judul: "Mengatur jadwal mesin",
        peran: ["owner", "admin", "qc", "petugas"],
        langkah: ["Tekan Tambah jadwal.", "Pilih Jenis dan Mitra.", "Isi waktu Mulai dan Selesai. Kalau bentrok, sistem ngasih peringatan dan nawarin Pakai jam kosong pertama.", "Isi Keterangan.", "Tekan Simpan jadwal."],
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
        pengantar: "Bagian atas nampilin pesanan jual. Di bawahnya ada Piutang dan invoice, terus jasa gudang yang belum ditagihkan. Ketuk satu baris buat bukanya.",
        gambar: "08-penjualan",
        keterangan: "Halaman Penjualan.",
      },
      {
        judul: "Membuat pesanan",
        peran: ["owner", "admin"],
        langkah: ["Tekan Buat pesanan.", "Pilih Pembeli dan Proyek.", "Pilih stok, terus isi berat dan harga per kg.", "Kalau barangnya lebih dari satu, tekan + Tambah baris.", "Cek Perkiraan total.", "Tekan Simpan pesanan (draf)."],
        gambar: "08-penjualan-buat",
        keterangan: "Form Buat pesanan. Pesanan nggak bisa lebih dari stok yang ada.",
      },
      {
        judul: "Mengirim pesanan",
        peran: ["owner", "admin", "qc", "petugas"],
        langkah: ["Buka pesanan yang statusnya Draf.", "Isi berat hasil timbang saat kirim. Berat diterima pembeli boleh nyusul.", "Tekan Kirim pesanan, terus Ya, kirim dan kurangi stok."],
        gambar: "08-penjualan-pesanan",
        keterangan: "Pesanan draf. Stok langsung berkurang sebanyak berat kirim.",
      },
      {"judul":"Menerbitkan invoice","peran":["owner","finance","admin"],"langkah":["Buka pesanan yang udah Terkirim.","Kalau ada, isi berat diterima pembeli, terus tekan Simpan berat diterima.","Tekan Terbitkan invoice, terus Ya, terbitkan invoice."],"gambar":"08-penjualan-terbit","keterangan":"Pesanan terkirim yang siap ditagih.","catatan":"Kalau berat diterima diisi, tagihannya pakai berat itu. Jadi isi dulu sebelum invoice terbit. Jatuh temponya ikut tempo pembeli."},
      {
        judul: "Mencatat uang masuk dan menagih",
        peran: ["owner", "finance"],
        langkah: ["Buka invoice.", "Isi Jumlah dan Tanggal pembayaran.", "Tekan Catat pembayaran masuk.", "Tekan Lampirkan bukti transfer.", "Kalau telat bayar, tekan Kirim pengingat (WhatsApp)."],
        gambar: "08-penjualan-invoice",
        keterangan: "Rincian invoice: isi tagihan, pembayaran, berkas, dan tombol pengingat.",
      },
      {"judul":"Menagih jasa gudang","peran":["owner","finance","admin"],"langkah":["Di bagian Jasa gudang dingin yang belum ditagihkan, pilih pelanggan.","Centang tagihan yang mau digabung.","Tekan Terbitkan invoice jasa, terus konfirmasi."],"gambar":"08-penjualan-jasa","keterangan":"Tagihan jasa yang siap diterbitkan."},
    ],
  },
  {
    slug: "keuangan",
    judul: "Keuangan",
    kelompok: "Niaga",
    ringkas: "Nyatet biaya sama notanya, lihat buku kas, dan tutup buku tiap bulan.",
    peran: ["owner", "finance", "admin"],
    menu: "/keuangan",
    tugas: [
      {
        judul: "Membaca halaman Keuangan",
        pengantar: "Bagian atas nampilin uang masuk, uang keluar, dan biaya yang lagi nunggu Owner. Di bawahnya ada daftar Biaya.",
        gambar: "09-keuangan",
        keterangan: "Halaman Keuangan.",
      },
      {
        judul: "Mencatat biaya",
        peran: ["owner", "finance", "admin"],
        langkah: ["Tekan Catat biaya.", "Pilih Kategori dan isi Uraian.", "Isi Jumlah (Rp) dan Tanggal.", "Kalau ada, pilih PO atau Produksi yang terkait. Proyeknya ikut otomatis.", "Tekan Simpan draf biaya.", "Buka biayanya, tekan Lampirkan nota, terus tekan Ajukan ke Owner."],
        gambar: "09-keuangan-catat",
        keterangan: "Form Catat biaya.",
      },
      {
        judul: "Memutuskan biaya",
        peran: ["owner"],
        langkah: ["Buka biaya yang statusnya Menunggu Owner.", "Tekan Buka di nota buat ngecek notanya.", "Tekan Setujui biaya atau Tolak biaya."],
        gambar: "09-keuangan-biaya",
        keterangan: "Biaya yang disetujui otomatis masuk buku kas.",
      },
      {
        judul: "Melihat buku kas",
        pengantar: "Transaksinya dikelompokkan per tanggal. Saring pakai Semua, Uang masuk, dan Uang keluar, atau cari lewat kotak pencarian. Tekan Unduh Excel buat nyimpennya.",
        gambar: "09-keuangan-kas",
        keterangan: "Buku kas.",
      },
      {
        judul: "Menutup buku bulanan",
        peran: ["owner"],
        langkah: ["Pastiin nggak ada biaya yang masih nunggu keputusan.", "Di bagian Tutup buku per bulan, mulai dari bulan paling lama.", "Tekan Tutup buku, terus konfirmasi."],
        gambar: "09-keuangan-tutup",
        keterangan: "Daftar bulan sama statusnya.",
        catatan: "Bulan yang udah ditutup kekunci. Transaksi bertanggal di bulan itu nggak bisa ditambah atau diubah. Cuma Owner yang bisa buka lagi, dan alasannya dicatat.",
      },
    ],
  },
  {
    slug: "laporan",
    judul: "Laporan",
    kelompok: "Laporan",
    ringkas: "Laba rugi per proyek, perbandingan antarproyek, simulasi harga, dan riwayat harga beli.",
    peran: ["owner", "finance", "admin"],
    menu: "/laporan",
    tugas: [
      {
        judul: "Laba rugi proyek",
        langkah: ["Pilih proyek.", "Baca pendapatan, biaya langsung, laba kotor, dan hasil olahan.", "Ketuk nama baris yang bergaris putus-putus buat lihat transaksinya.", "Kalau perlu, tekan Unduh Excel."],
        gambar: "10-laporan",
        keterangan: "Tab Laba rugi proyek.",
        catatan: "Yang dihitung baru laba kotor. Laba bersih masih nunggu biaya bulanan, penyusutan, dan pajak.",
      },
      {
        judul: "Tren antarproyek",
        pengantar: "Bandingin hasil olahan, harga ikan, pendapatan, biaya, dan laba antarproyek. Barisnya keisi sendiri dari data yang udah tercatat.",
        gambar: "10-laporan-tren",
        keterangan: "Tab Tren antarproyek.",
      },
      {
        judul: "Simulasi harga",
        pengantar: "Geser harga ikan, hasil olahan, dan harga jual buat lihat pengaruhnya ke laba, harga jual minimal, dan harga ikan tertinggi. Ini cuma perkiraan, nggak ada data yang berubah. Tekan Kembalikan ke angka proyek buat ngulang.",
        gambar: "10-laporan-simulasi",
        keterangan: "Tab Simulasi harga.",
      },
      {
        judul: "Harga beli",
        pengantar: "Riwayat harga beli rata-rata tertimbang. Bisa disaring per minggu atau per hari, per pemasok, dan per grade.",
        gambar: "10-laporan-harga",
        keterangan: "Tab Harga beli.",
      },
    ],
  },
  {
    slug: "siklus",
    judul: "Rincian Proyek",
    kelompok: "Laporan",
    ringkas: "Satu proyek (batch atau bongkaran) dari beli ikan sampai uang masuk. Tujuh tahapnya ada di satu layar.",
    peran: SEMUA,
    menu: "/siklus",
    tugas: [
      {
        judul: "Menelusuri satu proyek",
        langkah: ["Tekan Telusuri di proyeknya.", "Baca tujuh tahapnya: beli ikan, terima dan cek mutu, produksi, stok, jual dan kirim, tagihan dan uang masuk, biaya lain.", "Ketuk satu baris buat buka transaksinya."],
        gambar: "11-siklus-detail",
        keterangan: "Rincian satu proyek. Angka yang muncul ikut izin jabatan masing-masing.",
      },
      {
        judul: "Menutup proyek",
        peran: ["owner"],
        pengantar: "Proyek bisa ditutup kalau PO udah lunas, produksi udah disetujui, pesanan udah terkirim, tagihan udah lunas, dan biaya udah diputusin. Proyek yang udah ditutup nggak bisa dipakai buat transaksi baru sampai dibuka lagi pakai alasan.",
        gambar: "11-siklus",
        keterangan: "Daftar proyek.",
      },
    ],
  },
  {
    slug: "asisten",
    judul: "Asisten AI",
    kelompok: "Lainnya",
    ringkas: "Tanya jawab dari data, sesuai izin masing-masing. Asisten cuma bisa baca, nggak bisa ngubah apa pun.",
    peran: SEMUA,
    menu: "/asisten",
    tugas: [
      {
        judul: "Memakai pertanyaan cepat",
        pengantar: "Pertanyaan cepat nampilin data apa adanya, nggak pakai nebak, dan nggak makan jatah harian.",
        langkah: ["Tekan salah satu tombol, misalnya Piutang yang terlambat.", "Baca jawabannya.", "Ketuk tautan di bawah jawaban buat buka transaksinya."],
        gambar: "12-asisten-jawab",
        keterangan: "Jawaban dari pertanyaan cepat.",
      },
      {
        judul: "Bertanya dengan kalimat biasa",
        langkah: ["Ketik pertanyaan di kotak bawah, misalnya: Berapa saldo kas bulan ini?", "Tekan Tanya."],
        gambar: "12-asisten",
        keterangan: "Jatah pertanyaan harian ada di bawah kotak.",
        catatan: "Sebelum ambil keputusan, cek lagi angka penting di halaman asalnya.",
      },
    ],
  },
  {
    slug: "absensi",
    judul: "Absensi",
    kelompok: "Lainnya",
    ringkas: "Absen masuk dan pulang pakai lokasi dan foto langsung, ngajuin izin, dan rekap kehadiran.",
    peran: SEMUA,
    menu: "/absensi",
    tugas: [
      {"judul":"Absen masuk dan pulang","peran":["finance","admin","qc","petugas"],"langkah":["Buka menu Absensi di HP.","Tekan Absen masuk atau Absen pulang.","Kalau browser nanya, izinkan lokasi dan kamera.","Tunggu sampai lokasinya dapat dan kamera muncul.","Tekan Ambil foto dan absen masuk."],"gambar":"20-hp-absen","keterangan":"Form absen di HP. Kotak hijau itu gambar kamera contoh. Di HP yang asli, yang muncul gambar kamera beneran.","catatan":"Harus ada di dalam radius lokasi kerja. Foto diambil langsung dari kamera, nggak bisa dari galeri, dan jamnya dicatat server."},
      {"judul":"Kalau absen ditolak","peran":["finance","admin","qc","petugas"],"pengantar":"Alasannya muncul dengan latar merah, misalnya jarak dari lokasi kerja. Percobaan yang ditolak tetap kesimpan di riwayat. Masuk ke area kerja, terus tekan tombolnya lagi.","gambar":"20-hp-absen-tolak","keterangan":"Contoh absen ditolak karena di luar radius."},
      {
        judul: "Melihat absen sendiri",
        peran: ["finance", "admin", "qc", "petugas"],
        pengantar: "Bagian Absen hari ini nunjukin jam masuk dan pulang. Riwayat absen saya ada di bagian bawah.",
        gambar: "20-hp-absensi",
        keterangan: "Halaman Absensi di HP.",
      },
      {
        judul: "Mengajukan izin, sakit, atau libur",
        peran: ["finance", "admin", "qc", "petugas"],
        langkah: ["Di bagian Izin dan sakit, tekan Ajukan.", "Pilih Jenis.", "Isi tanggal Dari dan Sampai.", "Tulis Alasan.", "Tekan Kirim pengajuan."],
        gambar: "13-absensi-ajukan",
        keterangan: "Form pengajuan. Yang belum diputusin bisa dibatalin sendiri lewat tombol Batalkan.",
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
        langkah: ["Pilih Bulan dan Tanggal rincian.", "Tekan Tampilkan.", "Baca hari kerja, hadir, terlambat, izin, sakit, libur, dan tidak hadir tiap orang."],
        gambar: "13-absensi-rekap",
        keterangan: "Rekap kehadiran. Di bawahnya ada daftar absen per tanggal sama fotonya.",
      },
      {"judul":"Mengatur lokasi kerja","peran":["owner","admin"],"langkah":["Tekan Ubah di lokasinya, atau Tambah buat lokasi baru.","Kalau titiknya perlu diganti, berdiri di tengah tempat kerja, terus tekan Pakai lokasi saya sekarang.","Atur Radius (meter) dan Batas akurasi GPS (m).","Atur jam masuk dan pulang buat Senin-Jumat dan Sabtu, plus Toleransi terlambat (menit).","Tekan Simpan lokasi."],"gambar":"13-absensi-ubah-lokasi","keterangan":"Form Ubah lokasi kerja."},
    ],
  },
  {
    slug: "akses",
    judul: "Akses",
    kelompok: "Admin",
    ringkas: "Bikin akun dan ngatur jabatan. Satu jabatan cuma buat satu akun aktif.",
    peran: ["owner", "admin"],
    menu: "/akses",
    tugas: [
      {
        judul: "Membuat akun",
        langkah: ["Di bagian Buat akun pengguna, isi Nama dan Email. Email cuma dipakai buat nama masuk.", "Pilih Peran. Yang bisa dipilih cuma jabatan yang masih kosong.", "Tekan Buat akun."],
        gambar: "14-akses-buat",
        keterangan: "Form Buat akun pengguna.",
      },
      {
        judul: "Mengirim tautan aktivasi",
        langkah: ["Habis akun dibikin, tautannya muncul di layar.", "Tekan Kirim lewat WhatsApp atau Salin tautan.", "Pastiin orangnya buka tautan itu dalam 24 jam."],
        gambar: "14-akses-tautan",
        keterangan: "Tautan aktivasi. Sistem nggak ngirim email apa pun.",
      },
      {
        judul: "Mengelola akun yang ada",
        pengantar: "Tiap baris punya tombol Ubah email, Tautan atur sandi, dan Lepas peran. Buat ganti pemegang jabatan, ubah akun lamanya ke Nonaktif, tekan Simpan, terus bikin akun baru. Akun Owner cuma bisa diatur Owner.",
        gambar: "14-akses",
        keterangan: "Daftar pengguna.",
        catatan: "Orang yang keluar cukup dinonaktifin, nggak dihapus, biar riwayat kerjanya tetap ada.",
      },
      {
        judul: "Memilih yang menyetujui PO",
        pengantar: "Di bagian Tugas per peran, pilih jabatan yang boleh Menyetujui PO, Memeriksa PO, dan Melampirkan nota susulan. Tekan Ya atau Tidak di kolom jabatannya. Owner selalu bisa semuanya.",
        langkah: ["Cari baris tugasnya.", "Tekan tombol di kolom jabatan. Ya artinya dikasih, Tidak artinya dicabut."],
        catatan: "Yang ngajuin PO nggak bisa nyetujuin PO-nya sendiri. Tugas buat jabatan sendiri cuma bisa diubah Owner.",
      },
    ],
  },
  {
    slug: "pengaturan",
    judul: "Pengaturan",
    kelompok: "Admin",
    ringkas: "Data master yang dipakai di menu lain: target hasil, pemasok, pembeli, produk, grade, hasil samping dan limbah, plus kategori biaya.",
    peran: SEMUA,
    menu: "/pengaturan",
    tugas: [
      {
        judul: "Mengatur target hasil",
        peran: ["owner", "admin"],
        langkah: ["Buka tab Target hasil.", "Ubah Rencana hasil olahan atau batasnya.", "Tekan Simpan di baris itu."],
        gambar: "15-pengaturan",
        keterangan: "Target dipakai buat nandain produksi yang hasilnya di bawah rencana atau di luar batas wajar.",
      },
      {
        judul: "Mengatur lampiran wajib",
        peran: ["owner", "admin"],
        langkah: ["Buka tab Lampiran wajib.", "Pilih Wajib atau Opsional buat tiap berkas: nota PO, foto timbangan, bukti transfer, dan lainnya.", "Kalau perlu, ubah keterangannya, terus tekan Simpan."],
        catatan: "Lampiran wajib yang belum ada nggak bikin pencatatan berhenti. Cuma ditandai Belum ada biar bisa dilengkapi.",
      },
      {"judul":"Menambah pemasok","peran":["owner","admin"],"langkah":["Buka tab Pemasok.","Tekan Tambah.","Isi Nama, Kontak, dan Catatan.","Tekan Simpan."],"gambar":"15-pengaturan-tambah","keterangan":"Form Tambah pemasok. Data yang udah nggak dipakai dinonaktifin lewat tombol Nonaktifkan."},
      {
        judul: "Menambah pembeli",
        peran: ["owner", "admin"],
        pengantar: "Isi Tempo bayar (hari), soalnya dipakai buat ngitung jatuh tempo invoice. Isi juga kontaknya, soalnya dipakai buat ngirim pengingat tagihan.",
        gambar: "15-pengaturan-pembeli",
        keterangan: "Tab Pembeli.",
      },
      {
        judul: "Grade dan kategori biaya",
        peran: ["owner", "admin"],
        pengantar: "Caranya sama: tekan Tambah, Ubah, atau Nonaktifkan di tab masing-masing. Urutannya nentuin urutan pilihan di form.",
        gambar: "15-pengaturan-grade",
        keterangan: "Tab Grade.",
      },
      {
        judul: "Kategori biaya",
        peran: ["owner", "admin"],
        pengantar: "Kategori nentuin pengelompokan biaya di buku kas dan laporan.",
        gambar: "15-pengaturan-kategori",
        keterangan: "Tab Kategori biaya.",
      },
    ],
  },
  {
    slug: "masalah",
    judul: "Kalau ada masalah",
    kelompok: "Bantuan",
    ringkas: "Masalah yang paling mungkin ketemu, sama cara ngatasinnya.",
    peran: SEMUA,
    tugas: [
      { judul: "Absen ditolak: di luar radius", pengantar: "Posisinya kejauhan dari titik lokasi kerja. Pesannya nyebutin jaraknya. Masuk ke area kerja, terus coba lagi. Kalau yakin udah di dalam, minta Super Admin ngecek titik lokasinya." },
      { judul: "Absen ditolak: GPS kurang akurat", pengantar: "Pindah ke tempat terbuka, tunggu sebentar, terus coba lagi." },
      { judul: "Kamera atau lokasi tidak muncul", pengantar: "Izinkan kamera dan lokasi buat situs ini di pengaturan browser, terus muat ulang halaman." },
      { judul: "Tautan aktivasi tidak bisa dibuka", pengantar: "Tautannya mungkin udah lewat 24 jam atau udah pernah dipakai. Minta Tautan atur sandi yang baru ke Super Admin." },
      { judul: "Sebuah menu atau tombol tidak ada", pengantar: "Menu dan tombol ikut izin jabatan. Kalau rasanya harusnya ada, tanya ke Super Admin." },
      { judul: "Tombol berwarna abu-abu", pengantar: "Syaratnya belum lengkap. Biasanya ada tulisan di dekat tombolnya, misalnya Lampirkan nota dulu, atau centang Nota menyusul kalau notanya belum ada." },
      { judul: "Isian belum tersimpan di HP", pengantar: "Biarin halamannya kebuka sampai sinyal balik dan muncul tulisan Semua tersimpan di server. Jangan hapus data browser sebelum itu." },
      { judul: "Tampilan masih yang lama", pengantar: "Muat ulang halaman. Kalau masih sama, tutup browser terus buka lagi." },
    ],
  },
];
