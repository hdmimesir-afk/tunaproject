"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Card, Field, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { setAktifCctv, simpanCctv } from "@/lib/actions/pengaturan";

/* Link CCTV buat dashboard owner. Admin yg ngisi, owner tinggal pencet buat buka. Link nggak dihapus, cuma dinonaktifin. */

export type Cctv = { id: string; nama: string; url: string; urutan: number; aktif: boolean };

function FormCctv({ c, onSelesai }: { c: Cctv | null; onSelesai: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanCctv, undefined);
  useEffect(() => { if (state?.pesan) onSelesai(); }, [state, onSelesai]);
  return (
    <form action={action} className="min-w-0 space-y-3 rounded-2xl bg-white p-3.5" data-testid="form-cctv">
      {c && <input type="hidden" name="id" value={c.id} />}
      {state?.error && <p role="alert" className="text-[12.5px]" style={{ color: "#A8322B" }}>{state.error}</p>}
      <div className="grid min-w-0 gap-3 md:grid-cols-[1fr_2fr_6rem]">
        <Field label="Nama kamera" error={state?.kolom?.nama?.[0]}><TextIn name="nama" maxLength={60} defaultValue={c?.nama ?? ""} placeholder="Gudang" required /></Field>
        <Field label="Link" error={state?.kolom?.url?.[0]}><TextIn name="url" type="url" maxLength={500} defaultValue={c?.url ?? ""} placeholder="https://..." required /></Field>
        <Field label="Urutan" error={state?.kolom?.urutan?.[0]}><TextIn name="urutan" type="number" min={0} max={999} defaultValue={c?.urutan ?? 0} /></Field>
      </div>
      <div className="flex gap-2">
        <Btn type="submit" size="sm" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Btn>
        <Btn size="sm" v="ghost" onClick={onSelesai}>Batal</Btn>
      </div>
    </form>
  );
}

export function CctvKelola({ daftar, bolehAtur, polos = false }: { daftar: Cctv[]; bolehAtur: boolean; /** Tanpa kotak Card, buat dipakai di dalam jendela (dashboard owner). */ polos?: boolean }) {
  const [edit, setEdit] = useState<Cctv | "baru" | null>(null);
  const judul = `Link CCTV · ${daftar.filter((c) => c.aktif).length} aktif`;
  const tambah = bolehAtur && edit === null ? <Btn size="sm" onClick={() => setEdit("baru")}>Tambah</Btn> : undefined;
  const isi = (
      <div className={`min-w-0 space-y-2 ${polos ? "" : "px-2.5 pb-2.5"}`}>
        <p className="text-[13px]" style={{ color: MUTED }}>Link ke aplikasi atau halaman CCTV tiap kamera. Owner tinggal pencet di dashboard. Peran lain nggak bisa lihat linknya.</p>
        {edit === "baru" && <FormCctv c={null} onSelesai={() => setEdit(null)} />}
        {daftar.length === 0 && edit === null && <p className="rounded-2xl bg-white px-4 py-5 text-center text-[13px]" style={{ color: MUTED }}>Belum ada link CCTV.</p>}
        <ul className="space-y-2">
          {daftar.map((c) => (edit !== "baru" && edit?.id === c.id ? (
            <li key={c.id}><FormCctv c={c} onSelesai={() => setEdit(null)} /></li>
          ) : (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ opacity: c.aktif ? 1 : 0.55 }}>
              <span className="min-w-0">
                <b className="font-medium" style={{ color: INK }}>{c.nama}</b>{!c.aktif && " (nonaktif)"}
                <span className="block truncate text-[12px]" style={{ color: MUTED }}>{c.url}</span>
              </span>
              {bolehAtur && (
                <span className="flex gap-1.5">
                  <Btn size="sm" v="light" onClick={() => setEdit(c)}>Ubah</Btn>
                  <form action={setAktifCctv}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="aktif" value={String(!c.aktif)} />
                    <Btn type="submit" size="sm" v="ghost">{c.aktif ? "Nonaktifkan" : "Aktifkan"}</Btn>
                  </form>
                </span>
              )}
            </li>
          )))}
        </ul>
      </div>
  );
  if (polos) {
    return (
      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2"><p className="text-[14px] font-medium" style={{ color: INK }}>{judul}</p>{tambah}</div>
        {isi}
      </div>
    );
  }
  return <Card title={judul} right={tambah}>{isi}</Card>;
}
