"use client";

import { useActionState, useState } from "react";
import { Btn, Field, Inner, Modal, Pill, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { ajukanPO, catatBayar } from "@/lib/actions/pembelian";
import type { DetailPO as Detail } from "@/lib/data/pembelian";
import { hariIni as hariIniFn, rp, tanggal, waktu } from "@/lib/format";
import { bisaDiedit, LABEL_APV, LABEL_BAYAR, LABEL_PO, LABEL_QC, LABEL_TERIMA, lampiranWajib, namaPemegang, selisihHarga, sisaBayar } from "@/lib/logic/pembelian";
import { formatKg } from "@/lib/logic/neraca";
import type { AturanLampiran, Opsi, PemegangTugas, Pengguna } from "@/lib/types/pembelian";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { DaftarDokumen, Unggah } from "@/components/dokumen/Dokumen";
import { FormPO } from "./FormPO";

type Props = {
  detail: Detail;
  kelengkapan: Kelengkapan;
  pengguna: Record<string, Pengguna>;
  pemasok: Opsi[];
  siklus: Opsi[];
  bolehTulis: boolean;
  bolehBayar: boolean;
  bolehDokumen: boolean;
  bolehSiklusBaru: boolean;
  hariIni: string;
  onTutup: () => void;
};

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

/** Nota wajib tapi belum ada: PO tetap bisa diajukan dengan tanda "nota menyusul" supaya penerimaan tidak tertahan. */
function Ajukan({ poId, adaNota, notaWajib, penyetuju }: { poId: string; adaNota: boolean; notaWajib: boolean; penyetuju: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(ajukanPO, undefined);
  const [menyusul, setMenyusul] = useState(false);
  const perluTanda = notaWajib && !adaNota;
  const siap = !perluTanda || menyusul;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="poId" value={poId} />
      <Pesan state={state} />
      {perluTanda && (
        <label className="flex items-start gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-[13px]" style={{ color: INK }}>
          <input type="checkbox" name="notaMenyusul" checked={menyusul} onChange={(e) => setMenyusul(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#00171F]" />
          <span><b className="font-medium">Nota menyusul.</b> Notanya belum ada (misalnya bongkar malam). PO tetap diajukan dan ikan tetap bisa diterima; notanya dilampirkan nanti.</span>
        </label>
      )}
      <KonfirmasiDua full label="Ajukan untuk disetujui" labelYa="Ya, ajukan sekarang" pending={pending} disabled={!siap}
        pesan={`Setelah diajukan, PO tidak bisa diubah sampai diputuskan.${menyusul && perluTanda ? " PO ditandai nota menyusul." : ""} Lanjutkan?`} />
      {!siap && <p className="text-[12px]" style={{ color: "#8A5A00" }}>Lampirkan nota dulu, atau centang Nota menyusul bila notanya belum ada.</p>}
      {penyetuju && <p className="text-[12px]" style={{ color: MUTED }}>Yang bisa menyetujui: {penyetuju}.</p>}
    </form>
  );
}

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
        pesan={`Catat pembayaran ${rp(Number(jumlah) || 0)} untuk PO ini? Pastikan nominal sudah benar.`} />
    </form>
  );
}

export function DetailPO({ detail, kelengkapan, pengguna, pemasok, siklus, bolehTulis, bolehBayar, bolehDokumen, bolehSiklusBaru, hariIni, onTutup }: Props) {
  const { po, pengajuan, dokumen, lot, bayar } = detail;
  const [edit, setEdit] = useState(false);
  const dokPO = dokumen.filter((d) => d.ref_tabel === "purchase_orders");
  const adaNota = dokPO.some((d) => d.jenis === "nota");
  const bisaUbah = bolehTulis && bisaDiedit(po.status_persetujuan);
  const notaWajib = lampiranWajib(kelengkapan.aturan, "purchase_orders", "nota");
  const buktiWajib = lampiranWajib(kelengkapan.aturan, "payments", "bukti_transfer");
  // Sebelum diajukan, siapa pun yang boleh melampirkan berkas boleh menambah nota; sesudahnya hanya pemegang tugas nota susulan.
  const bolehNota = bolehDokumen && (bisaDiedit(po.status_persetujuan) || kelengkapan.bolehNotaSusulan);
  const penyetuju = namaPemegang(kelengkapan.pemegang, "persetujuan.setuju");
  const banding = selisihHarga(po.harga_per_kg, po.harga_acuan);
  const sisa = sisaBayar(po.total, po.total_bayar);
  const tanggalIni = hariIni || hariIniFn();

  return (
    <Modal title={`${po.kode} · ${po.supplier_nama}`} onClose={onTutup}>
      <div className="flex flex-wrap gap-1.5">
        <Pill t={LABEL_PO[po.status_persetujuan]} />
        <Pill t={LABEL_TERIMA[po.status_terima]} />
        <Pill t={LABEL_BAYAR[po.status_bayar]} />
        {po.nota_menyusul && !adaNota && <span className="rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Nota menyusul</span>}
      </div>

      {edit && bisaUbah ? (
        <FormPO po={po} pemasok={pemasok} siklus={siklus} bolehSiklusBaru={bolehSiklusBaru} hariIni={tanggalIni} onSelesai={() => setEdit(false)} />
      ) : (
        <Bagian judul="Ringkasan" kanan={bisaUbah && <Btn size="sm" v="light" onClick={() => setEdit(true)}>Ubah</Btn>}>
          <Inner className="!p-3.5">
            <Baris k="Tanggal" v={tanggal(po.tanggal)} />
            <Baris k="Berat" v={`${formatKg(po.kg)} kg`} />
            <Baris k="Harga per kg" v={rp(po.harga_per_kg)} />
            <Baris k="Total" v={rp(po.total)} />
            <Baris k="Proyek" v={po.siklus_kode ?? "-"} />
            {po.catatan && <Baris k="Catatan" v={po.catatan} />}
          </Inner>
          {banding && banding.naik && (
            <p className="mt-2 rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
              Harga naik {rp(banding.selisih)}/kg ({banding.persen.toFixed(1).replace(".", ",")}%) dari pembelian terakhir pemasok ini ({rp(po.harga_acuan ?? 0)}/kg).
            </p>
          )}
        </Bagian>
      )}

      <Bagian judul={`Nota dan berkas${notaWajib ? " · nota wajib" : ""}`} kanan={bolehNota && <Unggah refTabel="purchase_orders" refId={po.id} jenis="nota" label={bisaDiedit(po.status_persetujuan) ? "Lampirkan nota" : "Lampirkan nota susulan"} />}>
        <DaftarDokumen dokumen={dokPO} kosong={po.nota_menyusul ? "Nota menyusul, belum dilampirkan." : "Belum ada nota."} />
        {po.nota_menyusul && !adaNota && !bolehNota && bolehDokumen && (
          <p className="mt-2 text-[12px]" style={{ color: MUTED }}>Nota susulan dilampirkan oleh {namaPemegang(kelengkapan.pemegang, "nota.susulan") || "pemegang tugas yang dipilih admin"}.</p>
        )}
      </Bagian>

      {bisaUbah && <Ajukan poId={po.id} adaNota={adaNota} notaWajib={notaWajib} penyetuju={penyetuju} />}
      {po.status_persetujuan === "diajukan" && penyetuju && <p className="text-[12.5px]" style={{ color: MUTED }}>Menunggu keputusan dari: {penyetuju}.</p>}

      {pengajuan.length > 0 && (
        <Bagian judul="Riwayat persetujuan">
          <div className="space-y-2">
            {pengajuan.map((a) => (
              <Inner key={a.id} className="!p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium" style={{ color: INK }}>{a.kode}</span>
                  <Pill t={LABEL_APV[a.status]} />
                </div>
                <ul className="mt-2 space-y-1 text-[12.5px]" style={{ color: MUTED }}>
                  <li>Diajukan oleh {nama(pengguna, a.diajukan_oleh)} · {waktu(a.diajukan_pada)}</li>
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

      <Bagian judul={`Penerimaan ikan · ${formatKg(po.kg_diterima)} dari ${formatKg(po.kg)} kg`}>
        {lot.length === 0 ? (
          <p className="text-[13px]" style={{ color: MUTED }}>Belum ada ikan diterima. Penerimaan dicatat di menu Mutu dan Penerimaan.</p>
        ) : (
          <ul className="space-y-1.5">
            {lot.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]">
                <span style={{ color: INK }}>{l.kode} · {formatKg(l.kg)} kg · {tanggal(l.tanggal_terima)}{l.sebelum_disetujui && " · bongkar malam"}</span>
                <Pill t={LABEL_QC[l.qc]} />
              </li>
            ))}
          </ul>
        )}
      </Bagian>

      {po.status_persetujuan === "disetujui" && (
        <Bagian judul={`Pembayaran · ${rp(po.total_bayar)} dari ${rp(po.total)}`}>
          <div className="space-y-2">
            {bayar.map((b) => (
              <div key={b.id} className="rounded-2xl bg-white p-3.5">
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span style={{ color: INK }}>{b.kode} · {tanggal(b.tanggal)}{b.catatan && ` · ${b.catatan}`}</span>
                  <b style={{ color: INK }}>{rp(b.jumlah)}</b>
                </div>
                <div className="mt-2 space-y-2">
                  <DaftarDokumen dokumen={dokumen.filter((d) => d.ref_tabel === "payments" && d.ref_id === b.id)} kosong={buktiWajib ? "Bukti transfer belum ada (wajib)." : "Belum ada bukti transfer."} />
                  {bolehDokumen && <Unggah refTabel="payments" refId={b.id} jenis="bukti_transfer" label="Lampirkan bukti transfer" />}
                </div>
              </div>
            ))}
            {bolehBayar && sisa > 0 && <FormBayar poId={po.id} sisa={sisa} hariIni={tanggalIni} />}
            {bayar.length === 0 && !bolehBayar && <p className="text-[13px]" style={{ color: MUTED }}>Belum ada pembayaran. Dicatat oleh Finance.</p>}
          </div>
        </Bagian>
      )}
    </Modal>
  );
}
