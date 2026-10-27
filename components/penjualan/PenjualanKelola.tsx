"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { DaftarDokumen, Unggah } from "@/components/dokumen/Dokumen";
import { Btn, Card, Field, Inner, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { DaftarInvoice, DaftarPesanan } from "./DaftarPenjualan";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import {
  batalkanInvoice, batalkanPesanan, catatBeratDiterima, kirimPesanan, simpanPesanan, terbitkanInvoice, terbitkanInvoiceJasa, terimaPembayaran,
} from "@/lib/actions/penjualan";
import type { DetailInvoice, DetailPesanan } from "@/lib/data/penjualan";
import { rp, tanggal } from "@/lib/format";
import { gramKeTeks, tampilKg } from "@/lib/logic/grid";
import { jumlahBaris, LABEL_PESANAN, LABEL_TAGIHAN, linkWa, pesanPengingat, totalBaris } from "@/lib/logic/penjualan";
import type { Opsi } from "@/lib/types/pembelian";
import type { Invoice, JasaBelumDitagih, Pembeli, Pesanan, UnitJual } from "@/lib/types/penjualan";

type Props = {
  pesanan: Pesanan[];
  invoice: Invoice[];
  unit: UnitJual[];
  pembeli: Pembeli[];
  siklus: Opsi[];
  jasa: JasaBelumDitagih[];
  detailP: DetailPesanan | null;
  detailI: DetailInvoice | null;
  bolehBuat: boolean;
  bolehKirim: boolean;
  bolehInvoice: boolean;
  bolehBayar: boolean;
  bolehDokumen: boolean;
  hariIni: string;
};

const kgTeks = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;
const kgInput = (n: number | null | undefined) => (n === null || n === undefined ? "" : gramKeTeks(Math.round(n * 1000)).replace(".", ","));

/* ------------------------------------------------------ form pesanan */
type BarisForm = { id?: string; unit_id: string; kg: string; harga: string };

function FormPesananJual({ unit, pembeli, siklus, hariIni, awal, onSelesai }: {
  unit: UnitJual[]; pembeli: Pembeli[]; siklus: Opsi[]; hariIni: string; awal: DetailPesanan | null; onSelesai: (id: string) => void;
}) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanPesanan, undefined);
  const [baris, setBaris] = useState<BarisForm[]>(() =>
    awal ? awal.baris.map((b) => ({ id: b.id, unit_id: b.unit_id, kg: kgInput(b.kg_pesan), harga: String(b.harga_per_kg).replace(".", ",") })) : [{ unit_id: "", kg: "", harga: "" }]);
  useEffect(() => { if (state?.id && !state.error) onSelesai(state.id); }, [state, onSelesai]);
  const ubah = (i: number, k: keyof BarisForm, v: string) => setBaris((b) => b.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const hitung = totalBaris(baris.map((b) => ({ kg: Number(b.kg.replace(",", ".")) || 0, harga: Number(b.harga.replace(/\./g, "").replace(",", ".")) || 0 })));
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
      <Field label="Siklus" hint="Supaya masuk laba rugi siklus. Boleh kosong.">
        <select name="siklusId" className={pilihCls} defaultValue={awal?.pesanan.cycle_id ?? ""}><option value="">Tanpa siklus</option>{siklus.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
      </Field>
      <div className="space-y-2">
        <p className="text-[12px] font-medium" style={{ color: MUTED }}>Barang yang dijual</p>
        {baris.map((b, i) => {
          const u = unit.find((x) => x.id === b.unit_id);
          return (
            <div key={i} className="space-y-2 rounded-2xl bg-white p-2.5">
              <select aria-label={`Stok baris ${i + 1}`} className={pilihCls} value={b.unit_id} onChange={(e) => ubah(i, "unit_id", e.target.value)} required>
                <option value="" disabled>Pilih stok</option>
                {unit.map((x) => <option key={x.id} value={x.id}>{x.label} · tersedia {kgTeks(x.tersediaKg)}</option>)}
              </select>
              <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <input aria-label={`Berat baris ${i + 1} (kg)`} inputMode="decimal" placeholder="kg" className="h-10 rounded-xl border border-[#E2E4EA] px-3 text-right text-[14px]" value={b.kg} onChange={(e) => ubah(i, "kg", e.target.value)} />
                <input aria-label={`Harga per kg baris ${i + 1}`} inputMode="decimal" placeholder="Rp/kg" className="h-10 rounded-xl border border-[#E2E4EA] px-3 text-right text-[14px]" value={b.harga} onChange={(e) => ubah(i, "harga", e.target.value)} />
                <Btn size="sm" v="ghost" onClick={() => setBaris((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : x))} disabled={baris.length <= 1}>Buang</Btn>
              </div>
              {u && <p className="text-[11.5px]" style={{ color: u.tersediaKg < Number(b.kg.replace(",", ".")) ? "#A8322B" : MUTED }}>Tersedia {kgTeks(u.tersediaKg)} dari sisa {kgTeks(u.sisaKg)}</p>}
            </div>
          );
        })}
        <Btn size="sm" v="light" onClick={() => setBaris((b) => [...b, { unit_id: "", kg: "", harga: "" }])}>+ Tambah baris</Btn>
      </div>
      <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} defaultValue={awal?.pesanan.catatan ?? ""} /></Field>
      <div className="flex justify-between text-[14px] font-semibold" style={{ color: INK }}><span>Perkiraan total</span><span>{rp(hitung)}</span></div>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : awal ? "Simpan perubahan" : "Simpan pesanan (draf)"}</Btn>
    </form>
  );
}

