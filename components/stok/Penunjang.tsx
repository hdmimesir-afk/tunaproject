"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Bar, Btn, Card, Field, Icon, Inner, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { KotakCari, useCari } from "@/components/ui/Cari";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { barangKeluar, barangMasuk, koreksiBarang, simpanBarang } from "@/lib/actions/stok";
import { hariIni, tanggal } from "@/lib/format";
import { formatKg } from "@/lib/logic/neraca";
import type { Barang, GerakBarang, KategoriBarang, StatusBarang } from "@/lib/types/stok";

/* Stok penunjang: barang habis pakai di luar ikan. Dua kelompok: penunjang kerja (kemasan, es, label, dan sejenisnya)
   dan penunjang pekerja (apron, masker, sarung tangan, dan sejenisnya). Stok dihitung dari riwayat masuk, keluar, dan koreksi. */

export const NAMA_KATEGORI: Record<KategoriBarang, string> = { kerja: "Penunjang kerja", pekerja: "Penunjang pekerja" };
const KETERANGAN: Record<KategoriBarang, string> = {
  kerja: "Kemasan, es, label, dan barang habis pakai untuk proses kerja.",
  pekerja: "Apron, masker, sarung tangan, dan perlengkapan pekerja.",
};
const WARNA: Record<StatusBarang, string> = { aman: "#0B6B4A", menipis: "#B8801A", habis: "#B4443C" };
const LABEL_STATUS: Record<StatusBarang, string> = { aman: "Cukup", menipis: "Menipis", habis: "Habis" };
const angka = (n: number) => formatKg(n);
const KOLOM = "lg:grid lg:grid-cols-[minmax(0,1.5fr)_150px_110px_96px_270px] lg:items-center lg:gap-4";

type Saring = "semua" | "menipis" | "habis";
type Modal_ = { jenis: "masuk" | "keluar" | "koreksi" | "riwayat" | "ubah"; barang: Barang } | { jenis: "baru" };

/* ------------------------------------------------------------------ form */
function useTutupBilaBerhasil(state: HasilForm, onTutup: () => void) {
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
}

function FormMasuk({ b, onTutup }: { b: Barang; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(barangMasuk, undefined);
  useTutupBilaBerhasil(state, onTutup);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="barangId" value={b.id} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[13px]" style={{ color: MUTED }}>{b.nama} · stok sekarang {angka(b.stok)} {b.satuan}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Jumlah masuk (${b.satuan})`} error={state?.kolom?.jumlah?.[0]}><TextIn name="jumlah" inputMode="decimal" placeholder="0" required /></Field>
        <Field label="Tanggal" hint="Kosong = hari ini." error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" max={hariIni()} /></Field>
      </div>
      <Field label="Catatan" hint="Misalnya pemasok atau nomor nota."><TextIn name="catatan" maxLength={300} /></Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Catat barang masuk"}</Btn>
    </form>
  );
}

function FormKeluar({ b, onTutup }: { b: Barang; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(barangKeluar, undefined);
  useTutupBilaBerhasil(state, onTutup);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="barangId" value={b.id} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[13px]" style={{ color: MUTED }}>{b.nama} · tersedia {angka(b.stok)} {b.satuan}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Jumlah keluar (${b.satuan})`} error={state?.kolom?.jumlah?.[0]}><TextIn name="jumlah" inputMode="decimal" placeholder="0" required /></Field>
        <Field label="Tanggal" hint="Kosong = hari ini." error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" max={hariIni()} /></Field>
      </div>
      <Field label="Dipakai oleh atau untuk" hint="Misalnya tim potong atau nama pekerja."><TextIn name="penerima" maxLength={100} /></Field>
      <Field label="Catatan"><TextIn name="catatan" maxLength={300} /></Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Catat barang keluar"}</Btn>
    </form>
  );
}

function FormKoreksi({ b, onTutup }: { b: Barang; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(koreksiBarang, undefined);
  useTutupBilaBerhasil(state, onTutup);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="barangId" value={b.id} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[13px]" style={{ color: MUTED }}>{b.nama} · tercatat {angka(b.stok)} {b.satuan}. Pakai koreksi bila hitungan fisik berbeda dari catatan.</p>
      <Field label={`Selisih jumlah (${b.satuan}), minus untuk mengurangi`} error={state?.kolom?.selisih?.[0]}><TextIn name="selisih" inputMode="text" placeholder="-2" required /></Field>
      <Field label="Alasan" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={300} placeholder="Misalnya hasil hitung fisik" required /></Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Catat koreksi"}</Btn>
    </form>
  );
}

