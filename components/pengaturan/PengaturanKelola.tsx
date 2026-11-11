"use client";

import { useActionState, useState } from "react";
import { Btn, Card, Field, Inner, Modal, Pill, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { setAktifMaster, simpanAturanLampiran, simpanMaster, simpanPengaturan } from "@/lib/actions/pengaturan";
import { LABEL_JENIS } from "@/components/dokumen/Dokumen";
import type { AturanLampiran } from "@/lib/types/pembelian";
import { MASTER, PENGATURAN, TABEL_MASTER, type Kolom, type KunciPengaturan, type TabelMaster } from "@/lib/master";

export type BarisMaster = { id: string; aktif: boolean } & Record<string, string | number | boolean | null>;
export type NilaiPengaturan = { kunci: string; nilai: number };

function Galat({ state }: { state: HasilForm }) {
  return state?.error ? <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div> : null;
}

/** Form tambah atau ubah satu baris master, dibangun dari daftar kolom di lib/master.ts. */
function FormMaster({ tabel, baris, onSelesai }: { tabel: TabelMaster; baris: BarisMaster | null; onSelesai: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(async (prev, fd) => {
    const r = await simpanMaster(prev, fd);
    if (!r) onSelesai();
    return r;
  }, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tabel" value={tabel} />
      {baris && <input type="hidden" name="id" value={baris.id} />}
      <Galat state={state} />
      {(MASTER[tabel].kolom as readonly Kolom[]).map((c) => (
        <Field key={c.k} label={c.label} error={state?.kolom?.[c.k]?.[0]}>
          {c.jenis === "pilih" ? (
            <select name={c.k} defaultValue={String(baris?.[c.k] ?? c.bawaan)} className="h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3 text-[14px]">
              {c.opsi.map((o) => <option key={o.nilai} value={o.nilai}>{o.label}</option>)}
            </select>
          ) : (
            <TextIn name={c.k} type={c.jenis === "angka" ? "number" : "text"} required={c.jenis === "teks" && c.wajib}
              defaultValue={String(baris?.[c.k] ?? ("bawaan" in c && c.bawaan !== undefined ? c.bawaan : ""))} />
          )}
        </Field>
      ))}
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Btn>
    </form>
  );
}

function TabelData({ tabel, rows, bolehUbah }: { tabel: TabelMaster; rows: BarisMaster[]; bolehUbah: boolean }) {
  const [edit, setEdit] = useState<BarisMaster | "baru" | null>(null);
  const kolom = MASTER[tabel].kolom as readonly Kolom[];
  const tampil = (c: Kolom, r: BarisMaster) => (c.jenis === "pilih" ? c.opsi.find((o) => o.nilai === r[c.k])?.label : String(r[c.k] ?? "")) || "-";
  return (
    <Card title={`${MASTER[tabel].label} · ${rows.length}`} right={bolehUbah && <Btn size="sm" onClick={() => setEdit("baru")}>Tambah</Btn>}>
      {rows.length === 0 ? (
        <Inner><p className="text-[13px]" style={{ color: MUTED }}>Belum ada data.</p></Inner>
      ) : (
        <div className="overflow-x-auto rounded-[20px] bg-white">
          <table className="w-full min-w-[520px] text-[13.5px]">
            <thead><tr className="text-left text-[12px]" style={{ color: MUTED }}>{kolom.map((c) => <th key={c.k} className="px-4 py-3 font-medium">{c.label}</th>)}<th className="px-4 py-3 font-medium">Status</th>{bolehUbah && <th className="px-4 py-3" />}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#EEF0F4]" style={{ opacity: r.aktif ? 1 : 0.55 }}>
                  {kolom.map((c) => <td key={c.k} className="px-4 py-3" style={{ color: INK }}>{tampil(c, r)}</td>)}
                  <td className="px-4 py-3"><Pill t={r.aktif ? "Aktif" : "Nonaktif"} /></td>
                  {bolehUbah && (
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Btn size="sm" v="light" onClick={() => setEdit(r)}>Ubah</Btn>
                        <form action={setAktifMaster}>
                          <input type="hidden" name="tabel" value={tabel} />
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="aktif" value={String(!r.aktif)} />
                          <Btn type="submit" size="sm" v="ghost">{r.aktif ? "Nonaktifkan" : "Aktifkan"}</Btn>
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <Modal title={edit === "baru" ? `Tambah ${MASTER[tabel].label.toLowerCase()}` : `Ubah ${MASTER[tabel].label.toLowerCase()}`} onClose={() => setEdit(null)}>
          <FormMaster tabel={tabel} baris={edit === "baru" ? null : edit} onSelesai={() => setEdit(null)} />
        </Modal>
      )}
    </Card>
  );
}

function FormPengaturan({ kunci, nilai, bolehAtur }: { kunci: KunciPengaturan; nilai: number | undefined; bolehAtur: boolean }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanPengaturan, undefined);
  const p = PENGATURAN[kunci];
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="kunci" value={kunci} />
      <div className="w-[220px]"><Field label={p.label}><TextIn name="nilai" type="number" min={p.min} max={p.max} step="0.1" defaultValue={nilai ?? ""} disabled={!bolehAtur} /></Field></div>
      {bolehAtur && <Btn type="submit" size="sm" disabled={pending}>{pending ? "..." : "Simpan"}</Btn>}
      <div className="w-full"><Galat state={state} /></div>
    </form>
  );
}

const NAMA_CATATAN: Record<AturanLampiran["ref_tabel"], string> = { purchase_orders: "PO (pembelian)", lots: "Penerimaan ikan (lot)", payments: "Pembayaran ke pemasok" };

/** Satu aturan lampiran: wajib atau opsional, plus keterangan yang tampil ke pengguna. */
function BarisAturan({ a, bolehAtur }: { a: AturanLampiran; bolehAtur: boolean }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanAturanLampiran, undefined);
  return (
    <form action={action} className="space-y-2 rounded-2xl bg-white p-3.5">
      <input type="hidden" name="id" value={a.id} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-medium" style={{ color: INK }}>{LABEL_JENIS[a.jenis]}</span>
        <select name="wajib" defaultValue={String(a.wajib)} disabled={!bolehAtur} aria-label={`${LABEL_JENIS[a.jenis]} wajib atau opsional`}
          className="h-9 rounded-xl border border-[#E2E4EA] bg-white px-2.5 text-[13px] outline-none focus:border-[#00171F]">
          <option value="true">Wajib</option>
          <option value="false">Opsional</option>
        </select>
      </div>
      <textarea name="keterangan" defaultValue={a.keterangan} maxLength={300} rows={3} disabled={!bolehAtur} aria-label={`Keterangan ${LABEL_JENIS[a.jenis]}`}
        className="w-full rounded-xl border border-[#E2E4EA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#00171F]" />
      {bolehAtur && <Btn type="submit" size="sm" disabled={pending}>{pending ? "..." : "Simpan"}</Btn>}
      {state?.pesan && <p role="status" className="text-[12.5px]" style={{ color: "#0B6B4A" }}>{state.pesan}</p>}
      <Galat state={state} />
    </form>
  );
}

function AturanLampiranKelola({ aturan, bolehAtur }: { aturan: AturanLampiran[]; bolehAtur: boolean }) {
  return (
    <Card title="Lampiran wajib">
      <div className="space-y-4 px-1 pb-1">
        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>
          Atur berkas mana yang wajib dan mana yang opsional. Kalau lampiran wajib belum ada, pencatatan tetap jalan. Catatannya cuma ditandai &ldquo;belum ada&rdquo; biar nanti bisa dilengkapi. Khusus nota PO, kalau wajib, PO tanpa nota diajukan dengan tanda &ldquo;nota menyusul&rdquo;.
        </p>
        {(Object.keys(NAMA_CATATAN) as AturanLampiran["ref_tabel"][]).map((r) => (
          <section key={r} className="space-y-2">
            <h4 className="text-[13px] font-semibold" style={{ color: INK }}>{NAMA_CATATAN[r]}</h4>
            <div className="grid gap-2 md:grid-cols-2">{aturan.filter((a) => a.ref_tabel === r).map((a) => <BarisAturan key={a.id} a={a} bolehAtur={bolehAtur} />)}</div>
          </section>
        ))}
      </div>
    </Card>
  );
}

export function PengaturanKelola({ data, pengaturan, aturan, bolehUbah, bolehAtur }: { data: Record<TabelMaster, BarisMaster[]>; pengaturan: NilaiPengaturan[]; aturan: AturanLampiran[]; bolehUbah: boolean; bolehAtur: boolean }) {
  const [aktif, setAktif] = useState<TabelMaster | "target" | "lampiran">("target");
  const tab = (id: TabelMaster | "target" | "lampiran", label: string) => (
    <button key={id} type="button" onClick={() => setAktif(id)} className="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px]"
      style={aktif === id ? { background: INK, color: "#fff", fontWeight: 600 } : { background: "#fff", color: INK }}>{label}</button>
  );
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tab("target", "Target hasil")}
        {tab("lampiran", "Lampiran wajib")}
        {TABEL_MASTER.map((t) => tab(t, MASTER[t].label))}
      </div>
      {aktif === "target" ? (
        <Card title="Target hasil olahan">
          <Inner className="space-y-3">
            <p className="text-[13px]" style={{ color: MUTED }}>Dipakai buat nandain produksi yang hasilnya di bawah rencana atau di luar batas wajar.</p>
            {(Object.keys(PENGATURAN) as KunciPengaturan[]).map((k) => (
              <FormPengaturan key={k} kunci={k} nilai={pengaturan.find((x) => x.kunci === k)?.nilai} bolehAtur={bolehAtur} />
            ))}
          </Inner>
        </Card>
      ) : aktif === "lampiran" ? (
        <AturanLampiranKelola aturan={aturan} bolehAtur={bolehAtur} />
      ) : (
        <TabelData key={aktif} tabel={aktif} rows={data[aktif]} bolehUbah={bolehUbah} />
      )}
    </div>
  );
}
