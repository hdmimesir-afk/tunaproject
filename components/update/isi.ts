/* Isi laporan /update. Ditulis dengan suara pengembang yang ngobrol langsung ke owner dan tim: "saya" untuk yang saya kerjakan, "kita" untuk
   yang disepakati bareng, dan "owner" untuk pemilik usaha. Bahasanya santai dan pendek pendek, tanpa istilah teknis (masukan Mas Bisma:
   jangan kaku). Jumlah tes dan catatan kas yang diimpor diambil dari pemeriksaan lengkap per 26 Oktober 2026 (PERIKSA_LENGKAP), jumlah menu
   dan jabatan dihitung ulang per 11 November 2026. Tidak ada angka perkiraan. Pembaruan sesudah 26 Oktober dicatat di PERJALANAN dan TERBARU. */

export const TANGGAL = "23 November 2026";
export const PERIKSA_LENGKAP = "26 Oktober 2026";

/* ---------------------------------------------------------------- angka */
export const ANGKA = [
  { nilai: "23 dari 23", label: "fitur yang kita sepakati udah jadi semua, dan semuanya lulus uji." },
  { nilai: "15", label: "menu udah siap dipake. Jabatannya ada 5, dan tiap jabatan cuma lihat menu yang emang urusannya." },
  { nilai: "235", label: "catatan uang keluar dari Monitor Dana udah saya masukin ke buku kas. Riwayat lama gak perlu diketik ulang." },
  { nilai: "581", label: "pemeriksaan otomatis lulus semua di pemeriksaan lengkap 26 Oktober, termasuk satu putaran penuh dari beli ikan sampai uang masuk." },
] as const;

/* ------------------------------------------------------------ perjalanan */
export const PERJALANAN = [
  { tanggal: "14 Oktober", judul: "Penawaran", isi: "Saya mulai dari penawaran dan contoh aplikasi di laptop dan HP, biar owner kebayang dulu sistemnya kayak apa sebelum saya bangun." },
  { tanggal: "21 Oktober", judul: "Rancangan disepakati", isi: "Rancangan akhir sama formulir timbang produksi saya susun. Pertanyaan buat owner saya bikin biar cukup dijawab sekali ketuk." },
  { tanggal: "22 Oktober", judul: "Jawaban owner masuk", isi: "Jawaban owner langsung saya masukin ke sistem: lima jabatan, tarif simpan Rp76 per kg per hari, dan pake paket gratis. Pondasinya juga sekalian saya pasang: login, pengaturan jabatan, data master, catatan perubahan, dan data yang gak bisa dihapus." },
  { tanggal: "23 Oktober", judul: "Semua alur kerja jadi", isi: "Ini hari paling padat. Pembelian dan persetujuan, produksi per potong loin, stok dan gudang dingin, penjualan, keuangan dan laporan, dashboard, sampai Asisten AI. Habis itu catatan Monitor Dana, tutup buku, absensi, tutup siklus, dan bikin akun lewat tautan." },
  { tanggal: "27 Oktober", judul: "Tampilan saya rapiin", isi: "Menu samping saya bikin ulang, ada logo dan pengelompokannya. Tampilan HP sekarang beda dari laptop. Buku kas jadi per hari, daftar lot dan penjualan lebih jelas, di menu Akses bisa ganti email dan lepas jabatan, dan ada data contoh buat latihan." },
  { tanggal: "31 Oktober", judul: "Gudang per ruangan dan stok penunjang", isi: "Gudang dingin sekarang dicatat per ruangan: ABF 1 sampai 3 dan Cold Storage 1. Ada stok barang penunjang kerja, kotak cari di semua daftar, dan Asisten bisa bikin laporan harian, mingguan, dan bulanan." },
  { tanggal: "4 November", judul: "Catatan rapat saya kerjain", isi: "Berat ikan pas penerimaan sekarang diambil dari pesanan. Jam kerja absensi disesuaikan, urutan menu operasional diubah, unduhan laporan jadi Excel yang rapi, dan akun dibikin satu per jabatan lewat tautan undangan." },
  { tanggal: "6 November", judul: "Jawaban tim Katalis masuk", isi: "Berat loin sekarang cukup diisi total per grade. Kalo mau timbang per potong, masih bisa. Nota nelayan, tanda terima titipan, sama tagihan yang dibuat admin di luar sistem tinggal difoto trus dilampirkan." },
  { tanggal: "10 November", judul: "Masukan Mas Bisma, bagian pertama", isi: "Pemasok baru bisa ditambah langsung dari form pembelian. Arti Lulus dan Tahan sekarang ada keterangannya di layar. Hasil produksi yang belum masuk stok udah muncul di form pesanan, dan kolom harga per kilo di HP udah gak kepotong lagi." },
  { tanggal: "11 November", judul: "Masukan Mas Bisma, bagian kedua", isi: "Satu lot bisa diisi beberapa grade. Pembelian gak nunggu nota lagi. Siapa yang menyetujui dan lampiran apa yang wajib, admin yang atur. Siklus juga saya ganti namanya jadi Proyek, dan stoknya ikut kecatat per proyek." },
  { tanggal: "14 November", judul: "Beres beres sebelum dipake", isi: "Data contoh saya hapus atas permintaan tim, pesan di layar saya bikin lebih santai, dan gambar panduan saya perbarui. Buat dua pertanyaan yang belum kejawab, saya tulis usulan biar tim tinggal milih." },
  { tanggal: "17 November", judul: "Masukan habis training", isi: "Alurnya saya balik, ikan diterima dulu tanpa PO trus digrading, baru diajuin. PO nya terbit pas udah disetujui. Tombol Koreksi sekarang ada di penerimaan, pembelian sama produksi. Status Lulus saya hapus, dan form mulai produksi udah ada proyek, PT sama lini bisnisnya." },
  { tanggal: "18 November", judul: "Desain Mas Bisma dan meeting operasional", isi: "Terima ikan udah bisa per ekor kayak di desain Mas Bisma, sekalian grading. Grade tuna utuh AB, C, D saya pisah dari grade loin. Produksi yang udah disetujui juga bisa dikoreksi timbangannya, laporan produksi udah lengkap sampe jumlah ekor, dan proyek sekarang dikunci biar datanya gak kecampur." },
  { tanggal: "19 November", judul: "Jawaban tim soal bayar dan titipan", isi: "Nelayan sekarang dibayar 2 termin, 50% dulu trus sisanya paling lambat 10 hari kerja. Ada pilihan harga cong (satu harga per kg). Titipan gak ada transit lagi, minimal 10 hari." },
  { tanggal: "21 November", judul: "Stok jadi dashboard, proyek di produksi", isi: "Hasil produksi yg udah disetujui Owner sekarang masuk stok sendiri, gak perlu diinput lagi. Halaman Stok jadi dashboard buat orang produksi. Proyek cuma dipilih pas mulai produksi, pas terima ikan gak perlu lagi." },
  { tanggal: "22 November", judul: "Pengaman data dan jenis ikan", isi: "Kirim barang gak bisa lebih dari pesanan dan gak bisa makan jatah pesanan lain. Terima ikan gak bisa kecatet dobel walaupun tombolnya keteken dua kali. Ada isian jenis ikan, Mulai Produksi bisa langsung dari Stok, dan jalur input stok yg lama saya tutup." },
  { tanggal: "23 November", judul: "Halaman khusus owner", isi: "Owner sekarang punya beranda sendiri isinya saldo, untung, modal balik, grafik 30 hari, sama ringkasan tiap bagian. Halaman Mutu, Produksi, Stok, Penjualan, Keuangan sama Absensi buat owner tampil jadi laporan yg gampang dibaca, gak kayak layar kerja. Kalo mau liat data lengkapnya tinggal pencet Buka halaman lengkap. Tiap akun sekarang juga bisa ganti kata sandinya sendiri, tinggal pencet nama di menu terus buka Akun saya." },
  { tanggal: "23 November", judul: "Masukan tim finance", isi: "Biaya keluar sekarang bisa dikoreksi semua isiannya walaupun udah diajukan atau udah disetujui, wajib alasan dan langsung berlaku, buku kasnya ikut dibenerin. Biaya yg dobel bisa dihapus (kecatat di log hapus). Ada juga daftar biaya tetap bulanan kayak gaji, sewa, listrik, tiap bulan tinggal pencet catat." },
] as const;

