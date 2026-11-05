import type { Metadata, Viewport } from "next";
import Image from "next/image";
import "./flowchart.css";

export const metadata: Metadata = {
  title: "KATALIS ERP | Penyesuaian Flowchart",
  description: "Perbedaan flowchart dengan sistem KATALIS ERP sekarang dan empat hal yang perlu diputuskan, dalam bahasa sederhana.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00171F" };

const JALUR = [
  { nama: "Jalur 1", isi: "Ikan yang kita beli" },
  { nama: "Jalur 2", isi: "Mengolah ikan milik orang lain (jasa olah)" },
  { nama: "Jalur 3", isi: "Menyimpan barang milik orang lain (jasa simpan)" },
];

const KEPUTUSAN = [
  {
    tanya: "Apakah flowchart ini menggantikan tahap yang sudah ada, atau hanya menambah?",
    alasan: "Sistem sekarang punya empat tahap: membuat surat pesanan (PO), menyetujui pesanan, cek mutu ikan, dan memeriksa hasil olahan. Keempatnya tidak ada di flowchart, jadi belum jelas apakah tetap dipakai.",
    label: "Saran kami",
    jawab: "Menambah. Harga dan mutu ikan tetap dicek seperti sekarang, lalu catatan ikan yang tiba disambungkan ke tahap-tahap itu.",
  },
  {
    tanya: "Apakah daging ikan (loin) masih perlu ditimbang satu per satu?",
    alasan: "Flowchart hanya mencatat berat total per kelas mutu. Kalau penimbangan satu per satu dihapus, kita tidak bisa lagi melihat hasil dari tiap ekor ikan, dan formulir produksi FRM-PRD-01 tidak bisa terisi seperti sekarang.",
    label: "Saran kami",
    jawab: "Tetap disediakan sebagai pilihan, tetapi yang biasa dipakai cukup mengisi totalnya.",
  },
  {
    tanya: "Apakah cara menghitung biaya gudang yang lama diganti?",
    alasan: "Sekarang barang yang disimpan lebih dari sehari ditagih minimal 10 hari, barang yang disimpan sampai 3 jam memakai tarif transit, dan pembekuan kena biaya Rp3.500/kg. Aturan ini tidak ada di flowchart. Flowchart juga belum menentukan apakah hari masuk dan hari keluar dihitung penuh. Sekarang lama simpan dibulatkan ke atas per 24 jam. Semua ini mengubah besar tagihan.",
    label: "Yang kami perlukan",
    jawab: "Aturan biaya yang sudah pasti, termasuk cara menghitung hari masuk dan hari keluar.",
  },
  {
    tanya: "Apakah jasa olah dan cetak dokumen masuk ke sistem versi pertama?",
    alasan: "Dokumen kesepakatan sistem (PRD) versi pertama belum memuat jasa olah, nota nelayan, tanda terima barang titipan, dan tagihan jasa olah. Menurut dokumen itu, fitur tambahan masuk masa garansi atau permintaan perubahan.",
    label: "Yang kami perlukan",
    jawab: "Kesepakatan tentang apa saja yang masuk, sebelum jadwal disusun.",
  },
];

