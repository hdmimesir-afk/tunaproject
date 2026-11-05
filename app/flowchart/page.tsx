import type { Metadata, Viewport } from "next";
import Image from "next/image";
import "./flowchart.css";

export const metadata: Metadata = {
  title: "KATALIS ERP | Penyesuaian Flowchart",
  description: "Perbedaan flowchart_v1 dengan KATALIS ERP sekarang, empat keputusan yang dibutuhkan, dan koreksi pada flowchart.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00171F" };

const JALUR = [
  { nama: "Jalur 1", isi: "Ikan yang dibeli" },
  { nama: "Jalur 2", isi: "Jasa olah, ikan milik pihak ketiga" },
  { nama: "Jalur 3", isi: "Jasa simpan barang pihak ketiga" },
];

const KEPUTUSAN = [
  {
    tanya: "Apakah flowchart menggantikan alur PO, persetujuan, cek mutu, dan pemeriksaan produksi, atau hanya menambah?",
    alasan: "Keempat tahap ini berjalan di sistem sekarang, tetapi tidak muncul di flowchart.",
    label: "Saran",
    jawab: "Menambah. Kontrol harga dan mutu tetap ada, dan kedatangan ikan dihubungkan ke tahap yang sudah berjalan.",
  },
  {
    tanya: "Apakah penimbangan loin per potong dihapus atau tetap menjadi pilihan?",
    alasan: "Flowchart hanya memakai total per grade. Tanpa data per potong, hasil per ekor dan isi form FRM-PRD-01 tidak bisa ditelusuri lagi.",
    label: "Saran",
    jawab: "Tetap menjadi pilihan, dengan rekap total sebagai cara input utama.",
  },
  {
    tanya: "Apakah aturan tarif gudang yang lama diganti?",
    alasan: "Minimum 10 hari, masa transit 3 jam, dan tarif ABF Rp3.500/kg tidak ada di flowchart. Hari masuk dan keluar juga belum ditentukan. Sekarang lama simpan dibulatkan ke atas per 24 jam. Semua ini mengubah nilai tagihan.",
    label: "Yang dibutuhkan",
    jawab: "Aturan tarif final, termasuk cara menghitung hari masuk dan keluar.",
  },
  {
    tanya: "Apakah jasa olah dan cetak dokumen masuk versi 1?",
    alasan: "PRD versi 1 belum memuat jasa olah, nota nelayan, tanda terima titipan, dan invoice jasa olah. Menurut PRD, fitur lanjutan masuk masa garansi atau permintaan perubahan.",
    label: "Yang dibutuhkan",
    jawab: "Kesepakatan cakupan sebelum jadwal disusun.",
  },
];

const ALUR = [
  {
    nama: "1. Penerimaan", hal: "hal. 1",
    flowchart: "Input setelah ikan ditimbang, berat per ekor, ada jalur 1 dan 2",
    sekarang: "PO dibuat dulu, lalu lot dengan satu total berat",
    dibuat: "Data kedatangan dan per ekor, subtotal per lembar Tally, potongan gancu 1 kg per kena, harga per grade atau cong, jatuh tempo nelayan, cetak nota",
  },
  {
    nama: "2. Produksi", hal: "hal. 2",
    flowchart: "Rekap total per grade, per kedatangan dan shift. Kedatangan ditutup setelah semua ikan selesai",
    sekarang: "Loin ditimbang per potong, lalu diperiksa QC dan Owner sebelum masuk stok",
    dibuat: "Shift, pengawas, buka dan tutup kedatangan, kontrol total Tally, hasil samping per tujuan (ABF, chilling, jual, buang)",
  },
  {
    nama: "3. Tagihan jasa olah", hal: "hal. 3",
    flowchart: "Tarif per kelompok hasil, ditagih per kedatangan",
    sekarang: "Belum ada. Invoice hanya untuk penjualan dan gudang dingin",
    dibuat: "Modul baru: ikan milik pihak ketiga, tagihan per kelompok hasil, cetak invoice",
  },
  {
    nama: "4. Jasa simpan", hal: "hal. 4",
    flowchart: "Ditagih per periode. Dasar tarif bisa per kg per hari, per palet per bulan, atau lainnya",
    sekarang: "Ditagih saat barang diambil, per kg per hari",
    dibuat: "Tagihan periode dan dasar tarif, kolom jumlah, satuan, suhu, kemasan, kendaraan, pengemudi, cetak tanda terima",
  },
  {
    nama: "5. Penunjang", hal: "hal. 5",
    flowchart: "Stok dari hitung fisik, pemakaian dihitung otomatis",
    sekarang: "Stok dari catatan masuk, keluar, dan koreksi",
    dibuat: "Form hitung fisik, dengan kosong dibedakan dari 0",
  },
];

const BENTROK = [
  { aturan: "PO dan nota disetujui sebelum ikan diterima", flowchart: "Tidak ada tahap persetujuan, harga diisi saat penerimaan", keputusan: "No. 1" },
  { aturan: "Lot yang ditahan cek mutu tidak bisa diproduksi", flowchart: "Tidak ada tahap cek mutu", keputusan: "No. 1" },
  { aturan: "Hasil produksi masuk stok setelah diperiksa QC dan Owner", flowchart: "Barang langsung tercatat saat rekap disimpan", keputusan: "No. 1" },
  { aturan: "Loin ditimbang per potong", flowchart: "Total per grade dari lembar Tally", keputusan: "No. 2" },
  { aturan: "Minimum 10 hari, transit 3 jam, ABF ditagih terpisah", flowchart: "Tidak disebut", keputusan: "No. 3" },
  { aturan: "Limbah ditimbang totalnya saja (keputusan owner)", flowchart: "Sisa dipisah per jenis dan dibuang tercatat per tujuan", keputusan: "Perlu dipastikan" },
];

