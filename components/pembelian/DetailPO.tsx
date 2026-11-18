"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Field, Inner, Modal, Pill, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { RiwayatKoreksi } from "@/components/ui/RiwayatKoreksi";
import type { HasilForm } from "@/lib/actions/auth";
import { batalkanBayar, catatBayar, koreksiPembelian } from "@/lib/actions/pembelian";
import type { DetailPO as Detail } from "@/lib/data/pembelian";
import { hariIni as hariIniFn, rp, tanggal, waktu } from "@/lib/format";
import { gradeLot, kodePO, LABEL_APV, LABEL_BAYAR, LABEL_PO, lampiranWajib, namaPemegang, selisihHarga, sisaBayar } from "@/lib/logic/pembelian";
import { formatKg } from "@/lib/logic/neraca";
import type { AturanLampiran, BayarBaris, Opsi, PemegangTugas, Pengguna } from "@/lib/types/pembelian";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { DaftarDokumen, Unggah } from "@/components/dokumen/Dokumen";

type Props = {
  detail: Detail;
  kelengkapan: Kelengkapan;
  pengguna: Record<string, Pengguna>;
  pemasok: Opsi[];
  siklus: Opsi[];
  bolehTulis: boolean;
  bolehBayar: boolean;
  bolehDokumen: boolean;
  hariIni: string;
  onTutup: () => void;
};

const selectCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]";
const nama = (p: Record<string, Pengguna>, id: string | null) => (id ? p[id]?.nama ?? "pengguna lain" : "-");

function Bagian({ judul, children, kanan }: { judul: string; children: React.ReactNode; kanan?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold" style={{ color: INK }}>{judul}</h4>
        {kanan}
      </div>
      {children}
    </section>
  );
}

const Baris = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-3 py-1.5 text-[13px]"><span style={{ color: MUTED }}>{k}</span><span className="text-right font-medium" style={{ color: INK }}>{v}</span></div>
);

function Pesan({ state }: { state: HasilForm }) {
  if (state?.error) return <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>;
  if (state?.pesan) return <div role="status" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>{state.pesan}</div>;
  return null;
}

/** Data kelengkapan dari admin: aturan lampiran wajib, pemegang tugas, dan boleh-tidaknya melampirkan nota susulan. */
export type Kelengkapan = { aturan: AturanLampiran[]; pemegang: PemegangTugas[]; bolehNotaSusulan: boolean };

