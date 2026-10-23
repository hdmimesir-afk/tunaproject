"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Btn, Card, Field, Inner, Modal, Pill } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { DaftarDokumen } from "@/components/dokumen/Dokumen";
import type { HasilForm } from "@/lib/actions/auth";
import { mintaRevisi, periksa, setujui, tolakPengajuan } from "@/lib/actions/persetujuan";
import type { DataPersetujuan } from "@/lib/data/persetujuan";
import { rp, tanggal, waktu } from "@/lib/format";
import { formatKg } from "@/lib/logic/neraca";
import { LABEL_APV, ringkasBatch, selisihHarga } from "@/lib/logic/pembelian";
import type { Pengajuan, Pengguna } from "@/lib/types/pembelian";

type Props = {
  data: DataPersetujuan;
  pengguna: Record<string, Pengguna>;
  bolehPeriksa: boolean;
  bolehSetuju: boolean;
  /** Id pengajuan yang disorot (dari tautan dashboard): digulir ke layar dan diberi bingkai. */
  sorot?: string;
};

const nama = (p: Record<string, Pengguna>, id: string | null) => (id ? p[id]?.nama ?? "pengguna lain" : "-");

function Galat({ state }: { state: HasilForm }) {
  return state?.error ? <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div> : null;
}

/* ----------------------------------------------------------- dialog alasan */
function DialogAlasan({ apv, jenis, onTutup }: { apv: Pengajuan; jenis: "tolak" | "revisi"; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(jenis === "tolak" ? tolakPengajuan : mintaRevisi, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  const tolak = jenis === "tolak";
  return (
    <Modal title={tolak ? `Tolak ${apv.po_kode ?? apv.kode}` : `Minta revisi ${apv.po_kode ?? apv.kode}`} onClose={onTutup}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={apv.id} />
        <Galat state={state} />
        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>
          {tolak ? "PO yang ditolak tidak bisa diajukan lagi; buat PO baru bila perlu." : "PO dikembalikan ke pengaju. Setelah diperbaiki, PO diajukan ulang dan riwayat ini tetap tersimpan."}
        </p>
        <Field label={tolak ? "Alasan penolakan" : "Apa yang perlu diperbaiki?"} error={state?.kolom?.alasan?.[0]}>
          <textarea name="alasan" rows={3} maxLength={500} required className="w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-[#00171F]" />
        </Field>
        <div className="flex gap-2.5">
          <Btn v="light" full onClick={onTutup}>Batal</Btn>
          <Btn type="submit" v={tolak ? "danger" : "dark"} full disabled={pending}>{pending ? "Menyimpan..." : tolak ? "Tolak PO" : "Kembalikan untuk revisi"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------- konfirmasi setuju (satu atau banyak) */
function Konfirmasi({ items, onTutup }: { items: Pengajuan[]; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(setujui, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  const { jumlah, total } = ringkasBatch(items);
  return (
    <Modal title={jumlah === 1 ? "Setujui pengajuan ini?" : `Setujui ${jumlah} pengajuan?`} onClose={onTutup}>
      <form action={action} className="space-y-4">
        <Galat state={state} />
        <input type="hidden" name="total" value={total} />
        {items.map((a) => <input key={a.id} type="hidden" name="id" value={a.id} />)}
        <ul className="space-y-1.5">
          {items.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]">
              <span style={{ color: INK }}>{a.po_kode} · {a.supplier_nama}<span className="block text-[12px]" style={{ color: MUTED }}>{a.judul}</span></span>
              <b className="shrink-0" style={{ color: INK }}>{rp(a.jumlah)}</b>
            </li>
          ))}
        </ul>
        <Inner className="!p-3.5">
          <div className="flex justify-between text-[13px]"><span style={{ color: MUTED }}>Jumlah pengajuan</span><b style={{ color: INK }}>{jumlah}</b></div>
          <div className="mt-1 flex justify-between text-[15px]"><span style={{ color: MUTED }}>Total nilai</span><b style={{ color: INK }}>{rp(total)}</b></div>
        </Inner>
        <p className="text-[12.5px] leading-relaxed" style={{ color: MUTED }}>Disetujui bukan berarti dibayar. Pembayaran dicatat terpisah oleh Finance.</p>
        <div className="flex gap-2.5">
          <Btn v="light" full onClick={onTutup}>Batal</Btn>
          <Btn type="submit" full disabled={pending}>{pending ? "Menyetujui..." : `Ya, setujui ${rp(total)}`}</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ kartu */
function Kartu({ a, props, nota, dipilih, onPilih, onSetuju, onAlasan }: {
  a: Pengajuan; props: Props; nota: DataPersetujuan["nota"][string] | undefined; dipilih: boolean;
  onPilih: (id: string) => void; onSetuju: (a: Pengajuan) => void; onAlasan: (a: Pengajuan, j: "tolak" | "revisi") => void;
}) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(periksa, undefined);
  const banding = selisihHarga(a.harga_per_kg ?? 0, a.harga_acuan);
  const bisaPeriksa = props.bolehPeriksa && a.status === "diajukan";
  const bisaSetuju = props.bolehSetuju && (a.status === "diperiksa" || a.status === "diajukan");
  const disorot = props.sorot === a.id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (disorot) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [disorot]);
  return (
    <div ref={ref} id={`apv-${a.id}`} data-sorot={disorot || undefined} className={`scroll-mt-24 rounded-[22px] ${disorot ? "ring-2 ring-[#00171F] ring-offset-2 ring-offset-[#F4F5F8]" : ""}`}>
    <Inner className="space-y-3 !p-4">
      <div className="flex items-start gap-3">
        {bisaSetuju && (
          <input type="checkbox" checked={dipilih} onChange={() => onPilih(a.id)} aria-label={`Pilih ${a.po_kode}`} className="mt-1 h-5 w-5 shrink-0 accent-[#00171F]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[15px] font-medium" style={{ color: INK }}>{a.judul}</div>
            <Pill t={LABEL_APV[a.status]} />
          </div>
          <div className="text-[12.5px]" style={{ color: MUTED }}>{a.po_kode} · {a.supplier_nama} · {a.kode}</div>
        </div>
      </div>

      <div className="text-[26px] font-normal tracking-tight" style={{ color: INK }}>{rp(a.jumlah)}</div>
      <div className="text-[12.5px]" style={{ color: MUTED }}>
        {a.po_kg !== null && `${formatKg(a.po_kg)} kg × ${rp(a.harga_per_kg ?? 0)}`} · Diajukan {nama(props.pengguna, a.diajukan_oleh)}, {waktu(a.diajukan_pada)}
        {a.diperiksa_oleh && <> · Diperiksa {nama(props.pengguna, a.diperiksa_oleh)}{a.catatan_periksa && ` ("${a.catatan_periksa}")`}</>}
      </div>

      {banding?.naik && (
        <div className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
          Harga naik {rp(banding.selisih)}/kg ({banding.persen.toFixed(1).replace(".", ",")}%) dari pembelian terakhir pemasok ini ({rp(a.harga_acuan ?? 0)}/kg).
        </div>
      )}

      <div>
        <div className="mb-1.5 text-[12px] font-medium" style={{ color: MUTED }}>Nota ({nota?.length ?? 0})</div>
        <DaftarDokumen dokumen={nota ?? []} kosong="Tidak ada nota terlampir." />
      </div>

      <Galat state={state} />
      <div className="flex flex-wrap items-center gap-2">
        {bisaPeriksa && (
          <form action={action} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={a.id} />
            <input name="catatan" placeholder="Catatan (boleh kosong)" maxLength={500} aria-label="Catatan pemeriksa" className="h-8 w-44 rounded-xl border border-[#E2E4EA] bg-white px-2.5 text-[12.5px] outline-none focus:border-[#00171F]" />
            <Btn type="submit" size="sm" disabled={pending}>{pending ? "..." : "Sudah diperiksa"}</Btn>
          </form>
        )}
        {bisaSetuju && <Btn size="sm" onClick={() => onSetuju(a)}>Setujui</Btn>}
        {(props.bolehPeriksa || props.bolehSetuju) && <Btn size="sm" v="light" onClick={() => onAlasan(a, "revisi")}>Minta revisi</Btn>}
        {props.bolehSetuju && <Btn size="sm" v="danger" onClick={() => onAlasan(a, "tolak")}>Tolak</Btn>}
      </div>
    </Inner>
    </div>
  );
}

/* ----------------------------------------------------------------- halaman */
export function Antrean(props: Props) {
  const { data, pengguna } = props;
  const [dipilih, setDipilih] = useState<string[]>([]);
  const [konfirmasi, setKonfirmasi] = useState<Pengajuan[] | null>(null);
  const [alasan, setAlasan] = useState<{ a: Pengajuan; j: "tolak" | "revisi" } | null>(null);

  const idAda = new Set(data.antrean.map((a) => a.id));
  const aktif = dipilih.filter((id) => idAda.has(id));
  const terpilih = data.antrean.filter((a) => aktif.includes(a.id));
  const ringkas = ringkasBatch(terpilih);
  const toggle = (id: string) => setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  const diperiksa = data.antrean.filter((a) => a.status === "diperiksa");
  const diajukan = data.antrean.filter((a) => a.status === "diajukan");
  const kartu = (a: Pengajuan) => (
    <Kartu key={a.id} a={a} props={props} nota={data.nota[a.ref_id]} dipilih={aktif.includes(a.id)}
      onPilih={toggle} onSetuju={(x) => setKonfirmasi([x])} onAlasan={(x, j) => setAlasan({ a: x, j })} />
  );

  return (
    <div className="space-y-4 pb-24">
      <Card title={`Perlu disetujui · ${diperiksa.length}`}>
        <div className="space-y-2.5">
          {diperiksa.length === 0 ? <Inner><p className="text-[13px]" style={{ color: MUTED }}>Tidak ada pengajuan yang menunggu persetujuan.</p></Inner> : diperiksa.map(kartu)}
        </div>
      </Card>

      <Card title={`Perlu diperiksa · ${diajukan.length}`}>
        <div className="space-y-2.5">
          {diajukan.length === 0 ? <Inner><p className="text-[13px]" style={{ color: MUTED }}>Tidak ada pengajuan yang menunggu pemeriksaan.</p></Inner> : diajukan.map(kartu)}
        </div>
      </Card>

      {data.bongkarMalam.length > 0 && (
        <Card title={`Bongkar malam menunggu persetujuan · ${data.bongkarMalam.length}`}>
          <ul className="space-y-1.5">
            {data.bongkarMalam.map((l) => (
              <li key={l.id} className="rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }}>
                {l.kode} · {formatKg(l.kg)} kg dari {l.po_kode} ({l.supplier_nama}) · diterima {tanggal(l.tanggal_terima)}
                <span className="block text-[12px]" style={{ color: MUTED }}>Ikan sudah diterima, tapi PO belum disetujui. Pembayaran tetap menunggu persetujuan.</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Riwayat terbaru">
        {data.riwayat.length === 0 ? (
          <Inner><p className="text-[13px]" style={{ color: MUTED }}>Belum ada keputusan.</p></Inner>
        ) : (
          <ul className="space-y-1.5">
            {data.riwayat.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]">
                <span style={{ color: INK }}>
                  {a.po_kode} · {a.supplier_nama} · {rp(a.jumlah)}
                  <span className="block text-[12px]" style={{ color: MUTED }}>
                    {a.status === "disetujui" && `Disetujui ${nama(pengguna, a.disetujui_oleh)}, ${waktu(a.disetujui_pada)}`}
                    {a.status === "ditolak" && `Ditolak: ${a.alasan_tolak}`}
                    {a.status === "perlu_revisi" && `Perlu revisi: ${a.catatan_revisi}`}
                  </span>
                </span>
                <Pill t={LABEL_APV[a.status]} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {props.bolehSetuju && aktif.length > 0 && (
        <div className="fixed inset-x-0 bottom-3 z-30 mx-auto w-[calc(100%-2rem)] max-w-[760px]">
          <div className="flex flex-wrap items-center gap-3 rounded-[24px] px-4 py-3 shadow-lg" style={{ background: INK }}>
            <div className="min-w-0 flex-1 text-[13px] text-white">
              <b>{ringkas.jumlah} dipilih</b> · total {rp(ringkas.total)}
            </div>
            <Btn v="light" size="sm" onClick={() => setDipilih([])}>Batal pilih</Btn>
            <Btn v="light" onClick={() => setKonfirmasi(terpilih)}>Setujui terpilih</Btn>
          </div>
        </div>
      )}

      {konfirmasi && <Konfirmasi items={konfirmasi} onTutup={() => { setKonfirmasi(null); setDipilih([]); }} />}
      {alasan && <DialogAlasan apv={alasan.a} jenis={alasan.j} onTutup={() => setAlasan(null)} />}
    </div>
  );
}
