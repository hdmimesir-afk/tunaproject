"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { GAMBAR, type NamaGambar } from "./gambar";
import { ALUR_CONTOH, BAB, DAFTAR_PERAN, ISTILAH, type PeranId, type Tugas } from "./isi";

const namaPeran = (id: PeranId) => DAFTAR_PERAN.find((p) => p.id === id)?.label ?? id;

function Gambar({ nama, keterangan }: { nama: NamaGambar; keterangan?: string }) {
  const [lebar, tinggi] = GAMBAR[nama];
  const hp = nama.startsWith("20-");
  const sempit = !hp && lebar / tinggi < 1.25;
  const src = `/tutorial/${nama}.webp`;
  return (
    <figure className={`t-gambar ${hp ? "t-gambar-hp" : sempit ? "t-gambar-sempit" : ""}`}>
      <a href={src} target="_blank" rel="noreferrer" aria-label={`Perbesar gambar: ${keterangan ?? nama}`}>
        {/* Sudah WebP berukuran pas, jadi tidak lewat pengolahan gambar Next. */}
        <Image src={src} alt={keterangan ?? ""} width={lebar} height={tinggi} loading="lazy" unoptimized />
      </a>
      {keterangan && <figcaption>{keterangan}</figcaption>}
    </figure>
  );
}

function KartuTugas({ t, babPeran }: { t: Tugas; babPeran: PeranId[] }) {
  const khusus = t.peran && t.peran.length < babPeran.length;
  const narasi = (
    <div className="t-narasi">
      <h3>{t.judul}</h3>
      {khusus && <p className="t-untuk">Khusus buat {t.peran!.map(namaPeran).join(", ")}</p>}
      {t.pengantar && <p>{t.pengantar}</p>}
      {t.langkah && <ol className="t-langkah">{t.langkah.map((l, i) => <li key={i}>{l}</li>)}</ol>}
      {t.catatan && <p className="t-catatan">{t.catatan}</p>}
    </div>
  );
  if (!t.gambar) return <article className="t-tugas">{narasi}</article>;
  const [lebar, tinggi] = GAMBAR[t.gambar];
  const berdampingan = t.gambar.startsWith("20-") || lebar / tinggi < 1.25;
  return (
    <article className={`t-tugas ${berdampingan ? "t-tugas-samping" : ""}`}>
      {narasi}
      <Gambar nama={t.gambar} keterangan={t.keterangan} />
    </article>
  );
}

/** Pilih jabatan dan cari: yang tidak relevan disembunyikan supaya tiap orang cukup membaca bagiannya. */
export function Panduan() {
  const [peran, setPeran] = useState<PeranId | "semua">("semua");
  const [cari, setCari] = useState("");
  const q = cari.trim().toLowerCase();

  const tampil = useMemo(() => BAB
    .filter((b) => peran === "semua" || b.peran.includes(peran))
    .map((b) => {
      const tugas = b.tugas.filter((t) => {
        if (peran !== "semua" && t.peran && !t.peran.includes(peran)) return false;
        if (!q) return true;
        const teks = [b.judul, b.ringkas, t.judul, t.pengantar, t.catatan, ...(t.langkah ?? [])].join(" ").toLowerCase();
        return teks.includes(q);
      });
      return { ...b, tugas };
    })
    .filter((b) => b.tugas.length > 0), [peran, q]);

  const kelompok = [...new Set(tampil.map((b) => b.kelompok))];
  const daftarIsi = kelompok.map((k) => (
    <div key={k}>
      <p className="t-toc-kelompok">{k}</p>
      <ul>
        {k === "Mulai" && !q && <li><a href="#alur">Contoh satu putaran kerja</a></li>}
        {k === "Mulai" && !q && <li><a href="#istilah">Arti istilah</a></li>}
        {tampil.filter((b) => b.kelompok === k).map((b) => <li key={b.slug}><a href={`#${b.slug}`}>{b.judul}</a></li>)}
      </ul>
    </div>
  ));

  return (
    <>
      <div className="t-saring">
        <div className="t-chip" role="group" aria-label="Pilih jabatan">
          {[{ id: "semua" as const, label: "Semua jabatan" }, ...DAFTAR_PERAN].map((p) => (
            <button key={p.id} type="button" aria-pressed={peran === p.id} onClick={() => setPeran(p.id)}>{p.label}</button>
          ))}
        </div>
        <label className="t-cari">
          <span className="sr-only">Cari di panduan</span>
          <input type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari, misalnya: nota, absen, invoice" />
        </label>
      </div>

      <div className="t-tata">
        <nav className="t-toc" aria-label="Daftar isi">{daftarIsi}</nav>
        <details className="t-toc-hp"><summary>Daftar isi</summary><nav aria-label="Daftar isi">{daftarIsi}</nav></details>

        <div className="t-isi">
          {!q && (
            <>
              <section id="alur" className="t-bab" aria-labelledby="judul-alur">
                <header>
                  <h2 id="judul-alur">Contoh satu putaran kerja</h2>
                  <p>Dari beli ikan sampai uang masuk, begini giliran kerja tiap jabatan.{peran !== "semua" && ` Giliran ${namaPeran(peran)} ditandai.`}</p>
                </header>
                <ol className="t-putaran">
                  {ALUR_CONTOH.map((l, i) => (
                    <li key={i} className={peran === "semua" ? "" : l.peran === peran ? "t-giliran" : "t-redup"}>
                      <span className="t-siapa">{namaPeran(l.peran)}</span>
                      <p>{l.kerja}</p>
                      <a href={`#${l.slug}`}>{l.menu}</a>
                    </li>
                  ))}
                </ol>
              </section>
              <section id="istilah" className="t-bab" aria-labelledby="judul-istilah">
                <header><h2 id="judul-istilah">Arti istilah</h2></header>
                <dl className="t-istilah">{ISTILAH.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              </section>
            </>
          )}
          {tampil.length === 0 && <p className="t-kosong">Nggak ada yang cocok. Coba kata lain, atau pilih Semua jabatan.</p>}
          {tampil.map((b) => (
            <section key={b.slug} id={b.slug} className="t-bab" aria-labelledby={`judul-${b.slug}`}>
              <header>
                <h2 id={`judul-${b.slug}`}>{b.judul}</h2>
                <p>{b.ringkas}</p>
                {b.menu && <a className="t-buka" href={b.menu}>Buka menu {b.judul}</a>}
              </header>
              {b.tugas.map((t) => <KartuTugas key={t.judul} t={t} babPeran={b.peran} />)}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
