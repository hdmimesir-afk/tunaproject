"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { DaftarDokumen, Unggah } from "@/components/dokumen/Dokumen";
import { Btn, Card, Field, Inner, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { HapusItem } from "@/components/ui/HapusItem";
import { RiwayatKoreksi } from "@/components/ui/RiwayatKoreksi";
import type { Koreksi } from "@/lib/data/koreksi";
import { DaftarInvoice, DaftarPesanan } from "./DaftarPenjualan";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import {
  batalkanInvoice, batalkanPesanan, catatBeratDiterima, hapusPesanan, hapusUangMasuk, kirimPesanan, koreksiPesananTerkirim, koreksiUangMasuk,
  simpanPesanan, terbitkanInvoice, terbitkanInvoiceJasa, terimaPembayaran,
} from "@/lib/actions/penjualan";
import type { DetailInvoice, DetailPesanan } from "@/lib/data/penjualan";
import { rp, tanggal , bacaAngka } from "@/lib/format";
import { gramKeTeks, keGram, tampilKg } from "@/lib/logic/grid";
import { hitungPotongan, jumlahBaris, LABEL_PESANAN, LABEL_TAGIHAN, linkWa, pesanPengingat, totalBaris } from "@/lib/logic/penjualan";
import type { Opsi } from "@/lib/types/pembelian";
import type { HasilTertunda, Invoice, Jasa, JasaBelumDitagih, PembayaranPembeli, Pembeli, Pesanan, UnitJual } from "@/lib/types/penjualan";
import { AturPajakDiskon, DaftarHargaJasa, FormPesananJasa, IsianPajakDiskon, potonganAwal, RincianTotal } from "./Jasa";

type Props = {
  /** Daftar harga jasa produksi (25 Nov 2026) dan persen pajak bawaan. */
  daftarJasa: Jasa[];
  pajakBawaan: number;
  /** Riwayat koreksi harga jasa. */
  koreksiJasa: Koreksi[];
  pesanan: Pesanan[];
  invoice: Invoice[];
  unit: UnitJual[];
  pembeli: Pembeli[];
  siklus: Opsi[];
  jasa: JasaBelumDitagih[];
  detailP: DetailPesanan | null;
  detailI: DetailInvoice | null;
  tertunda: HasilTertunda[];
  bolehBuat: boolean;
  bolehKirim: boolean;
  bolehInvoice: boolean;
  bolehBayar: boolean;
  bolehDokumen: boolean;
  hariIni: string;
  /** Riwayat koreksi pesanan atau uang masuk yg lagi dibuka. */
  koreksi: Koreksi[];
  pengguna: Record<string, { nama: string }>;
};

const kgTeks = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;
const kgInput = (n: number | null | undefined) => (n === null || n === undefined ? "" : gramKeTeks(Math.round(n * 1000)).replace(".", ","));

/* ------------------------------------------------------ form pesanan */
type BarisForm = { id?: string; unit_id: string; kg: string; harga: string };

const SEBAB_TERTUNDA: Record<HasilTertunda["sebab"], string> = {
  belum_stok: "udah disetujui, tapi belum masuk stok. Masukin dulu di menu Stok lewat tombol Hasil produksi masuk.",
  tunggu_qc: "masih nunggu dicek QC.",
  tunggu_owner: "masih nunggu persetujuan Owner.",
};

/** Daftar hasil produksi yang belum bisa dipilih beserta langkah yang kurang, supaya tidak dikira hilang. */
function HasilBelumSiap({ tertunda }: { tertunda: HasilTertunda[] }) {
  if (tertunda.length === 0) return null;
  return (
    <div className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }} data-testid="hasil-belum-siap">
      <p className="font-medium">Hasil produksi yang belum bisa dipilih:</p>
      <ul className="mt-1 space-y-0.5">
        {tertunda.map((t) => <li key={t.kode + t.sebab}>{t.kode} ({kgTeks(t.kg)}) {SEBAB_TERTUNDA[t.sebab]}</li>)}
      </ul>
      {tertunda.some((t) => t.sebab === "belum_stok") && <a href="/stok" className="mt-1 inline-flex min-h-[32px] items-center font-medium underline">Buka menu Stok</a>}
    </div>
  );
}

