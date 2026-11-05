import type { Metadata, Viewport } from "next";
import Image from "next/image";
import "./flowchart.css";

export const metadata: Metadata = {
  title: "KATALIS ERP | Penyesuaian Flowchart",
  description: "Bedanya flowchart sama sistem KATALIS ERP yang jalan sekarang, plus empat hal yang perlu diputusin.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00171F" };

const JALUR = [
  { nama: "Jalur 1", isi: "Ikan yang kita beli" },
  { nama: "Jalur 2", isi: "Ngolah ikan punya orang lain (jasa olah)" },
  { nama: "Jalur 3", isi: "Nyimpen barang punya orang lain (jasa simpan)" },
];

const KEPUTUSAN = [
  {
    tanya: "Flowchart ini gantiin tahap yang udah ada, atau cuma nambahin?",
    alasan: "Sistem sekarang punya empat tahap: bikin surat pesanan (PO), nyetujuin pesanan, cek mutu ikan, dan meriksa hasil olahan. Keempatnya nggak ada di flowchart, jadi belum jelas masih dipakai atau nggak.",
    label: "Saran developer",
    jawab: "Nambahin aja. Harga dan mutu ikan tetap dicek kayak sekarang, terus catatan ikan yang tiba disambungin ke tahap-tahap itu.",
  },
  {
    tanya: "Daging ikan (loin) masih perlu ditimbang satu-satu?",
    alasan: "Flowchart cuma nyatet berat total per kelas mutu. Kalau timbang satu-satu dihapus, kita nggak bisa lagi lihat hasil dari tiap ekor ikan, dan formulir produksi FRM-PRD-01 nggak bisa keisi kayak sekarang.",
    label: "Saran developer",
    jawab: "Tetap ada sebagai pilihan, tapi sehari-harinya cukup isi totalnya aja.",
  },
  {
    tanya: "Cara ngitung biaya gudang yang lama mau diganti?",
    alasan: "Sekarang barang yang disimpan lebih dari sehari ditagih minimal 10 hari, barang yang disimpan sampai 3 jam pakai tarif transit, dan pembekuan kena biaya Rp3.500/kg. Aturan ini nggak ada di flowchart. Flowchart juga belum nentuin hari masuk dan hari keluar dihitung penuh atau nggak. Sekarang lama simpan dibulatin ke atas per 24 jam. Semua ini ngaruh ke besar tagihan.",
    label: "Yang kita butuhin",
    jawab: "Aturan biaya yang udah pasti, termasuk cara ngitung hari masuk dan hari keluar.",
  },
  {
    tanya: "Jasa olah dan cetak dokumen masuk ke sistem versi pertama?",
    alasan: "Dokumen kesepakatan sistem (PRD) versi pertama belum mencakup jasa olah, nota nelayan, tanda terima barang titipan, dan tagihan jasa olah. Menurut dokumen itu, fitur tambahan masuk masa garansi atau permintaan perubahan.",
    label: "Yang kita butuhin",
    jawab: "Kesepakatan apa aja yang masuk, sebelum jadwalnya disusun.",
  },
];

const ALUR = [
  {
    nama: "1. Penerimaan ikan", hal: "halaman 1",
    flowchart: "Dicatat setelah semua ikan yang tiba selesai ditimbang. Beratnya dicatat per ekor.",
    sekarang: "Harus ada surat pesanan (PO) dulu. Pas ikan tiba, cuma dicatat satu berat total.",
    dibuat: "Catatan ikan yang tiba dan berat per ekor, jumlah tiap lembar timbang, potongan 1 kg buat tiap luka gancu, harga per kelas mutu atau satu harga rata, tanggal jatuh tempo bayar nelayan, dan cetak nota.",
  },
  {
    nama: "2. Pengolahan ikan", hal: "halaman 2",
    flowchart: "Cukup isi total berat per kelas mutu, buat tiap kedatangan dan giliran kerja. Kedatangan ditutup setelah semua ikannya kelar diolah.",
    sekarang: "Tiap potong daging ditimbang, terus diperiksa bagian mutu (QC) dan Owner sebelum masuk stok.",
    dibuat: "Giliran kerja, nama pengawas, buka dan tutup kedatangan, pencocokan sama total lembar timbang, dan tujuan hasil sampingan (dibekukan, didinginkan, dijual, atau dibuang).",
  },
  {
    nama: "3. Tagihan ngolah ikan orang lain", hal: "halaman 3",
    flowchart: "Biaya per kg beda-beda buat tiap kelompok hasil, ditagih per kedatangan.",
    sekarang: "Belum ada. Sistem baru bisa nagih penjualan dan penyimpanan gudang.",
    dibuat: "Fitur baru: catatan ikan punya orang lain, tagihan per kelompok hasil, dan cetak tagihan.",
  },
  {
    nama: "4. Nyimpen barang orang lain", hal: "halaman 4",
    flowchart: "Ditagih per periode. Biayanya bisa dihitung per kg per hari, per palet per bulan, atau cara lain.",
    sekarang: "Ditagih pas barang diambil, dihitung per kg per hari.",
    dibuat: "Tagihan per periode, pilihan cara hitung biaya, catatan jumlah, satuan, suhu, kemasan, kendaraan, dan pengemudi, plus cetak tanda terima.",
  },
  {
    nama: "5. Barang pendukung", hal: "halaman 5",
    flowchart: "Stok kemasan dan perlengkapan kerja ketahuan dari hitung langsung di gudang. Jumlah yang kepakai dihitung otomatis.",
    sekarang: "Stok dihitung dari catatan barang masuk, keluar, dan koreksi.",
    dibuat: "Formulir hitung stok yang bedain \"belum dihitung\" (dikosongin) sama \"habis\" (diisi 0).",
  },
];