const ALUR = [
  {
    nama: "1. Penerimaan ikan", hal: "halaman 1",
    flowchart: "Dicatat setelah semua ikan yang tiba selesai ditimbang. Berat dicatat per ekor.",
    sekarang: "Harus ada surat pesanan (PO) dulu. Saat ikan tiba, hanya dicatat satu berat total.",
    dibuat: "Catatan ikan yang tiba dan berat per ekor, jumlah tiap lembar timbang, potongan 1 kg untuk tiap luka gancu, harga per kelas mutu atau satu harga rata, tanggal jatuh tempo bayar nelayan, dan cetak nota.",
  },
  {
    nama: "2. Pengolahan ikan", hal: "halaman 2",
    flowchart: "Cukup mengisi total berat per kelas mutu, untuk tiap kedatangan dan giliran kerja. Kedatangan ditutup setelah semua ikannya selesai diolah.",
    sekarang: "Tiap potong daging ditimbang, lalu diperiksa bagian mutu (QC) dan Owner sebelum masuk stok.",
    dibuat: "Giliran kerja, nama pengawas, buka dan tutup kedatangan, pencocokan dengan total lembar timbang, dan tujuan hasil sampingan (dibekukan, didinginkan, dijual, atau dibuang).",
  },
  {
    nama: "3. Tagihan mengolah ikan orang lain", hal: "halaman 3",
    flowchart: "Biaya per kg berbeda untuk tiap kelompok hasil, ditagih per kedatangan.",
    sekarang: "Belum ada. Sistem hanya bisa menagih penjualan dan penyimpanan gudang.",
    dibuat: "Fitur baru: catatan ikan milik orang lain, tagihan per kelompok hasil, dan cetak tagihan.",
  },
  {
    nama: "4. Penyimpanan barang orang lain", hal: "halaman 4",
    flowchart: "Ditagih per periode. Biaya bisa dihitung per kg per hari, per palet per bulan, atau cara lain.",
    sekarang: "Ditagih saat barang diambil, dihitung per kg per hari.",
    dibuat: "Tagihan per periode, pilihan cara hitung biaya, catatan jumlah, satuan, suhu, kemasan, kendaraan, dan pengemudi, serta cetak tanda terima.",
  },
  {
    nama: "5. Barang pendukung", hal: "halaman 5",
    flowchart: "Stok kemasan dan perlengkapan kerja diketahui dari hitung langsung di gudang. Jumlah yang terpakai dihitung otomatis.",
    sekarang: "Stok dihitung dari catatan barang masuk, keluar, dan koreksi.",
    dibuat: "Formulir hitung stok yang membedakan \"belum dihitung\" (dikosongkan) dan \"habis\" (diisi 0).",
  },
];

const BENTROK = [
  { aturan: "Surat pesanan dan notanya disetujui dulu sebelum ikan diterima (kecuali bongkar malam)", flowchart: "Tidak ada persetujuan. Harga diisi saat ikan diterima.", keputusan: "No. 1" },
  { aturan: "Ikan yang ditahan saat cek mutu tidak boleh diolah", flowchart: "Tidak ada cek mutu.", keputusan: "No. 1" },
  { aturan: "Hasil olahan baru masuk stok setelah diperiksa QC dan Owner", flowchart: "Hasil olahan langsung tercatat saat rekap disimpan.", keputusan: "No. 1" },
  { aturan: "Daging ikan ditimbang per potong", flowchart: "Cukup total per kelas mutu dari lembar timbang.", keputusan: "No. 2" },
  { aturan: "Minimal ditagih 10 hari, tarif transit sampai 3 jam, biaya pembekuan ditagih terpisah", flowchart: "Tidak disebut.", keputusan: "No. 3" },
  { aturan: "Limbah cukup ditimbang totalnya (keputusan owner)", flowchart: "Sisa dipisah per jenis, dan dicatat ke mana perginya.", keputusan: "Perlu dipastikan" },
];

const CONTOH = [
  {
    judul: "Kalau \"hasil lain\" sudah termasuk sisa yang ditimbang",
    baris: [["Ikan diterima", "1.000 kg"], ["Hasil lain", "1.050 kg"], ["Sisa tidak ditimbang", "−50 kg"], ["Total ditagih", "1.000 kg"]],
    selisih: "0 kg",
    simpul: "Selalu dianggap benar, walaupun hasilnya lebih banyak dari ikan yang masuk.",
  },
  {
    judul: "Kalau \"hasil lain\" belum termasuk sisa yang ditimbang",
    baris: [["Ikan diterima", "1.000 kg"], ["Hasil lain + sisa ditimbang", "700 + 200 kg"], ["Sisa tidak ditimbang", "300 kg"], ["Total ditagih", "1.200 kg"]],
    selisih: "−200 kg",
    simpul: "Selalu dianggap salah setiap kali ada sisa yang ditimbang.",
  },
];

