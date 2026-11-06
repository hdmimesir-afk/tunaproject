import type { Metadata, Viewport } from "next";
import Image from "next/image";
import "./flowchart.css";

export const metadata: Metadata = {
  title: "KATALIS ERP | Penyesuaian Flowchart",
  description: "Status jawaban tim Katalis atas flowchart, plus lima pertanyaan lanjutan dengan saran developer.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00171F" };

const JALUR = [
  { nama: "Jalur 1", isi: "Ikan yang kita beli" },
  { nama: "Jalur 2", isi: "Ngolah ikan punya orang lain (jasa olah)" },
  { nama: "Jalur 3", isi: "Nyimpen barang punya orang lain (jasa simpan)" },
];

const LANJUTAN = [
  {
    tanya: "Kalau ikan dicatat tanpa nunggu PO, siapa yang nyetujuin harga nelayan, dan apa pembayaran tetap nunggu persetujuan?",
    alasan: "Jawaban sebelumnya: kedatangan ikan dan nota nelayan nggak boleh nunggu PO. Padahal sekarang harga disetujui Finance dan Owner dulu sebelum bisa dibayar, jadi kontrol ini perlu tempat baru.",
    saran: "Kedatangan dicatat langsung, lengkap dengan berat, grade, dan harga dari nota nelayan, terus sistem otomatis bikin pengajuan pembelian. Finance meriksa, Owner nyetujuin, dan pembayaran baru bisa dicatat setelah disetujui. Cek mutu dan produksi tetap jalan tanpa nunggu. Caranya sama kayak bongkar malam sekarang.",
  },
  {
    tanya: "Kalau sebagian titipan keluar setelah hari ke-10, berapa yang ditagih?",
    alasan: "Contoh: titipan 100 kg, 50 kg keluar di hari ke-2 dan 50 kg di hari ke-15. Yang terpakai 850 kg-hari, padahal minimalnya 1.000 kg-hari.",
    saran: "Ditagih mana yang lebih besar: kg-hari yang beneran terpakai, atau kg titipan × 10 hari. Di contoh ini jadinya 1.000 kg-hari. Tagihan nggak pernah di bawah minimal, dan pelanggan nggak bayar minimal dua kali.",
  },
  {
    tanya: "Kapan tarif transit dipakai?",
    alasan: "Sekarang titipan yang keluar dalam 3 jam kena tarif transit, dan yang keluar dalam 24 jam cuma ditagih 1 hari. Aturan minimal 10 hari per titipan bakal ngapus pengecualian 24 jam itu, jadi titipan yang nginep semalam kena 10 hari.",
    saran: "Titipan yang keluar dalam 3 jam kena tarif transit sekali bayar, tanpa minimal 10 hari. Di atas 3 jam, berlaku tarif simpan dengan minimal 10 hari. Mohon dipastiin juga apa pengecualian 24 jam memang dihapus.",
  },
  {
    tanya: "Apa barang yang datang udah beku juga kena biaya pembekuan?",
    alasan: "Jawaban sebelumnya bilang biaya pembekuan Rp3.500/kg berlaku buat semua barang, sekali per titipan.",
    saran: "Cuma buat titipan yang beneran dibekukan di ABF, yaitu yang datang fresh. Barang yang datang udah beku langsung masuk cold storage dan nggak kena, karena biaya ini buat pemakaian mesin ABF.",
  },
  {
    tanya: "Apa maksud \"kg net\", dan apa lanjutan kalimat di jawaban nomor 3?",
    alasan: "Istilah kg net muncul di aturan minimal 10 hari. Jawaban nomor 3 juga kepotong: \"Loin tidak wajib ditimbang satu-satu untuk .\"",
    saran: "Kg net = berat bersih yang ditimbang pas titipan masuk, tanpa palet, es, atau kemasan. Itu yang dicatat sistem sekarang. Kalimat yang kepotong cukup dilengkapi aja, karena loin total per grade udah jalan.",
  },
];

const LAIN = [
  {
    tanya: "Limbah tetap ditimbang totalnya, atau dipisah per jenis?",
    saran: "Tetap total, sesuai keputusan owner sebelumnya. Jenis sisa yang dijual tetap dicatat terpisah sebagai hasil sampingan.",
  },
  {
    tanya: "Form hitung stok barang pendukung (kemasan, perlengkapan kerja) jadi dibikin?",
    saran: "Dibikin, setelah kedatangan ikan dan tarif gudang. Jumlah yang kepakai dihitung dari hitungan terakhir, bukan dari saldo kemarin.",
  },
];

