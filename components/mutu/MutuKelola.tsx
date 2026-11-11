"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Card, Field, Inner, Modal, Stat, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { cekMutuLot, terimaIkan } from "@/lib/actions/mutu";
import { keGram } from "@/lib/logic/grid";
import { formatKg } from "@/lib/logic/neraca";
import { gradeLot } from "@/lib/logic/pembelian";
import { DaftarLot, type LampiranLot } from "./DaftarLot";
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
  const [beda, setBeda] = useState(false);
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
          <p className="text-[13px]" style={{ color: MUTED }}>Nggak ada PO yang lagi nunggu ikan. PO bakal muncul di sini habis diajukan.</p>
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
            {po && (
              <p className="rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }} data-testid="berat-dari-po">
                Berat dari PO: <b className="tabular-nums">{formatKg(po.kg - po.kg_diterima)} kg</b>. Nggak perlu ditimbang ulang di sini.
              </p>
            )}
            <label className="flex items-start gap-2.5 text-[13px]" style={{ color: INK }}>
              <input type="checkbox" name="beratBeda" checked={beda} onChange={(e) => setBeda(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#00171F]" />
              <span>Kiriman nyata berbeda dari PO</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {beda && (
                <Field label="Berat kiriman (kg)" error={state?.kolom?.kg?.[0]}>
                  <TextIn name="kg" type="number" inputMode="decimal" step="0.001" min="0" required />
                </Field>
              )}
              <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
            </div>
            {belumDisetujui && (
              <label className="flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
                <input type="checkbox" name="sebelumDisetujui" className="mt-0.5 h-4 w-4 accent-[#8A5A00]" />
                <span>PO ini belum disetujui. Centang kalau ikannya udah datang dan harus dibongkar dulu (bongkar malam). Pembayaran tetap nunggu persetujuan Owner.</span>
              </label>
            )}
            <Btn type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Catat penerimaan"}</Btn>
          </>
        )}
      </form>
  );
}

/* -------------------------------------------------------------- cek mutu */
type BarisIsian = { k: number; gradeId: string; kg: string };
const teksKg = (kg: number) => String(kg).replace(".", ",");