const BENTROK = [
  { aturan: "Surat pesanan dan notanya disetujui dulu sebelum ikan diterima (kecuali bongkar malam)", flowchart: "Nggak ada persetujuan. Harga diisi pas ikan diterima.", keputusan: "No. 1" },
  { aturan: "Ikan yang ditahan pas cek mutu nggak boleh diolah", flowchart: "Nggak ada cek mutu.", keputusan: "No. 1" },
  { aturan: "Hasil olahan baru masuk stok setelah diperiksa QC dan Owner", flowchart: "Hasil olahan langsung kecatat pas rekap disimpan.", keputusan: "No. 1" },
  { aturan: "Daging ikan ditimbang per potong", flowchart: "Cukup total per kelas mutu dari lembar timbang.", keputusan: "No. 2" },
  { aturan: "Minimal ditagih 10 hari, tarif transit sampai 3 jam, biaya pembekuan ditagih terpisah", flowchart: "Nggak disebut.", keputusan: "No. 3" },
  { aturan: "Limbah cukup ditimbang totalnya (keputusan owner)", flowchart: "Sisa dipisah per jenis, dan dicatat ke mana perginya.", keputusan: "Perlu dipastiin" },
];

const CONTOH = [
  {
    judul: "Kalau \"hasil lain\" udah termasuk sisa yang ditimbang",
    baris: [["Ikan diterima", "1.000 kg"], ["Hasil lain", "1.050 kg"], ["Sisa nggak ditimbang", "−50 kg"], ["Total ditagih", "1.000 kg"]],
    selisih: "0 kg",
    simpul: "Selalu dianggap bener, walaupun hasilnya lebih banyak dari ikan yang masuk.",
  },
  {
    judul: "Kalau \"hasil lain\" belum termasuk sisa yang ditimbang",
    baris: [["Ikan diterima", "1.000 kg"], ["Hasil lain + sisa ditimbang", "700 + 200 kg"], ["Sisa nggak ditimbang", "300 kg"], ["Total ditagih", "1.200 kg"]],
    selisih: "−200 kg",
    simpul: "Selalu dianggap salah tiap kali ada sisa yang ditimbang.",
  },
];

