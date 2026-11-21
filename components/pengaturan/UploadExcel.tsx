"use client";

import { useRef, useState, useTransition } from "react";
import { Btn, Card } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { INK, MUTED } from "@/components/ui/tokens";
import { pratinjauImpor, simpanImpor } from "@/lib/actions/impor";
import { bacaExcel, unduhTemplate } from "@/lib/excelImpor";
import { IMPOR, LABEL_STATUS, petakan, type BarisImpor, type HasilImpor, type JenisImpor, type StatusBaris } from "@/lib/imporMaster";
import { waktu } from "@/lib/format";

/* Upload Excel data master: pilih data, unduh template, pilih file, lihat pratinjau, simpan.
   Ada baris yg salah = tombol simpan mati (database juga nolak, jadi nggak ada yg setengah masuk). */

export type LogImpor = { id: string; jenis: JenisImpor; nama_file: string; baru: number; ubah: number; sama: number; oleh_nama: string; dibuat_pada: string };

const WARNA: Record<StatusBaris, { bg: string; fg: string }> = {
  baru: { bg: "#DDF3E8", fg: "#0B6B4A" },
  ubah: { bg: "#E4ECF7", fg: "#2B4A70" },
  sama: { bg: "#EEF0F5", fg: "#5B6475" },
  salah: { bg: "#FBE5E3", fg: "#A8322B" },
};
const URUT: Record<StatusBaris, number> = { salah: 0, baru: 1, ubah: 2, sama: 3 };
const TAMPIL_MAKS = 300;

type Siap = { namaFile: string; baris: BarisImpor[]; hasil: HasilImpor; dipetakan: { judul: string; ke: string }[]; diabaikan: string[] };