/* -------------------------------------------------------------- terbaru */
/* Laporan terbaru, yang paling baru di atas: meeting operasional dan desain Mas Bisma 18 November, masukan training 17 November,
   beres beres 14 November, lalu masukan Mas Bisma (notulen 10 November). */
export const TERBARU: { judul: string; isi: string }[] = [
  { judul: "Owner bisa lihat semua laporan, dashboard lebih simpel", isi: "Owner sekarang bisa buka semua menu buat lihat laporan lengkap (penerimaan, produksi, stok, penjualan, keuangan, absensi, dll), tapi tetep gak bisa ngisi data. Di atas tiap halaman ada tulisan Mode lihat biar jelas. Dashboard owner dibikin simpel: yg penting di atas (persetujuan, saldo, margin, balik modal), rincian lainnya dilipat. Link CCTV, saldo awal sama modal usaha sekarang bisa diatur owner langsung dari dashboard, gak harus lewat admin. Owner juga gak ikut kehitung di rekap absen lagi." },
  { judul: "Hapus akun sama foto otomatis dikecilin", isi: "Di menu Akses sekarang ada tombol Hapus akun buat akun yg udah dilepas perannya, misalnya akun uji. Wajib isi alasan dan kecatet di log hapus. Akun yg punya catatan absen gak bisa dihapus, cukup dinonaktifin. Terus semua foto yg diupload (foto timbangan, nota, bukti transfer, kwitansi, selfie absen) sekarang otomatis dikecilin dan disimpen jadi WebP, jadi lebih hemat kuota sama penyimpanan. PDF gak diubah." },
  { judul: "Akun owner jadi dashboard aja", isi: "Sesuai permintaan owner, akun owner sekarang cuma buat lihat sama nyetujuin, kayak aplikasi barber. Menunya tinggal Dashboard, Laporan, sama Akses buat ngundang akun karyawan. Gak ada isian data kerja atau upload. Di dashboard ada saldo perusahaan, margin profit, balik modal (BEP), sisa kapasitas gudang dingin, absensi hari ini, link CCTV, foto timbangan terbaru, sama invoice, kwitansi dan bukti bayar. Persetujuan (PO, produksi, biaya, koreksi, izin) tetep dari kotak Perlu persetujuan Anda. Saldo awal, modal usaha sama link CCTV diisi admin di Pengaturan, tab Dashboard owner. Lampiran sekarang ada jenis invoice sama kwitansi juga." },
  { judul: "Upload data master dari Excel", isi: "Di Pengaturan sekarang ada tab Upload Excel buat masukin pemasok, pembeli, produk, sama barang penunjang sekaligus banyak. Unduh templatenya, isi di Excel, terus pilih filenya. Sebelum disimpan ada pratinjau mana yg baru, diperbarui, sama, atau salah, lengkap sama nomor barisnya. Urutan kolom bebas, yg penting judulnya. Nama yg udah ada gak dibikin dobel, sel kosong gak ngapus data lama, dan kalo ada 1 baris salah gak ada yg disimpen. Tiap upload kecatet di Riwayat upload." },
  { judul: "Kirim gak bisa makan jatah pesanan lain", isi: "Berat yg dikirim sekarang maksimal sesuai pesanannya. Kalo kelebihan, kotaknya merah dan tombol Kirim gak bisa ditekan. Stok yg udah dipesan pesanan lain juga dijaga, jadi kirim atau ambil stok gak bisa makan jatah pesanan lain. Contohnya stok 2.400 kg, pesanan A 1.000 sama B 1.200, sisanya yg bebas cuma 200. Kalo dua orang ngirim barengan, sistem ngantri, jadi stoknya gak bakal minus. Stok tetep turunnya pas Kirim, pesanan lama gak diubah." },
  { judul: "Terima ikan gak bisa dobel", isi: "Kalo tombol Catat penerimaan keteken dua kali, atau sinyal putus terus dikirim ulang, lotnya tetep cuma satu. Tiap form terima ikan punya kode sendiri, jadi kiriman yg sama dikenali. Dua penerimaan yg beneran beda tapi isinya kebetulan sama (pemasok, berat, tanggal) tetep kecatet dua, gak dianggap dobel." },
  { judul: "Jenis ikan", isi: "Di Terima ikan cara berat total sekarang ada isian Jenis ikan, boleh kosong. Kalo dicatet per ekor, jenisnya diisi per ekor (satu lot boleh campur jenis). Jenisnya keliatan di daftar lot, di Stok, sama di form dan rincian Produksi. Kalo salah tinggal Koreksi. Isian asal kapal gak jadi dipake, biar form terima ikan tetep ringkes." },
  { judul: "Mulai Produksi langsung dari Stok", isi: "Tiap lot di Stok yg masih ada ikannya sekarang punya tombol Mulai Produksi. Formnya kebuka dengan lot itu udah kepilih: no lot, jenis ikan, berat awal, tersedia, sama yg lagi diproses. Beratnya udah keisi sebesar yg tersedia, tinggal diubah kalo cuma sebagian. Kalo diisi lebih dari yg tersedia langsung merah. Kalo lotnya udah kepake proyek, proyeknya kekunci ke situ. Kalo belum, ada keterangan lotnya bakal keiket ke proyek yg dipilih. Satu lot tetep satu proyek." },
  { judul: "Stok ikan utuh per lot", isi: "Di Stok bagian ikan utuh, tiap lot sekarang nunjukin tiga angka: Tersedia (belum diolah), Sedang diproduksi (produksinya belum disetujui Owner), sama Selesai diproduksi. Ada garis warna sama labelnya, misalnya Sebagian diolah atau Lagi diolah semua. Lot yg ikannya lagi diolah semua tetep muncul, gak ilang dari layar." },
  { judul: "Jalur input stok lama ditutup", isi: "Dua jalur lama, masukin hasil produksi ke stok manual sama ajukan koreksi stok, udah saya tutup. Stok sekarang masuk sendiri dari produksi yg disetujui, koreksinya lewat Koreksi produksi. Datanya gak ada yg dihapus. Pengajuan koreksi lama yg masih nunggu tetep bisa diputusin Owner di halaman Stok." },
  { judul: "Laporan harian di Dashboard", isi: "Paling atas Dashboard sekarang ada laporan: ikan masuk, loin hasil produksi plus persen hasilnya, stok siap jual, yg terjual, sama uang masuk. Bisa pilih Hari ini, Kemarin, atau 7 hari, dan tiap kotak bisa diketuk buat lihat rinciannya. Ada tombol Bagikan, di HP langsung bisa kirim ke WhatsApp, di laptop teksnya kesalin. Kotak Lantai produksi yg angkanya dobel udah dihapus." },
  { judul: "Bisa dipasang di HP, dan lebih ringan", isi: "KATALIS ERP sekarang bisa dipasang di HP kayak aplikasi: ada ikon KATALIS di layar utama dan bukanya tanpa bilah browser. Di Android tekan Menu, terus Pasang aplikasi di HP ini. Di iPhone lewat Safari, Bagikan, terus Tambah ke Layar Utama. File tampilannya disimpan di HP, jadi buka berikutnya nggak download ulang, cuma ambil data terbaru. Halaman Mutu sama Pembelian juga makin ringan, bagian upload foto baru dimuat pas dipake. Data perusahaan gak disimpan di HP." },
  { judul: "Hapus data di Pengaturan", isi: "Owner sekarang bisa hapus data sendiri lewat Pengaturan, tab Hapus data. Bisa semua sekaligus atau per bagian (penerimaan, produksi, penjualan, titipan, keuangan, absensi, barang penunjang). Sebelum hapus ada daftar apa aja yg bakal kehapus, wajib nulis alasan dan ngetik HAPUS. Data yg nyambung ikut kehapus biar gak bolong, misalnya hapus penjualan aja stoknya balik lagi. Tiap hapus kecatet di Log hapus, tekan Detail buat lihat siapa, kapan, alasannya, sama kode yg kehapus. Data master sama akun gak pernah ikut kehapus." },
  { judul: "Pilih Fresh atau Beku di produksi", isi: "Di rincian produksi sekarang ada bagian Kondisi hasil, tinggal pilih Fresh atau Beku (bawaannya Beku). Bisa dipilih dari produksi masih jalan sampe udah disetujui, stoknya ikut berubah. Kalo stoknya udah ada yg kejual atau diambil, kondisinya kekunci biar riwayat penjualannya gak berubah. Tiap ganti kondisi kecatet di riwayat koreksi produksinya." },
  { judul: "Stok masuk sendiri dari produksi", isi: "Begitu produksi disetujui Owner, hasilnya langsung jadi stok: loin per grade sama hasil samping per jenis, ngikut timbangan produksi. Jadi di halaman Stok udah gak ada input lagi. Kalo ada yg gak sesuai, benerin timbangannya lewat tombol Koreksi di halaman Produksi, stoknya ikut berubah sendiri. Yg udah kejual jadi batas bawahnya. Produksi lama yg udah disetujui tapi belum masuk stok ikut dimasukin sekali." },
  { judul: "Halaman Stok jadi mini dashboard", isi: "Isinya urut kayak kerja harian: 1. Ikan utuh dari bongkaran yg belum diolah, dikelompokin per proyek. 2. Produksi yg lagi jalan. 3. Hasil produksi siap jual. 4. Titipan. Di ikan utuh ada tombol Produksi dari ikan ini, jadi bongkaran semalem tinggal diproduksi besok paginya, lotnya udah kecentang di form. Di produksi yg lagi jalan ada tombol Isi hasil produksi buat sorenya." },
  { judul: "Ambil sama pindah ruangan pindah ke Gudang Dingin", isi: "Karena Stok sekarang cuma buat dilihat, tombol Ambil sama Pindah titipan ada di menu Gudang Dingin. Ada bagian baru Stok sendiri di gudang buat mindahin hasil produksi ke ruangannya." },
  { judul: "Barang Penunjang jadi menu sendiri", isi: "Es, kemasan, label, sama kebutuhan pekerja sekarang punya menu sendiri: Barang Penunjang, di grup Stok. Isinya sama kayak dulu (Tambah stok, Pakai, Koreksi, Riwayat), cuma pindah tempat biar gak nyampur sama Stok ikan." },
  { judul: "Proyek dipilih di Produksi aja", isi: "Biar gak salah input, pas terima ikan di Mutu dan Penerimaan udah gak ada pilihan proyek. Proyeknya dipilih pas mulai produksi. Lot yg belum punya proyek bisa dipake proyek mana aja, begitu dipake lotnya ikut proyek produksinya (pembeliannya juga ikut). Pengajuan pembelian tetep satu pemasok per pengajuan." },
  { judul: "Input per proyek dari menu Rincian Proyek", isi: "Sekarang di menu Rincian Proyek ada tombol Proyek baru. Isi nama, pilih lini bisnisnya (jual, jasa produksi dari ikan PT, atau titip saja), PT nya, sama tanggal. Abis itu proyeknya langsung kebuka dan ada tombol buat lanjut isi datanya: Mulai produksi atau Terima titipan, formnya langsung kebuka dengan proyek itu udah kepilih. Daftar proyek juga udah nampilin nama, lini bisnis sama PT nya. Cara pakainya ada di video ke 7 di halaman Panduan." },
  { judul: "Bayar nelayan 2 termin", isi: "Pengajuan sama persetujuannya tetep 100%, tapi bayarnya dua kali. Di kartu persetujuan sekarang keliatan pembagiannya: 50% dulu, sisanya paling lambat 10 hari kerja. Di form bayar ada tombol Termin 1 (50%) sama Termin 2 (pelunasan), jumlah sama catatannya keisi sendiri, termasuk tanggal paling lambat termin 2. Abis termin 1 dibayar, di rincian PO muncul pengingat termin 2, jadi merah kalo udah lewat." },
  { judul: "Harga cong", isi: "Pas ajuin pembelian sekarang ada pilihan Per grade atau Cong. Cong itu satu harga per kg buat semua ikan di pengajuan itu, gak liat grade. Gradingnya tetep kecatet buat laporan mutu, cuma harganya disamain. Catatan pengajuannya otomatis dikasih tulisan harga cong nya." },
  { judul: "Titipan gak ada transit lagi", isi: "Sesuai jawaban tim, titipan gak ada yg transit. Mau cuma semalam atau beberapa jam, tetep ditagih minimal 10 hari. Tagihan yg udah kebuat sebelumnya gak berubah." },
  { judul: "Proyek sekarang dikunci", isi: "Biar data antarproyek gak kecampur, lot yg udah masuk satu proyek gak bisa dipake produksi proyek lain. Kalo proyek pembelian dikoreksi, lotnya ikut pindah. (Update 21 Nov: proyek sekarang dipilih pas produksi, bukan pas terima ikan.)" },
  { judul: "Terima ikan per ekor, sekalian grading", isi: "Ngikut desain Mas Bisma, ikan sekarang bisa dicatet per ekor. Isinya no tag, spesies, berat, grade AB/C/D sama tusukan gancu. Abis ngisi berat tinggal Enter, langsung pindah ke ekor berikutnya dan no tag nya nambah sendiri. Potongan gancu defaultnya 1 kg per tusukan dan gak dibayar, angkanya bisa diubah di Pengaturan. Berat lot sama hasil gradingnya keitung sendiri dari ekornya, jadi terima, timbang sama grading cukup sekali jalan. Cara lama yg berat total masih ada kok, sekarang malah bisa isi jumlah ekor sama langsung grading juga. Kalo ada yg salah tinggal Koreksi, ekornya bisa diubah, ditambah atau dibuang, semua kecatet." },
  { judul: "Koreksi timbangan produksi yang udah disetujui", isi: "Produksi yang udah selesai atau udah disetujui sekarang ada tombol Koreksi timbangan. Bisa buat benerin loin per grade, hasil samping, limbah sama susut. Statusnya gak berubah, tapi wajib isi alasan dan kecatet di riwayat. Kalo hasilnya udah masuk stok, loin + hasil samping gak boleh kurang dari yang udah masuk stok ya. Berat masuk juga masih bisa dikoreksi walaupun udah masuk stok." },
  { judul: "Laporan produksi lebih lengkap", isi: "Produksi sekarang nyatet jumlah ekor juga, otomatis keisi kalo lotnya dipake utuh. Di rincian produksi keliatan ekornya, rata rata berat per ekor sama grade tuna utuh dari lot asalnya. Di daftar produksi ada tombol Unduh laporan, isinya Excel lengkap: ikan masuk, ekor, grade tuna utuh, loin per grade, yield, hasil samping, limbah, susut sama selisihnya. Formulir cetak juga udah ikut lengkap." },
  { judul: "Grade tuna utuh dipisah dari grade loin", isi: "Grading pas penerimaan sekarang pake grade tuna utuh AB, C sama D. Grade D tetep dibeli, yg ditolak cuma ikan gugur atau bau. Harga ke nelayan juga diisinya per grade ini. Grade loin A-SO sampe C-SL tetep dipake di produksi, stok sama penjualan. Kalo kedua grade ini ketuker sistem langsung nolak. Mau nambah grade? admin bisa nambah sendiri di Pengaturan, tinggal pilih buat tuna utuh atau loin." },
  { judul: "Tampilan ngikut desain Mas Bisma", isi: "Grade sekarang tinggal di tap aja, gak perlu buka dropdown lagi. Ini berlaku di terima ikan, grading sama timbang loin per potong. Di halaman Mutu ada kotak Penerimaan hari ini yg nunjukin ekor dan berat yg masuk per nelayan. Total di Ajukan pembelian dibikin gede biar keliatan, timbang per potong juga nampilin yieldnya. Satu yg beda dari desain, harga ke nelayan tetep diisi pas Ajukan pembelian bukan pas terima, biar sama kayak alur yg udah disepakatin." },
  { judul: "Ikan diterima dulu, PO belakangan", isi: "Urutan menu Operasi sekarang: Mutu dan Penerimaan, Persetujuan, Pembelian, trus Produksi. Petugas langsung nyatet ikan yang datang, gak perlu nunggu PO. Habis digrading, admin ngajuin pembeliannya dengan harga per kg tiap grade. Kode PO baru keluar waktu disetujui, trus Finance bayar di menu Pembelian. Tombol Buat PO yang lama saya hapus." },
  { judul: "Grading nentuin harga ke nelayan", isi: "Status Lulus udah gak ada. Yang tersisa cuma Menunggu (belum digrading) sama Ditahan (ikan gugur atau bau). Hasil grading tuna utuh dipake buat ngitung harga ke nelayan, jadi tiap grade punya harga sendiri. Lot yang belum digrading tetep boleh langsung diolah." },
  { judul: "Tombol Koreksi di mana mana", isi: "Penerimaan, pembelian, dan produksi sekarang punya tombol Koreksi. Isinya wajib pake alasan, dan angka sebelum sesudahnya kecatat di Riwayat koreksi. Kalo total PO yang udah disetujui berubah, PO nya balik ke Persetujuan dengan tanda Koreksi. Pembayaran yang salah bisa dibatalin, buku kasnya dapat baris pembalik." },
  { judul: "Form mulai produksi yang baru", isi: "Sekarang ada nama proyek, tanggal, PT pemilik ikan, dan lini bisnis: jasa produksi ikan (jual), jasa produksi (ikan dari PT), atau titip saja. Jasa produksi gak pake lot, cukup isi berat ikan dari PT, dan hasilnya masuk stok sebagai milik PT itu. Titip saja langsung diarahin ke Terima titipan di Gudang Dingin, proyeknya udah keisi." },
  { judul: "Data contoh udah dihapus", isi: "Data latihan yang saya isi buat presentasi udah saya hapus dari sistem. Yang diinput tim gak ada yang ilang. Beberapa data contoh terpaksa disisain karena udah dipake data tim, misalnya LOT-003 dan LOT-004 yang dipake produksi. Nama pemasok dan pembelinya udah saya ganti, jadi gak ada lagi tulisan \"(Demo)\"." },
  { judul: "Pesan di layar lebih santai", isi: "Pesan yang muncul kalo ada yang ditolak sekarang pake kata Proyek, gak Siklus lagi, dan gak pake \"Anda\". Misalnya \"Peran ini gak punya izin buat langkah ini\". Pesan absen juga, jadi \"Udah absen masuk hari ini jam 08.03\"." },
  { judul: "Gambar panduan diperbarui", isi: "Gambar form cek mutu di Panduan udah pake tampilan yang baru (bisa beberapa grade). Panduan milih yang menyetujui PO sama atur lampiran wajib sekarang juga ada gambarnya." },
  { judul: "Nota boleh nyusul", isi: "Kalo notanya belum ada, misalnya pas bongkar malam, pembelian tetep bisa diajukan. Tinggal centang \"Nota menyusul\". Ikan tetep bisa diterima dan diproduksi, pembeliannya juga tetep bisa disetujui. Notanya dilampirkan belakangan sama orang yang dipilih admin." },
  { judul: "Admin yang milih siapa yang menyetujui", isi: "Di menu Akses sekarang ada bagian Tugas per peran. Di situ admin tinggal pilih jabatan mana yang boleh menyetujui pembelian, memeriksa, dan nambahin nota susulan. Owner tetep bisa semuanya. Orang yang mengajukan gak bisa menyetujui pengajuannya sendiri, dan nama yang berhak menyetujui kelihatan di layar." },
  { judul: "Lampiran wajib juga diatur admin", isi: "Ada tab Lampiran wajib di Pengaturan. Awalnya saya set begini: nota pembelian, foto timbangan (satu tiap kali terima ikan, jadi kalo nimbangnya bertahap ya satu foto per tahap), sama bukti transfer. Kalo ada yang belum dilampirkan, cuma ditandai \"Belum ada\". Pencatatannya tetep jalan." },
  { judul: "Satu lot bisa beberapa grade", isi: "Waktu cek mutu, QC bisa isi beberapa grade sekaligus sama beratnya, misalnya 500 kg B-SO dan 300 kg A-SO. Totalnya gak boleh lebih dari berat lot. Laporan harga beli juga ikut dipecah per grade." },
  { judul: "Siklus sekarang namanya Proyek", isi: "Satu proyek itu satu batch atau satu bongkaran, dan isinya boleh beberapa pembelian. Dari pembelian, lot, produksi, stok, penjualan, tagihan, sampai biaya, semuanya bisa ditelusuri per proyek. Stok hasil produksi sekarang ikut kecatat proyeknya, dan kode proyeknya muncul di daftar lot, daftar stok, sama pilihan stok pas bikin pesanan." },
  { judul: "Video panduan", isi: "Ada enam video pendek di halaman Panduan, masing masing 1 sampai 2 menit: bikin PO, menyetujui, terima ikan dan cek mutu, produksi, periksa dan masuk stok, sampai jual dan tagih. Direkam dari aplikasinya langsung pake data contoh, penjelasannya berupa tulisan di layar. Kalo nanti tampilannya berubah, videonya bisa saya rekam ulang dengan cepat." },
  { judul: "Perbaikan kecil dari rapat", isi: "Pemasok baru bisa ditambah langsung dari form pembelian. Lulus dan Tahan sekarang ada penjelasannya. Hasil produksi yang belum masuk stok udah kelihatan di form pesanan, dan kolom harga per kilo di HP gak keluar layar lagi." },
];

