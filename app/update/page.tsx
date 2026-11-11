import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { Perangkat } from "@/components/update/Perangkat";
import { ANGKA, BELUM, BERIKUTNYA, KUALITAS, LIVE, MATRIKS, MODUL, NOTULEN, PERAN, PERIKSA_LENGKAP, PERJALANAN, TANGGAL, TERBARU, TUGAS_PERAN } from "@/components/update/isi";
import "./update.css";

export const metadata: Metadata = {
  title: "KATALIS ERP | Laporan untuk Owner",
  description: "Laporan buat Owner: posisi terbaru sistem KATALIS ERP, tampilan aslinya di laptop dan HP, dan apa aja yang masih tersisa.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00171F" };

const BAGIAN = [["terbaru", "Terbaru"], ["ringkasan", "Ringkasnya"], ["perjalanan", "Perjalanan"], ["tampilan", "Tampilan"], ["modul", "Isi menu"], ["peran", "Siapa melihat apa"], ["kualitas", "Keamanan"], ["belum", "Yang tersisa"]] as const;

export default function UpdatePage() {
  return (
    <div className="update">
      <header className="u-bar">
        <div className="u-wadah u-bar-isi">
          <a className="u-merek" href="#atas"><Image className="u-logo" src="/brand/katalis-mark-dark.png" alt="" width={28} height={28} priority />KATALIS ERP<span>Laporan untuk Owner</span></a>
          <nav aria-label="Bagian laporan">{BAGIAN.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
        </div>
      </header>

      <main id="atas">
        <section className="u-hero" aria-labelledby="judul">
          <div className="u-wadah u-hero-isi">
            <div>
              <Image className="u-logo-besar" src="/brand/katalis-logo-dark.png" alt="KATALIS Lintas Global" width={148} height={60} priority />
              <h1 id="judul">Masukan dari rapat udah masuk ke sistem.</h1>
              <p className="u-lead">Dari sepuluh masukan Mas Bisma, sembilan udah saya kerjain, termasuk yang kemarin masih nunggu keputusan perusahaan. Posisinya per {TANGGAL} saya rangkum di sini, plus tampilan aslinya di HP dan laptop.</p>
              <div className="u-aksi">
                <a className="u-tombol" href="#terbaru">Lihat yang baru</a>
                <a className="u-tombol u-tombol-sunyi" href="#ringkasan">Baca ringkasannya</a>
              </div>
            </div>
            <div className="u-hero-visual">
              <Perangkat jenis="laptop" layar="/update/layar/dashboard" judul="Dashboard Owner di laptop, dengan data contoh" segera />
              <Perangkat jenis="hp" layar="/update/layar/dashboard" judul="Dashboard Owner di HP, dengan data contoh" segera />
            </div>
          </div>
        </section>

        <section className="u-bagian" id="terbaru" aria-labelledby="h-terbaru">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-terbaru">Yang baru per {TANGGAL}</h2>
            <p className="u-pengantar">Ini dari masukan Mas Bisma di rapat 10 November, ditambah jawaban perusahaan tanggal 11. Sekarang orang lapangan bisa terus nyatet walaupun nota atau persetujuannya belum ada. Aturan yang perlu keputusan perusahaan juga bisa diatur admin sendiri.</p>
            <div className="u-kartu-grid u-badan">
              {TERBARU.map((k) => <div key={k.judul}><h3>{k.judul}</h3><p>{k.isi}</p></div>)}
            </div>
            <h3 className="u-sub" style={{ marginTop: "var(--space-xl, 48px)" }}>Sepuluh masukan Mas Bisma</h3>
            <ul className="u-notulen" style={{ marginTop: "var(--space-md)" }}>
              {NOTULEN.map((n) => (
                <li key={n.poin}>
                  <span>{n.poin}</span>
                  <span className={n.status === "selesai" ? "u-ya" : "u-tidak"}>{n.status === "selesai" ? "Beres" : "Nanti"}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="u-bagian u-bagian-alt" id="ringkasan" aria-labelledby="h-ringkasan">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-ringkasan">Singkatnya, sistemnya udah jadi</h2>
            <p className="u-pengantar">Fitur yang kita sepakati udah jadi semua. Sekarang saya lagi ngerjain penyesuaian dari catatan rapat. Sisanya tinggal dicoba di lapangan, plus beberapa hal yang memang cuma owner yang bisa mutusin.</p>
            <ul className="u-angka u-badan">
              {ANGKA.map((a) => <li key={a.nilai}><span className="u-besar">{a.nilai}</span><p>{a.label}</p></li>)}
            </ul>
            <div className="u-dua u-badan">
              <div>
                <h3 className="u-sub">Yang udah jalan sekarang</h3>
                <ul className="u-daftar-titik" style={{ marginTop: "var(--space-md)" }}>{LIVE.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div>
                <h3 className="u-sub">Cara baca laporan ini</h3>
                <p style={{ marginTop: "var(--space-md)", color: "var(--color-ink-2)" }}>
                  Semua angka di sini hasil hitungan dan pemeriksaan, nggak ada yang kira-kira. Jumlah pemeriksaan otomatis dan catatan kas diambil dari pemeriksaan lengkap {PERIKSA_LENGKAP}. Layar di bagian Tampilan itu halaman sistem yang asli, cuma saya isi data contoh, jadi susunannya persis kayak yang nanti dilihat pengguna. Data perusahaan nggak ada di halaman ini.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="u-bagian" id="perjalanan" aria-labelledby="h-perjalanan">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-perjalanan">Dari awal sampai sekarang</h2>
            <p className="u-pengantar">Ini urutan kerjanya dari awal, biar owner tahu apa aja yang udah lewat.</p>
            <ol className="u-jejak u-badan">
              {PERJALANAN.map((p) => <li key={p.tanggal}><time>{p.tanggal} 2026</time><h3>{p.judul}</h3><p>{p.isi}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="u-bagian u-bagian-alt" id="tampilan" aria-labelledby="h-tampilan">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-tampilan">Tampilannya di laptop dan HP</h2>
            <p className="u-pengantar">Semua layar di bawah ini halaman sistem yang asli, saya tampilin di ukuran layar perangkatnya.</p>
            <div className="u-gelar u-badan">
              <div className="u-gelar-laptop">
                <Perangkat jenis="laptop" layar="/update/layar/dashboard" judul="Dashboard Owner di laptop" />
                <div className="u-catatan">
                  <h3>Dashboard Owner</h3>
                  <p>Saya bikin supaya owner cukup buka halaman ini tiap pagi. Semua yang nunggu keputusan muncul satu-satu, dan sekali ketuk langsung dibawa ke urusannya.</p>
                  <ul>
                    <li>Yang merah paling mendesak, misalnya tagihan yang udah telat.</li>
                    <li>Di contoh ini ada tujuh urusan. Enam langsung kelihatan, sisanya disimpan di tombol &ldquo;Lihat lainnya&rdquo;.</li>
                    <li>Di bawahnya ada kas, piutang, stok, arus kas enam bulan, dan laba rugi proyek terbaru.</li>
                  </ul>
                </div>
              </div>

              <div className="u-gelar-laptop u-balik">
                <Perangkat jenis="laptop" layar="/update/layar/siklus" judul="Rincian Proyek di laptop" />
                <div className="u-catatan">
                  <h3>Rincian proyek</h3>
                  <p>Satu proyek (satu batch atau satu bongkaran) dari beli ikan sampai uang masuk saya rapiin jadi tujuh tahap. Nggak perlu ngetik ulang.</p>
                  <ul>
                    <li>Pembelian, mutu ikan, produksi, stok, penjualan, tagihan, dan biaya ada di satu layar.</li>
                    <li>Ketuk satu baris buat lihat transaksinya sama notanya.</li>
                    <li>Proyek yang udah lunas dan beres bisa ditutup owner dari sini.</li>
                  </ul>
                </div>
              </div>

              <div className="u-hp-baris">
                <figure style={{ margin: 0 }}>
                  <Perangkat jenis="hp" layar="/update/layar/persetujuan" judul="Persetujuan di HP" />
                  <figcaption className="u-catatan">
                    <h3>Persetujuan</h3>
                    <p>Pembelian yang dibuka dari dashboard langsung disorot. Notanya ada di kartu. Kalau notanya nyusul ada tandanya, kalau harganya naik ada peringatannya.</p>
                  </figcaption>
                </figure>
                <figure style={{ margin: 0 }}>
                  <Perangkat jenis="hp" layar="/update/layar/grid" judul="Grid loin di HP" />
                  <figcaption className="u-catatan">
                    <h3>Timbangan loin</h3>
                    <p>Petugas nimbang per potong. Kalau sinyal putus, catatannya tetap aman di HP.</p>
                  </figcaption>
                </figure>
                <figure style={{ margin: 0 }}>
                  <Perangkat jenis="hp" layar="/update/layar/absensi" judul="Absensi di HP" />
                  <figcaption className="u-catatan">
                    <h3>Absensi</h3>
                    <p>Karyawan absen pakai lokasi dan foto langsung dari kamera. Absen yang ditolak juga tetap kecatat, lengkap sama alasannya.</p>
                  </figcaption>
                </figure>
                <figure style={{ margin: 0 }}>
                  <Perangkat jenis="hp" layar="/update/layar/dashboard" judul="Dashboard di HP" />
                  <figcaption className="u-catatan">
                    <h3>Dashboard di HP</h3>
                    <p>Isinya sama kayak di laptop, cuma saya susun ulang biar pas di layar kecil. Menunya ada di bawah.</p>
                  </figcaption>
                </figure>
              </div>
            </div>
            <p className="u-contoh">Nama, angka, dan tanggal di layar-layar ini cuma contoh, biar tampilannya kelihatan. Susunannya asli. Menu sampingnya sengaja saya sederhanain, soalnya menu yang asli ngikutin siapa yang lagi masuk.</p>
          </div>
        </section>

        <section className="u-bagian" id="modul" aria-labelledby="h-modul">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-modul">Isi tiap menu</h2>
            <p className="u-pengantar">Ada lima belas menu. Saya jelasin satu-satu sesuai cara kerjanya sekarang.</p>
            <ol className="u-modul u-badan">
              {MODUL.map((m) => (
                <li key={m.slug} id={`modul-${m.slug}`}>
                  <div><h3>{m.nama}</h3><p className="u-ring">{m.ringkas}</p></div>
                  <ul>{m.poin.map((p) => <li key={p}>{p}</li>)}</ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="u-bagian u-bagian-alt" id="peran" aria-labelledby="h-peran">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-peran">Lima jabatan dan menu yang mereka lihat</h2>
            <p className="u-pengantar">Bisa lihat menunya belum tentu boleh ngubah isinya. Tombol ubah cuma muncul buat jabatan yang memang berhak.</p>
            <div className="u-tabel-bungkus" tabIndex={0} role="region" aria-label="Tabel menu per jabatan">
              <table className="u-tabel">
                <caption>Menu yang muncul buat tiap jabatan, sama persis dengan aturan akses di sistem.</caption>
                <thead><tr><th scope="col">Menu</th>{PERAN.map((p) => <th scope="col" key={p}>{p}</th>)}</tr></thead>
                <tbody>
                  {MATRIKS.map((r) => (
                    <tr key={r.menu}><th scope="row" style={{ fontWeight: 400 }}>{r.menu}</th>{r.ada.map((a, i) => <td key={PERAN[i]} className={a ? "u-ya" : "u-tidak"}>{a ? "Ya" : "Tidak"}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="u-peran">
              {TUGAS_PERAN.map((t) => <li key={t.peran}><strong>{t.peran}</strong><p>{t.isi}</p></li>)}
            </ul>
          </div>
        </section>

        <section className="u-bagian" id="kualitas" aria-labelledby="h-kualitas">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-kualitas">Seberapa aman datanya</h2>
            <p className="u-pengantar">Hal-hal ini dijaga sistemnya sendiri, jadi aman walaupun orangnya lagi nggak hati-hati.</p>
            <div className="u-kartu-grid u-badan">
              {KUALITAS.map((k) => <div key={k.judul}><h3>{k.judul}</h3><p>{k.isi}</p></div>)}
            </div>
          </div>
        </section>

        <section className="u-bagian u-bagian-alt" id="belum" aria-labelledby="h-belum">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-belum">Yang masih tersisa</h2>
            <p className="u-pengantar">Fiturnya udah lengkap. Yang tersisa tinggal nyoba di lapangan, plus bahan dan keputusan dari tim dan owner.</p>
            <ul className="u-belum u-badan">
              {BELUM.map((b) => <li key={b.judul}><strong>{b.judul}</strong><p>{b.isi}</p></li>)}
            </ul>
          </div>
        </section>

        <section className="u-bagian" id="berikutnya" aria-labelledby="h-berikutnya">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-berikutnya">Langkah berikutnya</h2>
            <p className="u-pengantar">Usul saya serah terimanya dua tahap, biar sistemnya udah bisa dipakai tanpa nunggu satu proyek asli selesai.</p>
            <ul className="u-tahap u-badan">
              {BERIKUTNYA.map((t) => <li key={t.tahap}><span className="u-label">{t.tahap}</span><h3>{t.judul}</h3><p>{t.isi}</p></li>)}
            </ul>
            <div className="u-tautan">
              <a className="u-tombol u-tombol-sunyi" href="/penawaran">Penawaran</a>
              <a className="u-tombol u-tombol-sunyi" href="/rancangan">Rancangan final</a>
              <a className="u-tombol u-tombol-sunyi" href="/PRD">Daftar kebutuhan</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="u-kaki">
        <div className="u-wadah u-kaki-isi">
          <Image className="u-logo" src="/brand/katalis-mark-dark.png" alt="" width={28} height={28} />
          <span>Disiapkan oleh Dar Dev untuk PT Katalis Lintas Global. Laporan per {TANGGAL}.</span>
        </div>
      </footer>
    </div>
  );
}