export function UploadExcel({ jenisBoleh, log }: { jenisBoleh: JenisImpor[]; log: LogImpor[] }) {
  const [jenis, setJenis] = useState<JenisImpor>(jenisBoleh[0]);
  const [siap, setSiap] = useState<Siap | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [baca, mulaiBaca] = useTransition();
  const [simpan, mulaiSimpan] = useTransition();
  const kunci = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSiap(null);
    setGalat(null);
    kunci.current = "";
    if (inputRef.current) inputRef.current.value = "";
  };
  const gantiJenis = (j: JenisImpor) => { setJenis(j); setBerhasil(null); reset(); };

  const pilihFile = (file: File | undefined) => {
    if (!file) return;
    setBerhasil(null);
    setSiap(null);
    setGalat(null);
    mulaiBaca(async () => {
      try {
        const { judul, rows } = await bacaExcel(file);
        const p = petakan(jenis, judul, rows);
        if (p.galat) { setGalat(p.galat); return; }
        const r = await pratinjauImpor({ jenis, baris: p.baris, namaFile: file.name });
        if (!r.ok) { setGalat(r.error); return; }
        // Kunci baru tiap file yg dipratinjau: simpan dua kali (klik ganda, koneksi putus) tetap sekali.
        kunci.current = crypto.randomUUID();
        setSiap({ namaFile: file.name, baris: p.baris, hasil: r.hasil, dipetakan: p.dipetakan, diabaikan: p.diabaikan });
      } catch (e) {
        setGalat(e instanceof Error ? e.message : "Filenya nggak kebaca.");
      }
    });
  };

  const jalankanSimpan = () => {
    if (!siap) return;
    mulaiSimpan(async () => {
      const r = await simpanImpor({ jenis, baris: siap.baris, namaFile: siap.namaFile, kunci: kunci.current });
      if (!r.ok) { setGalat(r.error); return; }
      const h = r.hasil;
      setBerhasil(`${siap.namaFile} udah disimpan: ${h.baru} baru, ${h.ubah} diperbarui, ${h.sama} sama (dilewati).`);
      reset();
    });
  };

  const cfg = IMPOR[jenis];
  const h = siap?.hasil;
  const baris = h ? [...h.baris].sort((a, b) => URUT[a.status] - URUT[b.status] || a.no - b.no) : [];

  return (
    <div className="space-y-4">
      <Card title="Upload Excel data master">
        <div className="space-y-4 px-2.5 pb-2.5">
          <p className="text-[13px]" style={{ color: MUTED }}>
            Buat masukin data banyak sekaligus. Unduh templatenya dulu, isi di Excel, terus pilih filenya di sini. Sebelum disimpan ada pratinjau.
            Nama yg udah ada nggak dibikin dobel, datanya diperbarui. Sel yg dikosongin di file nggak ngapus data yg udah ada.
          </p>

          <div role="radiogroup" aria-label="Data yg mau diupload" className="flex flex-wrap gap-1.5">
            {jenisBoleh.map((j) => (
              <button key={j} type="button" role="radio" aria-checked={jenis === j} onClick={() => gantiJenis(j)}
                className="h-10 rounded-xl px-3.5 text-[13.5px] font-medium" style={jenis === j ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>
                {IMPOR[j].label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-white px-3.5 py-3 text-[13px]" style={{ color: INK }}>
            <p className="font-medium">Kolom {cfg.label.toLowerCase()}</p>
            <ul className="mt-1.5 space-y-1" style={{ color: MUTED }}>
              {cfg.kolom.map((c) => (
                <li key={c.k}><b className="font-medium" style={{ color: INK }}>{c.judul}{c.wajib ? " (wajib)" : ""}</b>: {c.keterangan}</li>
              ))}
            </ul>
            <div className="mt-3"><Btn size="sm" v="light" onClick={() => void unduhTemplate(jenis)}>Unduh template {cfg.label.toLowerCase()}</Btn></div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium" style={{ color: INK }}>Pilih file Excel (.xlsx)</span>
            <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => pilihFile(e.target.files?.[0])} disabled={baca || simpan} data-testid="file-impor"
              className="block w-full rounded-2xl border border-dashed border-[#C9CDD6] bg-white px-3.5 py-3 text-[13px] file:mr-3 file:rounded-xl file:border-0 file:bg-[#00171F] file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-white" />
          </label>

          {baca && <p role="status" className="text-[13px]" style={{ color: MUTED }}>Lagi baca file dan ngecek datanya...</p>}
          {galat && <p role="alert" className="rounded-xl px-3 py-2 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{galat}</p>}
          {berhasil && <p role="status" className="rounded-xl px-3 py-2 text-[13px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }} data-testid="impor-berhasil">{berhasil}</p>}

          {siap && h && (
            <div className="space-y-3" data-testid="pratinjau-impor">
              <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                <span className="font-medium" style={{ color: INK }}>{siap.namaFile}:</span>
                {(["baru", "ubah", "sama", "salah"] as StatusBaris[]).map((s) => (
                  <span key={s} className="rounded-full px-2.5 py-1 font-semibold" style={{ background: WARNA[s].bg, color: WARNA[s].fg }}>{h[s]} {LABEL_STATUS[s].toLowerCase()}</span>
                ))}
              </div>
              <p className="text-[12px]" style={{ color: MUTED }}>
                Kolom yg kebaca: {siap.dipetakan.map((d) => (d.judul === d.ke ? d.ke : `${d.judul} jadi ${d.ke}`)).join(", ")}.
                {siap.diabaikan.length > 0 && ` Nggak dipakai: ${siap.diabaikan.join(", ")}.`}
              </p>
              <div className="max-h-[420px] overflow-auto rounded-2xl bg-white">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left" style={{ color: MUTED }}>
                      <th className="px-3.5 py-2 font-medium">Baris</th><th className="px-3.5 py-2 font-medium">Nama</th>
                      <th className="px-3.5 py-2 font-medium">Status</th><th className="hidden px-3.5 py-2 font-medium md:table-cell">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baris.slice(0, TAMPIL_MAKS).map((b) => (
                      <tr key={b.no} className="border-t border-[#EEF0F4]">
                        <td className="px-3.5 py-2 tabular-nums" style={{ color: MUTED }}>{b.no}</td>
                        <td className="px-3.5 py-2" style={{ color: INK }}>
                          {b.nama || "-"}
                          {b.pesan && <span className="mt-0.5 block text-[12px] md:hidden" style={{ color: b.status === "salah" ? "#A8322B" : MUTED }}>{b.pesan}</span>}
                        </td>
                        <td className="px-3.5 py-2"><span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: WARNA[b.status].bg, color: WARNA[b.status].fg }}>{LABEL_STATUS[b.status]}</span></td>
                        <td className="hidden px-3.5 py-2 md:table-cell" style={{ color: b.status === "salah" ? "#A8322B" : MUTED }}>{b.pesan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {baris.length > TAMPIL_MAKS && <p className="px-3.5 py-2 text-[12px]" style={{ color: MUTED }}>Ditampilin {TAMPIL_MAKS} dari {baris.length} baris, yg salah paling atas.</p>}
              </div>
              {h.salah > 0 ? (
                <p className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
                  Ada {h.salah} baris yg salah. Benerin di file Excel-nya (liat nomor barisnya), terus pilih filenya lagi. Belum ada yg disimpan.
                </p>
              ) : h.baru + h.ubah === 0 ? (
                <p className="rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: MUTED }}>Semua data di file ini udah sama persis, nggak ada yg perlu disimpan.</p>
              ) : (
                <form action={jalankanSimpan}>
                  <KonfirmasiDua full label={`Simpan ${h.baru + h.ubah} data`} labelYa="Ya, simpan sekarang" pending={simpan}
                    pesan={`${h.baru} ${cfg.label.toLowerCase()} baru dibikin dan ${h.ubah} diperbarui. Data yg sama dilewati. Lanjut?`} />
                </form>
              )}
              <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={reset}>Batal, pilih file lain</Btn></div>
            </div>
          )}
        </div>
      </Card>

      <Card title="Riwayat upload">
        {log.length === 0 ? (
          <p className="px-2.5 pb-2.5 text-[13px]" style={{ color: MUTED }}>Belum ada upload.</p>
        ) : (
          <ul className="space-y-1.5 px-1 pb-1" data-testid="riwayat-impor">
            {log.map((l) => (
              <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]">
                <span style={{ color: INK }}><b className="font-medium">{IMPOR[l.jenis]?.label ?? l.jenis}</b> · {l.nama_file || "tanpa nama"}</span>
                <span className="tabular-nums" style={{ color: MUTED }}>{l.baru} baru, {l.ubah} diperbarui, {l.sama} sama · {l.oleh_nama || "-"} · {waktu(l.dibuat_pada)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