/* ----------------------------------------------------------------- usulan */
/* Pertanyaan lanjutan yang belum dijawab tim Katalis. Ini usulan developer, belum dikerjakan sampai dikonfirmasi.
   (Kedatangan tanpa PO, harga per grade, dan penampungan = produksi udah dijawab dan udah dikerjain.) */
export const USULAN: { judul: string; masalah: string; usulan: string[]; tanya: string[] }[] = [
  {
    judul: "Satu produksi dari dua bongkaran",
    masalah: "Proyek udah dikunci. Ikan diterima tanpa proyek, proyeknya dipilih pas mulai produksi, dan begitu dipake lotnya ikut proyek itu. Satu produksi atau satu pengajuan pembelian cuma boleh pake lot dari proyek yg sama. Saya pake aturan yg paling ketat dulu biar datanya pasti gak kecampur.",
    usulan: [
      "Kalo di lapangan emang gak pernah nyampur, aturannya biarin kayak sekarang.",
      "Kalo kadang satu produksi ngolah ikan dari dua bongkaran, saya bikin boleh dicampur asal dipilih proyek utamanya, dan lot dari proyek lain ditandain di laporan.",
    ],
    tanya: [
      "Pernah gak satu produksi sengaja ngolah ikan dari dua bongkaran yg beda?",
      "Penjualan sama biaya juga mau diwajibin pilih proyek? Sekarang dua ini masih boleh kosong.",
    ],
  },
  {
    judul: "Biaya pembekuan buat barang yg udah beku",
    masalah: "Transit udah gak ada, titipan sebentar pun tetep dihitung minimal 10 hari. Tinggal satu yg belum kejawab soal gudang: barang titipan yg dateng udah beku.",
    usulan: [
      "Biaya pembekuan Rp3.500 per kilo cuma ditagih kalo barangnya masuk ABF. Barang yg dateng udah beku dan langsung masuk cold storage gak kena.",
    ],
    tanya: [
      "Barang yg dateng udah beku tetep kena biaya pembekuan atau gak?",
    ],
  },
];