const ISTILAH = [
  ["Flowchart", "Gambar alur kerja, langkah demi langkah"],
  ["PO (surat pesanan)", "Catatan pesanan ikan: dari siapa, berapa kg, dan harganya"],
  ["Loin", "Potongan daging tuna hasil olahan"],
  ["Kelas mutu (grade)", "Tingkat mutu ikan atau daging, misalnya A, B, C"],
  ["QC", "Bagian yang meriksa mutu"],
  ["Lembar timbang (Tally)", "Catatan kertas petugas yang nimbang ikan di lantai"],
  ["Gancu", "Alat pengait ikan. Tiap lukanya motong berat yang dibayar 1 kg"],
  ["Cong", "Satu harga rata buat semua ikan, tanpa kelas mutu"],
  ["Giliran kerja (shift)", "Pembagian jam kerja, misalnya pagi dan malam"],
  ["Rekap", "Ringkasan total hasil kerja"],
  ["Hasil sampingan", "Bagian ikan selain loin, kayak toro, rahang, dan tetelan"],
  ["ABF", "Ruang pembeku cepat"],
  ["Transit", "Barang yang cuma mampir sebentar di gudang"],
  ["PRD", "Dokumen kesepakatan soal isi sistem"],
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
          <p className="f-sumber">Dari flowchart_v1.pdf · 5 November 2026</p>
          <h1 id="judul">Apa aja yang perlu disesuaikan di sistem</h1>
          <p className="f-pengantar">Ini hasil perbandingan flowchart dari tim Katalis dengan sistem yang jalan sekarang.</p>
          <p className="f-pengantar">Sekarang pencatatan mulai dari surat pesanan, dan daging ikan ditimbang satu-satu. Di flowchart, pencatatan mulai pas ikan tiba, dan daging ikan cukup dicatat totalnya. Layanan ngolah ikan punya orang lain juga belum ada di sistem. Sebelum mulai dikerjain, ada empat hal yang perlu diputusin dulu.</p>
          <ul className="f-jalur" aria-label="Tiga jenis kegiatan usaha di flowchart">
            {JALUR.map((j) => <li key={j.nama}><b>{j.nama}</b><span>{j.isi}</span></li>)}
          </ul>
        </section>

        <section className="f-bagian" aria-labelledby="h-keputusan">
          <h2 id="h-keputusan">Empat hal yang perlu diputusin tim Katalis</h2>
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
          <h2 id="h-alur">Bedanya di tiap bagian kerja</h2>
          <div className="f-tabel" tabIndex={0} role="region" aria-labelledby="h-alur">
            <table>
              <thead><tr><th scope="col">Bagian kerja</th><th scope="col">Menurut flowchart</th><th scope="col">Di sistem sekarang</th><th scope="col">Yang perlu ditambah</th></tr></thead>
              <tbody>
                {ALUR.map((a) => (
                  <tr key={a.nama}>
                    <th scope="row">{a.nama} <span className="f-hal">{a.hal}</span></th>
                    <td data-label="Menurut flowchart">{a.flowchart}</td>
                    <td data-label="Di sistem sekarang">{a.sekarang}</td>
                    <td data-label="Yang perlu ditambah">{a.dibuat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="f-catatan">Daftar pilihan di sistem juga perlu ditambah: kelas ikan AB, C, dan cong, jenis loin CO dan natural, plus jenis sisa kayak kepala, tulang, ekor, kulit, dan sirip.</p>
        </section>

        <section className="f-bagian" aria-labelledby="h-bentrok">
          <h2 id="h-bentrok">Aturan sekarang yang beda sama flowchart</h2>
          <div className="f-tabel" tabIndex={0} role="region" aria-labelledby="h-bentrok">
            <table>
              <thead><tr><th scope="col">Aturan sekarang</th><th scope="col">Di flowchart</th><th scope="col">Lihat keputusan</th></tr></thead>
              <tbody>
                {BENTROK.map((b) => (
                  <tr key={b.aturan}>
                    <th scope="row">{b.aturan}</th>
                    <td data-label="Di flowchart">{b.flowchart}</td>
                    <td data-label="Lihat keputusan"><span className="f-tanda">{b.keputusan}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="f-bagian" aria-labelledby="h-koreksi">
          <h2 id="h-koreksi">Bagian flowchart yang perlu dibenerin</h2>
          <div className="f-koreksi">
            <article>
              <h3>Halaman 3: pengecekan selisih berat nggak bisa jalan</h3>
              <p>Rumusnya ngitung sisa yang nggak ditimbang dari berat ikan diterima dikurangi hasil lain. Totalnya terus dibandingin lagi sama berat ikan diterima, padahal angka itu udah dipakai buat ngitungnya. &quot;Hasil lain&quot; bisa punya dua arti, dan dua-duanya bermasalah. Angka di bawah cuma contoh.</p>
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
              <h3>Halaman 5: rumusnya pakai &quot;saldo kemarin&quot;</h3>
              <p>Awal alurnya ngambil hasil hitungan terakhir, tapi rumusnya pakai saldo kemarin. Kalau barangnya nggak dihitung tiap hari, jumlah yang kepakai jadi salah. Mending rumusnya pakai hasil hitungan terakhir.</p>
            </article>
            <article>
              <h3>Halaman 4: hari masuk dan hari keluar belum ditentuin</h3>
              <p>Flowchart-nya sendiri udah nandain ini sebagai hal yang perlu diputusin. Jawabannya masuk ke keputusan nomor 3.</p>
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
          <h2 id="h-dasar">Cara laporan ini dibikin</h2>
          <ul className="f-dasar">
            <li>Flowchart dibaca dari tulisan di file PDF. Arah panahnya kita simpulin dari tulisan dan urutannya, jadi tolong dikoreksi kalau ada yang keliru.</li>
            <li>Sistem dicocokin sama catatan teknisnya: database, formulir, dan PRD. Alurnya nggak dicoba langsung di aplikasi buat laporan ini.</li>
            <li>Belum ada alur kerja di sistem yang diubah. Urutan pengerjaan dan rencana buat data yang udah ada disusun setelah keempat hal di atas diputusin.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