/** Satu lot bisa berisi beberapa grade. Baris pertama terisi berat lot penuh, jadi lot satu grade cukup pilih grade-nya. */
function IsianGrade({ lot, grade, error }: { lot: LotBaris; grade: Opsi[]; error?: string }) {
  const [baris, setBaris] = useState<BarisIsian[]>(() => {
    const ada = gradeLot(lot);
    return ada.length > 0
      ? ada.map((g, i) => ({ k: i, gradeId: g.grade_id, kg: teksKg(g.kg) }))
      : [{ k: 0, gradeId: "", kg: teksKg(lot.kg) }];
  });
  const ubah = (k: number, isi: Partial<BarisIsian>) => setBaris((b) => b.map((x) => (x.k === k ? { ...x, ...isi } : x)));
  const tambah = () => setBaris((b) => [...b, { k: Math.max(...b.map((x) => x.k)) + 1, gradeId: "", kg: "" }]);
  const hapus = (k: number) => setBaris((b) => b.filter((x) => x.k !== k));

  const gramLot = Math.round(lot.kg * 1000);
  const gramIsi = baris.reduce((a, b) => a + (keGram(b.kg) ?? 0), 0);
  const lebih = gramIsi > gramLot;
  const sisa = gramLot - gramIsi;
  const dipakai = new Set(baris.map((b) => b.gradeId).filter(Boolean));

  return (
    <div className="space-y-2" data-testid="isian-grade">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium" style={{ color: INK }}>Grade dan beratnya</span>
        <span className="text-[12px]" style={{ color: MUTED }}>Satu lot boleh beberapa grade</span>
      </div>
      <input type="hidden" name="baris" value={JSON.stringify(baris.map((b) => ({ grade_id: b.gradeId, kg: b.kg })))} />
      <ul className="space-y-2">
        {baris.map((b, i) => (
          <li key={b.k} className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.25rem] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_7.5rem_2.25rem] sm:gap-2">
            <select aria-label={`Grade baris ${i + 1}`} value={b.gradeId} onChange={(e) => ubah(b.k, { gradeId: e.target.value })} className={selectCls}>
              <option value="" disabled>Pilih grade</option>
              {grade.map((g) => <option key={g.id} value={g.id} disabled={g.id !== b.gradeId && dipakai.has(g.id)}>{g.label}</option>)}
            </select>
            <div className="relative min-w-0">
              <input aria-label={`Berat grade baris ${i + 1} (kg)`} value={b.kg} onChange={(e) => ubah(b.k, { kg: e.target.value })} inputMode="decimal" placeholder="0"
                className="h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white pl-3 pr-9 text-right text-[14px] tabular-nums outline-none focus:border-[#00171F]" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: MUTED }}>kg</span>
            </div>
            {baris.length > 1
              ? <button type="button" onClick={() => hapus(b.k)} aria-label={`Hapus baris ${i + 1}`} title="Hapus baris ini"
                  className="flex h-11 w-9 items-center justify-center rounded-full text-[20px] leading-none hover:bg-white" style={{ color: MUTED }}>×</button>
              : <span aria-hidden />}
          </li>
        ))}
      </ul>
      {baris.length < grade.length && (
        <Btn type="button" size="sm" v="light" onClick={tambah}>+ Tambah grade</Btn>
      )}
      <p className="rounded-2xl px-3.5 py-2.5 text-[13px] tabular-nums" data-testid="jumlah-grade"
        style={lebih ? { background: "#FBE5E3", color: "#A8322B" } : sisa > 0 ? { background: "#FBF0D5", color: "#8A5A00" } : { background: "#fff", color: INK }}>
        Jumlah {formatKg(gramIsi / 1000)} kg dari {formatKg(lot.kg)} kg.{" "}
        {lebih ? `Kelebihan ${formatKg(-sisa / 1000)} kg, kurangin beratnya.` : sisa > 0 ? `${formatKg(sisa / 1000)} kg belum dibagi ke grade (nggak apa-apa, misalnya ikan yang disisihkan).` : "Semua berat udah dibagi."}
      </p>
      {error && <p role="alert" className="text-[12.5px]" style={{ color: "#A8322B" }}>{error}</p>}
    </div>
  );
}

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
        <p className="rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }} data-testid="arti-mutu">
          {hasil === "lulus"
            ? "Lulus: ikan layak diolah. Lot ini langsung bisa dipilih pas mulai produksi."
            : "Tahan: ikan belum boleh diolah, misalnya suhu atau baunya perlu dicek lagi. Lot ini nggak muncul di pilihan produksi sampai diubah jadi Lulus. Penerimaan dan pembayaran ke pemasok nggak terpengaruh."}
        </p>
        {hasil === "lulus" && <IsianGrade lot={lot} grade={grade} error={state?.kolom?.baris?.[0]} />}
        <Field label="Catatan" hint="Misalnya suhu, bau, atau alasan menahan."><TextIn name="catatan" maxLength={300} defaultValue={lot.qc_catatan} /></Field>
        <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan hasil"}</Btn>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- halaman */
export function MutuKelola({ lots, poSiap, grade, bolehTerima, bolehMutu, lampiran }: {
  lots: LotBaris[]; poSiap: POSiapTerima[]; grade: Opsi[]; bolehTerima: boolean; bolehMutu: boolean; lampiran: LampiranLot | null;
}) {
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

      <DaftarLot lots={lots} bolehMutu={bolehMutu} onCek={setCek} lampiran={lampiran} />
      {cek && <CekMutu key={cek.id} lot={cek} grade={grade} onTutup={() => setCek(null)} />}
      <Inner className="!p-3.5"><p className="text-[12.5px]" style={{ color: MUTED }}>Lulus artinya lot boleh diolah dan muncul di pilihan produksi. Tahan artinya lot belum boleh diolah sampai diubah jadi Lulus. Kalau lot udah dipakai produksi, mutunya nggak bisa diubah lagi.</p></Inner>
    </div>
  );
}
