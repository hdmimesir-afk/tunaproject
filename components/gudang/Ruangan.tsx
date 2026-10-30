import { Bar, Btn, Field, Pill } from "@/components/ui";
import { pilihCls } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import { formatKg } from "@/lib/logic/neraca";
import type { Ruangan } from "@/lib/types/stok";

/* Isi tiap ruangan gudang dingin: ABF (pembeku cepat, tiga ruangan) dan CS (cold storage, satu ruangan).
   Dipakai di halaman Gudang (lengkap) dan di dashboard owner (ringkas). Server dan klien memakai komponen yang sama. */

const kg = (n: number) => `${formatKg(n)} kg`;
const persen = (isi: number, kap: number) => (kap > 0 ? (isi / kap) * 100 : 0);
/** Hijau-ink wajar, kuning mulai penuh (di atas 70%), merah hampir penuh (di atas 90%). */
export const warnaIsi = (p: number) => (p > 90 ? "#B4443C" : p > 70 ? "#B8801A" : INK);

const statusIsi = (p: number, isi: number) => (isi <= 0 ? "Kosong" : p > 90 ? "Penuh" : p > 70 ? "Hampir penuh" : "Terisi");

export const JENIS_RUANGAN = { abf: "ABF", cs: "CS" } as const;

/** Pilihan ruangan beserta sisa muatnya, dipakai di form titipan dan hasil produksi. Kosong = belum ditempatkan (bisa dipindah nanti). */
export function PilihRuangan({ ruangan, nama = "ruanganId", dipilih = "" }: { ruangan: Ruangan[]; nama?: string; dipilih?: string }) {
  return (
    <Field label="Ruangan" hint="Boleh dikosongkan, bisa dipindah nanti.">
      <select name={nama} className={pilihCls} defaultValue={dipilih}>
        <option value="">Belum ditempatkan</option>
        {ruangan.map((r) => <option key={r.id} value={r.id}>{r.nama} · muat {kg(Math.max(0, r.kapasitas_kg - r.isi_kg))} lagi</option>)}
      </select>
    </Field>
  );
}

function Lencana({ jenis }: { jenis: Ruangan["jenis"] }) {
  const abf = jenis === "abf";
  return <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold leading-none" style={{ background: abf ? "#E4EEFB" : "#DDF3E8", color: abf ? "#2D5F9A" : "#0B6B4A" }}>{JENIS_RUANGAN[jenis]}</span>;
}

export function RuanganPanel({ ruangan, belumDitempatkanKg = 0, ringkas = false, onAtur }: {
  ruangan: Ruangan[]; belumDitempatkanKg?: number; ringkas?: boolean; onAtur?: (r: Ruangan) => void;
}) {
  if (ruangan.length === 0) {
    return <p className="rounded-2xl bg-white px-4 py-5 text-center text-[13px]" style={{ color: MUTED }}>Belum ada ruangan gudang dingin yang diatur.</p>;
  }
  const totalIsi = ruangan.reduce((a, r) => a + Math.round(r.isi_kg * 1000), 0) / 1000;
  const totalKap = ruangan.reduce((a, r) => a + Math.round(r.kapasitas_kg * 1000), 0) / 1000;
  return (
    <div className="space-y-2.5">
      <ul className={`grid gap-2.5 ${ringkas ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
        {ruangan.map((r) => {
          const p = persen(r.isi_kg, r.kapasitas_kg);
          const sisa = Math.max(0, r.kapasitas_kg - r.isi_kg);
          return (
            <li key={r.id} className="min-w-0 rounded-[20px] bg-white p-3.5" style={{ boxShadow: "0 1px 2px rgba(20,24,40,.06)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[13.5px] font-semibold" style={{ color: INK }}>{r.nama}</span><Lencana jenis={r.jenis} /></span>
                {!ringkas && onAtur && <Btn size="sm" v="ghost" onClick={() => onAtur(r)}>Atur</Btn>}
              </div>
              <div className="mt-2.5"><Pill t={statusIsi(p, r.isi_kg)} /></div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-semibold leading-tight tabular-nums md:text-[22px]" style={{ color: warnaIsi(p) }}>{kg(r.isi_kg)}</span>
              </div>
              <div className="mt-2" role="img" aria-label={`${r.nama} terisi ${formatKg(p, 1)} persen`}><Bar pct={p} color={warnaIsi(p)} /></div>
              <dl className="mt-2 space-y-0.5 text-[11.5px] tabular-nums" style={{ color: MUTED }}>
                <div className="flex justify-between gap-2"><dt>Terisi</dt><dd style={{ color: INK }}>{formatKg(p, 1)}%</dd></div>
                <div className="flex justify-between gap-2"><dt>Masih muat</dt><dd style={{ color: INK }}>{kg(sisa)}</dd></div>
                <div className="flex justify-between gap-2"><dt>Kapasitas</dt><dd>{kg(r.kapasitas_kg)}</dd></div>
              </dl>
              {!ringkas && (
                <div className="mt-2 border-t border-[#EEF0F4] pt-2 text-[11.5px] tabular-nums" style={{ color: MUTED }}>
                  {r.isi_kg > 0 ? <>Milik sendiri {kg(r.isi_sendiri_kg)}<br />Titipan {kg(r.isi_titipan_kg)}</> : "Belum ada isi"}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[12px] tabular-nums" style={{ color: MUTED }}>
        <span>Seluruh ruangan: <b className="font-semibold" style={{ color: INK }}>{kg(totalIsi)}</b> dari {kg(totalKap)} ({formatKg(persen(totalIsi, totalKap), 1)}%)</span>
        {belumDitempatkanKg > 0.0005 && <span style={{ color: "#8A5A00" }}>{kg(belumDitempatkanKg)} belum ditentukan ruangannya</span>}
        {!ringkas && ruangan.some((r) => !r.dikonfirmasi) && <span className="basis-full" style={{ color: "#8A5A00" }}>Kapasitas tiap ruangan masih perkiraan. Tekan Atur untuk memastikan angkanya.</span>}
      </div>
    </div>
  );
}