/* ----------------------------------------------------- detail pesanan */
function FormKirim({ d }: { d: DetailPesanan }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(kirimPesanan, undefined);
  const [nilai, setNilai] = useState(() => d.baris.map((b) => ({ id: b.id, kirim: kgInput(b.kg_pesan), diterima: "" })));
  const ubah = (i: number, k: "kirim" | "diterima", v: string) => setNilai((n) => n.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="pesananId" value={d.pesanan.id} />
      <input type="hidden" name="baris" value={JSON.stringify(nilai)} />
      <PesanForm state={state} />
      <p className="text-[12.5px]" style={{ color: MUTED }}>Isi berat hasil timbang saat kirim. Berat diterima pembeli boleh menyusul.</p>
      {d.baris.map((b, i) => (
        <div key={b.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl bg-white p-2.5 text-[13px]">
          <span>{b.unit_kode} · {b.product_nama}{b.grade_kode ? ` ${b.grade_kode}` : ""}<span className="block text-[11.5px]" style={{ color: MUTED }}>dipesan {kgTeks(b.kg_pesan)}</span></span>
          <input aria-label={`Berat kirim ${b.unit_kode}`} inputMode="decimal" className="h-10 w-24 rounded-xl border border-[#E2E4EA] px-3 text-right" value={nilai[i].kirim} onChange={(e) => ubah(i, "kirim", e.target.value)} />
          <input aria-label={`Berat diterima ${b.unit_kode}`} inputMode="decimal" placeholder="diterima" className="h-10 w-24 rounded-xl border border-[#E2E4EA] px-3 text-right" value={nilai[i].diterima} onChange={(e) => ubah(i, "diterima", e.target.value)} />
        </div>
      ))}
      <KonfirmasiDua full label="Kirim pesanan" labelYa="Ya, kirim dan kurangi stok" pending={pending} pesan="Stok langsung berkurang sebesar berat kirim. Lanjutkan?" />
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
      <p className="text-[12.5px]" style={{ color: MUTED }}>Tagihan memakai berat diterima pembeli bila diisi. Isi sebelum invoice terbit.</p>
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

function TerbitInvoice({ id }: { id: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(terbitkanInvoice, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="pesananId" value={id} />
      <PesanForm state={state} />
      <KonfirmasiDua full label="Terbitkan invoice" labelYa="Ya, terbitkan invoice" pending={pending} pesan="Invoice dibuat dari berat diterima (atau dikirim) dengan jatuh tempo sesuai tempo pembeli." />
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
      <KonfirmasiDua full size="sm" label="Batalkan pesanan" labelYa="Ya, batalkan pesanan" pending={pending} pesan="Pesanan dibatalkan dan stok yang dipesan dilepas." />
    </form>
  );
}

function DetailPesananModal({ d, unit, pembeli, siklus, hariIni, bolehBuat, bolehKirim, bolehInvoice, onTutup, onInvoice }: {
  d: DetailPesanan; unit: UnitJual[]; pembeli: Pembeli[]; siklus: Opsi[]; hariIni: string; bolehBuat: boolean; bolehKirim: boolean; bolehInvoice: boolean;
  onTutup: () => void; onInvoice: (id: string) => void;
}) {
  const p = d.pesanan;
  const [ubah, setUbah] = useState(false);
  return (
    <Modal title={`${p.kode} · ${p.buyer_nama}`} onClose={onTutup}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill t={LABEL_PESANAN[p.status]} />
        {p.siklus_kode && <Pill t={p.siklus_kode} />}
        <span className="text-[12px]" style={{ color: MUTED }}>{tanggal(p.tanggal)} · tempo {p.tempo_hari} hari</span>
      </div>
      {ubah && p.status === "draf" ? (
        <FormPesananJual unit={unit} pembeli={pembeli} siklus={siklus} hariIni={hariIni} awal={d} onSelesai={() => setUbah(false)} />
      ) : (
        <Inner className="!p-3.5">
          <div className="space-y-2">
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
          <div className="mt-2 flex justify-between border-t border-[#E2E4EA] pt-2 text-[14px] font-semibold" style={{ color: INK }}>
            <span>Total</span><span>{rp(p.status === "terkirim" ? p.total_final : p.total_pesan)}</span>
          </div>
          {p.catatan && <p className="mt-1.5 text-[12px]" style={{ color: MUTED }}>{p.catatan}</p>}
        </Inner>
      )}

      {p.status === "draf" && (
        <div className="space-y-3">
          {bolehBuat && !ubah && <Btn size="sm" v="light" onClick={() => setUbah(true)}>Ubah pesanan</Btn>}
          {bolehKirim && !ubah && <FormKirim d={d} />}
          {bolehBuat && !ubah && <BatalPesanan id={p.id} />}
        </div>
      )}
      {p.status === "dibatalkan" && <p className="text-[13px]" style={{ color: "#A8322B" }}>Dibatalkan: {p.alasan_batal}</p>}
      {p.status === "terkirim" && (
        <div className="space-y-3">
          {d.invoice ? (
            <Btn full v="light" onClick={() => onInvoice(d.invoice!.id)}>Lihat invoice {d.invoice.kode} · {LABEL_TAGIHAN[d.invoice.status_tagihan]}</Btn>
          ) : (
            <>
              {(bolehKirim || bolehInvoice) && <FormDiterima d={d} />}
              {bolehInvoice && <TerbitInvoice id={p.id} />}
            </>
          )}
        </div>
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
      <KonfirmasiDua size="sm" label="Catat pembayaran masuk" labelYa="Ya, catat pembayaran" pending={pending} pesan={`Catat uang masuk ${rp(Number(jumlah.replace(/\./g, "").replace(",", ".")) || 0)} untuk ${inv.kode}?`} />
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
      <KonfirmasiDua full size="sm" label="Batalkan invoice" labelYa="Ya, batalkan invoice" pending={pending} pesan="Invoice dibatalkan. Pesanan bisa ditagih ulang dengan invoice baru." />
    </form>
  );
}

function InvoiceModal({ d, bolehInvoice, bolehBayar, bolehDokumen, hariIni, onTutup }: { d: DetailInvoice; bolehInvoice: boolean; bolehBayar: boolean; bolehDokumen: boolean; hariIni: string; onTutup: () => void }) {
  const inv = d.invoice;
  const wa = inv.sisa > 0 ? linkWa(d.kontak, pesanPengingat({ pembeli: inv.buyer_nama, kode: inv.kode, sisa: inv.sisa, jatuhTempo: inv.jatuh_tempo, hariTelat: inv.hari_telat })) : null;
  return (
    <Modal title={`${inv.kode} · ${inv.buyer_nama}`} onClose={onTutup}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill t={LABEL_TAGIHAN[inv.status_tagihan]} />
        <Pill t={inv.jenis === "gudang_dingin" ? "Jasa gudang dingin" : "Penjualan"} />
        <span className="text-[12px]" style={{ color: MUTED }}>terbit {tanggal(inv.tanggal)} · jatuh tempo {tanggal(inv.jatuh_tempo)}{inv.hari_telat > 0 ? ` · terlambat ${inv.hari_telat} hari` : ""}</span>
      </div>
      <Inner className="!p-3.5">
        <div className="space-y-2">
          {inv.baris.map((b, i) => (
            <div key={i} className="flex justify-between gap-3 text-[13px]">
              <span style={{ color: INK }}>{b.uraian}<span className="block text-[11.5px]" style={{ color: MUTED }}>{kgTeks(b.kg)} × {rp(b.harga_per_kg)}{b.hari ? ` × ${b.hari} hari` : ""}{b.dasar ? ` · ${b.dasar}` : ""}</span></span>
              <b className="tabular-nums" style={{ color: INK }}>{rp(b.jumlah)}</b>
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-1 border-t border-[#E2E4EA] pt-2 text-[13.5px]">
          <div className="flex justify-between font-semibold" style={{ color: INK }}><span>Total</span><span>{rp(inv.total)}</span></div>
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
            <div className="mt-2 space-y-2">
              <DaftarDokumen dokumen={d.dokumen.filter((x) => x.ref_tabel === "customer_payments" && x.ref_id === b.id)} kosong="Belum ada bukti transfer." />
              {bolehDokumen && <Unggah refTabel="customer_payments" refId={b.id} jenis="bukti_transfer" label="Lampirkan bukti transfer" />}
            </div>
          </div>
        ))}
        {bolehBayar && inv.status_terbit === "terbit" && inv.sisa > 0 && <FormBayar inv={inv} hariIni={hariIni} />}
      </div>

      <div className="space-y-2">
        <h4 className="text-[13px] font-semibold" style={{ color: INK }}>Berkas invoice</h4>
        <DaftarDokumen dokumen={d.dokumen.filter((x) => x.ref_tabel === "invoices")} kosong="Belum ada berkas (misalnya surat jalan atau tanda terima)." />
        {bolehDokumen && <Unggah refTabel="invoices" refId={inv.id} jenis="surat_jalan" label="Lampirkan surat jalan / tanda terima" />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[12.5px] font-medium" style={{ color: INK, boxShadow: "0 1px 2px rgba(20,24,40,.08)" }}>Kirim pengingat (WhatsApp)</a>}
        {inv.sisa > 0 && !wa && <span className="text-[12px]" style={{ color: MUTED }}>Nomor pembeli belum terbaca untuk WhatsApp. Lengkapi kontak di Pengaturan.</span>}
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
      {pilih.length > 0 && <KonfirmasiDua full size="sm" label={`Terbitkan invoice jasa · ${rp(total)}`} labelYa="Ya, terbitkan invoice jasa" pending={pending} pesan={`Invoice jasa gudang dingin sebesar ${rp(total)} akan dibuat dengan rincian hitungan.`} />}
    </form>
  );
}

/* --------------------------------------------------------------- utama */
export function PenjualanKelola({ pesanan, invoice, unit, pembeli, siklus, jasa, detailP, detailI, bolehBuat, bolehKirim, bolehInvoice, bolehBayar, bolehDokumen, hariIni }: Props) {
  const router = useRouter();
  const [baru, setBaru] = useState(false);
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

      <Card title="Pesanan jual" right={bolehBuat && <Btn size="sm" onClick={() => setBaru(true)}>Buat pesanan</Btn>}>
        <DaftarPesanan rows={pesanan} onBuka={(id) => router.push(`/penjualan?p=${id}`)}
          kosong={bolehBuat ? "Belum ada pesanan. Ketuk Buat pesanan dan pilih dari stok." : "Belum ada pesanan."} />
      </Card>

      <Card title="Piutang dan invoice">
        <DaftarInvoice rows={invoice} onBuka={(id) => router.push(`/penjualan?inv=${id}`)} kosong="Belum ada invoice." />
      </Card>

      {bolehInvoice && jasa.length > 0 && (
        <Card title="Jasa gudang dingin yang belum ditagihkan"><InvoiceJasa jasa={jasa} /></Card>
      )}

      {baru && (
        <Modal title="Buat pesanan" onClose={() => setBaru(false)}>
          <FormPesananJual unit={unit} pembeli={pembeli} siklus={siklus} hariIni={hariIni} awal={null} onSelesai={(id) => { setBaru(false); router.push(`/penjualan?p=${id}`); }} />
        </Modal>
      )}
      {detailP && (
        <DetailPesananModal key={detailP.pesanan.id + detailP.pesanan.status} d={detailP} unit={unit} pembeli={pembeli} siklus={siklus} hariIni={hariIni}
          bolehBuat={bolehBuat} bolehKirim={bolehKirim} bolehInvoice={bolehInvoice} onTutup={() => router.push("/penjualan")} onInvoice={(id) => router.push(`/penjualan?inv=${id}`)} />
      )}
      {detailI && (
        <InvoiceModal key={detailI.invoice.id} d={detailI} bolehInvoice={bolehInvoice} bolehBayar={bolehBayar} bolehDokumen={bolehDokumen} hariIni={hariIni} onTutup={() => router.push("/penjualan")} />
      )}
    </div>
  );
}