function FormPesananJual({ unit, pembeli, siklus, hariIni, awal, tertunda = [], pajakBawaan, onSelesai }: {
  unit: UnitJual[]; pembeli: Pembeli[]; siklus: Opsi[]; hariIni: string; awal: DetailPesanan | null; tertunda?: HasilTertunda[]; pajakBawaan: number; onSelesai: (id: string) => void;
}) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanPesanan, undefined);
  const [baris, setBaris] = useState<BarisForm[]>(() =>
    awal ? awal.baris.map((b) => ({ id: b.id, unit_id: b.unit_id, kg: kgInput(b.kg_pesan), harga: String(b.harga_per_kg).replace(".", ",") })) : [{ unit_id: "", kg: "", harga: "" }]);
  useEffect(() => { if (state?.id && !state.error) onSelesai(state.id); }, [state, onSelesai]);
  const ubah = (i: number, k: keyof BarisForm, v: string) => setBaris((b) => b.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const hitung = totalBaris(baris.map((b) => ({ kg: bacaAngka(b.kg) || 0, harga: bacaAngka(b.harga) || 0 })));
  return (
    <form action={action} className="space-y-3">
      {awal && <input type="hidden" name="pesananId" value={awal.pesanan.id} />}
      <input type="hidden" name="baris" value={JSON.stringify(baris)} />
      <PesanForm state={state?.error ? state : undefined} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pembeli" error={state?.kolom?.buyerId?.[0]}>
          <select name="buyerId" className={pilihCls} defaultValue={awal?.pesanan.buyer_id ?? ""} required>
            <option value="" disabled>Pilih pembeli</option>
            {pembeli.map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
          </select>
        </Field>
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={awal?.pesanan.tanggal ?? hariIni} required /></Field>
      </div>
      <Field label="Proyek" hint="Biar masuk laba rugi proyek. Boleh dikosongin.">
        <select name="siklusId" className={pilihCls} defaultValue={awal?.pesanan.cycle_id ?? ""}><option value="">Tanpa proyek</option>{siklus.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
      </Field>
      <div className="space-y-2">
        <p className="text-[12px] font-medium" style={{ color: MUTED }}>Barang yang dijual</p>
        <HasilBelumSiap tertunda={tertunda} />
        {unit.length === 0 && <p className="text-[12.5px]" style={{ color: MUTED }}>Belum ada stok yang bisa dijual.</p>}
        {baris.map((b, i) => {
          const u = unit.find((x) => x.id === b.unit_id);
          return (
            <div key={i} className="space-y-2 rounded-2xl bg-white p-2.5">
              <select aria-label={`Stok baris ${i + 1}`} className={pilihCls} value={b.unit_id} onChange={(e) => ubah(i, "unit_id", e.target.value)} required>
                <option value="" disabled>Pilih stok</option>
                {unit.map((x) => <option key={x.id} value={x.id}>{x.label} · tersedia {kgTeks(x.tersediaKg)}</option>)}
              </select>
              {/* minmax(0, 1fr) + w-full: kolom boleh menyempit di layar kecil, jadi isian Rp/kg tidak keluar dari form. */}
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
                <input aria-label={`Berat baris ${i + 1} (kg)`} inputMode="decimal" placeholder="kg" className="h-10 w-full min-w-0 rounded-xl border border-[#E2E4EA] px-3 text-right text-[14px]" value={b.kg} onChange={(e) => ubah(i, "kg", e.target.value)} />
                <input aria-label={`Harga per kg baris ${i + 1}`} inputMode="decimal" placeholder="Rp/kg" className="h-10 w-full min-w-0 rounded-xl border border-[#E2E4EA] px-3 text-right text-[14px]" value={b.harga} onChange={(e) => ubah(i, "harga", e.target.value)} />
                <Btn size="sm" v="ghost" onClick={() => setBaris((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : x))} disabled={baris.length <= 1}>Buang</Btn>
              </div>
              {u && <p className="text-[11.5px]" style={{ color: u.tersediaKg < bacaAngka(b.kg) ? "#A8322B" : MUTED }}>Tersedia {kgTeks(u.tersediaKg)} dari sisa {kgTeks(u.sisaKg)}</p>}
            </div>
          );
        })}
        <Btn size="sm" v="light" onClick={() => setBaris((b) => [...b, { unit_id: "", kg: "", harga: "" }])}>+ Tambah baris</Btn>
      </div>
      <Field label="Catatan" hint="Boleh dikosongin."><TextIn name="catatan" maxLength={300} defaultValue={awal?.pesanan.catatan ?? ""} /></Field>
      <IsianPajakDiskon subtotal={hitung} awal={potonganAwal(awal?.pesanan, pajakBawaan)} judulTotal="Perkiraan total" />
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : awal ? "Simpan perubahan" : "Simpan pesanan (draf)"}</Btn>
    </form>
  );
}

/* ----------------------------------------------------- detail pesanan */
function FormKirim({ d }: { d: DetailPesanan }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(kirimPesanan, undefined);
  const [nilai, setNilai] = useState(() => d.baris.map((b) => ({ id: b.id, kirim: kgInput(b.kg_pesan), diterima: "" })));
  const ubah = (i: number, k: "kirim" | "diterima", v: string) => setNilai((n) => n.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  // Berat kirim nggak boleh lebih dari yang dipesan (database juga nolak). Kurang boleh: pengiriman sebagian.
  const lebih = d.baris.map((b, i) => { const g = keGram(nilai[i].kirim); return g !== null && g > Math.round(b.kg_pesan * 1000); });
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="pesananId" value={d.pesanan.id} />
      <input type="hidden" name="baris" value={JSON.stringify(nilai)} />
      <PesanForm state={state} />
      <p className="text-[12.5px]" style={{ color: MUTED }}>Isi berat hasil timbang pas kirim, maksimal sebesar yang dipesan. Kalau kirimnya kurang, sisanya dilepas lagi ke stok. Berat yang diterima pembeli boleh nyusul.</p>
      {d.baris.map((b, i) => (
        <div key={b.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl bg-white p-2.5 text-[13px]">
          <span>{b.unit_kode} · {b.product_nama}{b.grade_kode ? ` ${b.grade_kode}` : ""}<span className="block text-[11.5px]" style={{ color: lebih[i] ? "#A8322B" : MUTED }}>{lebih[i] ? `Maks ${kgTeks(b.kg_pesan)}, sesuai pesanan` : `dipesan ${kgTeks(b.kg_pesan)}`}</span></span>
          <input aria-label={`Berat kirim ${b.unit_kode}`} aria-invalid={lebih[i] || undefined} inputMode="decimal" className="h-10 w-24 rounded-xl border px-3 text-right" style={{ borderColor: lebih[i] ? "#A8322B" : "#E2E4EA" }} value={nilai[i].kirim} onChange={(e) => ubah(i, "kirim", e.target.value)} />
          <input aria-label={`Berat diterima ${b.unit_kode}`} inputMode="decimal" placeholder="diterima" className="h-10 w-24 rounded-xl border border-[#E2E4EA] px-3 text-right" value={nilai[i].diterima} onChange={(e) => ubah(i, "diterima", e.target.value)} />
        </div>
      ))}
      <KonfirmasiDua full label="Kirim pesanan" labelYa="Ya, kirim dan kurangi stok" pending={pending} disabled={lebih.some(Boolean)} pesan="Stok langsung berkurang sesuai berat kirim. Lanjut?" />
    </form>
  );
}

function FormDiterima({ d }: { d: DetailPesanan }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(catatBeratDiterima, undefined);
  const [nilai, setNilai] = useState(() => d.baris.map((b) => ({ id: b.id, diterima: kgInput(b.kg_diterima) })));
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="pesananId" value={d.pesanan.id} />
      <input type="hidden" name="baris" value={JSON.stringify(nilai)} />
      <PesanForm state={state} />
      <p className="text-[12.5px]" style={{ color: MUTED }}>Kalau berat diterima pembeli diisi, tagihannya pakai berat itu. Isinya sebelum invoice terbit.</p>
      {d.baris.map((b, i) => (
        <div key={b.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-2.5 text-[13px]">
          <span>{b.unit_kode} · dikirim {kgTeks(b.kg_kirim ?? 0)}</span>
          <input aria-label={`Diterima ${b.unit_kode}`} inputMode="decimal" className="h-10 w-28 rounded-xl border border-[#E2E4EA] px-3 text-right" value={nilai[i].diterima}
            onChange={(e) => setNilai((n) => n.map((x, j) => (j === i ? { ...x, diterima: e.target.value } : x)))} />
        </div>
      ))}
      <Btn type="submit" size="sm" v="light" disabled={pending}>{pending ? "Menyimpan..." : "Simpan berat diterima"}</Btn>
    </form>
  );
}

function TerbitInvoice({ id, jasa = false }: { id: string; jasa?: boolean }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(terbitkanInvoice, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="pesananId" value={id} />
      <PesanForm state={state} />
      <KonfirmasiDua full label="Terbitkan invoice" labelYa="Ya, terbitkan invoice" pending={pending}
        pesan={jasa ? "Invoice jasa dibikin dari isi jasa di atas, plus pajak dan diskonnya. Jatuh temponya ikut tempo pelanggan." : "Invoice dibikin dari berat yang diterima (atau yang dikirim), plus pajak dan diskonnya. Jatuh temponya ikut tempo pembeli."} />
    </form>
  );
}

function BatalPesanan({ id }: { id: string }) {
  const [buka, setBuka] = useState(false);
  const [state, action, pending] = useActionState<HasilForm, FormData>(batalkanPesanan, undefined);
  if (!buka) return <Btn size="sm" v="ghost" onClick={() => setBuka(true)}>Batalkan pesanan</Btn>;
  return (
    <form action={action} className="space-y-2.5 rounded-2xl bg-white p-3">
      <input type="hidden" name="pesananId" value={id} />
      <PesanForm state={state} />
      <Field label="Alasan membatalkan" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={300} required /></Field>
      <KonfirmasiDua full size="sm" label="Batalkan pesanan" labelYa="Ya, batalkan pesanan" pending={pending} pesan="Pesanan dibatalin, terus stok yang tadinya dipesan dilepas lagi." />
    </form>
  );
}

/** Koreksi pesanan yg udah dikirim: berat kirim, berat diterima, harga, tanggal, catatan. Wajib alasan. */
function KoreksiPesanan({ d, onSelesai }: { d: DetailPesanan; onSelesai: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(koreksiPesananTerkirim, undefined);
  const [nilai, setNilai] = useState(() => d.baris.map((b) => ({ id: b.id, kirim: kgInput(b.kg_kirim), diterima: kgInput(b.kg_diterima), harga: String(b.harga_per_kg).replace(".", ",") })));
  const ubah = (i: number, k: "kirim" | "diterima" | "harga", v: string) => setNilai((n) => n.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  useEffect(() => { if (state?.pesan && !state.error) onSelesai(); }, [state, onSelesai]);
  return (
    <form action={action} className="space-y-3" data-testid="form-koreksi-pesanan">
      <input type="hidden" name="pesananId" value={d.pesanan.id} />
      <input type="hidden" name="baris" value={JSON.stringify(nilai)} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[12.5px]" style={{ color: MUTED }}>Berat yg dikurangin balik ke stok, yg ditambah diambil dari stok.{d.invoice ? ` Invoice ${d.invoice.kode} ikut dihitung ulang.` : ""}</p>
      {d.baris.map((b, i) => (
        <div key={b.id} className="space-y-1.5 rounded-2xl bg-white p-2.5 text-[13px]">
          <p style={{ color: INK }}>{b.unit_kode} · {b.product_nama}{b.grade_kode ? ` ${b.grade_kode}` : ""}</p>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-[11.5px]" style={{ color: MUTED }}>Kirim (kg)<input aria-label={`Koreksi berat kirim ${b.unit_kode}`} inputMode="decimal" className="mt-0.5 h-10 w-full rounded-xl border border-[#E2E4EA] px-2.5 text-right text-[13px]" style={{ color: INK }} value={nilai[i].kirim} onChange={(e) => ubah(i, "kirim", e.target.value)} /></label>
            <label className="text-[11.5px]" style={{ color: MUTED }}>Diterima (kg)<input aria-label={`Koreksi berat diterima ${b.unit_kode}`} inputMode="decimal" placeholder="kosong" className="mt-0.5 h-10 w-full rounded-xl border border-[#E2E4EA] px-2.5 text-right text-[13px]" style={{ color: INK }} value={nilai[i].diterima} onChange={(e) => ubah(i, "diterima", e.target.value)} /></label>
            <label className="text-[11.5px]" style={{ color: MUTED }}>Harga/kg<input aria-label={`Koreksi harga ${b.unit_kode}`} inputMode="decimal" className="mt-0.5 h-10 w-full rounded-xl border border-[#E2E4EA] px-2.5 text-right text-[13px]" style={{ color: INK }} value={nilai[i].harga} onChange={(e) => ubah(i, "harga", e.target.value)} /></label>
          </div>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={d.pesanan.tanggal} required /></Field>
        <Field label="Catatan"><TextIn name="catatan" maxLength={300} defaultValue={d.pesanan.catatan} /></Field>
      </div>
      <Field label="Alasan koreksi" hint="Wajib. Misalnya salah timbang atau salah harga." error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required /></Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan koreksi"}</Btn>
    </form>
  );
}

/** Satu uang masuk dari pembeli: koreksi (jumlah, tanggal, catatan) atau hapus kalau salah input/dobel. */
function KoreksiUangMasuk({ b, onSelesai }: { b: PembayaranPembeli; onSelesai: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(koreksiUangMasuk, undefined);
  useEffect(() => { if (state?.pesan && !state.error) onSelesai(); }, [state, onSelesai]);
  return (
    <form action={action} className="space-y-2.5 rounded-2xl p-3" style={{ background: "#F4F5F8" }} data-testid="form-koreksi-uang-masuk">
      <input type="hidden" name="bayarId" value={b.id} />
      <PesanForm state={state?.error ? state : undefined} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Jumlah" error={state?.kolom?.jumlah?.[0]}><TextIn name="jumlah" inputMode="decimal" defaultValue={String(b.jumlah).replace(".", ",")} required /></Field>
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={b.tanggal} required /></Field>
      </div>
      <Field label="Catatan"><TextIn name="catatan" maxLength={300} defaultValue={b.catatan} /></Field>
      <Field label="Alasan koreksi" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required /></Field>
      <Btn type="submit" size="sm" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan koreksi"}</Btn>
      <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={onSelesai}>Nggak jadi</Btn></div>
    </form>
  );
}

function DetailPesananModal({ d, unit, pembeli, siklus, hariIni, bolehBuat, bolehKirim, bolehInvoice, koreksi, pengguna, daftarJasa, pajakBawaan, onTutup, onInvoice }: {
  d: DetailPesanan; unit: UnitJual[]; pembeli: Pembeli[]; siklus: Opsi[]; hariIni: string; bolehBuat: boolean; bolehKirim: boolean; bolehInvoice: boolean;
  koreksi: Koreksi[]; pengguna: Record<string, { nama: string }>; daftarJasa: Jasa[]; pajakBawaan: number; onTutup: () => void; onInvoice: (id: string) => void;
}) {
  const p = d.pesanan;
  const jasa = p.jenis === "jasa";
  const [ubah, setUbah] = useState(false);
  const [koreksiBuka, setKoreksiBuka] = useState(false);
  const [potongan, setPotongan] = useState(false);
  // Jasa: "terkirim" artinya udah ditagih (nggak lewat kirim).
  const final = p.status === "terkirim";
  const sub = final ? p.subtotal_final : p.subtotal_pesan;
  const label = jasa && final ? "Udah ditagih" : LABEL_PESANAN[p.status];
  return (
    <Modal title={`${p.kode} · ${p.buyer_nama}`} onClose={onTutup}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill t={label} />
        {jasa && <Pill t="Jasa produksi" />}
        {p.siklus_kode && <Pill t={p.siklus_kode} />}
        <span className="text-[12px]" style={{ color: MUTED }}>{tanggal(p.tanggal)} · tempo {p.tempo_hari} hari</span>
      </div>
      {ubah && p.status === "draf" ? (
        jasa
          ? <FormPesananJasa daftar={daftarJasa} pembeli={pembeli} siklus={siklus} hariIni={hariIni} pajakBawaan={pajakBawaan} awal={d} onSelesai={() => setUbah(false)} />
          : <FormPesananJual unit={unit} pembeli={pembeli} siklus={siklus} hariIni={hariIni} awal={d} pajakBawaan={pajakBawaan} onSelesai={() => setUbah(false)} />
      ) : koreksiBuka && final ? (
        jasa
          ? <FormPesananJasa daftar={daftarJasa} pembeli={pembeli} siklus={siklus} hariIni={hariIni} pajakBawaan={pajakBawaan} awal={d} koreksi onSelesai={() => setKoreksiBuka(false)} />
          : <KoreksiPesanan d={d} onSelesai={() => setKoreksiBuka(false)} />
      ) : potongan ? (
        <AturPajakDiskon p={p} subtotal={sub} pajakBawaan={pajakBawaan} adaInvoice={!!d.invoice} onSelesai={() => setPotongan(false)} />
      ) : (
        <Inner className="!p-3.5">
          <div className="space-y-2">
            {d.jasa.map((b) => (
              <div key={b.id} className="flex justify-between gap-3 text-[13px]">
                <span style={{ color: INK }}>{b.keterangan}<span className="block text-[11.5px]" style={{ color: MUTED }}>{b.service_item_id ? "dari daftar harga jasa" : "isian manual"}</span></span>
                <b className="tabular-nums" style={{ color: INK }}>{rp(b.harga)}</b>
              </div>
            ))}
            {d.baris.map((b) => {
              const kg = b.kg_diterima ?? b.kg_kirim ?? b.kg_pesan;
              return (
                <div key={b.id} className="flex justify-between gap-3 text-[13px]">
                  <span style={{ color: INK }}>{b.product_nama}{b.grade_kode ? ` ${b.grade_kode}` : ""}<span className="block text-[11.5px]" style={{ color: MUTED }}>
                    {b.unit_kode} · {kgTeks(kg)} × {rp(b.harga_per_kg)}{b.kg_kirim !== null ? (b.kg_diterima !== null ? " · berat diterima pembeli" : " · berat kirim") : " · dipesan"}</span></span>
                  <b className="tabular-nums" style={{ color: INK }}>{rp(jumlahBaris(kg, b.harga_per_kg))}</b>
                </div>
              );
            })}
          </div>
          <div className="mt-2 border-t border-[#E2E4EA] pt-2">
            {final
              ? <RincianTotal subtotal={p.subtotal_final} diskon={p.diskon_final} pajak={p.pajak_final} pajakPersen={p.pajak_aktif ? p.pajak_persen : 0} total={p.total_final} />
              : <RincianTotal {...hitungPotongan(p.subtotal_pesan, { pajakAktif: p.pajak_aktif, pajakPersen: Number(p.pajak_persen), diskonJenis: p.diskon_jenis, diskonNilai: Number(p.diskon_nilai) })}
                  pajakPersen={p.pajak_aktif ? p.pajak_persen : 0} judulTotal="Perkiraan total" />}
          </div>
          {p.catatan && <p className="mt-1.5 text-[12px]" style={{ color: MUTED }}>{p.catatan}</p>}
        </Inner>
      )}

      {bolehBuat && p.status !== "dibatalkan" && !ubah && !koreksiBuka && !potongan && (
        <div><Btn size="sm" v="light" onClick={() => setPotongan(true)}>{p.pajak_aktif || p.diskon_nilai > 0 ? "Ubah pajak dan diskon" : "Atur pajak dan diskon"}</Btn></div>
      )}
      {p.status === "draf" && !potongan && (
        <div className="space-y-3">
          {bolehBuat && !ubah && <Btn size="sm" v="light" onClick={() => setUbah(true)}>{jasa ? "Ubah pesanan jasa" : "Ubah pesanan"}</Btn>}
          {!jasa && bolehKirim && !ubah && <FormKirim d={d} />}
          {jasa && bolehInvoice && !ubah && <TerbitInvoice id={p.id} jasa />}
          {bolehBuat && !ubah && <BatalPesanan id={p.id} />}
        </div>
      )}
      {p.status === "dibatalkan" && <p className="text-[13px]" style={{ color: "#A8322B" }}>Dibatalkan: {p.alasan_batal}</p>}
      {final && bolehBuat && !koreksiBuka && !potongan && <Btn size="sm" v="light" onClick={() => setKoreksiBuka(true)}>{jasa ? "Koreksi jasa" : "Koreksi pesanan"}</Btn>}
      {final && !koreksiBuka && !potongan && (
        <div className="space-y-3">
          {d.invoice ? (
            <Btn full v="light" onClick={() => onInvoice(d.invoice!.id)}>Lihat invoice {d.invoice.kode} · {LABEL_TAGIHAN[d.invoice.status_tagihan]}</Btn>
          ) : (
            <>
              {!jasa && (bolehKirim || bolehInvoice) && <FormDiterima d={d} />}
              {bolehInvoice && <TerbitInvoice id={p.id} jasa={jasa} />}
            </>
          )}
        </div>
      )}
      <RiwayatKoreksi daftar={koreksi.filter((k) => k.ref_id === p.id)} pengguna={pengguna} />
      {bolehBuat && p.status !== "terkirim" && !ubah && (
        <HapusItem aksi={hapusPesanan} isian={{ pesananId: p.id }} tombol="Hapus pesanan" testId="form-hapus-pesanan"
          keterangan={`${p.kode} bakal dihapus permanen dari daftar penjualan, kecatat di log hapus.`}
          konfirmasi={`Yakin hapus ${p.kode}? Kalau cuma mau batal, pakai Batalkan pesanan aja.`} />
      )}
    </Modal>
  );
}

/* ----------------------------------------------------- detail invoice */
function FormBayar({ inv, hariIni }: { inv: Invoice; hariIni: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(terimaPembayaran, undefined);
  const [jumlah, setJumlah] = useState(String(inv.sisa).replace(".", ","));
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-white p-3.5">
      <input type="hidden" name="invoiceId" value={inv.id} />
      <PesanForm state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Jumlah (sisa ${rp(inv.sisa)})`} error={state?.kolom?.jumlah?.[0]}><TextIn name="jumlah" inputMode="decimal" value={jumlah} onChange={(e) => setJumlah(e.target.value)} required /></Field>
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={hariIni} required /></Field>
      </div>
      <Field label="Catatan" hint="Misalnya DP atau pelunasan."><TextIn name="catatan" maxLength={300} /></Field>
      <KonfirmasiDua size="sm" label="Catat pembayaran masuk" labelYa="Ya, catat pembayaran" pending={pending} pesan={`Catat uang masuk ${rp(bacaAngka(jumlah) || 0)} buat ${inv.kode}?`} />
    </form>
  );
}

function BatalInvoice({ id }: { id: string }) {
  const [buka, setBuka] = useState(false);
  const [state, action, pending] = useActionState<HasilForm, FormData>(batalkanInvoice, undefined);
  if (!buka) return <Btn size="sm" v="ghost" onClick={() => setBuka(true)}>Batalkan invoice</Btn>;
  return (
    <form action={action} className="space-y-2.5 rounded-2xl bg-white p-3">
      <input type="hidden" name="invoiceId" value={id} />
      <PesanForm state={state} />
      <Field label="Alasan membatalkan" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={300} required /></Field>
      <KonfirmasiDua full size="sm" label="Batalkan invoice" labelYa="Ya, batalkan invoice" pending={pending} pesan="Invoice dibatalin. Pesanannya nanti bisa ditagih lagi pakai invoice baru." />
    </form>
  );
}

function InvoiceModal({ d, bolehInvoice, bolehBayar, bolehDokumen, hariIni, koreksi, pengguna, onTutup }: {
  d: DetailInvoice; bolehInvoice: boolean; bolehBayar: boolean; bolehDokumen: boolean; hariIni: string; koreksi: Koreksi[]; pengguna: Record<string, { nama: string }>; onTutup: () => void;
}) {
  const inv = d.invoice;
  const [koreksiId, setKoreksiId] = useState<string | null>(null);
  const wa = inv.sisa > 0 ? linkWa(d.kontak, pesanPengingat({ pembeli: inv.buyer_nama, kode: inv.kode, sisa: inv.sisa, jatuhTempo: inv.jatuh_tempo, hariTelat: inv.hari_telat })) : null;
  return (
    <Modal title={`${inv.kode} · ${inv.buyer_nama}`} onClose={onTutup}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill t={LABEL_TAGIHAN[inv.status_tagihan]} />
        <Pill t={inv.jenis === "gudang_dingin" ? "Jasa gudang dingin" : inv.jenis === "jasa_produksi" ? "Jasa produksi" : "Penjualan"} />
        <span className="text-[12px]" style={{ color: MUTED }}>terbit {tanggal(inv.tanggal)} · jatuh tempo {tanggal(inv.jatuh_tempo)}{inv.hari_telat > 0 ? ` · terlambat ${inv.hari_telat} hari` : ""}</span>
      </div>
      <Inner className="!p-3.5">
        <div className="space-y-2">
          {inv.baris.map((b, i) => (
            <div key={i} className="flex justify-between gap-3 text-[13px]">
              <span style={{ color: INK }}>{b.uraian}{b.kg !== undefined && b.harga_per_kg !== undefined && (
                <span className="block text-[11.5px]" style={{ color: MUTED }}>{kgTeks(b.kg)} × {rp(b.harga_per_kg)}{b.hari ? ` × ${b.hari} hari` : ""}{b.dasar ? ` · ${b.dasar}` : ""}</span>)}</span>
              <b className="tabular-nums" style={{ color: INK }}>{rp(b.jumlah)}</b>
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-1 border-t border-[#E2E4EA] pt-2 text-[13.5px]">
          <RincianTotal subtotal={inv.subtotal} diskon={inv.diskon} pajak={inv.pajak} pajakPersen={inv.pajak_persen} total={inv.total} />
          <div className="flex justify-between" style={{ color: MUTED }}><span>Sudah dibayar</span><span>{rp(inv.dibayar)}</span></div>
          <div className="flex justify-between font-medium" style={{ color: INK }}><span>Sisa tagihan</span><span>{rp(inv.sisa)}</span></div>
        </div>
      </Inner>

      <div className="space-y-2">
        <h4 className="text-[13px] font-semibold" style={{ color: INK }}>Pembayaran masuk</h4>
        {d.pembayaran.length === 0 && <p className="text-[13px]" style={{ color: MUTED }}>Belum ada pembayaran.</p>}
        {d.pembayaran.map((b) => (
          <div key={b.id} className="rounded-2xl bg-white p-3.5">
            <div className="flex justify-between text-[13px]"><span style={{ color: INK }}>{b.kode} · {tanggal(b.tanggal)}{b.catatan ? ` · ${b.catatan}` : ""}</span><b style={{ color: INK }}>{rp(b.jumlah)}</b></div>
            {bolehBayar && koreksiId !== b.id && (
              <div className="mt-1.5 flex justify-end"><Btn size="sm" v="ghost" onClick={() => setKoreksiId(b.id)}>Koreksi</Btn></div>
            )}
            {bolehBayar && koreksiId === b.id && (
              <div className="mt-2 space-y-2">
                <KoreksiUangMasuk b={b} onSelesai={() => setKoreksiId(null)} />
                <HapusItem aksi={hapusUangMasuk} isian={{ bayarId: b.id }} tombol="Hapus uang masuk" testId="form-hapus-uang-masuk"
                  keterangan={`${b.kode} (${rp(b.jumlah)}) bakal dihapus permanen, termasuk baris buku kas sama bukti bayarnya.`}
                  konfirmasi={`Yakin hapus ${b.kode}? Sisa tagihan ${inv.kode} bakal nambah lagi.`} onSelesai={() => setKoreksiId(null)} />
              </div>
            )}
            <RiwayatKoreksi daftar={koreksi.filter((k) => k.ref_id === b.id)} pengguna={pengguna} />
            <div className="mt-2 space-y-2">
              <DaftarDokumen dokumen={d.dokumen.filter((x) => x.ref_tabel === "customer_payments" && x.ref_id === b.id)} kosong="Belum ada bukti transfer." />
              {bolehDokumen && (
                <div className="flex flex-wrap gap-2">
                  <Unggah refTabel="customer_payments" refId={b.id} jenis="bukti_transfer" label="Lampirkan bukti transfer" />
                  <Unggah refTabel="customer_payments" refId={b.id} jenis="kwitansi" label="Lampirkan kwitansi" />
                </div>
              )}
            </div>
          </div>
        ))}
        {bolehBayar && inv.status_terbit === "terbit" && inv.sisa > 0 && <FormBayar inv={inv} hariIni={hariIni} />}
      </div>

      <div className="space-y-2">
        <h4 className="text-[13px] font-semibold" style={{ color: INK }}>Berkas invoice</h4>
        <DaftarDokumen dokumen={d.dokumen.filter((x) => x.ref_tabel === "invoices")} kosong="Belum ada berkas (misalnya surat jalan atau tanda terima)." />
        {bolehDokumen && (
          <div className="flex flex-wrap gap-2">
            <Unggah refTabel="invoices" refId={inv.id} jenis="invoice" label="Lampirkan invoice" />
            <Unggah refTabel="invoices" refId={inv.id} jenis="surat_jalan" label="Lampirkan surat jalan / tanda terima" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[12.5px] font-medium" style={{ color: INK, boxShadow: "0 1px 2px rgba(20,24,40,.08)" }}>Kirim pengingat (WhatsApp)</a>}
        {inv.sisa > 0 && !wa && <span className="text-[12px]" style={{ color: MUTED }}>Nomor pembeli belum kebaca buat WhatsApp. Lengkapin kontaknya di Pengaturan.</span>}
        {bolehInvoice && inv.status_terbit === "terbit" && inv.dibayar === 0 && <BatalInvoice id={inv.id} />}
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------- jasa gudang */
function InvoiceJasa({ jasa }: { jasa: JasaBelumDitagih[] }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(terbitkanInvoiceJasa, undefined);
  const [buyer, setBuyer] = useState("");
  const [pilih, setPilih] = useState<string[]>([]);
  const pembeliJasa = useMemo(() => [...new Map(jasa.map((j) => [j.buyer_id, j.pemilik_nama])).entries()], [jasa]);
  const baris = jasa.filter((j) => j.buyer_id === buyer);
  const total = baris.filter((j) => pilih.includes(j.id)).reduce((a, j) => a + Math.round(j.jumlah * 100), 0) / 100;
  return (
    <form action={action} className="space-y-3 px-2.5 pb-2.5">
      <input type="hidden" name="buyerId" value={buyer} />
      <input type="hidden" name="ids" value={JSON.stringify(pilih)} />
      <PesanForm state={state} />
      <Field label="Pelanggan">
        <select className={pilihCls} value={buyer} onChange={(e) => { setBuyer(e.target.value); setPilih([]); }}>
          <option value="">Pilih pelanggan</option>{pembeliJasa.map(([id, nama]) => <option key={id} value={id}>{nama}</option>)}
        </select>
      </Field>
      {baris.map((j) => (
        <label key={j.id} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]">
          <input type="checkbox" className="h-4 w-4 accent-[#00171F]" checked={pilih.includes(j.id)} onChange={(e) => setPilih((p) => (e.target.checked ? [...p, j.id] : p.filter((x) => x !== j.id)))} />
          <span className="flex-1">{j.kode} · {j.jenis === "abf" ? "ABF" : "Simpan"} · {kgTeks(j.kg_dasar)}</span><b>{rp(j.jumlah)}</b>
        </label>
      ))}
      {pilih.length > 0 && <KonfirmasiDua full size="sm" label={`Terbitkan invoice jasa · ${rp(total)}`} labelYa="Ya, terbitkan invoice jasa" pending={pending} pesan={`Invoice jasa gudang dingin sebesar ${rp(total)} bakal dibikin, lengkap sama rincian hitungannya.`} />}
    </form>
  );
}

/* --------------------------------------------------------------- utama */
export function PenjualanKelola({ pesanan, invoice, unit, pembeli, siklus, jasa, detailP, detailI, tertunda, bolehBuat, bolehKirim, bolehInvoice, bolehBayar, bolehDokumen, hariIni, koreksi, pengguna, daftarJasa, pajakBawaan, koreksiJasa }: Props) {
  const router = useRouter();
  const [baru, setBaru] = useState(false);
  const [baruJasa, setBaruJasa] = useState(false);
  const piutang = invoice.reduce((a, i) => a + Math.round(i.sisa * 100), 0) / 100;
  const terlambat = invoice.filter((i) => i.status_tagihan === "terlambat");
  const draf = pesanan.filter((p) => p.status === "draf").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Stat value={String(draf)} label="Pesanan belum dikirim" />
        <Stat value={rp(piutang)} label="Piutang (belum dibayar pembeli)" />
        <Stat value={String(terlambat.length)} label="Invoice terlambat" tone={terlambat.length > 0 ? "warn" : undefined} />
        <Stat value={rp(terlambat.reduce((a, i) => a + Math.round(i.sisa * 100), 0) / 100)} label="Nilai yang terlambat" tone={terlambat.length > 0 ? "warn" : undefined} />
      </div>

      <Card title="Pesanan jual" right={bolehBuat && <>
        <Btn size="sm" v="light" onClick={() => setBaruJasa(true)}>Penjualan jasa</Btn>
        <Btn size="sm" onClick={() => setBaru(true)}>Buat pesanan</Btn>
      </>}>
        <DaftarPesanan rows={pesanan} onBuka={(id) => router.push(`/penjualan?p=${id}`)}
          kosong={bolehBuat ? "Belum ada pesanan. Ketuk Buat pesanan, terus pilih dari stok." : "Belum ada pesanan."} />
      </Card>

      <Card title="Piutang dan invoice">
        <DaftarInvoice rows={invoice} onBuka={(id) => router.push(`/penjualan?inv=${id}`)} kosong="Belum ada invoice." />
      </Card>

      {bolehInvoice && jasa.length > 0 && (
        <Card title="Jasa gudang dingin yang belum ditagihkan"><InvoiceJasa jasa={jasa} /></Card>
      )}

      <DaftarHargaJasa jasa={daftarJasa} bolehUbah={bolehBuat} koreksi={koreksiJasa} pengguna={pengguna} />

      {baru && (
        <Modal title="Buat pesanan" onClose={() => setBaru(false)}>
          <FormPesananJual unit={unit} pembeli={pembeli} siklus={siklus} hariIni={hariIni} awal={null} tertunda={tertunda} pajakBawaan={pajakBawaan} onSelesai={(id) => { setBaru(false); router.push(`/penjualan?p=${id}`); }} />
        </Modal>
      )}
      {baruJasa && (
        <Modal title="Penjualan jasa" onClose={() => setBaruJasa(false)}>
          <FormPesananJasa daftar={daftarJasa} pembeli={pembeli} siklus={siklus} hariIni={hariIni} pajakBawaan={pajakBawaan} awal={null}
            onSelesai={(id) => { setBaruJasa(false); router.push(`/penjualan?p=${id}`); }} />
        </Modal>
      )}
      {detailP && (
        <DetailPesananModal key={detailP.pesanan.id + detailP.pesanan.status} d={detailP} unit={unit} pembeli={pembeli} siklus={siklus} hariIni={hariIni}
          daftarJasa={daftarJasa} pajakBawaan={pajakBawaan}
          bolehBuat={bolehBuat} bolehKirim={bolehKirim} bolehInvoice={bolehInvoice} koreksi={koreksi} pengguna={pengguna} onTutup={() => router.push("/penjualan")} onInvoice={(id) => router.push(`/penjualan?inv=${id}`)} />
      )}
      {detailI && (
        <InvoiceModal key={detailI.invoice.id} d={detailI} bolehInvoice={bolehInvoice} bolehBayar={bolehBayar} bolehDokumen={bolehDokumen} hariIni={hariIni} koreksi={koreksi} pengguna={pengguna} onTutup={() => router.push("/penjualan")} />
      )}
    </div>
  );
}
