"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Card, Field, Inner, Modal, Stat, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { cekMutuLot, terimaIkan } from "@/lib/actions/mutu";
import { formatKg } from "@/lib/logic/neraca";
import { DaftarLot } from "./DaftarLot";
import type { LotBaris, Opsi, POSiapTerima } from "@/lib/types/pembelian";

const selectCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]";

function Pesan({ state }: { state: HasilForm }) {
  if (state?.error) return <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>;
  if (state?.pesan) return <div role="status" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>{state.pesan}</div>;
  return null;
}

/* ------------------------------------------------------------ terima ikan */
function TerimaIkan({ poSiap }: { poSiap: POSiapTerima[] }) {
  // Setelah sukses, form dipasang ulang (key berganti) supaya isiannya kosong, dan pesan sukses tetap tampil.
  const [kunci, setKunci] = useState(0);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  return (
    <Card title="Terima ikan">
      {berhasil && <div className="px-2.5 pb-2"><Pesan state={{ pesan: berhasil }} /></div>}
      <FormTerima key={kunci} poSiap={poSiap} onSukses={(m) => { setBerhasil(m); setKunci((k) => k + 1); }} />
    </Card>
  );
}

function FormTerima({ poSiap, onSukses }: { poSiap: POSiapTerima[]; onSukses: (pesan: string) => void }) {
  const [poId, setPoId] = useState("");
  const [state, action, pending] = useActionState<HasilForm, FormData>(async (prev, fd) => {
    const r = await terimaIkan(prev, fd);
    if (r?.pesan) onSukses(r.pesan);
    return r;
  }, undefined);
  const po = poSiap.find((p) => p.po_id === poId);
  const belumDisetujui = po?.status_persetujuan === "diajukan";
  return (
      <form action={action} className="space-y-3 px-2.5 pb-2.5">
        <Pesan state={state?.error ? state : undefined} />
        {poSiap.length === 0 ? (
          <p className="text-[13px]" style={{ color: MUTED }}>Tidak ada PO yang menunggu ikan. PO muncul di sini setelah diajukan.</p>
        ) : (
          <>
            <Field label="PO" error={state?.kolom?.poId?.[0]}>
              <select name="poId" value={poId} onChange={(e) => setPoId(e.target.value)} className={selectCls} required>
                <option value="" disabled>Pilih PO</option>
                {poSiap.map((p) => (
                  <option key={p.po_id} value={p.po_id}>
                    {p.kode} · {p.supplier_nama} · sisa {formatKg(p.kg - p.kg_diterima)} kg{p.status_persetujuan === "diajukan" ? " · belum disetujui" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Berat ditimbang (kg)" error={state?.kolom?.kg?.[0]}>
                <TextIn name="kg" type="number" inputMode="decimal" step="0.001" min="0" required />
              </Field>
              <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
            </div>
            {belumDisetujui && (
              <label className="flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
                <input type="checkbox" name="sebelumDisetujui" className="mt-0.5 h-4 w-4 accent-[#8A5A00]" />
                <span>PO ini belum disetujui. Centang bila ikan sudah datang dan harus dibongkar dulu (bongkar malam). Pembayaran tetap menunggu persetujuan Owner.</span>
              </label>
            )}
            <Btn type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Catat penerimaan"}</Btn>
          </>
        )}
      </form>
  );
}

/* -------------------------------------------------------------- cek mutu */
function CekMutu({ lot, grade, onTutup }: { lot: LotBaris; grade: Opsi[]; onTutup: () => void }) {
  const [hasil, setHasil] = useState<"lulus" | "ditahan">(lot.qc === "ditahan" ? "ditahan" : "lulus");
  const [state, action, pending] = useActionState<HasilForm, FormData>(cekMutuLot, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  const pilihan = (v: "lulus" | "ditahan", label: string) => (
    <label className="flex flex-1 cursor-pointer items-center justify-center rounded-2xl px-3.5 py-3 text-[14px] font-medium"
      style={hasil === v ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>
      <input type="radio" name="hasil" value={v} checked={hasil === v} onChange={() => setHasil(v)} className="sr-only" />{label}
    </label>
  );
  return (
    <Modal title={`Cek mutu ${lot.kode}`} onClose={onTutup}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="lotId" value={lot.id} />
        <Pesan state={state} />
        <p className="text-[13px]" style={{ color: MUTED }}>{lot.po_kode} · {lot.suppliers?.nama} · {formatKg(lot.kg)} kg</p>
        <div className="flex gap-2">{pilihan("lulus", "Lulus")}{pilihan("ditahan", "Tahan")}</div>
        {hasil === "lulus" && (
          <Field label="Kelas mutu" error={state?.kolom?.gradeId?.[0]}>
            <select name="gradeId" defaultValue={lot.grade_id ?? ""} className={selectCls} required>
              <option value="" disabled>Pilih kelas</option>
              {grade.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </Field>
        )}
        <Field label="Catatan" hint="Misalnya suhu, bau, atau alasan menahan."><TextIn name="catatan" maxLength={300} defaultValue={lot.qc_catatan} /></Field>
        <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan hasil"}</Btn>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- halaman */
export function MutuKelola({ lots, poSiap, grade, bolehTerima, bolehMutu }: { lots: LotBaris[]; poSiap: POSiapTerima[]; grade: Opsi[]; bolehTerima: boolean; bolehMutu: boolean }) {
  const [cek, setCek] = useState<LotBaris | null>(null);
  const menunggu = lots.filter((l) => l.qc === "menunggu").length;
  const ditahan = lots.filter((l) => l.qc === "ditahan").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={String(lots.length)} label="Lot tercatat" />
        <Stat value={String(menunggu)} label="Menunggu cek mutu" tone={menunggu > 0 ? "warn" : undefined} />
        <Stat value={String(ditahan)} label="Ditahan" tone={ditahan > 0 ? "warn" : undefined} />
      </div>

      {bolehTerima && <TerimaIkan poSiap={poSiap} />}

      <DaftarLot lots={lots} bolehMutu={bolehMutu} onCek={setCek} />
      {cek && <CekMutu key={cek.id} lot={cek} grade={grade} onTutup={() => setCek(null)} />}
      <Inner className="!p-3.5"><p className="text-[12.5px]" style={{ color: MUTED }}>Lot yang lulus dengan kelas mutu bisa dipakai untuk produksi (Fase 3). Lot yang sudah dipakai tidak bisa diubah mutunya.</p></Inner>
    </div>
  );
}
