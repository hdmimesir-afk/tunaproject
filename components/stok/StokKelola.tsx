"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Card, DataList, Field, Inner, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { ajukanKoreksi, ambilStok, masukkanHasil, putuskanKoreksi } from "@/lib/actions/stok";
import { waktu } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import type { Opsi } from "@/lib/types/pembelian";
import type { GerakStok, IsiGudang, ProduksiSiapStok, UnitStok } from "@/lib/types/stok";

type Koreksi = GerakStok & { unit_kode: string; sisa_kg: number };

type Props = {
  units: UnitStok[];
  isi: IsiGudang;
  koreksi: Koreksi[];
  produksi: ProduksiSiapStok[];
  produk: Opsi[];
  grade: Opsi[];
  bolehTulis: boolean;
  bolehSetuju: boolean;
  bolehTitipan: boolean;
};

const kgTeks = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;

/* -------------------------------------------------------- hasil masuk */
function FormHasil({ produksi, produk, grade, onTutup }: { produksi: ProduksiSiapStok[]; produk: Opsi[]; grade: Opsi[]; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(masukkanHasil, undefined);
  const [langsung, setLangsung] = useState(false);
  const [kondisi, setKondisi] = useState("beku");
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  return (
    <form action={action} className="space-y-3">
      <PesanForm state={state?.error ? state : undefined} />
      {produksi.length === 0 ? (
        <p className="text-[13px]" style={{ color: MUTED }}>Belum ada produksi yang disetujui Owner dengan hasil yang belum masuk stok.</p>
      ) : (
        <>
          <Field label="Produksi" error={state?.kolom?.produksiId?.[0]}>
            <select name="produksiId" className={pilihCls} defaultValue="" required>
              <option value="" disabled>Pilih produksi</option>
              {produksi.map((p) => <option key={p.id} value={p.id}>{p.kode} · sisa {kgTeks(p.sisaKg)}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Produk" error={state?.kolom?.productId?.[0]}>
              <select name="productId" className={pilihCls} defaultValue="" required>
                <option value="" disabled>Pilih</option>
                {produk.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </Field>
            <Field label="Grade" hint="Boleh kosong.">
              <select name="gradeId" className={pilihCls} defaultValue="">
                <option value="">Tanpa grade</option>
                {grade.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </Field>
            <Field label="Kondisi" error={state?.kolom?.kondisi?.[0]}>
              <select name="kondisi" className={pilihCls} value={kondisi} onChange={(e) => { setKondisi(e.target.value); if (e.target.value !== "fresh") setLangsung(false); }}>
                <option value="beku">Beku</option><option value="fresh">Fresh</option>
              </select>
            </Field>
            <Field label="Berat (kg)" error={state?.kolom?.kg?.[0]}><TextIn name="kg" inputMode="decimal" placeholder="0,000" required /></Field>
          </div>
          {!langsung && <Field label="Lokasi di gudang" hint="Misalnya rak atau ruang."><TextIn name="lokasi" maxLength={60} /></Field>}
          {kondisi === "fresh" && (
            <label className="flex items-start gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]">
              <input type="checkbox" name="langsungKirim" className="mt-0.5 h-4 w-4 accent-[#00171F]" checked={langsung} onChange={(e) => setLangsung(e.target.checked)} />
              <span>Fresh langsung kirim, tidak masuk gudang.</span>
            </label>
          )}
          <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
          <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : langsung ? "Catat langsung kirim" : "Masukkan ke stok"}</Btn>
        </>
      )}
    </form>
  );
}

/* ---------------------------------------------------------- ambil stok */
function FormAmbil({ unit, onTutup }: { unit: UnitStok; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(ambilStok, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="unitId" value={unit.id} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[13px]" style={{ color: MUTED }}>{unit.pemilik_nama} · {unit.product_nama}{unit.grade_kode ? ` ${unit.grade_kode}` : ""} · sisa {kgTeks(unit.sisa_kg)}</p>
      <Field label="Berat keluar, hasil timbang ulang (kg)" error={state?.kolom?.kg?.[0]}><TextIn name="kg" inputMode="decimal" placeholder="0,000" required /></Field>
      <Field label="Keterangan" hint="Misalnya tujuan kirim."><TextIn name="alasan" maxLength={300} /></Field>
      {unit.buyer_id && <p className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Titipan pelanggan: tagihan jasa dibuat otomatis saat diambil.</p>}
      <KonfirmasiDua full label="Catat pengambilan" labelYa="Ya, ambil dari gudang" pending={pending} pesan="Stok berkurang sesuai berat yang ditimbang. Lanjutkan?" />
    </form>
  );
}

/* ------------------------------------------------------------- koreksi */
function FormKoreksi({ unit, onTutup }: { unit: UnitStok; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(ajukanKoreksi, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="unitId" value={unit.id} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[13px]" style={{ color: MUTED }}>Sisa tercatat {kgTeks(unit.sisa_kg)}. Koreksi baru berlaku setelah disetujui Owner.</p>
      <Field label="Selisih berat (kg), minus untuk mengurangi" error={state?.kolom?.selisih?.[0]}><TextIn name="selisih" inputMode="text" placeholder="-1,500" required /></Field>
      <Field label="Alasan" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={300} required /></Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Mengajukan..." : "Ajukan koreksi"}</Btn>
    </form>
  );
}

function PutusanKoreksi({ k }: { k: Koreksi }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(putuskanKoreksi, undefined);
  const [tolak, setTolak] = useState(false);
  return (
    <Inner className="!p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span><b>{k.unit_kode}</b> · {k.kg > 0 ? "+" : ""}{tampilKg(Math.round(k.kg * 1000))} kg · sisa sekarang {kgTeks(k.sisa_kg)}</span>
        <span style={{ color: MUTED }}>{waktu(k.waktu)}</span>
      </div>
      <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>Alasan: {k.alasan}</p>
      <form action={action} className="mt-2.5 space-y-2.5">
        <input type="hidden" name="gerakId" value={k.id} />
        <PesanForm state={state} />
        {!tolak ? (
          <>
            <input type="hidden" name="setuju" value="ya" /><input type="hidden" name="catatan" value="" />
            <KonfirmasiDua full size="sm" label="Setujui koreksi" labelYa="Ya, setujui koreksi" pending={pending} pesan="Stok langsung berubah sesuai selisih ini. Lanjutkan?" />
            <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={() => setTolak(true)}>Tolak koreksi...</Btn></div>
          </>
        ) : (
          <>
            <input type="hidden" name="setuju" value="tidak" />
            <Field label="Alasan menolak"><TextIn name="catatan" maxLength={300} required /></Field>
            <Btn type="submit" full v="danger" disabled={pending}>{pending ? "Menolak..." : "Tolak koreksi"}</Btn>
            <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={() => setTolak(false)}>Kembali</Btn></div>
          </>
        )}
      </form>
    </Inner>
  );
}

/* --------------------------------------------------------------- utama */
export function StokKelola({ units, isi, koreksi, produksi, produk, grade, bolehTulis, bolehSetuju, bolehTitipan }: Props) {
  const [hasil, setHasil] = useState(false);
  const [ambil, setAmbil] = useState<UnitStok | null>(null);
  const [koreksiUnit, setKoreksiUnit] = useState<UnitStok | null>(null);
  const [semua, setSemua] = useState(false);
  const tampil = semua ? units : units.filter((u) => u.status === "aktif");
  const totalIsi = isi.isi_sendiri_kg + isi.isi_titipan_kg;
  const bolehAmbil = (u: UnitStok) => u.status === "aktif" && (u.buyer_id ? bolehTitipan : bolehTulis);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Stat value={kgTeks(isi.isi_sendiri_kg)} label="Stok milik sendiri" />
        <Stat value={kgTeks(isi.isi_titipan_kg)} label="Titipan pelanggan" />
        <Stat value={kgTeks(Math.max(0, isi.kapasitas_kg - totalIsi))} label={`Sisa kapasitas dari ${kgTeks(isi.kapasitas_kg)}`} tone={totalIsi > isi.kapasitas_kg * 0.9 ? "warn" : undefined} />
        <Stat value={String(koreksi.length)} label="Koreksi menunggu Owner" tone={koreksi.length > 0 ? "warn" : undefined} />
      </div>

      {bolehSetuju && koreksi.length > 0 && (
        <Card title="Koreksi stok menunggu persetujuan">
          <div className="space-y-2">{koreksi.map((k) => <PutusanKoreksi key={k.id} k={k} />)}</div>
        </Card>
      )}

      <Card title="Stok" right={<div className="flex gap-2"><Btn size="sm" v="light" onClick={() => setSemua((s) => !s)}>{semua ? "Hanya yang aktif" : "Tampilkan semua"}</Btn>{bolehTulis && <Btn size="sm" onClick={() => setHasil(true)}>Hasil produksi masuk</Btn>}</div>}>
        <DataList
          rows={tampil}
          empty="Belum ada stok."
          cols={[
            { h: "Unit", r: (u: UnitStok) => <><span className="font-medium">{u.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{u.pemilik_nama}{u.production_kode ? ` · ${u.production_kode}` : ""}</span></> },
            { h: "Produk", r: (u) => `${u.product_nama}${u.grade_kode ? ` · ${u.grade_kode}` : ""}` },
            { h: "Kondisi", r: (u) => <Pill t={u.langsung_kirim ? "Langsung kirim" : u.kondisi === "beku" ? "Beku" : "Fresh"} /> },
            { h: "Lokasi", r: (u) => u.lokasi || "-" },
            { h: "Masuk", r: (u) => kgTeks(u.kg_masuk), right: true },
            { h: "Sisa", r: (u) => kgTeks(u.sisa_kg), right: true },
          ]}
          actions={(u) => (
            <>
              {bolehAmbil(u) && <Btn size="sm" v="light" onClick={() => setAmbil(u)}>Ambil</Btn>}
              {bolehTulis && u.status === "aktif" && <Btn size="sm" v="ghost" onClick={() => setKoreksiUnit(u)}>Koreksi</Btn>}
            </>
          )}
        />
      </Card>

      {hasil && <Modal title="Hasil produksi masuk stok" onClose={() => setHasil(false)}><FormHasil produksi={produksi} produk={produk} grade={grade} onTutup={() => setHasil(false)} /></Modal>}
      {ambil && <Modal title={`Ambil ${ambil.kode}`} onClose={() => setAmbil(null)}><FormAmbil unit={ambil} onTutup={() => setAmbil(null)} /></Modal>}
      {koreksiUnit && <Modal title={`Koreksi ${koreksiUnit.kode}`} onClose={() => setKoreksiUnit(null)}><FormKoreksi unit={koreksiUnit} onTutup={() => setKoreksiUnit(null)} /></Modal>}
    </div>
  );
}
