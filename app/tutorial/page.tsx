import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { Panduan } from "@/components/tutorial/Panduan";
import { ALUR } from "@/components/tutorial/isi";
import { MATRIKS, PERAN } from "@/components/update/isi";
import "./tutorial.css";

export const metadata: Metadata = {
  title: "KATALIS ERP | Panduan",
  description: "Panduan memakai KATALIS ERP per halaman dan per jabatan, lengkap dengan gambar layarnya.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00171F" };

export default function TutorialPage() {
  return (
    <div className="tutorial">
      <header className="t-bar">
        <a className="t-merek" href="#atas"><Image src="/brand/katalis-mark-dark.png" alt="" width={28} height={28} priority />KATALIS ERP<span>Panduan</span></a>
        <a className="t-masuk" href="/dashboard">Buka aplikasi</a>
      </header>

      <main id="atas">
        <section className="t-kepala" aria-labelledby="judul">
          <h1 id="judul">Panduan memakai KATALIS ERP</h1>
          <p>Pilih jabatan Anda, lalu ikuti langkahnya halaman demi halaman. Nama dan angka di gambar hanya contoh, bukan data perusahaan. Kotak merah menandai tombol yang dimaksud. Ketuk gambar untuk memperbesarnya.</p>
          <ol className="t-alur" aria-label="Alur kerja">{ALUR.map((a) => <li key={a}>{a}</li>)}</ol>
        </section>

        <Panduan />

        <section className="t-lampiran" id="jabatan" aria-labelledby="h-jabatan">
          <h2 id="h-jabatan">Menu per jabatan</h2>
          <div className="t-tabel" tabIndex={0} role="region" aria-label="Tabel menu per jabatan">
            <table>
              <thead><tr><th scope="col">Menu</th>{PERAN.map((p) => <th scope="col" key={p}>{p}</th>)}</tr></thead>
              <tbody>
                {MATRIKS.map((m) => (
                  <tr key={m.menu}><th scope="row">{m.menu}</th>{m.ada.map((a, i) => <td key={PERAN[i]} className={a ? "t-ya" : ""}>{a ? "Ya" : "Tidak"}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