const JAWABAN = [
  { isi: "Flowchart nambahin, bukan gantiin PO, persetujuan, cek mutu, dan pemeriksaan hasil olahan. Kedatangan ikan nggak nunggu PO.", status: "Nunggu pertanyaan 1", siap: false },
  { isi: "Tarif gudang: dihitung dari jam masuk sampai jam keluar, minimal 10 hari per titipan, tarif diinput pas bikin tagihan.", status: "Nunggu pertanyaan 2–5", siap: false },
  { isi: "Loin cukup diisi total per grade. Yield dihitung per produksi, dan penelusuran berhenti di kedatangan dan nelayan.", status: "Udah jalan", siap: true },
  { isi: "Nota nelayan, tanda terima, dan tagihan dibuat admin. Sistem cukup nyimpen lampirannya. Jasa olah menyusul.", status: "Lampiran udah jalan", siap: true },
];

const ALUR = [
  {
    nama: "1. Penerimaan ikan", hal: "halaman 1",
    flowchart: "Dicatat setelah semua ikan yang tiba selesai ditimbang. Beratnya dicatat per ekor.",
    sekarang: "Harus ada surat pesanan (PO) dulu. Pas ikan tiba, cuma dicatat satu berat total. Nota nelayan udah bisa dilampirkan.",
    dibuat: "Catatan ikan yang tiba tanpa nunggu PO, jumlah tiap lembar timbang, potongan 1 kg buat tiap luka gancu, harga per kelas mutu atau satu harga rata, dan tanggal jatuh tempo bayar nelayan.",
  },
  {
    nama: "2. Pengolahan ikan", hal: "halaman 2",
    flowchart: "Cukup isi total berat per kelas mutu, buat tiap kedatangan dan giliran kerja. Kedatangan ditutup setelah semua ikannya kelar diolah.",
    sekarang: "Loin udah bisa diisi total per grade, atau ditimbang per potong kalau perlu. Tetap diperiksa QC dan Owner sebelum masuk stok.",
    dibuat: "Giliran kerja, nama pengawas, buka dan tutup kedatangan, pencocokan sama total lembar timbang, dan tujuan hasil sampingan (dibekukan, didinginkan, dijual, atau dibuang).",
  },
  {
    nama: "3. Tagihan ngolah ikan orang lain", hal: "halaman 3",
    flowchart: "Biaya per kg beda-beda buat tiap kelompok hasil, ditagih per kedatangan.",
    sekarang: "Belum ada. Sistem baru bisa nagih penjualan dan penyimpanan gudang.",
    dibuat: "Menyusul, bukan prioritas: catatan ikan punya orang lain dan tagihan per kelompok hasil.",
  },
  {
    nama: "4. Nyimpen barang orang lain", hal: "halaman 4",
    flowchart: "Ditagih per periode. Biayanya bisa dihitung per kg per hari, per palet per bulan, atau cara lain.",
    sekarang: "Ditagih pas barang diambil, dihitung per kg per hari. Tanda terima dan tagihan udah bisa dilampirkan.",
    dibuat: "Aturan tarif baru (nunggu pertanyaan 2–5), tagihan per periode, dan catatan jumlah, satuan, suhu, kemasan, kendaraan, dan pengemudi.",
  },
  {
    nama: "5. Barang pendukung", hal: "halaman 5",
    flowchart: "Stok kemasan dan perlengkapan kerja ketahuan dari hitung langsung di gudang. Jumlah yang kepakai dihitung otomatis.",
    sekarang: "Stok dihitung dari catatan barang masuk, keluar, dan koreksi.",
    dibuat: "Formulir hitung stok yang bedain \"belum dihitung\" (dikosongin) sama \"habis\" (diisi 0), kalau jadi dibikin.",
  },
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
  ["Kg-hari", "Berat dikali lama simpan. 100 kg selama 10 hari = 1.000 kg-hari"],
  ["Bongkar malam", "Ikan yang dibongkar sebelum pesanannya disetujui. Pembayarannya tetap nunggu persetujuan"],
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
          <p className="f-sumber">Dari flowchart_v1.pdf · diperbarui 6 November 2026</p>
          <h1 id="judul">Apa aja yang perlu disesuaikan di sistem</h1>
          <p className="f-pengantar">Ini hasil perbandingan flowchart dari tim Katalis dengan sistem yang jalan sekarang.</p>
          <p className="f-pengantar">Empat keputusan sebelumnya udah dijawab, dan sebagian udah jalan di sistem. Sisanya nunggu lima pertanyaan lanjutan di bawah. Tiap pertanyaan udah ada saran developer, jadi cukup jawab setuju, atau tulis aturan yang diinginkan.</p>
          <ul className="f-jalur" aria-label="Tiga jenis kegiatan usaha di flowchart">
            {JALUR.map((j) => <li key={j.nama}><b>{j.nama}</b><span>{j.isi}</span></li>)}
          </ul>
        </section>

        <section className="f-bagian" aria-labelledby="h-lanjutan">
          <h2 id="h-lanjutan">Lima pertanyaan lanjutan buat tim Katalis</h2>
          <ol className="f-keputusan">
            {LANJUTAN.map((k) => (
              <li key={k.tanya}>
                <h3>{k.tanya}</h3>
                <p>{k.alasan}</p>
                <p className="f-saran"><b>Saran developer:</b> {k.saran}</p>
              </li>
            ))}
          </ol>
          <div className="f-koreksi">
            <article>
              <h3>Dua hal lain, nggak buru-buru</h3>
              <ul className="f-lain">
                {LAIN.map((l) => (
                  <li key={l.tanya}>
                    <b>{l.tanya}</b>
                    <span><b>Saran developer:</b> {l.saran}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="f-bagian" aria-labelledby="h-jawaban">
          <h2 id="h-jawaban">Jawaban sebelumnya dan statusnya</h2>
          <ul className="f-status">
            {JAWABAN.map((j, i) => (
              <li key={j.isi}>
                <span className="f-nomor">{i + 1}</span>
                <p>{j.isi}</p>
                <span className={j.siap ? "f-tanda f-tanda-siap" : "f-tanda"}>{j.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="f-bagian" aria-labelledby="h-alur">
          <h2 id="h-alur">Bedanya di tiap bagian kerja</h2>
          <div className="f-tabel" tabIndex={0} role="region" aria-labelledby="h-alur">
            <table>
              <thead><tr><th scope="col">Bagian kerja</th><th scope="col">Menurut flowchart</th><th scope="col">Di sistem sekarang</th><th scope="col">Yang masih perlu ditambah</th></tr></thead>
              <tbody>
                {ALUR.map((a) => (
                  <tr key={a.nama}>
                    <th scope="row">{a.nama} <span className="f-hal">{a.hal}</span></th>
                    <td data-label="Menurut flowchart">{a.flowchart}</td>
                    <td data-label="Di sistem sekarang">{a.sekarang}</td>
                    <td data-label="Yang masih perlu ditambah">{a.dibuat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="f-catatan">Daftar pilihan di sistem juga perlu ditambah: kelas ikan AB, C, dan cong, jenis loin CO dan natural, plus jenis sisa kayak kepala, tulang, ekor, kulit, dan sirip.</p>
        </section>

        <section className="f-bagian" aria-labelledby="h-koreksi">
          <h2 id="h-koreksi">Bagian flowchart yang perlu dibenerin</h2>
          <div className="f-koreksi">
            <article>
              <h3>Halaman 3: pengecekan selisih berat nggak bisa jalan</h3>
              <p>Ini buat jasa olah, jadi baru kepake nanti. Rumusnya ngitung sisa yang nggak ditimbang dari berat ikan diterima dikurangi hasil lain. Totalnya terus dibandingin lagi sama berat ikan diterima, padahal angka itu udah dipakai buat ngitungnya. &quot;Hasil lain&quot; bisa punya dua arti, dan dua-duanya bermasalah. Angka di bawah cuma contoh.</p>
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
            <li>Sistem dicocokin sama catatan teknisnya: database, formulir, dan PRD.</li>
            <li>Yang ditandai &quot;udah jalan&quot; udah tayang di aplikasi. Kedatangan ikan tanpa PO dan aturan tarif gudang baru dikerjain setelah pertanyaan lanjutan dijawab.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
