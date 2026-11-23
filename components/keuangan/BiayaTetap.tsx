"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Card, Field, Modal, Pill, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { catatBiayaTetap, simpanBiayaTetap } from "@/lib/actions/keuangan";
import { rp } from "@/lib/format";
import type { Biaya, BiayaTetap as TipeBiayaTetap, KategoriBiaya } from "@/lib/types/keuangan";

/* Biaya tetap bulanan (permintaan finance 23 Nov 2026): daftar biaya rutin kayak gaji, sewa, listrik. Tiap bulan tinggal
   pencet Catat bulan ini, biayanya kebikin sendiri. Yg kategorinya wajib nota jadi draf dulu, sisanya langsung diajukan ke Owner. */

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const bulanTeks = (b: string) => `${NAMA_BULAN[Number(b.slice(5, 7)) - 1]} ${b.slice(0, 4)}`;

function FormTetap({ kategori, awal, onSelesai }: { kategori: KategoriBiaya[]; awal: TipeBiayaTetap | null; onSelesai: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanBiayaTetap, undefined);
  useEffect(() => { if (state?.pesan && !state.error) onSelesai(); }, [state, onSelesai]);
  return (
    <form action={action} className="space-y-3">
      {awal && <input type="hidden" name="tetapId" value={awal.id} />}
      <PesanForm state={state?.error ? state : undefined} />
      <Field label="Nama" hint="Misalnya Gaji karyawan, Sewa gudang, Listrik." error={state?.kolom?.nama?.[0]}>
        <TextIn name="nama" maxLength={120} defaultValue={awal?.nama} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori" error={state?.kolom?.kategoriId?.[0]}>
          <select name="kategoriId" className={pilihCls} defaultValue={awal?.category_id ?? ""} required>
            <option value="" disabled>Pilih kategori</option>{kategori.map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
          </select>
        </Field>
        <Field label="Jumlah per bulan (Rp)" error={state?.kolom?.jumlah?.[0]}>
          <TextIn name="jumlah" inputMode="decimal" defaultValue={awal ? String(awal.jumlah).replace(".", ",") : ""} required />
        </Field>
      </div>
      <Field label="Catatan" hint="Boleh dikosongin.">
        <TextIn name="catatan" maxLength={300} defaultValue={awal?.catatan} />
      </Field>
      <Field label="Status">
        <select name="aktif" className={pilihCls} defaultValue={awal && !awal.aktif ? "tidak" : "ya"}>
          <option value="ya">Aktif (ikut dicatat tiap bulan)</option>
          <option value="tidak">Nonaktif (nggak dicatat lagi)</option>
        </select>
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : awal ? "Simpan perubahan" : "Tambah biaya tetap"}</Btn>
    </form>
  );
}

function CatatBulanIni({ bulan, hariIni, belum }: { bulan: string; hariIni: string; belum: TipeBiayaTetap[] }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(catatBiayaTetap, undefined);
  const total = belum.reduce((a, b) => a + Math.round(b.jumlah * 100), 0) / 100;
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="bulan" value={bulan} />
      <PesanForm state={state} />
      <Field label="Tanggal dicatat" hint={`Harus di bulan ${bulanTeks(bulan)}.`} error={state?.kolom?.tanggal?.[0]}>
        <TextIn name="tanggal" type="date" defaultValue={hariIni.startsWith(bulan) ? hariIni : `${bulan}-01`} min={`${bulan}-01`} max={`${bulan}-31`} required />
      </Field>
      <KonfirmasiDua full label={`Catat biaya tetap ${bulanTeks(bulan)}`} labelYa="Ya, catat sekarang" pending={pending} disabled={belum.length === 0}
        pesan={`${belum.length} biaya tetap, total ${rp(total)}, bakal dicatat jadi biaya ${bulanTeks(bulan)}. Yg kategorinya wajib nota masuk draf dulu, sisanya langsung diajukan ke Owner.`} />
    </form>
  );
}

export function BiayaTetap({ daftar, kategori, biaya, bolehTulis, hariIni }: { daftar: TipeBiayaTetap[]; kategori: KategoriBiaya[]; biaya: Biaya[]; bolehTulis: boolean; hariIni: string }) {
  const [form, setForm] = useState<TipeBiayaTetap | "baru" | null>(null);
  const bulan = hariIni.slice(0, 7);
  const sudah = new Set(biaya.filter((b) => b.fixed_cost_id && b.bulan_tetap?.startsWith(bulan)).map((b) => b.fixed_cost_id as string));
  const aktif = daftar.filter((d) => d.aktif);
  const belum = aktif.filter((d) => !sudah.has(d.id));
  const totalBulan = aktif.reduce((a, b) => a + Math.round(b.jumlah * 100), 0) / 100;
  const namaKategori = (id: string) => kategori.find((k) => k.id === id)?.nama ?? "-";

  return (
    <Card title="Biaya tetap bulanan" right={bolehTulis && <Btn size="sm" v="light" onClick={() => setForm("baru")}>Tambah</Btn>}>
      <div data-testid="biaya-tetap" className="space-y-3">
        <p className="text-[12.5px]" style={{ color: MUTED }}>
          Biaya rutin tiap bulan kayak gaji, sewa, listrik. Isi sekali di sini, terus tiap bulan tinggal dicatat.
          {aktif.length > 0 && <> Total yg aktif <b style={{ color: INK }}>{rp(totalBulan)}</b> per bulan.</>}
        </p>
        {daftar.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-5 text-center text-[13px]" style={{ color: MUTED }}>{bolehTulis ? "Belum ada biaya tetap. Pencet Tambah buat mulai." : "Belum ada biaya tetap."}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {daftar.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-3" style={{ opacity: d.aktif ? 1 : 0.6 }}>
                <span className="min-w-0">
                  <span className="block break-words text-[14px] font-semibold leading-snug" style={{ color: INK }}>{d.nama}</span>
                  <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>{namaKategori(d.category_id)}{d.catatan ? ` · ${d.catatan}` : ""}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-right">
                    <span className="block text-[13.5px] font-semibold tabular-nums" style={{ color: INK }}>{rp(d.jumlah)}</span>
                    <span className="block text-[11.5px]" style={{ color: MUTED }}>{!d.aktif ? "nonaktif" : sudah.has(d.id) ? `udah dicatat ${NAMA_BULAN[Number(bulan.slice(5, 7)) - 1]}` : "belum dicatat"}</span>
                  </span>
                  {bolehTulis && <Btn size="sm" v="ghost" onClick={() => setForm(d)}>Ubah</Btn>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {bolehTulis && aktif.length > 0 && (
          belum.length > 0
            ? <CatatBulanIni bulan={bulan} hariIni={hariIni} belum={belum} />
            : <div className="flex justify-center"><Pill t={`Semua biaya tetap ${bulanTeks(bulan)} udah dicatat`} /></div>
        )}
      </div>
      {form && (
        <Modal title={form === "baru" ? "Tambah biaya tetap" : `Ubah ${form.nama}`} onClose={() => setForm(null)}>
          <FormTetap kategori={kategori} awal={form === "baru" ? null : form} onSelesai={() => setForm(null)} />
        </Modal>
      )}
    </Card>
  );
}
