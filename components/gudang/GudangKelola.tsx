"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Btn, Card, DataList, Field, Inner, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { batalkanBooking, buatBooking, pindahBooking, terimaTitipan, ubahTarif } from "@/lib/actions/stok";
import { rp, tanggal } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import { cariBentrok, slotKosong } from "@/lib/logic/jadwal";
import { uraikanBiaya } from "@/lib/logic/tarif";
import type { Opsi } from "@/lib/types/pembelian";
import type { AturanTarif, Booking, IsiGudang, Tagihan, UnitStok } from "@/lib/types/stok";
import { jamWib, keInputWib, sekarangInputWib } from "@/lib/waktu";

type Props = {
  titipan: UnitStok[];
  isi: IsiGudang;
  tagihan: Tagihan[];
  tarif: AturanTarif[];
  booking: Booking[];
  pelanggan: Opsi[];
  produk: Opsi[];
  grade: Opsi[];
  mitra: Opsi[];
  bolehTulis: boolean;
  bolehTarif: boolean;
  hariIni: string;
};

const kgTeks = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;
const LABEL_JASA = { simpan: "Simpan", abf: "ABF", transit: "Transit" } as const;

/* ------------------------------------------------------------ titipan */
function FormTitipan({ pelanggan, produk, grade, onTutup }: { pelanggan: Opsi[]; produk: Opsi[]; grade: Opsi[]; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(terimaTitipan, undefined);
  const [kondisi, setKondisi] = useState("fresh");
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  return (
    <form action={action} className="space-y-3">
      <PesanForm state={state?.error ? state : undefined} />
      {pelanggan.length === 0 ? <p className="text-[13px]" style={{ color: MUTED }}>Belum ada pelanggan. Tambahkan dulu di Pengaturan.</p> : (
        <>
          <Field label="Pelanggan pemilik titipan" error={state?.kolom?.buyerId?.[0]}>
            <select name="buyerId" className={pilihCls} defaultValue="" required><option value="" disabled>Pilih pelanggan</option>{pelanggan.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Produk" error={state?.kolom?.productId?.[0]}>
              <select name="productId" className={pilihCls} defaultValue="" required><option value="" disabled>Pilih</option>{produk.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
            </Field>
            <Field label="Grade" hint="Boleh kosong."><select name="gradeId" className={pilihCls} defaultValue=""><option value="">Tanpa grade</option>{grade.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
            <Field label="Kondisi"><select name="kondisi" className={pilihCls} value={kondisi} onChange={(e) => setKondisi(e.target.value)}><option value="fresh">Fresh</option><option value="beku">Beku</option></select></Field>
            <Field label="Berat (kg)" error={state?.kolom?.kg?.[0]}><TextIn name="kg" inputMode="decimal" placeholder="0,000" required /></Field>
          </div>
          <Field label="Lokasi" hint="Misalnya rak atau ruang."><TextIn name="lokasi" maxLength={60} /></Field>
          {kondisi === "fresh" && (
            <label className="flex items-start gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]">
              <input type="checkbox" name="perluAbf" className="mt-0.5 h-4 w-4 accent-[#00171F]" /><span>Dibekukan di ABF (ditagih terpisah).</span>
            </label>
          )}
          <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
          <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Terima titipan"}</Btn>
        </>
      )}
    </form>
  );
}

/* ------------------------------------------------------------ tagihan */
function RincianTagihan({ t, onTutup }: { t: Tagihan; onTutup: () => void }) {
  const r = t.rincian;
  const baris = t.jenis === "abf"
    ? [`${tampilKg(Math.round(t.kg_dasar * 1000))} kg × ${rp(t.tarif_per_kg)} = ${rp(t.jumlah)}`, "ABF ditagih sekali per kg dan terpisah dari biaya simpan."]
    : uraikanBiaya({
        transit: !!r.transit, detik: r.detik ?? 0, hariBulat: r.hari_bulat ?? 0, hariDitagih: t.hari_ditagih, tarifPerKg: t.tarif_per_kg,
        kgDasar: t.kg_dasar, jumlah: t.jumlah, minimumHari: r.minimum_hari ?? 10, masaTransitJam: r.masa_transit_jam ?? 3,
      });
  return (
    <Modal title={`${t.kode} · ${t.pemilik_nama}`} onClose={onTutup}>
      <div className="flex flex-wrap gap-1.5"><Pill t={LABEL_JASA[t.jenis]} />{r.dikonfirmasi === false && <Pill t="Tarif belum dikonfirmasi" />}</div>
      <Inner className="!p-3.5">
        <ul className="space-y-1.5 text-[13px]" style={{ color: INK }}>{baris.map((b, i) => <li key={i}>{b}</li>)}</ul>
        <p className="mt-2 text-[12px]" style={{ color: MUTED }}>
          Masuk {jamWib(t.masuk_pada)}{t.keluar_pada ? ` · keluar ${jamWib(t.keluar_pada)}` : ""}
          {r.dasar_berat ? ` · dasar berat: ${r.dasar_berat}` : ""}{r.kg_timbang_keluar ? ` · timbang keluar ${tampilKg(Math.round(r.kg_timbang_keluar * 1000))} kg` : ""}
        </p>
      </Inner>
      <div className="flex justify-between text-[15px] font-semibold" style={{ color: INK }}><span>Total</span><span>{rp(t.jumlah)}</span></div>
      <Btn full v="light" onClick={() => window.print()}>Cetak rincian</Btn>
    </Modal>
  );
}

/* --------------------------------------------------------------- tarif */
function FormTarif({ aturan, onTutup, hariIni }: { aturan: AturanTarif; onTutup: () => void; hariIni: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(ubahTarif, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="jenis" value={aturan.jenis} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[12.5px]" style={{ color: MUTED }}>Tarif baru berlaku mulai tanggal yang dipilih. Tagihan lama tetap memakai tarif saat ikan masuk.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={aturan.jenis === "simpan" ? "Tarif simpan (Rp/kg/hari)" : "Tarif (Rp/kg)"} error={state?.kolom?.tarif?.[0]}><TextIn name="tarif" type="number" step="0.01" min="0" defaultValue={aturan.tarif_per_kg} required /></Field>
        <Field label="Berlaku mulai" error={state?.kolom?.berlakuDari?.[0]}><TextIn name="berlakuDari" type="date" defaultValue={hariIni} required /></Field>
        <Field label="Minimum hari simpan" error={state?.kolom?.minimumHari?.[0]}><TextIn name="minimumHari" type="number" min="1" defaultValue={aturan.minimum_hari} required /></Field>
        <Field label="Masa transit (jam)" error={state?.kolom?.masaTransitJam?.[0]}><TextIn name="masaTransitJam" type="number" min="0" defaultValue={aturan.masa_transit_jam} required /></Field>
      </div>
      <Field label="Dasar berat tagihan simpan">
        <select name="dasarBerat" className={pilihCls} defaultValue={aturan.dasar_berat}><option value="masuk">Berat masuk</option><option value="keluar">Berat keluar (timbang ulang)</option></select>
      </Field>
      <label className="flex items-center gap-2.5 text-[13px]"><input type="checkbox" name="dikonfirmasi" className="h-4 w-4 accent-[#00171F]" defaultChecked={aturan.dikonfirmasi} />Angka ini sudah dikonfirmasi owner</label>
      <Field label="Catatan"><TextIn name="catatan" maxLength={300} defaultValue={aturan.catatan} /></Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan tarif"}</Btn>
    </form>
  );
}

/* -------------------------------------------------------------- jadwal */
function FormBooking({ booking, mitra, onTutup }: { booking: Booking[]; mitra: Opsi[]; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(buatBooking, undefined);
  const [mulai, setMulai] = useState(() => sekarangInputWib());
  const [selesai, setSelesai] = useState(() => keInputWib(new Date(Date.now() + 2 * 3600 * 1000)));
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);

  const rentang = useMemo(() => booking.map((b) => ({ id: b.id, label: b.label, mulai: new Date(b.mulai), selesai: new Date(b.selesai) })), [booking]);
  const m = new Date(`${mulai}:00+07:00`);
  const s = new Date(`${selesai}:00+07:00`);
  const sahRentang = !Number.isNaN(m.getTime()) && !Number.isNaN(s.getTime()) && s > m;
  const bentrokan = sahRentang ? cariBentrok(rentang, { mulai: m, selesai: s }) : [];
  const pakaiKosong = () => {
    const durasi = Math.round((s.getTime() - m.getTime()) / 60000);
    const t = slotKosong(rentang, durasi, m);
    setMulai(keInputWib(t));
    setSelesai(keInputWib(new Date(t.getTime() + durasi * 60000)));
  };
  return (
    <form action={action} className="space-y-3">
      <PesanForm state={state?.error ? state : undefined} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Jenis"><select name="jenis" className={pilihCls} defaultValue="abf"><option value="abf">ABF</option><option value="produksi">Produksi</option></select></Field>
        <Field label="Mitra" hint="Kosong = milik sendiri."><select name="partnerId" className={pilihCls} defaultValue=""><option value="">Milik sendiri</option>{mitra.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
        <Field label="Mulai (WIB)" error={state?.kolom?.mulai?.[0]}><TextIn name="mulai" type="datetime-local" value={mulai} onChange={(e) => setMulai(e.target.value)} required /></Field>
        <Field label="Selesai (WIB)" error={state?.kolom?.selesai?.[0]}><TextIn name="selesai" type="datetime-local" value={selesai} onChange={(e) => setSelesai(e.target.value)} required /></Field>
      </div>
      {bentrokan.length > 0 && (
        <div role="alert" className="space-y-2 rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>
          <p>Bentrok dengan: {bentrokan.map((b) => `${b.label} (${jamWib(b.mulai)}–${jamWib(b.selesai)})`).join(", ")}.</p>
          <Btn size="sm" v="light" onClick={pakaiKosong}>Pakai jam kosong pertama</Btn>
        </div>
      )}
      <Field label="Keterangan" error={state?.kolom?.label?.[0]}><TextIn name="label" maxLength={120} placeholder="Misalnya ABF titipan Pak Budi" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Perkiraan berat (kg)" hint="Boleh kosong."><TextIn name="kg" inputMode="decimal" /></Field>
        <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
      </div>
      <Btn type="submit" full disabled={pending || bentrokan.length > 0}>{pending ? "Menyimpan..." : "Simpan jadwal"}</Btn>
    </form>
  );
}

function AksiBooking({ b, booking, onTutup }: { b: Booking; booking: Booking[]; onTutup: () => void }) {
  const [batal, aksiBatal, sedangBatal] = useActionState<HasilForm, FormData>(batalkanBooking, undefined);
  const [statePindah, aksiPindah, sedangPindah] = useActionState<HasilForm, FormData>(pindahBooking, undefined);
  useEffect(() => { if (batal?.pesan || statePindah?.pesan) onTutup(); }, [batal, statePindah, onTutup]);
  const durasi = Math.round((new Date(b.selesai).getTime() - new Date(b.mulai).getTime()) / 60000);
  const kosong = slotKosong(booking.map((x) => ({ id: x.id, mulai: new Date(x.mulai), selesai: new Date(x.selesai) })), durasi, new Date(b.mulai), b.id);
  return (
    <div className="space-y-4">
      <p className="text-[13px]" style={{ color: MUTED }}>{b.label} · {jamWib(b.mulai)}–{jamWib(b.selesai)}</p>
      <form action={aksiPindah} className="space-y-2.5">
        <input type="hidden" name="bookingId" value={b.id} />
        <PesanForm state={statePindah} />
        <Field label="Pindah ke jam mulai (WIB)" error={statePindah?.kolom?.mulai?.[0]} hint={`Jam kosong pertama: ${jamWib(kosong)}`}>
          <TextIn name="mulai" type="datetime-local" defaultValue={keInputWib(kosong)} />
        </Field>
        <Btn type="submit" full v="light" disabled={sedangPindah}>{sedangPindah ? "Memindah..." : "Pindahkan jadwal"}</Btn>
      </form>
      <form action={aksiBatal} className="space-y-2.5 border-t border-[#E2E4EA] pt-4">
        <input type="hidden" name="bookingId" value={b.id} />
        <PesanForm state={batal} />
        <Field label="Alasan membatalkan" error={batal?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={300} required /></Field>
        <KonfirmasiDua full label="Batalkan jadwal" labelYa="Ya, batalkan jadwal" pending={sedangBatal} pesan="Jam ini dilepas dan bisa dipakai jadwal lain." />
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- utama */
export function GudangKelola({ titipan, isi, tagihan, tarif, booking, pelanggan, produk, grade, mitra, bolehTulis, bolehTarif, hariIni }: Props) {
  const [terima, setTerima] = useState(false);
  const [rincian, setRincian] = useState<Tagihan | null>(null);
  const [ubah, setUbah] = useState<AturanTarif | null>(null);
  const [jadwalBaru, setJadwalBaru] = useState(false);
  const [aksi, setAksi] = useState<Booking | null>(null);
  const aktif = titipan.filter((u) => u.status === "aktif");
  const total = isi.isi_sendiri_kg + isi.isi_titipan_kg;
  const persen = isi.kapasitas_kg > 0 ? (total / isi.kapasitas_kg) * 100 : 0;
  const aturanBerlaku = tarif.filter((a, i, semua) => semua.findIndex((x) => x.jenis === a.jenis) === i);
  const belumKonfirmasi = aturanBerlaku.some((a) => !a.dikonfirmasi);
  const namaMitra = new Map(mitra.map((m) => [m.id, m.label]));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Stat value={kgTeks(isi.isi_titipan_kg)} label="Titipan di gudang" />
        <Stat value={kgTeks(isi.isi_sendiri_kg)} label="Stok sendiri di gudang" />
        <Stat value={`${persen.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`} label={`Terisi dari ${kgTeks(isi.kapasitas_kg)}`} tone={persen > 90 ? "warn" : undefined} />
        <Stat value={rp(tagihan.reduce((a, t) => a + Math.round(t.jumlah * 100), 0) / 100)} label="Total tagihan jasa tercatat" />
      </div>

      <Card title="Titipan pelanggan" right={bolehTulis && <Btn size="sm" onClick={() => setTerima(true)}>Terima titipan</Btn>}>
        <DataList
          rows={aktif}
          empty="Tidak ada titipan di gudang."
          cols={[
            { h: "Pelanggan", r: (u: UnitStok) => <><span className="font-medium">{u.pemilik_nama}</span><span className="block text-[12px]" style={{ color: MUTED }}>{u.kode} · masuk {tanggal(u.masuk_pada)}</span></> },
            { h: "Produk", r: (u) => `${u.product_nama}${u.grade_kode ? ` · ${u.grade_kode}` : ""}` },
            { h: "Kondisi", r: (u) => <Pill t={u.kondisi === "beku" ? "Beku" : u.perlu_abf ? "Fresh + ABF" : "Fresh"} /> },
            { h: "Lokasi", r: (u) => u.lokasi || "-" },
            { h: "Sisa", r: (u) => kgTeks(u.sisa_kg), right: true },
          ]}
        />
        <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>Titipan diambil dari menu Stok. Tagihan jasa dibuat otomatis saat diambil.</p>
      </Card>

      <Card title="Tagihan jasa gudang">
        <DataList
          rows={tagihan}
          empty="Belum ada tagihan jasa."
          cols={[
            { h: "Tagihan", r: (t: Tagihan) => <><span className="font-medium">{t.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{t.pemilik_nama}</span></> },
            { h: "Jenis", r: (t) => <Pill t={LABEL_JASA[t.jenis]} /> },
            { h: "Berat dasar", r: (t) => kgTeks(t.kg_dasar), right: true },
            { h: "Hari", r: (t) => (t.jenis === "abf" ? "-" : String(t.hari_ditagih)), right: true },
            { h: "Jumlah", r: (t) => rp(t.jumlah), right: true },
          ]}
          actions={(t) => <Btn size="sm" v="light" onClick={() => setRincian(t)}>Rincian</Btn>}
        />
      </Card>

      <Card title="Tarif">
        {belumKonfirmasi && <div className="px-2.5 pb-2"><p className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Sebagian angka tarif belum dikonfirmasi owner. Tagihan tetap dihitung dengan angka ini dan ditandai di rincian.</p></div>}
        <DataList
          rows={tarif}
          empty="Belum ada tarif."
          cols={[
            { h: "Layanan", r: (a: AturanTarif) => <><span className="font-medium">{LABEL_JASA[a.jenis]}</span><span className="block text-[12px]" style={{ color: MUTED }}>berlaku {tanggal(a.berlaku_dari)}</span></> },
            { h: "Tarif", r: (a) => `${rp(a.tarif_per_kg)}${a.jenis === "simpan" ? "/kg/hari" : "/kg"}`, right: true },
            { h: "Aturan", r: (a) => (a.jenis === "simpan" ? `minimum ${a.minimum_hari} hari · transit ${a.masa_transit_jam} jam · dasar ${a.dasar_berat}` : "-") },
            { h: "Status", r: (a) => <Pill t={a.dikonfirmasi ? "Dikonfirmasi" : "Belum dikonfirmasi"} /> },
          ]}
          actions={(a) => (bolehTarif ? <Btn size="sm" v="light" onClick={() => setUbah(a)}>Ubah</Btn> : null)}
        />
      </Card>

      <Card title="Jadwal mesin (ABF dan mitra)" right={bolehTulis && <Btn size="sm" onClick={() => setJadwalBaru(true)}>Tambah jadwal</Btn>}>
        <DataList
          rows={booking}
          empty="Belum ada jadwal."
          cols={[
            { h: "Jadwal", r: (b: Booking) => <><span className="font-medium">{b.label}</span><span className="block text-[12px]" style={{ color: MUTED }}>{b.partner_id ? namaMitra.get(b.partner_id) ?? "Mitra" : "Milik sendiri"}</span></> },
            { h: "Jenis", r: (b) => <Pill t={b.jenis === "abf" ? "ABF" : "Produksi"} /> },
            { h: "Mulai", r: (b) => jamWib(b.mulai) },
            { h: "Selesai", r: (b) => jamWib(b.selesai) },
          ]}
          actions={(b) => (bolehTulis ? <Btn size="sm" v="light" onClick={() => setAksi(b)}>Atur</Btn> : null)}
        />
      </Card>

      {terima && <Modal title="Terima titipan" onClose={() => setTerima(false)}><FormTitipan pelanggan={pelanggan} produk={produk} grade={grade} onTutup={() => setTerima(false)} /></Modal>}
      {rincian && <RincianTagihan t={rincian} onTutup={() => setRincian(null)} />}
      {ubah && <Modal title={`Ubah tarif ${LABEL_JASA[ubah.jenis]}`} onClose={() => setUbah(null)}><FormTarif aturan={ubah} hariIni={hariIni} onTutup={() => setUbah(null)} /></Modal>}
      {jadwalBaru && <Modal title="Tambah jadwal" onClose={() => setJadwalBaru(false)}><FormBooking booking={booking} mitra={mitra} onTutup={() => setJadwalBaru(false)} /></Modal>}
      {aksi && <Modal title="Atur jadwal" onClose={() => setAksi(null)}><AksiBooking b={aksi} booking={booking} onTutup={() => setAksi(null)} /></Modal>}
    </div>
  );
}
