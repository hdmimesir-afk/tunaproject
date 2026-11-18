"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Field, Modal, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { bukaLagiProduksi, koreksiProduksi, koreksiTimbangan } from "@/lib/actions/produksi";
import type { DetailProduksi as Detail } from "@/lib/data/produksi";
import { gramKeTeks } from "@/lib/logic/grid";
import type { Opsi } from "@/lib/types/pembelian";
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
  const sudahStok = !!p.sudah_stok;
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
          <Field label="Berat ikan dari PT (kg)" error={state?.kolom?.kgPt?.[0]}>
            <TextIn name="kgPt" inputMode="decimal" defaultValue={inputKg(p.kg_masuk_pt)} required />
          </Field>
        ) : alokasi.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-medium" style={{ color: INK }}>Berat dari tiap lot</p>
            {alokasi.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2 text-[13px]">
                <span style={{ color: INK }}>{a.lot_kode}</span>
                <input aria-label={`Berat dari ${a.lot_kode} (kg)`} inputMode="decimal" value={kgLot[a.lot_id] ?? ""}
                  onChange={(e) => setKgLot((k) => ({ ...k, [a.lot_id]: e.target.value }))}
                  className="h-9 w-28 rounded-lg border border-[#E2E4EA] px-2 text-right" />
              </div>
            ))}
          </div>
        )}
        <Field label="Jumlah ekor" hint="Boleh kosong." error={state?.kolom?.jumlahEkor?.[0]}>
          <TextIn name="jumlahEkor" inputMode="numeric" defaultValue={p.jumlah_ekor ?? ""} />
        </Field>
        <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" defaultValue={p.catatan} maxLength={300} /></Field>
        <Field label="Alasan koreksi" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required placeholder="Misalnya salah ketik berat" /></Field>
        {p.status !== "berjalan" && !sudahStok && (
          <p className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Kalau beratnya berubah, produksi ini balik ke Berjalan dan perlu diperiksa ulang.</p>
        )}
        {sudahStok && (
          <p className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Hasilnya udah masuk stok. Koreksi berat masuk tetap boleh, cuma ngubah neraca dan yield, statusnya nggak berubah.</p>
        )}
        <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan koreksi"}</Btn>
      </form>
    </Modal>
  );
}

/** Koreksi timbangan produksi yang udah selesai, diperiksa, atau disetujui. Status nggak berubah; hasil di stok jadi batas bawah. */
export function KoreksiTimbangan({ detail, grade, samping, onTutup }: { detail: Detail; grade: Opsi[]; samping: Opsi[]; onTutup: () => void }) {
  const { produksi: p } = detail;
  const [state, action, pending] = useActionState<HasilForm, FormData>(koreksiTimbangan, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  const perPotong = detail.loin.some((l) => !l.batal);
  const awalLoin = new Map(detail.total.filter((t) => t.kg > 0).map((t) => [t.grade_id, inputKg(t.kg)]));
  const awalSamping = new Map(detail.samping.map((s) => [s.category_id, inputKg(s.kg)]));
  const [loin, setLoin] = useState<Record<string, string>>(() => Object.fromEntries(grade.map((g) => [g.id, awalLoin.get(g.id) ?? ""])));
  const [isiSamping, setIsiSamping] = useState<Record<string, string>>(() => Object.fromEntries(samping.map((s) => [s.id, awalSamping.get(s.id) ?? ""])));
  // Grade yang sebelumnya keisi lalu dikosongin dikirim sebagai 0 biar beratnya bener-bener dihapus dari total.
  const kirimLoin = grade.map((g) => ({ grade_id: g.id, kg: (loin[g.id] ?? "").trim() === "" ? (awalLoin.has(g.id) ? "0" : "") : loin[g.id] }))
    .filter((b) => b.kg !== "");
  return (
    <Modal title={`Koreksi timbangan ${p.kode}`} onClose={onTutup} lebar>
      <form action={action} className="space-y-4">
        <input type="hidden" name="produksiId" value={p.id} />
        {!perPotong && <input type="hidden" name="loin" value={JSON.stringify(kirimLoin)} />}
        <input type="hidden" name="samping" value={JSON.stringify(samping.map((s) => ({ category_id: s.id, kg: isiSamping[s.id] ?? "" })))} />
        <Pesan state={state} />
        <p className="text-[12.5px]" style={{ color: MUTED }}>
          Buat produksi yang udah selesai atau disetujui. Statusnya tetap, koreksinya kecatat bareng alasannya.
          {p.sudah_stok ? " Hasilnya udah masuk stok, jadi loin ditambah hasil samping nggak boleh kurang dari yang udah masuk stok." : ""}
        </p>
        {perPotong ? (
          <p className="rounded-2xl bg-white px-3.5 py-2.5 text-[12.5px]" style={{ color: MUTED }}>Loin produksi ini ditimbang per potong. Buat ngoreksi loinnya, minta Owner Buka lagi. Hasil samping, limbah, dan susut tetap bisa dikoreksi di sini.</p>
        ) : (
          <div>
            <p className="mb-2 text-[13px] font-medium" style={{ color: INK }}>Loin per grade (kg)</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {grade.map((g) => (
                <Field key={g.id} label={g.label}>
                  <TextIn inputMode="decimal" placeholder="0" value={loin[g.id] ?? ""} onChange={(e) => setLoin((x) => ({ ...x, [g.id]: e.target.value }))} />
                </Field>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-2 text-[13px] font-medium" style={{ color: INK }}>Hasil samping, limbah, susut (kg)</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {samping.map((s) => (
              <Field key={s.id} label={s.label}>
                <TextIn inputMode="decimal" placeholder="belum ditimbang" value={isiSamping[s.id] ?? ""} onChange={(e) => setIsiSamping((x) => ({ ...x, [s.id]: e.target.value }))} />
              </Field>
            ))}
            <Field label="Limbah, total" error={state?.kolom?.limbah?.[0]}><TextIn name="limbah" inputMode="decimal" defaultValue={inputKg(p.limbah_kg)} /></Field>
            <Field label="Susut, total" error={state?.kolom?.susut?.[0]}><TextIn name="susut" inputMode="decimal" defaultValue={inputKg(p.susut_kg)} /></Field>
          </div>
        </div>
        <Field label="Alasan koreksi" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required placeholder="Misalnya timbangan loin grade B salah ketik" /></Field>
        <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan koreksi timbangan"}</Btn>
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