function FormBarang({ kategori, awal, onTutup }: { kategori: KategoriBarang; awal: Barang | null; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanBarang, undefined);
  useTutupBilaBerhasil(state, onTutup);
  return (
    <form action={action} className="space-y-3">
      {awal && <input type="hidden" name="barangId" value={awal.id} />}
      <PesanForm state={state?.error ? state : undefined} />
      <Field label="Kelompok" error={state?.kolom?.kategori?.[0]}>
        <select name="kategori" className={pilihCls} defaultValue={awal?.kategori ?? kategori}>
          <option value="kerja">{NAMA_KATEGORI.kerja}</option><option value="pekerja">{NAMA_KATEGORI.pekerja}</option>
        </select>
      </Field>
      <Field label="Nama barang" error={state?.kolom?.nama?.[0]}><TextIn name="nama" maxLength={100} defaultValue={awal?.nama} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Satuan" error={state?.kolom?.satuan?.[0]}><TextIn name="satuan" maxLength={20} defaultValue={awal?.satuan ?? "pcs"} required /></Field>
        <Field label="Stok minimum" hint="Di bawah ini ditandai menipis." error={state?.kolom?.minimum?.[0]}><TextIn name="minimum" inputMode="decimal" defaultValue={awal ? angka(awal.stok_minimum) : ""} placeholder="0" /></Field>
      </div>
      <Field label="Lokasi simpan" hint="Boleh kosong."><TextIn name="lokasi" maxLength={60} defaultValue={awal?.lokasi} /></Field>
      <Field label="Keterangan" hint="Boleh kosong."><TextIn name="keterangan" maxLength={300} defaultValue={awal?.keterangan} /></Field>
      {awal && <label className="flex items-center gap-2.5 text-[13px]"><input type="checkbox" name="aktif" className="h-4 w-4 accent-[#00171F]" defaultChecked={awal.aktif} />Barang masih dipakai</label>}
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : awal ? "Simpan perubahan" : "Tambah barang"}</Btn>
    </form>
  );
}

