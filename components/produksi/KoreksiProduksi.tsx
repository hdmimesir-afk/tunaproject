"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Field, Modal, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { bukaLagiProduksi, koreksiProduksi } from "@/lib/actions/produksi";
import type { DetailProduksi as Detail } from "@/lib/data/produksi";
import { gramKeTeks } from "@/lib/logic/grid";
import type { ProyekOpsi } from "@/lib/types/produksi";

const selectCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]";
const inputKg = (n: number | null | undefined) => (n === null || n === undefined ? "" : gramKeTeks(Math.round(n * 1000)).replace(".", ","));

function Pesan({ state }: { state: HasilForm }) {
  if (state?.error) return <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>;
  if (state?.pesan) return <div role="status" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>{state.pesan}</div>;
  return null;
}

/** Koreksi produksi: tanggal, proyek, berat ikan dari PT (jasa) atau berat tiap lot (jual), catatan, dan alasan. */
export function KoreksiProduksi({ detail, proyek, onTutup }: { detail: Detail; proyek: ProyekOpsi[]; onTutup: () => void }) {
  const { produksi: p, alokasi } = detail;
  const [state, action, pending] = useActionState<HasilForm, FormData>(koreksiProduksi, undefined);
  const [kgLot, setKgLot] = useState<Record<string, string>>(() => Object.fromEntries(alokasi.map((a) => [a.lot_id, inputKg(a.kg)])));
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  const jasa = p.kg_masuk_pt !== null && p.kg_masuk_pt !== undefined;
  // Proyek yang cocok: jasa cuma ke proyek jasa, jual ke proyek jual. Proyek titip nggak dipakai buat produksi.
  const cocok = proyek.filter((x) => (jasa ? x.lini_bisnis === "jasa" : x.lini_bisnis === "jual"));
  const proyekAda = p.cycle_id && !cocok.some((x) => x.id === p.cycle_id) ? [{ id: p.cycle_id, label: [p.siklus_kode, p.proyek_nama].filter(Boolean).join(" · ") }] : [];
  const kunciBerat = !!p.sudah_stok;
  return (
    <Modal title={`Koreksi ${p.kode}`} onClose={onTutup}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="produksiId" value={p.id} />
        <input type="hidden" name="alokasi" value={JSON.stringify(alokasi.map((a) => ({ lot_id: a.lot_id, kg: kgLot[a.lot_id] ?? "", lama: a.kg })))} />
        <Pesan state={state} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={p.tanggal} required /></Field>
          <Field label="Proyek" error={state?.kolom?.siklusId?.[0]}>
            <select name="siklusId" defaultValue={p.cycle_id ?? ""} className={selectCls}>
              {!jasa && <option value="">Tanpa proyek</option>}
              {[...proyekAda, ...cocok].map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </Field>
        </div>
        {jasa ? (
          <Field label="Berat ikan dari PT (kg)" hint={kunciBerat ? "Hasilnya udah masuk stok, beratnya nggak bisa diubah lagi." : undefined} error={state?.kolom?.kgPt?.[0]}>
            <TextIn name="kgPt" inputMode="decimal" defaultValue={inputKg(p.kg_masuk_pt)} readOnly={kunciBerat} required />
          </Field>
        ) : alokasi.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-medium" style={{ color: INK }}>Berat dari tiap lot</p>
            {alokasi.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2 text-[13px]">
                <span style={{ color: INK }}>{a.lot_kode}</span>
                <input aria-label={`Berat dari ${a.lot_kode} (kg)`} inputMode="decimal" value={kgLot[a.lot_id] ?? ""} readOnly={kunciBerat}
                  onChange={(e) => setKgLot((k) => ({ ...k, [a.lot_id]: e.target.value }))}
                  className="h-9 w-28 rounded-lg border border-[#E2E4EA] px-2 text-right" />
              </div>
            ))}
            {kunciBerat && <p className="text-[12px]" style={{ color: MUTED }}>Hasilnya udah masuk stok, berat lotnya nggak bisa diubah lagi.</p>}
          </div>
        )}
        <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" defaultValue={p.catatan} maxLength={300} /></Field>
        <Field label="Alasan koreksi" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required placeholder="Misalnya salah ketik berat" /></Field>
        {p.status !== "berjalan" && !kunciBerat && (
          <p className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Kalau beratnya berubah, produksi ini balik ke Berjalan dan perlu diperiksa ulang.</p>
        )}
        <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan koreksi"}</Btn>
      </form>
    </Modal>
  );
}

/** Owner buka lagi produksi yang udah disetujui (asal hasilnya belum masuk stok). */
export function BukaLagi({ produksiId }: { produksiId: string }) {
  const [buka, setBuka] = useState(false);
  const [state, action, pending] = useActionState<HasilForm, FormData>(bukaLagiProduksi, undefined);
  if (!buka) return <Btn size="sm" v="light" onClick={() => setBuka(true)}>Buka lagi</Btn>;
  return (
    <form action={action} className="w-full space-y-2 rounded-2xl bg-white p-3.5">
      <input type="hidden" name="produksiId" value={produksiId} />
      <Pesan state={state} />
      <Field label="Alasan buka lagi" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required /></Field>
      <KonfirmasiDua size="sm" label="Buka lagi produksi" labelYa="Ya, buka lagi" pending={pending}
        pesan="Produksi balik ke Berjalan biar bisa dikoreksi, terus perlu diperiksa dan disetujui lagi. Lanjut?" />
      <Btn size="sm" v="ghost" onClick={() => setBuka(false)}>Batal</Btn>
    </form>
  );
}