function FormBayar({ poId, sisa, hariIni }: { poId: string; sisa: number; hariIni: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(catatBayar, undefined);
  const [jumlah, setJumlah] = useState(String(sisa));
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-white p-3.5">
      <input type="hidden" name="poId" value={poId} />
      <Pesan state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Jumlah (sisa ${rp(sisa)})`} error={state?.kolom?.jumlah?.[0]}>
          <TextIn name="jumlah" type="number" inputMode="decimal" step="0.01" min="0" max={sisa} value={jumlah} onChange={(e) => setJumlah(e.target.value)} required />
        </Field>
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}>
          <TextIn name="tanggal" type="date" defaultValue={hariIni} required />
        </Field>
      </div>
      <Field label="Catatan" hint="Misalnya DP atau pelunasan."><TextIn name="catatan" maxLength={300} /></Field>
      <KonfirmasiDua size="sm" label="Catat pembayaran" labelYa="Ya, catat pembayaran" pending={pending}
        pesan={`Catat pembayaran ${rp(Number(jumlah) || 0)} buat PO ini? Cek dulu nominalnya udah benar.`} />
    </form>
  );
}

function BatalBayar({ b }: { b: BayarBaris }) {
  const [buka, setBuka] = useState(false);
  const [state, action, pending] = useActionState<HasilForm, FormData>(batalkanBayar, undefined);
  if (!buka) return <Btn size="sm" v="ghost" onClick={() => setBuka(true)}>Batalkan</Btn>;
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="bayarId" value={b.id} />
      <Pesan state={state} />
      <Field label="Alasan pembatalan" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required placeholder="Misalnya salah nominal" /></Field>
      <KonfirmasiDua size="sm" v="danger" label="Batalkan pembayaran" labelYa="Ya, batalkan" pending={pending}
        pesan={`Batalkan ${b.kode} ${rp(b.jumlah)}? Buku kas dapat baris pembalik. Pembayaran yang benar dicatat ulang.`} />
    </form>
  );
}

/** Koreksi pembelian: harga per grade, pemasok, proyek, catatan, plus alasan. */
function KoreksiPO({ detail, pemasok, siklus, onSelesai }: { detail: Detail; pemasok: Opsi[]; siklus: Opsi[]; onSelesai: () => void }) {
  const { po, baris } = detail;
  const [state, action, pending] = useActionState<HasilForm, FormData>(koreksiPembelian, undefined);
  const [harga, setHarga] = useState<Record<string, string>>(() => Object.fromEntries(baris.map((b) => [b.grade_id, String(b.harga_per_kg)])));
  useEffect(() => { if (state?.pesan) onSelesai(); }, [state, onSelesai]);
  const isiHarga = JSON.stringify(baris.map((b) => ({ grade_id: b.grade_id, harga_per_kg: (harga[b.grade_id] ?? "").replace(",", ".") })));
  const proyekAda = po.cycle_id && !siklus.some((s) => s.id === po.cycle_id) ? [{ id: po.cycle_id, label: po.siklus_kode ?? "Proyek lama" }] : [];
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-white p-3.5">
      <input type="hidden" name="poId" value={po.id} />
      <input type="hidden" name="harga" value={isiHarga} />
      <Pesan state={state} />
      {baris.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium" style={{ color: INK }}>Harga per kg</p>
          {baris.map((b) => (
            <div key={b.grade_id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_8rem] items-center gap-2 text-[13px] tabular-nums">
              <b style={{ color: INK }}>{b.grades?.kode ?? "-"}</b>
              <span style={{ color: MUTED }}>{formatKg(b.kg)} kg</span>
              <input aria-label={`Harga per kg ${b.grades?.kode ?? ""}`} inputMode="decimal" value={harga[b.grade_id] ?? ""}
                onChange={(e) => setHarga((h) => ({ ...h, [b.grade_id]: e.target.value }))}
                className="h-10 w-full rounded-xl border border-[#E2E4EA] px-2.5 text-right outline-none focus:border-[#00171F]" />
            </div>
          ))}
          {state?.kolom?.harga?.[0] && <p role="alert" className="text-[12.5px]" style={{ color: "#A8322B" }}>{state.kolom.harga[0]}</p>}
        </div>
      )}
      <Field label="Pemasok atau nelayan" error={state?.kolom?.supplierId?.[0]}>
        <select name="supplierId" defaultValue={po.supplier_id} className={selectCls}>
          {pemasok.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </Field>
      <Field label="Proyek" error={state?.kolom?.siklusId?.[0]}>
        <select name="siklusId" defaultValue={po.cycle_id ?? ""} className={selectCls}>
          <option value="">Tanpa proyek</option>
          {[...proyekAda, ...siklus].map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </Field>
      <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" defaultValue={po.catatan} maxLength={500} /></Field>
      <Field label="Alasan koreksi" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required placeholder="Misalnya salah ketik harga" /></Field>
      {po.status_persetujuan === "disetujui" && (
        <p className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>PO ini udah disetujui. Kalau totalnya berubah, PO balik ke antrean persetujuan dan belum bisa dibayar sampai disetujui lagi.</p>
      )}
      <div className="flex gap-2">
        <Btn type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan koreksi"}</Btn>
        <Btn v="ghost" onClick={onSelesai}>Batal</Btn>
      </div>
    </form>
  );
}

export function DetailPO({ detail, kelengkapan, pengguna, pemasok, siklus, bolehTulis, bolehBayar, bolehDokumen, hariIni, onTutup }: Props) {
  const { po, pengajuan, dokumen, lot, bayar, baris, koreksi } = detail;
  const [koreksiBuka, setKoreksiBuka] = useState(false);
  const dokPO = dokumen.filter((d) => d.ref_tabel === "purchase_orders" || (d.ref_tabel === "lots" && d.jenis === "nota"));
  const adaNota = dokPO.some((d) => d.jenis === "nota");
  const notaWajib = lampiranWajib(kelengkapan.aturan, "purchase_orders", "nota");
  const buktiWajib = lampiranWajib(kelengkapan.aturan, "payments", "bukti_transfer");
  const bolehNota = bolehDokumen && kelengkapan.bolehNotaSusulan;
  const penyetuju = namaPemegang(kelengkapan.pemegang, "persetujuan.setuju");
  const banding = selisihHarga(po.harga_per_kg, po.harga_acuan);
  const sisa = sisaBayar(po.total, po.total_bayar);
  const tanggalIni = hariIni || hariIniFn();
  const bisaKoreksi = bolehTulis && po.status_persetujuan !== "ditolak";
  const namaId = Object.fromEntries([...pemasok, ...siklus].map((o) => [o.id, o.label]));

  return (
    <Modal title={`${kodePO(po.kode)} · ${po.supplier_nama}`} onClose={onTutup}>
      <div className="flex flex-wrap gap-1.5">
        <Pill t={LABEL_PO[po.status_persetujuan]} />
        {po.status_persetujuan === "disetujui" && <Pill t={LABEL_BAYAR[po.status_bayar]} />}
        {po.nota_menyusul && !adaNota && <span className="rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Nota menyusul</span>}
      </div>
      {!po.kode && po.status_persetujuan !== "ditolak" && <p className="text-[12.5px]" style={{ color: MUTED }}>Kode PO keluar begitu pembelian ini disetujui.</p>}

      {koreksiBuka ? (
        <KoreksiPO detail={detail} pemasok={pemasok} siklus={siklus} onSelesai={() => setKoreksiBuka(false)} />
      ) : (
        <Bagian judul="Ringkasan" kanan={bisaKoreksi && <Btn size="sm" v="light" onClick={() => setKoreksiBuka(true)}>Koreksi</Btn>}>
          <Inner className="!p-3.5">
            <Baris k="Tanggal" v={tanggal(po.tanggal)} />
            <Baris k="Berat" v={`${formatKg(po.kg)} kg`} />
            {baris.map((b) => <Baris key={b.id} k={`Grade ${b.grades?.kode ?? "-"} · ${formatKg(b.kg)} kg x ${rp(b.harga_per_kg)}`} v={rp(b.jumlah)} />)}
            {baris.length === 0 && <Baris k="Harga per kg" v={rp(po.harga_per_kg)} />}
            <Baris k="Total" v={rp(po.total)} />
            <Baris k="Proyek" v={po.siklus_kode ? [po.siklus_kode, po.proyek_nama].filter(Boolean).join(" · ") : "-"} />
            {po.catatan && <Baris k="Catatan" v={po.catatan} />}
          </Inner>
          {banding && banding.naik && (
            <p className="mt-2 rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
              Rata-rata harga naik {rp(banding.selisih)}/kg ({banding.persen.toFixed(1).replace(".", ",")}%) dari pembelian terakhir pemasok ini ({rp(po.harga_acuan ?? 0)}/kg).
            </p>
          )}
        </Bagian>
      )}

      <Bagian judul={`Nota dan berkas${notaWajib ? " · nota wajib" : ""}`} kanan={bolehNota && <Unggah refTabel="purchase_orders" refId={po.id} jenis="nota" label="Lampirkan nota susulan" />}>
        <DaftarDokumen dokumen={dokPO} kosong={po.nota_menyusul ? "Nota menyusul, belum dilampirin." : "Belum ada nota."} />
        {po.nota_menyusul && !adaNota && !bolehNota && bolehDokumen && (
          <p className="mt-2 text-[12px]" style={{ color: MUTED }}>Nota susulan nanti dilampirin sama {namaPemegang(kelengkapan.pemegang, "nota.susulan") || "pemegang tugas yang dipilih admin"}.</p>
        )}
      </Bagian>

      {po.status_persetujuan === "diajukan" && penyetuju && <p className="text-[12.5px]" style={{ color: MUTED }}>Lagi nunggu keputusan dari: {penyetuju}.</p>}
      {po.status_persetujuan === "perlu_revisi" && bolehTulis && <p className="text-[12.5px]" style={{ color: "#8A5A00" }}>Perlu revisi. Tekan Koreksi, benerin yang diminta, terus simpan. Pembeliannya otomatis diajukan lagi.</p>}

      {pengajuan.length > 0 && (
        <Bagian judul="Riwayat persetujuan">
          <div className="space-y-2">
            {pengajuan.map((a) => (
              <Inner key={a.id} className="!p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium" style={{ color: INK }}>{a.kode} · {a.judul}</span>
                  <Pill t={LABEL_APV[a.status]} />
                </div>
                <ul className="mt-2 space-y-1 text-[12.5px]" style={{ color: MUTED }}>
                  <li>Diajukan oleh {nama(pengguna, a.diajukan_oleh)} · {waktu(a.diajukan_pada)} · {rp(a.jumlah)}</li>
                  {a.diperiksa_oleh && <li>Diperiksa oleh {nama(pengguna, a.diperiksa_oleh)} · {waktu(a.diperiksa_pada)}{a.catatan_periksa && ` · "${a.catatan_periksa}"`}</li>}
                  {a.disetujui_oleh && <li>Disetujui oleh {nama(pengguna, a.disetujui_oleh)} · {waktu(a.disetujui_pada)}</li>}
                  {a.catatan_revisi && <li style={{ color: "#8A5A00" }}>Perlu revisi: {a.catatan_revisi}</li>}
                  {a.alasan_tolak && <li style={{ color: "#A8322B" }}>Ditolak: {a.alasan_tolak}</li>}
                </ul>
              </Inner>
            ))}
          </div>
        </Bagian>
      )}

      <Bagian judul={`Ikan yang dibeli · ${formatKg(po.kg_diterima)} kg`}>
        {lot.length === 0 ? (
          <p className="text-[13px]" style={{ color: MUTED }}>Belum ada lot di pembelian ini.</p>
        ) : (
          <ul className="space-y-1.5">
            {lot.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]">
                <span style={{ color: INK }}>{l.kode} · {formatKg(l.kg)} kg · {tanggal(l.tanggal_terima)}</span>
                <span className="text-[12px]" style={{ color: MUTED }}>{gradeLot(l).map((g) => `${g.kode} ${formatKg(g.kg)} kg`).join(", ") || "belum digrading"}</span>
              </li>
            ))}
          </ul>
        )}
      </Bagian>

      {(po.status_persetujuan === "disetujui" || bayar.length > 0) && (
        <Bagian judul={`Pembayaran · ${rp(po.total_bayar)} dari ${rp(po.total)}`}>
          <div className="space-y-2">
            {bayar.map((b) => (
              <div key={b.id} className="rounded-2xl bg-white p-3.5" style={b.batal ? { opacity: 0.6 } : undefined}>
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span style={{ color: INK }}>{b.kode} · {tanggal(b.tanggal)}{b.catatan && ` · ${b.catatan}`}</span>
                  <b style={{ color: INK, textDecoration: b.batal ? "line-through" : undefined }}>{rp(b.jumlah)}</b>
                </div>
                {b.batal ? (
                  <p className="mt-1 text-[12.5px]" style={{ color: "#A8322B" }}>Dibatalkan: {b.alasan_batal}</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <DaftarDokumen dokumen={dokumen.filter((d) => d.ref_tabel === "payments" && d.ref_id === b.id)} kosong={buktiWajib ? "Bukti transfer belum ada, padahal wajib." : "Belum ada bukti transfer."} />
                    <div className="flex flex-wrap gap-2">
                      {bolehDokumen && <Unggah refTabel="payments" refId={b.id} jenis="bukti_transfer" label="Lampirkan bukti transfer" />}
                      {bolehBayar && <BatalBayar b={b} />}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {bolehBayar && po.status_persetujuan === "disetujui" && sisa > 0 && <FormBayar poId={po.id} sisa={sisa} hariIni={tanggalIni} />}
            {bayar.length === 0 && !bolehBayar && <p className="text-[13px]" style={{ color: MUTED }}>Belum ada pembayaran. Nanti dicatat sama Finance.</p>}
          </div>
        </Bagian>
      )}

      <RiwayatKoreksi daftar={koreksi} pengguna={pengguna} nama={namaId} />
    </Modal>
  );
}