function Riwayat({ b, gerak }: { b: Barang; gerak: GerakBarang[] }) {
  const baris = gerak.filter((g) => g.item_id === b.id);
  return (
    <div className="space-y-3">
      <p className="text-[13px]" style={{ color: MUTED }}>{b.nama} · stok sekarang <b style={{ color: INK }}>{angka(b.stok)} {b.satuan}</b></p>
      {baris.length === 0 ? <Inner><p className="py-2 text-center text-[13px]" style={{ color: MUTED }}>Belum ada riwayat.</p></Inner> : (
        <ul className="divide-y divide-[#EEF0F4] overflow-hidden rounded-2xl bg-white">
          {baris.map((g) => {
            const keluar = g.jenis === "keluar" || (g.jenis === "koreksi" && g.jumlah < 0);
            return (
              <li key={g.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium" style={{ color: INK }}>{g.jenis === "masuk" ? "Masuk" : g.jenis === "keluar" ? "Keluar" : "Koreksi"}{g.penerima ? ` · ${g.penerima}` : ""}</div>
                  <div className="text-[12px]" style={{ color: MUTED }}>{tanggal(g.tanggal)}{g.catatan ? ` · ${g.catatan}` : ""}</div>
                </div>
                <span className="shrink-0 text-[13.5px] font-semibold tabular-nums" style={{ color: keluar ? "#8A5A00" : "#0B6B4A" }}>{keluar ? "-" : "+"}{angka(Math.abs(g.jumlah))} {b.satuan}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- baris */
function BarisBarang({ b, bolehTulis, buka }: { b: Barang; bolehTulis: boolean; buka: (m: Modal_) => void }) {
  const pct = b.stok_minimum > 0 ? Math.min(100, (b.stok / (b.stok_minimum * 2)) * 100) : b.stok > 0 ? 100 : 0;
  const status = b.aktif ? b.status_stok : "habis";
  return (
    <li className={`flex flex-col gap-2.5 border-t border-[#EEF0F4] px-4 py-3.5 first:border-t-0 lg:px-5 ${KOLOM} hover:bg-[#FAFBFD]`} style={b.aktif ? undefined : { opacity: 0.6 }}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14.5px] font-semibold" style={{ color: INK }}>{b.nama}</span>
          <span className="rounded-md bg-[#EEF0F5] px-1.5 py-0.5 text-[10.5px] leading-none" style={{ color: "#4A5560" }}>{b.kode}</span>
          {!b.aktif && <span className="rounded-md bg-[#ECEDF1] px-1.5 py-0.5 text-[10.5px] leading-none" style={{ color: "#5A5F68" }}>Nonaktif</span>}
        </div>
        <div className="mt-0.5 text-[12px]" style={{ color: MUTED }}>{b.lokasi || "Lokasi belum diisi"}{b.terakhir ? ` · terakhir ${tanggal(b.terakhir)}` : ""}</div>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2 lg:block">
          <span className="text-[12px] lg:hidden" style={{ color: MUTED }}>Stok sekarang</span>
          <span><b className="text-[17px] font-semibold tabular-nums" style={{ color: WARNA[status] }}>{angka(b.stok)}</b> <span className="text-[12px]" style={{ color: MUTED }}>{b.satuan}</span></span>
        </div>
        <div className="mt-1.5" role="img" aria-label={`Stok ${angka(b.stok)} ${b.satuan}, minimum ${angka(b.stok_minimum)}`}><Bar pct={pct} color={WARNA[status]} /></div>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-[12.5px] tabular-nums lg:block" style={{ color: MUTED }}>
        <span className="lg:hidden">Batas minimum</span><span>{angka(b.stok_minimum)} {b.satuan}</span>
      </div>
      <div><Pill t={b.aktif ? LABEL_STATUS[status] : "Nonaktif"} /></div>
      <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
        {bolehTulis && b.aktif && <><Btn size="sm" onClick={() => buka({ jenis: "masuk", barang: b })}>Tambah stok</Btn><Btn size="sm" v="light" onClick={() => buka({ jenis: "keluar", barang: b })} disabled={b.stok <= 0}>Pakai</Btn></>}
        {bolehTulis && b.aktif && <Btn size="sm" v="ghost" onClick={() => buka({ jenis: "koreksi", barang: b })}>Koreksi</Btn>}
        <Btn size="sm" v="ghost" onClick={() => buka({ jenis: "riwayat", barang: b })}>Riwayat</Btn>
        {bolehTulis && <Btn size="sm" v="ghost" onClick={() => buka({ jenis: "ubah", barang: b })}>Ubah</Btn>}
      </div>
    </li>
  );
}

/* --------------------------------------------------------------- utama */
export function Penunjang({ kategori, barang, riwayat, bolehTulis }: { kategori: KategoriBarang; barang: Barang[]; riwayat: GerakBarang[]; bolehTulis: boolean }) {
  const [saring, setSaring] = useState<Saring>("semua");
  const [nonaktif, setNonaktif] = useState(false);
  const [modal, setModal] = useState<Modal_ | null>(null);
  const tutup = () => setModal(null);

  const kelompok = useMemo(() => barang.filter((b) => b.kategori === kategori), [barang, kategori]);
  const aktif = kelompok.filter((b) => b.aktif);
  const menipis = aktif.filter((b) => b.status_stok === "menipis").length;
  const habis = aktif.filter((b) => b.status_stok === "habis").length;
  const dasar = useMemo(() => kelompok.filter((b) => (nonaktif || b.aktif) && (saring === "semua" || b.status_stok === saring)), [kelompok, nonaktif, saring]);
  const teks = useMemo(() => (b: Barang) => `${b.nama} ${b.kode} ${b.lokasi} ${b.satuan} ${b.keterangan}`, []);
  const { q, setQ, hasil } = useCari(dasar, teks);

  const pilihan: { id: Saring; label: string; n: number }[] = [{ id: "semua", label: "Semua", n: aktif.length }, { id: "menipis", label: "Menipis", n: menipis }, { id: "habis", label: "Habis", n: habis }];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={String(aktif.length)} label="Macam barang" />
        <Stat value={String(menipis)} label="Hampir habis" tone={menipis > 0 ? "warn" : undefined} />
        <Stat value={String(habis)} label="Sudah habis" tone={habis > 0 ? "warn" : undefined} />
      </div>

      <Card title={NAMA_KATEGORI[kategori]} right={bolehTulis && <Btn size="sm" onClick={() => setModal({ jenis: "baru" })}><Icon n="plus" s={15} c="#fff" />Tambah barang</Btn>}>
        <div className="space-y-3">
          <p className="px-1 text-[12.5px]" style={{ color: MUTED }}>{KETERANGAN[kategori]}</p>
          <p className="rounded-xl bg-[#FBF0D5] px-3 py-2 text-[12px] leading-relaxed" style={{ color: "#8A5A00" }}>Daftar dan jumlah di bawah masih contoh. Setelah daftar asli diterima, angkanya diganti lewat tombol Koreksi.</p>
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
            <div role="group" aria-label="Filter stok" className="flex w-full gap-0.5 rounded-full bg-white p-1 md:w-auto md:gap-1">
              {pilihan.map((p) => (
                <button key={p.id} type="button" aria-pressed={saring === p.id} onClick={() => setSaring(p.id)}
                  className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 text-[12.5px] font-medium transition md:h-9 md:flex-none md:gap-1.5 md:px-4 md:text-[13px]"
                  style={saring === p.id ? { background: INK, color: "#fff" } : { color: MUTED }}>
                  {p.label}
                  <span className="rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums" style={saring === p.id ? { background: "rgba(255,255,255,.18)" } : { background: "#EEF0F5" }}>{p.n}</span>
                </button>
              ))}
            </div>
            <KotakCari q={q} onUbah={setQ} placeholder="Cari barang, kode, atau lokasi" tampil={hasil.length} total={dasar.length} className="md:w-[320px]" />
          </div>

          {hasil.length === 0 ? (
            <div className="rounded-[20px] bg-white px-4 py-8 text-center text-[13px]" style={{ color: MUTED }}>
              {kelompok.length === 0 ? "Belum ada barang di kelompok ini." : q.trim() ? `Tidak ada barang yang cocok dengan “${q.trim()}”.` : "Tidak ada barang untuk filter ini."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[20px] bg-white">
              <div className={`hidden border-b border-[#EEF0F4] px-5 py-3 text-[12px] font-medium ${KOLOM}`} style={{ color: MUTED }} aria-hidden>
                <span>Barang</span><span>Stok sekarang</span><span>Batas minimum</span><span>Keadaan</span><span className="text-right">Aksi</span>
              </div>
              <ul>{hasil.map((b) => <BarisBarang key={b.id} b={b} bolehTulis={bolehTulis} buka={setModal} />)}</ul>
            </div>
          )}
          {kelompok.some((b) => !b.aktif) && (
            <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={() => setNonaktif((x) => !x)}>{nonaktif ? "Sembunyikan barang nonaktif" : "Tampilkan barang nonaktif"}</Btn></div>
          )}
        </div>
      </Card>

      {modal?.jenis === "masuk" && <Modal title={`Tambah stok · ${modal.barang.nama}`} onClose={tutup}><FormMasuk b={modal.barang} onTutup={tutup} /></Modal>}
      {modal?.jenis === "keluar" && <Modal title={`Pemakaian · ${modal.barang.nama}`} onClose={tutup}><FormKeluar b={modal.barang} onTutup={tutup} /></Modal>}
      {modal?.jenis === "koreksi" && <Modal title={`Koreksi · ${modal.barang.nama}`} onClose={tutup}><FormKoreksi b={modal.barang} onTutup={tutup} /></Modal>}
      {modal?.jenis === "riwayat" && <Modal title={`Riwayat · ${modal.barang.nama}`} onClose={tutup}><Riwayat b={modal.barang} gerak={riwayat} /></Modal>}
      {modal?.jenis === "ubah" && <Modal title={`Ubah ${modal.barang.nama}`} onClose={tutup}><FormBarang kategori={kategori} awal={modal.barang} onTutup={tutup} /></Modal>}
      {modal?.jenis === "baru" && <Modal title={`Tambah ${NAMA_KATEGORI[kategori].toLowerCase()}`} onClose={tutup}><FormBarang kategori={kategori} awal={null} onTutup={tutup} /></Modal>}
    </div>
  );
}
