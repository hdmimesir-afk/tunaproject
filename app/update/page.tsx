import type { Metadata, Viewport } from "next";
import { Perangkat } from "@/components/update/Perangkat";
import { ANGKA, BELUM, BERIKUTNYA, KUALITAS, LIVE, MATRIKS, MODUL, PERAN, PERJALANAN, TANGGAL, TUGAS_PERAN } from "@/components/update/isi";
import "./update.css";

export const metadata: Metadata = {
  title: "KATALIS ERP | Laporan progres",
  description: "Laporan progres pembangunan sistem KATALIS ERP per 26 Oktober 2026, dengan tampilan asli di laptop dan HP.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00171F" };

const BAGIAN = [["ringkasan", "Ringkasan"], ["perjalanan", "Perjalanan"], ["tampilan", "Tampilan"], ["modul", "Modul"], ["peran", "Peran"], ["kualitas", "Kualitas"], ["belum", "Yang belum"]] as const;

export default function UpdatePage() {
  return (
    <div className="update">
      <header className="u-bar">
        <div className="u-wadah u-bar-isi">
          <a className="u-merek" href="#atas">KATALIS ERP<span>Laporan progres</span></a>
          <nav aria-label="Bagian laporan">{BAGIAN.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
        </div>
      </header>

      <main id="atas">
        <section className="u-hero" aria-labelledby="judul">
          <div className="u-wadah u-hero-isi">
            <div>
              <h1 id="judul">Sistem selesai dibangun, siap dicoba.</h1>
              <p className="u-lead">Laporan {TANGGAL} dengan tampilan asli sistem di HP dan laptop.</p>
              <div className="u-aksi">
                <a className="u-tombol" href="#tampilan">Lihat tampilannya</a>
                <a className="u-tombol u-tombol-sunyi" href="#ringkasan">Baca laporan</a>
              </div>
            </div>
            <div className="u-hero-visual">
              <Perangkat jenis="laptop" layar="/update/layar/dashboard" judul="Dashboard Owner di laptop, dengan data contoh" segera />
              <Perangkat jenis="hp" layar="/update/layar/dashboard" judul="Dashboard Owner di HP, dengan data contoh" segera />
            </div>
          </div>
        </section>

        <section className="u-bagian" id="ringkasan" aria-labelledby="h-ringkasan">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-ringkasan">Ringkasan status</h2>
            <p className="u-pengantar">Semua fitur di PRD sudah dibangun dan terpasang. Sisanya adalah uji di lapangan dan hal yang hanya bisa diputuskan owner.</p>
            <ul className="u-angka u-badan">
              {ANGKA.map((a) => <li key={a.nilai}><span className="u-besar">{a.nilai}</span><p>{a.label}</p></li>)}
            </ul>
            <div className="u-dua u-badan">
              <div>
                <h3 className="u-sub">Sudah hidup di produksi</h3>
                <ul className="u-daftar-titik" style={{ marginTop: "var(--space-md)" }}>{LIVE.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div>
                <h3 className="u-sub">Cara membaca laporan ini</h3>
                <p style={{ marginTop: "var(--space-md)", color: "var(--color-ink-2)" }}>
                  Angka teknis dihitung dari repo dan hasil pemeriksaan otomatis per {TANGGAL}, bukan perkiraan. Tampilan di bagian berikutnya adalah komponen asli sistem yang dirender dengan data contoh, jadi tata letaknya persis seperti yang dilihat pengguna. Halaman ini tidak memuat data perusahaan.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="u-bagian u-bagian-alt" id="perjalanan" aria-labelledby="h-perjalanan">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-perjalanan">Perjalanan pembangunan</h2>
            <p className="u-pengantar">Dari riwayat commit di repo, urut dari awal.</p>
            <ol className="u-jejak u-badan">
              {PERJALANAN.map((p) => <li key={p.tanggal}><time>{p.tanggal} 2026</time><h3>{p.judul}</h3><p>{p.isi}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="u-bagian" id="tampilan" aria-labelledby="h-tampilan">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-tampilan">Tampilan asli di laptop dan HP</h2>
            <p className="u-pengantar">Setiap layar di bawah adalah halaman sistem yang sebenarnya, dimuat pada ukuran layar perangkatnya.</p>
            <div className="u-gelar u-badan">
              <div className="u-gelar-laptop">
                <Perangkat jenis="laptop" layar="/update/layar/dashboard" judul="Dashboard Owner di laptop" />
                <div className="u-catatan">
                  <h3>Dashboard Owner</h3>
                  <p>Pemilik cukup membuka halaman ini. Yang menunggu keputusan tampil satu per satu, dan ketukan membawa langsung ke urusannya.</p>
                  <ul>
                    <li>Baris merah paling mendesak, misalnya tagihan terlambat.</li>
                    <li>Tujuh hal contoh: enam tampil, sisanya dilipat.</li>
                    <li>Arus kas enam bulan dan laba rugi siklus terbaru di bawahnya.</li>
                  </ul>
                </div>
              </div>

              <div className="u-gelar-laptop u-balik">
                <Perangkat jenis="laptop" layar="/update/layar/siklus" judul="Rincian Siklus di laptop" />
                <div className="u-catatan">
                  <h3>Rincian siklus</h3>
                  <p>Satu siklus dari beli ikan sampai uang masuk, dalam enam tahap, tanpa input ulang.</p>
                  <ul>
                    <li>PO, lot dan mutu, produksi, pesanan, invoice, dan biaya di satu layar.</li>
                    <li>Setiap baris menuju transaksinya beserta nota.</li>
                    <li>Owner menutup siklus yang sudah lunas dan beres.</li>
                  </ul>
                </div>
              </div>

              <div className="u-hp-baris">
                <figure style={{ margin: 0 }}>
                  <Perangkat jenis="hp" layar="/update/layar/persetujuan" judul="Persetujuan di HP" />
                  <figcaption className="u-catatan">
                    <h3>Persetujuan</h3>
                    <p>PO yang dibuka dari dashboard disorot. Nota ada di kartu, dan harga naik diberi peringatan.</p>
                  </figcaption>
                </figure>
                <figure style={{ margin: 0 }}>
                  <Perangkat jenis="hp" layar="/update/layar/grid" judul="Grid loin di HP" />
                  <figcaption className="u-catatan">
                    <h3>Grid loin</h3>
                    <p>Timbang per potong dengan tiga desimal. Draf aman di HP saat sinyal putus.</p>
                  </figcaption>
                </figure>
                <figure style={{ margin: 0 }}>
                  <Perangkat jenis="hp" layar="/update/layar/absensi" judul="Absensi di HP" />
                  <figcaption className="u-catatan">
                    <h3>Absensi</h3>
                    <p>Absen dengan lokasi dan foto kamera. Yang ditolak tetap tercatat dengan alasannya.</p>
                  </figcaption>
                </figure>
                <figure style={{ margin: 0 }}>
                  <Perangkat jenis="hp" layar="/update/layar/dashboard" judul="Dashboard di HP" />
                  <figcaption className="u-catatan">
                    <h3>Dashboard di HP</h3>
                    <p>Tata letak yang sama menyesuaikan layar kecil, dengan menu di tab bawah.</p>
                  </figcaption>
                </figure>
              </div>
            </div>
            <p className="u-contoh">Semua nama, angka, dan tanggal di tampilan ini karangan untuk memperlihatkan layar. Komponen dan tata letaknya asli. Kerangka menu disederhanakan karena menu asli membaca sesi pengguna.</p>
          </div>
        </section>

        <section className="u-bagian u-bagian-alt" id="modul" aria-labelledby="h-modul">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-modul">Isi tiap modul</h2>
            <p className="u-pengantar">Lima belas menu, ditulis sesuai cara sistem bekerja sekarang.</p>
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

        <section className="u-bagian" id="peran" aria-labelledby="h-peran">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-peran">Lima peran dan menu yang terlihat</h2>
            <p className="u-pengantar">Izin dicek di database. Melihat menu tidak berarti boleh mengubah: tombol ubah hanya muncul bila perannya punya izin tulis.</p>
            <div className="u-tabel-bungkus" tabIndex={0} role="region" aria-label="Tabel menu per peran">
              <table className="u-tabel">
                <caption>Menu yang tampil untuk tiap peran, diambil dari tabel izin di database.</caption>
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

        <section className="u-bagian u-bagian-alt" id="kualitas" aria-labelledby="h-kualitas">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-kualitas">Kualitas dan keamanan</h2>
            <p className="u-pengantar">Yang dijaga oleh sistem sendiri dan oleh pemeriksaan otomatis.</p>
            <div className="u-kartu-grid u-badan">
              {KUALITAS.map((k) => <div key={k.judul}><h3>{k.judul}</h3><p>{k.isi}</p></div>)}
            </div>
          </div>
        </section>

        <section className="u-bagian" id="belum" aria-labelledby="h-belum">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-belum">Yang belum selesai</h2>
            <p className="u-pengantar">Tidak ada fitur versi 1 di PRD yang tertinggal. Yang tersisa adalah pembuktian di lapangan dan keputusan.</p>
            <ul className="u-belum u-badan">
              {BELUM.map((b) => <li key={b.judul}><strong>{b.judul}</strong><p>{b.isi}</p></li>)}
            </ul>
          </div>
        </section>

        <section className="u-bagian u-bagian-alt" id="berikutnya" aria-labelledby="h-berikutnya">
          <div className="u-wadah">
            <h2 className="u-judul" id="h-berikutnya">Langkah berikutnya</h2>
            <p className="u-pengantar">Serah terima dibagi dua tahap supaya sistem bisa mulai dipakai tanpa menunggu siklus asli selesai.</p>
            <ul className="u-tahap u-badan">
              {BERIKUTNYA.map((t) => <li key={t.tahap}><span className="u-label">{t.tahap}</span><h3>{t.judul}</h3><p>{t.isi}</p></li>)}
            </ul>
            <div className="u-tautan">
              <a className="u-tombol u-tombol-sunyi" href="/penawaran">Penawaran</a>
              <a className="u-tombol u-tombol-sunyi" href="/rancangan">Rancangan final</a>
              <a className="u-tombol u-tombol-sunyi" href="/PRD">PRD</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="u-kaki">
        <div className="u-wadah">Disiapkan oleh Dar Dev untuk PT Katalis Lintas Global. Laporan per {TANGGAL}.</div>
      </footer>
    </div>
  );
}