/* Jawaban tim 19 Nov 2026 yg udah dikerjain: bayar nelayan dua termin, harga cong per kg, titipan tanpa transit minimal 10 hari. */

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
      "Paling atas ada daftar \"Perlu tindakan Anda\" (tulisannya emang begitu di layar). Isinya semua yang nunggu keputusan: pembelian yang belum disetujui, biaya, koreksi stok, produksi yang nunggu, ikan yang belum dicek mutunya, tagihan yang telat, dan izin karyawan. Satu urusan satu baris.",
      "Ketuk barisnya, owner langsung dibawa ke urusan itu. Kalo pembelian, kartunya udah langsung disorot di antrean persetujuan.",
      "Di bawahnya ada kas bulan ini, piutang, utang ke pemasok, stok sendiri dan titipan, isi tiap ruangan gudang dingin, arus kas enam bulan, laba rugi proyek terbaru, dan berapa transaksi yang belum ada notanya.",
      "Tiap jabatan cuma lihat yang emang bisa dia kerjain.",
    ],
  },
  {
    slug: "mutu", nama: "Mutu dan Penerimaan", ringkas: "Langkah pertama: ikan datang, ditimbang, digrading, trus diajukan pembeliannya.",
    poin: [
      "Ikan yang datang langsung dicatat jadi lot, gak perlu nunggu PO, tapi wajib masuk proyek. Bisa per ekor (nomor tag, spesies, berat, grade, tusukan gancu) atau berat total plus jumlah ekor. Potongan gancu (bawaan 1 kg per tusukan) gak dibayar.",
      "Grading tuna utuh pake grade AB, C, dan D, dan bisa sekalian waktu terima. Lot per ekor gradingnya ngikut grade tiap ekor. Hasilnya dipake buat ngitung harga ke nelayan. Ikan gugur atau bau ditandai Ditahan, dan gak bisa diolah.",
      "Admin ngajuin pembelian dari lot yang udah digrading, harga per kg tiap grade. Jumlah dan totalnya kehitung sendiri. Satu pengajuan buat satu pemasok di satu proyek, boleh beberapa lot.",
      "Foto timbangan wajib satu tiap kali terima ikan. Lot yang belum ada fotonya ditandai \"Belum ada\", tapi tetep bisa digrading dan diproduksi.",
      "Tiap lot punya tombol Koreksi (pake alasan). Lot per ekor bisa diubah, ditambah, atau dibuang ekornya, dan semuanya kecatat. Lot yang belum digrading tetep boleh langsung diolah.",
      "Kotak Penerimaan hari ini nampilin ekor dan berat yang masuk per nelayan.",
    ],
  },
  {
    slug: "persetujuan", nama: "Persetujuan", ringkas: "Pembelian disetujui di sini, dan kode PO nya terbit di sini juga.",
    poin: [
      "Alurnya: diajukan, diperiksa, trus disetujui. Siapa yang meriksa dan siapa yang menyetujui dipilih admin di menu Akses, dan namanya kelihatan di layar. Awalnya Finance yang meriksa dan owner yang menyetujui. Yang menyetujui boleh langsung mutusin tanpa nunggu diperiksa, tapi gak boleh menyetujui pengajuannya sendiri.",
      "Tiap kartu nampilin rincian per grade, lot asalnya, dan nota. Kalo rata rata harganya naik dibanding pembelian terakhir dari pemasok yang sama, ada peringatannya.",
      "Begitu disetujui, kode PO nya keluar. PO yang dikoreksi setelah disetujui balik lagi ke sini dengan tanda Koreksi.",
      "Pengajuan bisa dibalikin buat diperbaiki atau ditolak. Dua duanya wajib nulis alasan.",
      "Mau setujuin banyak sekaligus? Pilih beberapa kartu. Sistem nampilin daftar, jumlah, dan total nilainya dulu sebelum disetujui.",
    ],
  },
  {
    slug: "pembelian", nama: "Pembelian", ringkas: "PO yang udah terbit, pembayaran ke pemasok, nota, dan koreksinya.",
    poin: [
      "Daftarnya nampilin semua pembelian. Yang masih nunggu persetujuan tulisannya Belum terbit.",
      "Rincian PO nampilin harga per grade, lot asalnya, nota, riwayat persetujuan, dan pembayaran.",
      "Nelayan dibayar 2 termin: 50% dulu, sisanya paling lambat 10 hari kerja. Tombol termin ngisiin jumlah sama catatannya, dan pengingat termin 2 muncul di rincian PO. Sistem nolak kalo bayarnya lebih dari nilai PO, atau PO nya belum disetujui. Pembayaran yang salah bisa dibatalin pake alasan, buku kasnya dapat baris pembalik.",
      "Tombol Koreksi buat benerin harga per grade, pemasok, proyek, atau catatan. Kalo totalnya berubah setelah disetujui, PO balik ke Persetujuan.",
      "Kalo nota belum ada, pembelian tetep bisa diajukan dengan tanda \"Nota menyusul\". Notanya dilampirkan belakangan sama jabatan yang dipilih admin.",
    ],
  },
  {
    slug: "produksi", nama: "Produksi", ringkas: "Nimbang loin, dan selisihnya kelihatan apa adanya.",
    poin: [
      "Mulai produksi diisi proyek, tanggal, PT pemilik ikan, dan lini bisnis: jual (ikan dari lot kita), jasa produksi (ikan dari PT, cukup beratnya), atau titip saja (langsung ke titipan gudang). Hasil jasa produksi masuk stok sebagai milik PT nya. Produksi jual cuma bisa pake lot dari proyeknya sendiri.",
      "Owner bisa nelusurin dua arah: dari lot ke produksinya, atau dari produksi balik ke lot asalnya, lengkap sama jumlah ekor dan grade tuna utuhnya. Tiap produksi punya tombol Koreksi, dan yang udah disetujui bisa dibuka lagi sama owner selama hasilnya belum masuk stok.",
      "Produksi yang udah selesai atau disetujui punya tombol Koreksi timbangan buat loin per grade, hasil samping, limbah, dan susut. Statusnya tetep, wajib alasan, dan kalo udah masuk stok, hasilnya gak boleh kurang dari yang ada di stok.",
      "Berat loin cukup diisi total per grade. Kalo perlu, bisa juga ditimbang per potong lewat tabel timbang. Tabelnya saya samain sama formulir kertas yang biasa dipake: nomor ekor, nomor loin, grade, dan berat sampai tiga angka di belakang koma. Cukup pake keyboard, total per grade dan per ekor kehitung sendiri.",
      "Kalo sinyal putus, catatannya tetep aman di HP dan kekirim sendiri begitu sinyal balik. Dua petugas yang ngedit baris yang sama gak saling nimpa, dan tiap koreksi nyatet angka sebelum dan sesudahnya.",
      "Ada neraca berat: ikan masuk harus sama dengan loin, hasil samping, limbah, dan susut yang ditimbang. Sisanya tampil sebagai \"selisih belum jelas\", dan gak pernah saya isi otomatis. Hasil di luar 40 sampai 80 persen ditandai buat dicek, targetnya 60 persen.",
      "Habis petugas selesai nimbang, QC meriksa, trus owner menyetujui. Yang nimbang gak boleh meriksa produksi yang sama. Formulirnya bisa dicetak, tabelnya bisa diunduh ke Excel.",
      "Tombol Unduh laporan di daftar produksi ngasih Excel berisi ikan masuk, jumlah ekor, grade tuna utuh, loin per grade, yield, hasil samping, limbah, susut, dan selisih.",
    ],
  },
  {
    slug: "stok", nama: "Stok", ringkas: "Tiap kilo jelas punya siapa, kondisinya, dan di mana.",
    poin: [
      "Stok dicatat per pemilik (punya sendiri atau titipan pelanggan), produk, grade, segar atau beku, lokasi, dan proyek asalnya.",
      "Hasil produksi baru masuk stok setelah produksinya disetujui owner. Ikan segar boleh langsung dikirim tanpa masuk gudang.",
      "Stok bisa diambil sebagian atau semuanya, pake berat hasil timbang ulang. Koreksi stok baru berlaku setelah disetujui owner.",
      "Barang penunjang kerja punya catatan sendiri: barang masuk, pemakaian, koreksi, dan batas minimum.",
    ],
  },
  {
    slug: "gudang", nama: "Gudang Dingin", ringkas: "Ruangan, titipan pelanggan, tarif, dan jadwal mesin.",
    poin: [
      "Gudang dicatat per ruangan: ABF 1, ABF 2, ABF 3, dan Cold Storage 1. Isi tiap ruangan kelihatan, dan stok bisa dipindah antarruangan, misalnya dari ABF ke cold storage setelah beku.",
      "Titipan pelanggan dicatat masuk keluarnya. Kapasitas 17.500 kg saya jaga: titipan baru ditolak kalo stok sendiri plus titipan udah lewat batas. Pembagian per ruangan masih sementara, nunggu angka dari owner.",
      "Tarifnya saya simpan di pengaturan, jadi gampang diubah: simpan Rp76 per kg per hari minimum 10 hari, dan ABF Rp3.500 per kg. Gak ada transit, titipan sebentar pun tetep minimal 10 hari, sesuai jawaban tim. Data yang sama selalu ngasilin tagihan yang sama.",
      "Tagihan jasa gudang nampilin cara ngitungnya, jadi pelanggan bisa ngecek sendiri.",
      "Jadwal mesin ABF dan produksi mitra ngasih tahu kalo bentrok, dan bisa dipindah ke jam kosong terdekat.",
    ],
  },
  {
    slug: "penjualan", nama: "Penjualan", ringkas: "Pesanan, pengiriman, tagihan, dan uang masuk.",
    poin: [
      "Pesanan diambil dari stok, dan gak boleh lebih dari stok yang ada setelah dikurangi pesanan lain yang belum dikirim. Satu pesanan boleh dari beberapa produksi. Pilihan stoknya nampilin proyek dan produksi asalnya, dan hasil produksi yang belum masuk stok juga kelihatan.",
      "Pas dikirim, berat kirim diisi dari hasil timbang. Kalo pembeli nimbang ulang, berat versi pembeli juga dicatat, dan tagihannya pake berat itu.",
      "Tagihan jatuh tempo 14 hari. Statusnya jelas: belum jatuh tempo, jatuh tempo, telat, atau lunas. Pembeli boleh bayar sebagian, pake bukti transfer.",
    ],
  },
  {
    slug: "keuangan", nama: "Keuangan", ringkas: "Biaya pake nota, buku kas, dan tutup buku.",
    poin: [
      "Biaya dibagi delapan kategori. Kategori yang wajib nota gak bisa diajukan tanpa nota. Biaya bisa dikaitin ke pembelian, produksi, atau proyek, dan ditolak kalo gak nyambung.",
      "Biaya baru berlaku setelah disetujui owner. Bayar ke pemasok, uang masuk dari pembeli, dan biaya yang disetujui otomatis masuk buku kas.",
      "Buku kas tampil per hari, bisa disaring uang masuk atau keluar, dan bisa diunduh ke Excel.",
      "Tutup buku per bulan, urut dari bulan paling lama, dan cuma bisa setelah bulannya lewat. Bulan yang udah ditutup kekunci, dan cuma owner yang bisa buka lagi, pake alasan.",
      "235 catatan uang keluar dari Monitor Dana yang saya sebut di atas udah ada di buku kas.",
    ],
  },
  {
    slug: "laporan", nama: "Laporan", ringkas: "Laba rugi per proyek, bisa diketuk sampai ke transaksinya.",
    poin: [
      "Laba rugi per proyek saya bikin ngikutin contoh laporan Siklus 1: pendapatan per grade dan hasil samping, biaya langsung, laba kotor, margin, angka per kilo loin, dan harga jual minimal.",
      "Tiap baris bisa diketuk buat lihat transaksi di baliknya. Unduhannya file Excel yang rapi, enak dibaca, bisa dicetak di A4, dan angkanya persis sama dengan di layar. Diagram di Excel masih usulan, belum saya bikin.",
      "Ada juga tren antarproyek, harga beli rata rata per grade, per periode, dan per pemasok, plus simulasi: kalo harga ikan naik atau turun, labanya jadi berapa.",
      "Laba bersih sementara masih tertulis \"belum bisa dihitung\", soalnya saya masih butuh biaya bulanan, penyusutan, dan aturan pajak dari owner.",
    ],
  },
  {
    slug: "siklus", nama: "Rincian Proyek", ringkas: "Satu proyek (batch atau bongkaran) dari beli ikan sampai uang masuk.",
    poin: [
      "Dulu namanya Siklus. Satu proyek itu satu batch atau satu bongkaran, dan isinya boleh beberapa pembelian.",
      "Ada tujuh tahap di satu layar: beli ikan, terima dan cek mutu, produksi, stok, jual dan kirim, tagihan dan uang masuk, biaya lain. Semuanya ditarik dari catatan yang sama, jadi gak ada yang diketik ulang.",
      "Owner bisa nutup proyek yang udah beres. Sistem nolak kalo masih ada pembelian yang belum diputusin atau belum lunas, produksi yang belum disetujui, pesanan yang belum dikirim, tagihan yang belum lunas, atau biaya yang belum diputusin. Proyek yang udah ditutup gak bisa nerima transaksi baru sampai owner buka lagi, pake alasan.",
    ],
  },
  {
    slug: "asisten", nama: "Asisten AI", ringkas: "Tanya pake kalimat biasa. Asistennya cuma bisa baca.",
    poin: [
      "Bisa ditanya soal tagihan telat, saldo kas, hasil per ekor, jadwal yang bentrok, urusan yang nunggu keputusan, isi gudang dingin, transaksi tanpa nota, dan biaya serta laba satu proyek.",
      "Jawabannya gak pernah lebih dari yang boleh dilihat si penanya. Asisten gak bisa ngubah data apa pun, dan jumlah pertanyaan per hari ada batasnya.",
      "Jawabannya saya bikin singkat, pake tabel atau paragraf pendek.",
      "Ada laporan harian, mingguan, dan bulanan. Bisa dicetak, disimpan jadi PDF, atau diunduh ke Excel.",
    ],
  },
  {
    slug: "absensi", nama: "Absensi", ringkas: "Lokasi dari GPS, foto langsung dari kamera, jam dari sistem.",
    poin: [
      "Karyawan absen masuk dan pulang dari HP, pake GPS dan foto yang diambil langsung (gak bisa dari galeri). Jarak ke lokasi kerja dihitung sendiri sama sistem.",
      "Absen ditolak kalo di luar radius atau GPS nya kurang akurat, lengkap dengan alasannya, dan percobaan yang ditolak tetep kecatat. Sehari satu absen masuk dan satu absen pulang.",
      "Izin, sakit, dan libur diajukan dari HP, owner yang mutusin. Super Admin dan owner bisa lihat rekap bulanan (hadir, telat, izin, sakit, gak hadir) dan foto absen harian.",
      "Jam kerjanya Senin sampai Jumat 08.00 sampai 17.00, Sabtu 08.00 sampai 12.00. Pulang lebih awal tetep bisa, dan menitnya dicatat. Hari Minggu gak dihitung telat atau pulang awal.",
      "Super Admin nandain lokasi kerja pake tombol \"lokasi saya sekarang\", trus ngatur radius, batas akurasi, jam kerja hari biasa dan Sabtu, dan toleransi telat.",
    ],
  },
  {
    slug: "akses", nama: "Akses", ringkas: "Satu akun per jabatan, dibikin lewat tautan undangan.",
    poin: [
      "Super Admin bikin akun pake nama, email (buat masuk), dan jabatan. Satu jabatan cuma buat satu akun aktif, jadi jabatan yang udah ada orangnya gak muncul lagi di pilihan.",
      "Sistem bikin tautan undangan sekali pake yang berlaku 24 jam, tinggal kirim lewat WhatsApp. Begitu diklik, penerimanya langsung bikin kata sandi. Tautannya baru kepakai pas kata sandi disimpan, jadi pratinjau WhatsApp gak bikin tautannya hangus.",
      "Lupa kata sandi? Tinggal bikin tautan baru. Email masuk bisa diganti, dan jabatan seseorang bisa dilepas (akunnya otomatis nonaktif, bisa diaktifin lagi). Akun orang yang keluar dinonaktifin, gak dihapus. Akun Owner cuma bisa dibikin dan diatur sama Owner.",
      "Di bagian Tugas per peran, admin milih jabatan yang boleh menyetujui pembelian, meriksa, dan nambahin nota susulan. Tugas buat jabatan admin sendiri cuma bisa diubah owner.",
      "Tiap akun punya kata sandi sendiri. Kode kedua (MFA) sempat dipasang trus dicabut atas keputusan developer, jadi kata sandi yang kuat satu satunya pengaman akun. Daftar sendiri tanpa undangan saya tutup.",
    ],
  },
  {
    slug: "pengaturan", nama: "Pengaturan", ringkas: "Data master, target hasil, dan lampiran wajib.",
    poin: [
      "Admin nentuin lampiran mana yang wajib dan mana yang opsional: nota pembelian, foto timbangan, bukti transfer, dan lainnya.",
      "Isinya daftar pemasok, pembeli, produk, grade (tiap grade dipilih buat tuna utuh atau loin), jenis hasil samping, dan kategori biaya. Datanya gak dihapus, cuma dinonaktifin.",
      "Target hasil olahan 60 persen, batas wajar 40 sampai 80 persen, dan potongan gancu per tusukan (bawaan 1 kg) bisa diubah di sini.",
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
  { menu: "Barang Penunjang", ada: SEMUA },
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
  { peran: "Petugas Lapangan", isi: "Nerima dan nimbang ikan, ngisi timbangan loin dan hasil samping, nyatet pengiriman dan titipan. Gak lihat harga." },
] as const;

/* ------------------------------------------------------------ keamanan */
export const KUALITAS = [
  { judul: "Data gak bisa dihapus", isi: "Gak ada tombol hapus di mana pun. Yang salah dibatalin atau dikoreksi pake alasan, dan tiap perubahan nyatet siapa, kapan, sama angka sebelum dan sesudahnya. Jadi riwayatnya selalu utuh." },
  { judul: "Aturannya dijaga sampai ke database", isi: "Aturan kayak setuju, kirim, bayar, dan tutup buku saya pasang sampai ke database. Jadi kalaupun ada yang nyoba lewat jalan lain, tetep ditolak." },
  { judul: "Akses berlapis", isi: "Izin dicek di halaman, di tiap tombol, dan di database. Nota dan foto absen disimpan di tempat tertutup, cuma bisa dibuka lewat tautan yang hangus dalam 60 detik. Percobaan masuk juga dibatasi, jadi kata sandi gak bisa ditebak tebak." },
  { judul: "Angkanya gak geser", isi: "Berat dihitung sampai tiga angka di belakang koma dan uang sampai dua angka, tanpa dibulatin diam diam. Saya udah uji pake 500 potong loin: total di layar, rekap per grade dan per ekor, neraca, dan file unduhannya hasilnya sama persis." },
  { judul: "Satu putaran penuh udah diuji", isi: "Saya jalanin pembelian sampai uang masuk pake kelima jabatan, trus nyocokin angka di neraca, stok, tagihan, rincian proyek, laba rugi, dashboard, dan buku kas. Perubahan saldo kas harus sama dengan laba kotor." },
  { judul: "Dicek otomatis tiap ada perubahan", isi: "Tiap kali sistem saya ubah, pemeriksaan otomatis jalan di laptop dan HP sebelum perubahannya dipake. Pemeriksaan lengkap 26 Oktober lulus semua. Pembaruan 19 November juga lulus semua: 738 pemeriksaan aturan database dan 125 pemeriksaan logika." },
  { judul: "Cadangan tiap hari", isi: "Database dicadangin tiap malam dan dienkripsi. Udah empat kali berhasil, tiga di antaranya otomatis terjadwal. Yang belum saya lakuin: nyoba mulihin cadangan ke tempat kosong (ada di bagian yang masih tersisa)." },
] as const;

/* ------------------------------------------------------------- udah hidup */
export const LIVE = [
  "Sistemnya udah bisa dibuka di internet dan nyambung ke database. Yang belum masuk diarahin ke halaman login.",
  "Semua fitur udah terpasang, termasuk absensi dan perbaikan dari hasil pemeriksaan saya ke rancangan.",
  "235 catatan uang keluar dari Monitor Dana udah ada di buku kas.",
  "Satu lokasi kerja absensi udah saya tandai, yaitu Cold Storage Bungus. Titiknya saya samain sama pin kantor di Google Maps.",
  "Akun owner udah ada. Akun jabatan lain kita bikin bareng pas serah terima, lewat menu Akses.",
] as const;

/* ------------------------------------------------------------ yang tersisa */
export const BELUM = [
  { judul: "Dicoba di sistem yang udah jalan", isi: "Pembaruan 19 November udah lulus pemeriksaan otomatis, termasuk 738 pemeriksaan aturan database. Saya juga udah coba satu putaran sendiri: terima ikan per ekor sekalian grading, koreksi ekor, ajukan, setujui, bayar, produksi jual, jasa, titip, sama koreksi timbangan produksi yang udah disetujui. Yang belum: dicoba tim di sistem yang udah dipake." },
  { judul: "Jawaban lanjutan tim Katalis", isi: "Soal produksi dari dua bongkaran sama biaya pembekuan barang yg udah beku, usulannya ada di bagian atas. Tim tinggal jawab pertanyaannya." },
  { judul: "Meeting UX bareng Mas Bisma", isi: "Format Excel produksi dan finance, alur QC yang lebih detail, dan maksud input per proyek mau dibahas bareng di meeting tambahan. Biar gak nebak, saya nunggu contoh file dan alurnya dari tim dulu." },
  { judul: "Video panduan", isi: "Teks dan gambar panduan udah ngikutin alur baru. Video buat penerimaan, pembelian, dan mulai produksi masih tampilan lama, nanti saya rekam ulang." },
  { judul: "Absen GPS dicoba di kantor", isi: "Titik kantor dari Google Maps udah kepasang di sistem. Tapi baru bisa dibilang beres kalo udah dicoba dari HP di kantor, soalnya pin di peta bisa agak beda sama tempat orang berdiri pas absen." },
  { judul: "Urutan menu lengkap", isi: "Menu Operasi udah ngikut alur: Mutu dan Penerimaan, Persetujuan, Pembelian, trus Produksi. Menu lainnya nunggu daftar lengkap dari tim pengguna." },
  { judul: "Efek satu akun per jabatan", isi: "Semua petugas lapangan pake satu akun yang sama. Jadi absen masuk dan pulang cuma kecatat sekali sehari buat semuanya, dan catatan perubahan cuma nunjukin jabatannya, orangnya gak kelihatan." },
  { judul: "Dicoba orang di lapangan", isi: "Timbangan di HP pas sinyal jelek, sama absen pake kamera dan GPS di lokasi, baru saya uji pake perangkat tiruan. Belum dicoba di HP petugas yang asli, dan ini yang paling pengin saya coba duluan." },
  { judul: "Satu proyek asli dibandingin sama kertas", isi: "Angka loin, neraca, tagihan, dan kas belum saya cocokin sama catatan kertas. Ini syarat serah terima akhir." },
  { judul: "Bahan dari owner", isi: "Saya butuh data master yang asli, foto formulir timbang Siklus 1 per potong loin buat saya masukin, catatan susut, plus biaya bulanan dan aturan pajak biar laba bersih bisa dihitung. Daftar barang penunjang yang asli juga saya perlu, soalnya stok awalnya sekarang masih contoh." },
  { judul: "Keputusan dari owner", isi: "Tolong dikonfirmasi: kapasitas tiap ruangan gudang, cara nyatet setoran modal investor di dashboard, dan foto absen disimpan berapa lama." },
  { judul: "Uji mulihin cadangan", isi: "Cadangannya udah ada, tapi belum saya buktiin bisa dipulihin. Buat nyobanya saya butuh satu database kosong." },
  { judul: "Ngamanin akun pas serah terima", isi: "Bikin akun semua jabatan dan ganti kata sandi awal kita beresin bareng owner." },
  { judul: "Batas paket gratis", isi: "Hosting dan database pake paket gratis, sesuai keputusan owner. Hosting gratis aturannya buat pemakaian non komersial, dan database yang sepi tujuh hari bisa dijeda. Risikonya udah diterima owner dan udah dicatat." },
] as const;

export const BERIKUTNYA = [
  { tahap: "Tahap 1", judul: "Mulai dipake bareng kertas", isi: "Ganti kata sandi awal, bikin akun tiap jabatan, isi data master, konfirmasi tarif, simpan frasa sandi cadangan di dua orang, trus saya kasih latihan singkat buat tiap jabatan." },
  { tahap: "Tahap 2", judul: "Serah terima akhir", isi: "Satu proyek asli kita catat bareng kertas trus dicocokin, absensi dicoba di lokasi, pemulihan cadangan saya uji, dan apa pun yang ketemu saya perbaiki." },
] as const;