const ISTILAH = [
  ["Flowchart", "Gambar alur kerja, langkah demi langkah"],
  ["PO (surat pesanan)", "Catatan pesanan ikan: dari siapa, berapa kg, dan harganya"],
  ["Loin", "Potongan daging tuna hasil olahan"],
  ["Kelas mutu (grade)", "Tingkat mutu ikan atau daging, misalnya A, B, C"],
  ["QC", "Bagian yang memeriksa mutu"],
  ["Lembar timbang (Tally)", "Catatan kertas petugas yang menimbang ikan di lantai"],
  ["Gancu", "Alat pengait ikan. Tiap lukanya memotong berat yang dibayar 1 kg"],
  ["Cong", "Satu harga rata untuk semua ikan, tanpa kelas mutu"],
  ["Giliran kerja (shift)", "Pembagian jam kerja, misalnya pagi dan malam"],
  ["Rekap", "Ringkasan total hasil kerja"],
  ["Hasil sampingan", "Bagian ikan selain loin, seperti toro, rahang, dan tetelan"],
  ["ABF", "Ruang pembeku cepat"],
  ["Transit", "Barang yang hanya singgah sebentar di gudang"],
  ["PRD", "Dokumen kesepakatan tentang isi sistem"],
];

export default function FlowchartPage() {
  return (
    <div className="flowchart">
      <header className="f-bar">
        <a className="f-merek" href="#atas"><Image src="/brand/katalis-mark-dark.png" alt="" width={28} height={28} priority />KATALIS ERP<span>Penyesuaian flowchart</span></a>
        <a className="f-masuk" href="/dashboard">Buka aplikasi</a>
      </header>

      <main id="atas" className="f-isi">
        <section className="f-bagian" aria-labelledby="judul">
          <p className="f-sumber">Berdasarkan flowchart_v1.pdf · 5 November 2026</p>
          <h1 id="judul">Apa yang perlu disesuaikan di sistem</h1>
          <p className="f-pengantar">Tim Katalis mengirim flowchart, yaitu gambar alur kerja yang diinginkan. Laporan ini membandingkannya dengan sistem yang berjalan sekarang.</p>
          <p className="f-pengantar">Sekarang pencatatan dimulai dari surat pesanan, dan daging ikan ditimbang satu per satu. Di flowchart, pencatatan dimulai saat ikan tiba, dan daging ikan cukup dicatat totalnya. Layanan mengolah ikan milik orang lain juga belum ada di sistem. Sebelum dikerjakan, ada empat hal yang perlu diputuskan.</p>
          <ul className="f-jalur" aria-label="Tiga jenis kegiatan usaha dalam flowchart">
            {JALUR.map((j) => <li key={j.nama}><b>{j.nama}</b><span>{j.isi}</span></li>)}
          </ul>
        </section>

        <section className="f-bagian" aria-labelledby="h-keputusan">
          <h2 id="h-keputusan">Empat hal yang perlu diputuskan tim Katalis</h2>
          <ol className="f-keputusan">
            {KEPUTUSAN.map((k) => (
              <li key={k.tanya}>
                <h3>{k.tanya}</h3>
                <p>{k.alasan}</p>
                <p className="f-saran"><b>{k.label}:</b> {k.jawab}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="f-bagian" aria-labelledby="h-alur">
          <h2 id="h-alur">Perbedaan di tiap bagian kerja</h2>
          <div className="f-tabel" tabIndex={0} role="region" aria-labelledby="h-alur">
            <table>
              <thead><tr><th scope="col">Bagian kerja</th><th scope="col">Menurut flowchart</th><th scope="col">Di sistem sekarang</th><th scope="col">Yang perlu ditambah</th></tr></thead>
              <tbody>
                {ALUR.map((a) => (
                  <tr key={a.nama}>
                    <th scope="row">{a.nama} <span className="f-hal">{a.hal}</span></th>
                    <td>{a.flowchart}</td>
                    <td>{a.sekarang}</td>
                    <td>{a.dibuat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="f-catatan">Daftar pilihan di sistem juga perlu ditambah: kelas ikan AB, C, dan cong, jenis loin CO dan natural, serta jenis sisa seperti kepala, tulang, ekor, kulit, dan sirip.</p>
        </section>

        <section className="f-bagian" aria-labelledby="h-bentrok">
          <h2 id="h-bentrok">Aturan sekarang yang berbeda dengan flowchart</h2>
          <div className="f-tabel" tabIndex={0} role="region" aria-labelledby="h-bentrok">
            <table>
              <thead><tr><th scope="col">Aturan sekarang</th><th scope="col">Di flowchart</th><th scope="col">Lihat keputusan</th></tr></thead>
              <tbody>
                {BENTROK.map((b) => (
                  <tr key={b.aturan}>
                    <th scope="row">{b.aturan}</th>
                    <td>{b.flowchart}</td>
                    <td><span className="f-tanda">{b.keputusan}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="f-bagian" aria-labelledby="h-koreksi">
          <h2 id="h-koreksi">Bagian flowchart yang perlu diperbaiki</h2>
          <div className="f-koreksi">
            <article>
              <h3>Halaman 3: pengecekan selisih berat tidak bisa berjalan</h3>
              <p>Rumusnya menghitung sisa yang tidak ditimbang dari berat ikan diterima dikurangi hasil lain. Totalnya lalu dibandingkan lagi dengan berat ikan diterima, padahal angka itu sudah dipakai untuk menghitungnya. Ada dua kemungkinan arti &quot;hasil lain&quot;, dan keduanya bermasalah. Angka di bawah hanya contoh.</p>
              <div className="f-contoh">
                {CONTOH.map((c) => (
                  <figure key={c.judul}>
                    <figcaption>{c.judul}</figcaption>
                    <dl>
                      {c.baris.map(([label, nilai]) => <div key={label}><dt>{label}</dt><dd>{nilai}</dd></div>)}
                      <div className="f-akhir"><dt>Selisih</dt><dd>{c.selisih}</dd></div>
                    </dl>
                    <p className="f-simpul">{c.simpul}</p>
                  </figure>
                ))}
              </div>
            </article>
            <article>
              <h3>Halaman 5: rumus memakai &quot;saldo kemarin&quot;</h3>
              <p>Awal alur mengambil hasil hitungan terakhir, tetapi rumusnya memakai saldo kemarin. Kalau barang tidak dihitung setiap hari, jumlah yang terpakai jadi salah. Sebaiknya rumus memakai hasil hitungan terakhir.</p>
            </article>
            <article>
              <h3>Halaman 4: hari masuk dan hari keluar belum ditentukan</h3>
              <p>Flowchart sendiri sudah menandai ini sebagai hal yang perlu diputuskan. Jawabannya masuk ke keputusan nomor 3.</p>
            </article>
          </div>
        </section>

        <section className="f-bagian" aria-labelledby="h-istilah">
          <h2 id="h-istilah">Arti istilah</h2>
          <dl className="f-istilah">
            {ISTILAH.map(([nama, arti]) => <div key={nama}><dt>{nama}</dt><dd>{arti}</dd></div>)}
          </dl>
        </section>

        <section className="f-bagian" aria-labelledby="h-dasar">
          <h2 id="h-dasar">Cara laporan ini dibuat</h2>
          <ul className="f-dasar">
            <li>Flowchart dibaca dari tulisan di file PDF. Arah panahnya kami simpulkan dari tulisan dan urutannya, jadi mohon dikoreksi kalau ada yang keliru.</li>
            <li>Sistem dicocokkan dengan catatan teknisnya: database, formulir, dan PRD. Alurnya tidak dicoba langsung di aplikasi untuk laporan ini.</li>
            <li>Belum ada alur kerja di sistem yang diubah. Urutan pengerjaan dan rencana untuk data yang sudah ada disusun setelah keempat hal di atas diputuskan.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