const CONTOH = [
  {
    judul: "Bila sudah termasuk sisa yang ditimbang",
    baris: [["Berat terima", "1.000 kg"], ["Hasil lain", "1.050 kg"], ["Sisa tak tertimbang", "−50 kg"], ["Total ditagih", "1.000 kg"]],
    selisih: "0 kg",
    simpul: "Selalu lolos, walau hasil melebihi ikan masuk.",
  },
  {
    judul: "Bila belum termasuk sisa yang ditimbang",
    baris: [["Berat terima", "1.000 kg"], ["Hasil lain + sisa ditimbang", "700 + 200 kg"], ["Sisa tak tertimbang", "300 kg"], ["Total ditagih", "1.200 kg"]],
    selisih: "−200 kg",
    simpul: "Selalu gagal setiap kali ada sisa yang ditimbang.",
  },
];

const ISTILAH = [
  ["Tally", "Petugas timbang di lantai dan lembar catatannya"],
  ["Gancu (gaff)", "Luka kena gancu, memotong berat bayar 1 kg per kena"],
  ["Cong", "Satu harga rata tanpa grade"],
  ["ABF", "Air blast freezer, ruang pembeku cepat"],
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
          <p className="f-sumber">flowchart_v1.pdf · 5 November 2026</p>
          <h1 id="judul">Penyesuaian sistem terhadap flowchart</h1>
          <p className="f-pengantar">Flowchart ini mengubah dasar pencatatan, dari PO dan loin per potong menjadi kedatangan ikan dan rekap per shift. Jasa olah ikan juga belum ada di sistem. Empat keputusan di bawah perlu dijawab sebelum pengerjaan dimulai, karena jawabannya menentukan apa yang dibuat dan apa yang diganti.</p>
          <ul className="f-jalur" aria-label="Tiga jalur usaha dalam flowchart">
            {JALUR.map((j) => <li key={j.nama}><b>{j.nama}</b><span>{j.isi}</span></li>)}
          </ul>
        </section>

        <section className="f-bagian" aria-labelledby="h-keputusan">
          <h2 id="h-keputusan">Keputusan yang dibutuhkan dari tim Katalis</h2>
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
          <h2 id="h-alur">Perbedaan per alur</h2>
          <div className="f-tabel" tabIndex={0} role="region" aria-labelledby="h-alur">
            <table>
              <thead><tr><th scope="col">Alur</th><th scope="col">Flowchart</th><th scope="col">Sistem sekarang</th><th scope="col">Yang perlu dibuat</th></tr></thead>
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
          <p className="f-catatan">Data master juga perlu ditambah: grade ikan AB, C, dan cong, CO loin dan natural loin, serta jenis sisa seperti kepala, tulang, ekor, kulit, dan sirip.</p>
        </section>

        <section className="f-bagian" aria-labelledby="h-bentrok">
          <h2 id="h-bentrok">Aturan sekarang yang bertentangan</h2>
          <div className="f-tabel" tabIndex={0} role="region" aria-labelledby="h-bentrok">
            <table>
              <thead><tr><th scope="col">Aturan sekarang</th><th scope="col">Di flowchart</th><th scope="col">Keputusan</th></tr></thead>
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
          <h2 id="h-koreksi">Bagian flowchart yang perlu dikoreksi</h2>
          <div className="f-koreksi">
            <article>
              <h3>Halaman 3: cek selisih tagihan jasa olah tidak bisa berfungsi</h3>
              <p>Sisa tak tertimbang dihitung dari berat terima dikurangi hasil lain, lalu totalnya dicek lagi terhadap berat terima. Hasilnya tergantung arti &quot;hasil lain&quot;, dan kedua arti itu bermasalah. Angka di bawah hanya contoh.</p>
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
              <h3>Halaman 5: &quot;saldo kemarin&quot; tidak konsisten</h3>
              <p>Awal alur mengambil saldo hitungan terakhir, tetapi rumusnya memakai saldo kemarin. Bila barang tidak dihitung setiap hari, angka pemakaiannya salah. Rumus sebaiknya memakai saldo hitungan terakhir.</p>
            </article>
            <article>
              <h3>Halaman 4: hari masuk dan keluar belum diputuskan</h3>
              <p>Flowchart sudah menandai ini sebagai keputusan yang dibutuhkan. Jawabannya masuk ke keputusan nomor 3.</p>
            </article>
          </div>
        </section>

        <section className="f-bagian" aria-labelledby="h-istilah">
          <h2 id="h-istilah">Istilah di flowchart</h2>
          <dl className="f-istilah">
            {ISTILAH.map(([nama, arti]) => <div key={nama}><dt>{nama}</dt><dd>{arti}</dd></div>)}
          </dl>
        </section>

        <section className="f-bagian" aria-labelledby="h-dasar">
          <h2 id="h-dasar">Dasar pemeriksaan</h2>
          <ul className="f-dasar">
            <li>Flowchart dibaca dari teks PDF. Arah panah disimpulkan dari label dan urutannya, jadi perlu dikoreksi bila ada yang keliru terbaca.</li>
            <li>Sistem dicocokkan dengan struktur database, form, dan PRD. Alurnya tidak dicoba langsung di aplikasi untuk laporan ini.</li>
            <li>Belum ada perubahan apa pun pada alur sistem. Urutan kerja dan rencana untuk data yang sudah ada disusun setelah keempat keputusan dijawab.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
