"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Card, Field, Modal, Pill, TextIn } from "@/components/ui";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { RiwayatKoreksi } from "@/components/ui/RiwayatKoreksi";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { aturPajakDiskon, koreksiPesananJasa, simpanJasa, simpanPesananJasa } from "@/lib/actions/penjualan";
import type { Koreksi } from "@/lib/data/koreksi";
import type { DetailPesanan } from "@/lib/data/penjualan";
import { rp } from "@/lib/format";
import { hitungPotongan, type Potongan } from "@/lib/logic/penjualan";
import type { Opsi } from "@/lib/types/pembelian";
import type { Jasa, Pembeli, Pesanan } from "@/lib/types/penjualan";

/* Penjualan jasa produksi, pajak, dan diskon (permintaan tim 24 Nov 2026). */

/** "1.250.000" atau "11,5" jadi angka. Kosong atau nggak kebaca jadi 0. */
export const angkaId = (s: string) => {
  const n = Number(s.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const teksAngka = (n: number) => String(n).replace(".", ",");

export function potonganAwal(p: Pick<Pesanan, "pajak_aktif" | "pajak_persen" | "diskon_jenis" | "diskon_nilai"> | null | undefined, pajakBawaan: number): Potongan {
  return p ? { pajakAktif: p.pajak_aktif, pajakPersen: p.pajak_aktif ? Number(p.pajak_persen) : pajakBawaan, diskonJenis: p.diskon_jenis, diskonNilai: Number(p.diskon_nilai) }
    : { pajakAktif: false, pajakPersen: pajakBawaan, diskonJenis: "nominal", diskonNilai: 0 };
}

/** Rincian subtotal, diskon, pajak, total. Dipakai di form, rincian pesanan, dan invoice. */
export function RincianTotal({ subtotal, diskon, pajak, pajakPersen, total, judulTotal = "Total" }: { subtotal: number; diskon: number; pajak: number; pajakPersen?: number; total: number; judulTotal?: string }) {
  return (
    <div className="space-y-1 text-[13.5px]" data-testid="rincian-total">
      {(diskon > 0 || pajak > 0) && <div className="flex justify-between" style={{ color: MUTED }}><span>Subtotal</span><span className="tabular-nums">{rp(subtotal)}</span></div>}
      {diskon > 0 && <div className="flex justify-between" style={{ color: MUTED }}><span>Diskon</span><span className="tabular-nums">−{rp(diskon)}</span></div>}
      {pajak > 0 && <div className="flex justify-between" style={{ color: MUTED }}><span>Pajak{pajakPersen ? ` ${teksAngka(pajakPersen)}%` : ""}</span><span className="tabular-nums">{rp(pajak)}</span></div>}
      <div className="flex justify-between font-semibold" style={{ color: INK }}><span>{judulTotal}</span><span className="tabular-nums">{rp(total)}</span></div>
    </div>
  );
}

/** Isian pajak (on/off + persen) dan diskon (persen atau nominal). Nama isiannya dibaca server action:
    pajakAktif, pajakPersen, diskonJenis, diskonNilai. */
export function IsianPajakDiskon({ subtotal, awal, judulTotal }: { subtotal: number; awal: Potongan; judulTotal?: string }) {
  const [pajakAktif, setPajakAktif] = useState(awal.pajakAktif);
  const [pajakPersen, setPajakPersen] = useState(teksAngka(awal.pajakPersen));
  const [diskonJenis, setDiskonJenis] = useState<"persen" | "nominal">(awal.diskonJenis);
  const [diskonNilai, setDiskonNilai] = useState(awal.diskonNilai ? teksAngka(awal.diskonNilai) : "");
  const h = hitungPotongan(subtotal, { pajakAktif, pajakPersen: angkaId(pajakPersen), diskonJenis, diskonNilai: angkaId(diskonNilai) });
  return (
    <div className="space-y-3 rounded-2xl bg-white p-3" data-testid="isian-pajak-diskon">
      <input type="hidden" name="pajakAktif" value={pajakAktif ? "1" : "0"} />
      <input type="hidden" name="diskonJenis" value={diskonJenis} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="flex min-h-10 items-center gap-2.5 text-[13.5px] font-medium" style={{ color: INK }}>
            <input type="checkbox" role="switch" aria-label="Pakai pajak" className="h-5 w-5 accent-[#00171F]" checked={pajakAktif} onChange={(e) => setPajakAktif(e.target.checked)} />
            Pakai pajak
          </label>
          {pajakAktif && (
            <div className="flex items-center gap-2">
              <input name="pajakPersen" aria-label="Persen pajak" inputMode="decimal" className="h-10 w-24 rounded-xl border border-[#E2E4EA] px-3 text-right text-[14px]" style={{ color: INK }} value={pajakPersen} onChange={(e) => setPajakPersen(e.target.value)} />
              <span className="text-[13px]" style={{ color: MUTED }}>% dari setelah diskon</span>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <div role="radiogroup" aria-label="Jenis diskon" className="inline-flex rounded-full bg-[#EEF0F5] p-1 text-[12.5px]">
            {(["nominal", "persen"] as const).map((j) => (
              <button key={j} type="button" role="radio" aria-checked={diskonJenis === j} onClick={() => setDiskonJenis(j)}
                className="h-8 rounded-full px-3.5 font-medium" style={diskonJenis === j ? { background: INK, color: "#fff" } : { color: MUTED }}>
                {j === "nominal" ? "Diskon Rp" : "Diskon %"}
              </button>
            ))}
          </div>
          <input name="diskonNilai" aria-label={diskonJenis === "persen" ? "Diskon persen" : "Diskon rupiah"} inputMode="decimal" placeholder={diskonJenis === "persen" ? "0 %" : "Rp0"}
            className="h-10 w-full rounded-xl border border-[#E2E4EA] px-3 text-right text-[14px]" style={{ color: INK }} value={diskonNilai} onChange={(e) => setDiskonNilai(e.target.value)} />
        </div>
      </div>
      <RincianTotal subtotal={h.subtotal} diskon={h.diskon} pajak={h.pajak} pajakPersen={pajakAktif ? angkaId(pajakPersen) : 0} total={h.total} judulTotal={judulTotal} />
    </div>
  );
}

/* ------------------------------------------------------------ pesanan jasa */
type BarisForm = { service_item_id: string | null; keterangan: string; harga: string };
const MANUAL = 5;

/** Form penjualan jasa: centang jasa dari daftar (harganya keisi, boleh diubah) plus 5 baris manual. Dipakai buat bikin baru,
    ubah yang belum ditagih, dan koreksi yang udah ditagih (wajib alasan). */
export function FormPesananJasa({ daftar, pembeli, siklus, hariIni, pajakBawaan, awal, koreksi = false, onSelesai }: {
  daftar: Jasa[]; pembeli: Pembeli[]; siklus: Opsi[]; hariIni: string; pajakBawaan: number; awal: DetailPesanan | null; koreksi?: boolean; onSelesai: (id: string) => void;
}) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(koreksi ? koreksiPesananJasa : simpanPesananJasa, undefined);
  const aktif = daftar.filter((j) => j.aktif || awal?.jasa.some((b) => b.service_item_id === j.id));
  // Jasa dari daftar: id -> harga (teks). Yang nggak ada di peta berarti nggak dicentang.
  const [pilih, setPilih] = useState<Record<string, { keterangan: string; harga: string }>>(() =>
    Object.fromEntries((awal?.jasa ?? []).filter((b) => b.service_item_id).map((b) => [b.service_item_id!, { keterangan: b.keterangan, harga: teksAngka(b.harga) }])));
  const [manual, setManual] = useState<BarisForm[]>(() => {
    const ada = (awal?.jasa ?? []).filter((b) => !b.service_item_id).map((b) => ({ service_item_id: null, keterangan: b.keterangan, harga: teksAngka(b.harga) }));
    return [...ada, ...Array.from({ length: Math.max(0, MANUAL - ada.length) }, () => ({ service_item_id: null, keterangan: "", harga: "" }))].slice(0, MANUAL);
  });
  useEffect(() => { if ((state?.id || state?.pesan) && !state.error) onSelesai(state.id ?? awal?.pesanan.id ?? ""); }, [state, onSelesai, awal]);
  const baris: BarisForm[] = [
    ...aktif.filter((j) => j.id in pilih).map((j) => ({ service_item_id: j.id, keterangan: pilih[j.id].keterangan, harga: pilih[j.id].harga })),
    ...manual.filter((m) => m.keterangan.trim() !== "" || m.harga.trim() !== ""),
  ];
  const subtotal = baris.reduce((a, b) => a + Math.round(angkaId(b.harga) * 100), 0) / 100;
  const ubahManual = (i: number, k: "keterangan" | "harga", v: string) => setManual((m) => m.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <form action={action} className="space-y-3" data-testid="form-pesanan-jasa">
      {awal && <input type="hidden" name="pesananId" value={awal.pesanan.id} />}
      <input type="hidden" name="baris" value={JSON.stringify(baris)} />
      <PesanForm state={state?.error ? state : undefined} />
      {!koreksi && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pelanggan (PT)" error={state?.kolom?.buyerId?.[0]}>
              <select name="buyerId" className={pilihCls} defaultValue={awal?.pesanan.buyer_id ?? ""} required>
                <option value="" disabled>Pilih pelanggan</option>
                {pembeli.map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
              </select>
            </Field>
            <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={awal?.pesanan.tanggal ?? hariIni} required /></Field>
          </div>
          <Field label="Proyek" hint="Biar masuk laba rugi proyek jasanya. Boleh dikosongin.">
            <select name="siklusId" className={pilihCls} defaultValue={awal?.pesanan.cycle_id ?? ""}><option value="">Tanpa proyek</option>{siklus.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
          </Field>
        </>
      )}
      {koreksi && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={awal?.pesanan.tanggal ?? hariIni} required /></Field>
          <Field label="Catatan"><TextIn name="catatan" maxLength={300} defaultValue={awal?.pesanan.catatan ?? ""} /></Field>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[12px] font-medium" style={{ color: MUTED }}>Jasa dari daftar harga</p>
        {aktif.length === 0 && <p className="text-[12.5px]" style={{ color: MUTED }}>Daftar harga jasa masih kosong. Isi dulu di kartu Daftar harga jasa, atau pakai baris manual di bawah.</p>}
        {aktif.map((j) => {
          const on = j.id in pilih;
          return (
            <div key={j.id} className="rounded-2xl bg-white p-2.5">
              <label className="flex min-h-10 items-center gap-2.5 text-[13.5px]" style={{ color: INK }}>
                <input type="checkbox" className="h-5 w-5 accent-[#00171F]" checked={on} aria-label={`Pakai jasa ${j.nama}`}
                  onChange={(e) => setPilih((p) => { const n = { ...p }; if (e.target.checked) n[j.id] = { keterangan: j.nama, harga: teksAngka(j.harga) }; else delete n[j.id]; return n; })} />
                <span className="flex-1">{j.nama}</span>
                <span className="text-[12.5px] tabular-nums" style={{ color: MUTED }}>{rp(j.harga)}</span>
              </label>
              {on && (
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-2">
                  <input aria-label={`Keterangan ${j.nama}`} className="h-10 w-full min-w-0 rounded-xl border border-[#E2E4EA] px-3 text-[13.5px]" value={pilih[j.id].keterangan}
                    onChange={(e) => setPilih((p) => ({ ...p, [j.id]: { ...p[j.id], keterangan: e.target.value } }))} />
                  <input aria-label={`Harga ${j.nama}`} inputMode="decimal" className="h-10 w-full min-w-0 rounded-xl border border-[#E2E4EA] px-3 text-right text-[13.5px]" value={pilih[j.id].harga}
                    onChange={(e) => setPilih((p) => ({ ...p, [j.id]: { ...p[j.id], harga: e.target.value } }))} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-[12px] font-medium" style={{ color: MUTED }}>Isian manual (paling banyak 5)</p>
        {manual.map((m, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-2">
            <input aria-label={`Keterangan manual ${i + 1}`} placeholder={`Keterangan ${i + 1}`} className="h-10 w-full min-w-0 rounded-xl border border-[#E2E4EA] bg-white px-3 text-[13.5px]" value={m.keterangan} onChange={(e) => ubahManual(i, "keterangan", e.target.value)} />
            <input aria-label={`Harga manual ${i + 1}`} inputMode="decimal" placeholder="Rp" className="h-10 w-full min-w-0 rounded-xl border border-[#E2E4EA] bg-white px-3 text-right text-[13.5px]" value={m.harga} onChange={(e) => ubahManual(i, "harga", e.target.value)} />
          </div>
        ))}
      </div>

      {!koreksi && <IsianPajakDiskon subtotal={subtotal} awal={potonganAwal(awal?.pesanan, pajakBawaan)} judulTotal="Perkiraan total" />}
      {koreksi && <p className="text-[13px] font-semibold" style={{ color: INK }}>Subtotal baru {rp(subtotal)}. Pajak sama diskonnya tetap, invoice dihitung ulang.</p>}
      {!koreksi && <Field label="Catatan" hint="Boleh dikosongin."><TextIn name="catatan" maxLength={300} defaultValue={awal?.pesanan.catatan ?? ""} /></Field>}
      {koreksi && <Field label="Alasan koreksi" hint="Wajib. Misalnya harga jasanya salah." error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required /></Field>}
      <Btn type="submit" full disabled={pending || baris.length === 0}>{pending ? "Menyimpan..." : koreksi ? "Simpan koreksi" : awal ? "Simpan perubahan" : "Simpan pesanan jasa"}</Btn>
    </form>
  );
}

/** Ubah pajak dan diskon pesanan yang udah ada. Kalau invoice-nya udah terbit, wajib alasan dan invoice dihitung ulang. */
export function AturPajakDiskon({ p, subtotal, pajakBawaan, adaInvoice, onSelesai }: { p: Pesanan; subtotal: number; pajakBawaan: number; adaInvoice: boolean; onSelesai: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(aturPajakDiskon, undefined);
  useEffect(() => { if (state?.pesan && !state.error) onSelesai(); }, [state, onSelesai]);
  return (
    <form action={action} className="space-y-3" data-testid="form-atur-pajak-diskon">
      <input type="hidden" name="pesananId" value={p.id} />
      <PesanForm state={state?.error ? state : undefined} />
      <IsianPajakDiskon subtotal={subtotal} awal={potonganAwal(p, pajakBawaan)} />
      {adaInvoice
        ? <Field label="Alasan" hint="Wajib, invoice-nya udah terbit dan bakal dihitung ulang." error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required /></Field>
        : <input type="hidden" name="alasan" value="" />}
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan pajak dan diskon"}</Btn>
      <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={onSelesai}>Nggak jadi</Btn></div>
    </form>
  );
}

/* ------------------------------------------------------------ daftar harga jasa */
function FormJasa({ jasa, onSelesai }: { jasa: Jasa | null; onSelesai: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanJasa, undefined);
  useEffect(() => { if (state?.pesan && !state.error) onSelesai(); }, [state, onSelesai]);
  return (
    <form action={action} className="space-y-3" data-testid="form-jasa">
      {jasa && <input type="hidden" name="jasaId" value={jasa.id} />}
      <PesanForm state={state?.error ? state : undefined} />
      <Field label="Nama jasa" error={state?.kolom?.nama?.[0]}><TextIn name="nama" maxLength={120} defaultValue={jasa?.nama ?? ""} required /></Field>
      <Field label="Harga" hint="Harga bawaan. Pas bikin pesanan masih bisa diubah." error={state?.kolom?.harga?.[0]}><TextIn name="harga" inputMode="decimal" defaultValue={jasa ? teksAngka(jasa.harga) : ""} required /></Field>
      {jasa && (
        <>
          <Field label="Status">
            <select name="aktif" className={pilihCls} defaultValue={jasa.aktif ? "1" : "0"}><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
          </Field>
          <Field label="Alasan" hint="Wajib, misalnya harga naik." error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required /></Field>
        </>
      )}
      {!jasa && <input type="hidden" name="alasan" value="" />}
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : jasa ? "Simpan koreksi" : "Tambah jasa"}</Btn>
    </form>
  );
}

/** Daftar harga jasa produksi: paling banyak 5 yang aktif. Harga bisa dikoreksi kapan aja, riwayatnya kecatat. */
export function DaftarHargaJasa({ jasa, bolehUbah, koreksi, pengguna }: { jasa: Jasa[]; bolehUbah: boolean; koreksi: Koreksi[]; pengguna: Record<string, { nama: string }> }) {
  const [buka, setBuka] = useState<Jasa | "baru" | null>(null);
  const aktif = jasa.filter((j) => j.aktif).length;
  return (
    <Card title="Daftar harga jasa produksi" right={bolehUbah && aktif < 5 && <Btn size="sm" v="light" onClick={() => setBuka("baru")}>Tambah jasa</Btn>}>
      <div className="space-y-1.5 px-1 pb-1" data-testid="daftar-harga-jasa">
        {jasa.length === 0 && <p className="px-1.5 pb-1 text-[13px]" style={{ color: MUTED }}>Belum ada jasa. Isi sampai 5 jasa produksi beserta harganya.</p>}
        {jasa.map((j) => (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5">
            <span className="min-w-0 text-[13.5px] font-medium" style={{ color: INK }}>{j.nama} {!j.aktif && <Pill t="Nonaktif" />}</span>
            <span className="flex items-center gap-2">
              <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: INK }}>{rp(j.harga)}</span>
              {bolehUbah && <Btn size="sm" v="ghost" onClick={() => setBuka(j)}>Koreksi</Btn>}
            </span>
          </div>
        ))}
        <p className="px-1.5 pt-1 text-[12px]" style={{ color: MUTED }}>{aktif} dari 5 jasa aktif. Harga di sini cuma bawaan, tiap pesanan bisa beda.</p>
      </div>
      {buka && (
        <Modal title={buka === "baru" ? "Tambah jasa" : `Koreksi ${buka.nama}`} onClose={() => setBuka(null)}>
          <FormJasa jasa={buka === "baru" ? null : buka} onSelesai={() => setBuka(null)} />
          {buka !== "baru" && <RiwayatKoreksi daftar={koreksi.filter((k) => k.ref_id === buka.id)} pengguna={pengguna} />}
        </Modal>
      )}
    </Card>
  );
}
