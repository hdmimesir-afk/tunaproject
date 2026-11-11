"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Btn, Field, TextIn } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { simpanPO, tambahPemasok } from "@/lib/actions/pembelian";
import { rp } from "@/lib/format";
import type { Opsi, POBaris } from "@/lib/types/pembelian";

const selectCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]";

/** Isian pemasok baru di dalam form PO. Bukan form terpisah (form tidak boleh bersarang), jadi dikirim lewat tombol. */
function PemasokBaru({ onDibuat, onBatal }: { onDibuat: (p: Opsi) => void; onBatal: () => void }) {
  const [nama, setNama] = useState("");
  const [kontak, setKontak] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, mulai] = useTransition();
  const simpan = () => mulai(async () => {
    setGalat(null);
    const r = await tambahPemasok({ nama, kontak });
    if (r.error || !r.id) return setGalat(r.error ?? "Pemasok gagal disimpan.");
    onDibuat({ id: r.id, label: r.label ?? nama.trim() });
  });
  return (
    <div className="space-y-2.5 rounded-2xl bg-white p-3">
      <p className="text-[12.5px] font-medium" style={{ color: MUTED }}>Pemasok baru</p>
      {galat && <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{galat}</div>}
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Nama pemasok"><TextIn value={nama} onChange={(e) => setNama(e.target.value)} maxLength={120} /></Field>
        <Field label="Kontak" hint="Boleh kosong."><TextIn value={kontak} onChange={(e) => setKontak(e.target.value)} maxLength={120} /></Field>
      </div>
      <div className="flex gap-2">
        <Btn size="sm" disabled={sibuk || nama.trim() === ""} onClick={simpan}>{sibuk ? "Menyimpan..." : "Simpan pemasok"}</Btn>
        <Btn size="sm" v="ghost" onClick={onBatal}>Batal</Btn>
      </div>
    </div>
  );
}

/** Buat PO baru atau ubah PO yang masih draf / perlu revisi. */
export function FormPO({ po, pemasok, siklus, bolehSiklusBaru, bolehPemasokBaru = false, hariIni, onSelesai }: {
  po: POBaris | null; pemasok: Opsi[]; siklus: Opsi[]; bolehSiklusBaru: boolean; bolehPemasokBaru?: boolean; hariIni: string; onSelesai: (id?: string) => void;
}) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanPO, undefined);
  const [supplierId, setSupplierId] = useState(po?.supplier_id ?? "");
  const [baru, setBaru] = useState<Opsi[]>([]);
  const [isiBaru, setIsiBaru] = useState(false);
  const daftar = [...pemasok, ...baru.filter((b) => !pemasok.some((p) => p.id === b.id))];
  useEffect(() => {
    if (state?.id && !state.error) onSelesai(state.id);
  }, [state, onSelesai]);

  return (
    <form action={action} className="space-y-4">
      {po && <input type="hidden" name="id" value={po.id} />}
      {state?.error && <div role="alert" className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>}
      <Field label="Pemasok" error={state?.kolom?.supplierId?.[0]}>
        <select name="supplierId" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={selectCls} required>
          <option value="" disabled>Pilih pemasok</option>
          {daftar.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </Field>
      {bolehPemasokBaru && (isiBaru
        ? <PemasokBaru onBatal={() => setIsiBaru(false)} onDibuat={(p) => { setBaru((b) => [...b, p]); setSupplierId(p.id); setIsiBaru(false); }} />
        : <div className="-mt-2"><Btn size="sm" v="ghost" onClick={() => setIsiBaru(true)}>+ Pemasok belum ada di daftar</Btn></div>)}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Berat (kg)" error={state?.kolom?.kg?.[0]}>
          <TextIn name="kg" type="number" inputMode="decimal" step="0.001" min="0" defaultValue={po?.kg ?? ""} required />
        </Field>
        <Field label="Harga per kg (Rp)" error={state?.kolom?.hargaPerKg?.[0]}>
          <TextIn name="hargaPerKg" type="number" inputMode="decimal" step="0.01" min="0" defaultValue={po?.harga_per_kg ?? ""} required />
        </Field>
      </div>
      {po && <p className="-mt-2 text-[12px]" style={{ color: MUTED }}>Total sekarang {rp(po.total)}. Nanti dihitung ulang pas disimpan.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}>
          <TextIn name="tanggal" type="date" defaultValue={po?.tanggal ?? hariIni} required />
        </Field>
        <Field label="Proyek (batch atau bongkaran)" hint="Satu proyek boleh isinya beberapa PO." error={state?.kolom?.siklusId?.[0]}>
          <select name="siklusId" defaultValue={po?.cycle_id ?? ""} className={selectCls}>
            <option value="">Tanpa proyek</option>
            {bolehSiklusBaru && <option value="baru">Proyek baru (otomatis)</option>}
            {siklus.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Catatan" error={state?.kolom?.catatan?.[0]} hint="Boleh kosong.">
        <TextIn name="catatan" defaultValue={po?.catatan ?? ""} maxLength={500} />
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : po ? "Simpan perubahan" : "Buat PO (draf)"}</Btn>
    </form>
  );
}
