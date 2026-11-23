"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { LABEL_JENIS } from "@/components/dokumen/Dokumen";
import { urlDokumen } from "@/lib/actions/pembelian";
import type { DataOwner } from "@/lib/data/dashboardOwner";
import { rp, waktu } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import { jamWib } from "@/lib/waktu";
import type { Ruangan } from "@/lib/types/stok";

/* Bagian tambahan dashboard owner (permintaan owner 23 Nov 2026). Semua cuma buat dilihat, nggak ada isian. */

const KARTU = "rounded-[26px] p-4 md:p-5";
const GAYA_KARTU = { background: "rgba(248,249,252,.82)", border: "1px solid rgba(255,255,255,.95)", boxShadow: "0 6px 24px rgba(40,50,80,.05)" } as const;
const HIJAU = "#0B6B4A";
const MERAH = "#B4443C";
const AMBER = "#8A5A00";
const kgT = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;
const persen = (n: number) => `${n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function Kotak({ judul, kanan, children, testid }: { judul: string; kanan?: React.ReactNode; children: React.ReactNode; testid?: string }) {
  return (
    <section className={KARTU} style={GAYA_KARTU} data-testid={testid}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[14.5px] font-medium" style={{ color: INK }}>{judul}</h2>
        {kanan}
      </div>
      {children}
    </section>
  );
}

const Kosong = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl bg-white px-4 py-5 text-center text-[13px]" style={{ color: MUTED }}>{children}</p>
);

/* ------------------------------------------------------------ uang */
export function UangOwner({ saldo, margin, bep }: Pick<DataOwner, "saldo" | "margin" | "bep">) {
  if (!saldo && !margin && !bep) return null;
  return (
    <div className="grid gap-2.5 md:grid-cols-3" data-testid="uang-owner">
      {saldo && (
        <div className="rounded-[22px] bg-white p-4" style={{ boxShadow: "0 1px 2px rgba(20,24,40,.06)" }}>
          <p className="text-[12.5px] font-medium" style={{ color: MUTED }}>Saldo perusahaan</p>
          <p className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-tight" style={{ color: saldo.saldo < 0 ? MERAH : INK }}>{rp(saldo.saldo)}</p>
          <p className="mt-1 text-[12px] leading-snug" style={{ color: MUTED }}>
            Semua uang masuk {rp(saldo.masuk)}, keluar {rp(saldo.keluar)}{saldo.saldoAwal !== 0 ? `, saldo awal ${rp(saldo.saldoAwal)}` : ""}.
            {saldo.terakhir ? ` Catatan kas terakhir ${waktu(saldo.terakhir).split(",")[0]}.` : ""}
          </p>
        </div>
      )}
      {margin && (
        <div className="rounded-[22px] bg-white p-4" style={{ boxShadow: "0 1px 2px rgba(20,24,40,.06)" }}>
          <p className="text-[12.5px] font-medium" style={{ color: MUTED }}>Margin profit</p>
          <p className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-tight" style={{ color: margin.laba < 0 ? MERAH : margin.marginPct !== null ? HIJAU : INK }}>
            {margin.marginPct !== null ? persen(margin.marginPct) : "-"}
          </p>
          <p className="mt-1 text-[12px] leading-snug" style={{ color: MUTED }}>
            {margin.pendapatan > 0
              ? `Laba kotor ${rp(margin.laba)} dari pendapatan ${rp(margin.pendapatan)}, ${margin.jumlahProyek} proyek yg udah ada penjualan.${margin.belumLaku > 0 ? ` ${margin.belumLaku} proyek belum ada penjualan, belum diitung.` : ""}`
              : "Belum ada penjualan, margin muncul abis ada yg kejual."}
          </p>
        </div>
      )}
      {bep && (
        <div className="rounded-[22px] bg-white p-4" style={{ boxShadow: "0 1px 2px rgba(20,24,40,.06)" }} data-testid="bep-owner">
          <p className="text-[12.5px] font-medium" style={{ color: MUTED }}>Balik modal (BEP)</p>
          {bep.pct === null ? (
            <p className="mt-1.5 text-[13px] leading-snug" style={{ color: MUTED }}>Modal usaha belum diisi. Minta admin isi di Pengaturan, tab Dashboard owner.</p>
          ) : (
            <>
              <p className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-tight" style={{ color: bep.lunas ? HIJAU : INK }}>{bep.lunas ? "Udah balik modal" : persen(bep.pct)}</p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EEF0F5]" role="progressbar" aria-valuenow={bep.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Persen balik modal">
                <div className="h-full rounded-full" style={{ width: `${bep.pct}%`, background: HIJAU }} />
              </div>
              <p className="mt-1.5 text-[12px] leading-snug" style={{ color: MUTED }}>
                Laba {rp(bep.laba)} dari modal {rp(bep.modal)}.
                {!bep.lunas && ` Kurang ${rp(bep.sisa)}.`}
                {bep.bulanLagi !== null ? ` Kalo lajunya kayak 3 bulan terakhir (${rp(bep.perBulan ?? 0)} per bulan), kira kira ${bep.bulanLagi} bulan lagi.` : !bep.lunas ? " Perkiraan waktunya muncul abis ada laba 3 bulan terakhir." : ""}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------- sisa kapasitas gudang */
export function KapasitasOwner({ ruangan }: { ruangan: Ruangan[] }) {
  const aktif = ruangan.filter((r) => r.aktif);
  if (aktif.length === 0) return null;
  const g = (n: number) => Math.round(n * 1000);
  const kap = aktif.reduce((a, r) => a + g(r.kapasitas_kg), 0);
  const isi = aktif.reduce((a, r) => a + g(r.isi_kg), 0);
  const sisa = kap - isi;
  return (
    <Kotak judul="Sisa kapasitas gudang dingin" testid="kapasitas-owner">
      <p className="text-[13px]" style={{ color: INK }}>
        <b className="text-[22px] font-semibold tabular-nums" style={{ color: sisa <= 0 ? MERAH : HIJAU }}>{kgT(Math.max(0, sisa) / 1000)}</b> masih kosong dari {kgT(kap / 1000)}
      </p>
      <ul className="mt-3 space-y-2">
        {aktif.map((r) => {
          const pct = r.kapasitas_kg > 0 ? Math.min(100, (r.isi_kg / r.kapasitas_kg) * 100) : 0;
          const s = Math.max(0, g(r.kapasitas_kg) - g(r.isi_kg)) / 1000;
          return (
            <li key={r.id} className="rounded-2xl bg-white px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-medium" style={{ color: INK }}>{r.nama}</span>
                <span className="tabular-nums" style={{ color: s <= 0 ? MERAH : MUTED }}>sisa {kgT(s)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#EEF0F5]">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 90 ? MERAH : pct >= 70 ? "#C98A12" : HIJAU }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Kotak>
  );
}

/* -------------------------------------------------------- absensi */
export function AbsensiOwner({ absensi }: Pick<DataOwner, "absensi">) {
  if (!absensi) return null;
  return (
    <Kotak judul="Absensi hari ini" testid="absensi-owner">
      <div className="grid grid-cols-3 gap-2">
        {[["Hadir", absensi.hadir, HIJAU], ["Terlambat", absensi.terlambat, absensi.terlambat > 0 ? AMBER : MUTED], ["Udah pulang", absensi.udahPulang, INK]].map(([l, n, w]) => (
          <div key={l as string} className="rounded-2xl bg-white px-3 py-2.5 text-center">
            <p className="text-[20px] font-semibold tabular-nums" style={{ color: w as string }}>{n as number}</p>
            <p className="text-[11.5px]" style={{ color: MUTED }}>{l as string}</p>
          </div>
        ))}
      </div>
      {absensi.orang.length === 0 ? (
        <p className="mt-2.5 text-[12.5px]" style={{ color: MUTED }}>Belum ada yg absen masuk hari ini.</p>
      ) : (
        <ul className="mt-2.5 divide-y divide-[#EEF0F4] overflow-hidden rounded-2xl bg-white">
          {absensi.orang.slice(0, 12).map((o) => (
            <li key={o.nama + o.masuk} className="flex items-center justify-between gap-2 px-3.5 py-2 text-[13px]">
              <span className="min-w-0 truncate" style={{ color: INK }}>{o.nama}</span>
              <span className="shrink-0 tabular-nums text-[12.5px]" style={{ color: MUTED }}>
                masuk {o.masuk ? jamWib(o.masuk) : "-"}{o.terlambat > 0 && <span style={{ color: AMBER }}> (telat {o.terlambat} mnt)</span>}{o.pulang ? ` · pulang ${jamWib(o.pulang)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Kotak>
  );
}

/* ----------------------------------------------------------- CCTV */
export function CctvOwner({ cctv }: Pick<DataOwner, "cctv">) {
  return (
    <Kotak judul="CCTV" testid="cctv-owner">
      {cctv.length === 0 ? (
        <Kosong>Link CCTV belum diisi. Minta admin isi di Pengaturan, tab Dashboard owner.</Kosong>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {cctv.map((c) => (
            <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-[13.5px] font-medium transition active:scale-[0.98]" style={{ color: INK }}>
              <span className="min-w-0 truncate">{c.nama}</span><Icon n="arrow" s={14} c={MUTED} />
            </a>
          ))}
        </div>
      )}
    </Kotak>
  );
}

/* -------------------------------------------------- foto timbangan */
export function FotoTimbanganOwner({ foto }: Pick<DataOwner, "foto">) {
  return (
    <Kotak judul="Foto timbangan terbaru" testid="foto-owner">
      {foto.length === 0 ? (
        <Kosong>Belum ada foto timbangan.</Kosong>
      ) : (
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {foto.map((f) => (
            <li key={f.id}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl bg-white">
                {/* Link file dari penyimpanan privat yg berlaku 30 menit, jadi pakai img biasa. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={`Foto timbangan ${f.lot}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <span className="block px-2.5 py-1.5 text-[12px]" style={{ color: MUTED }}><b className="font-medium" style={{ color: INK }}>{f.lot}</b> · {waktu(f.waktu)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Kotak>
  );
}

/* ------------------------------------------- invoice, kwitansi, bukti bayar */
function DaftarLampiran({ daftar, buka }: { daftar: DataOwner["lampiran"]; buka: (id: string) => void }) {
  return (
    <ul className="divide-y divide-[#EEF0F4] overflow-hidden rounded-2xl bg-white">
      {daftar.map((l) => (
        <li key={l.id}>
          <button type="button" onClick={() => buka(l.id)} className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[13px] hover:bg-[#F7F8FA]">
            <span className="min-w-0">
              <span className="block truncate font-medium" style={{ color: INK }}>{l.nama}</span>
              <span className="block text-[12px]" style={{ color: MUTED }}>{LABEL_JENIS[l.jenis]} · {l.ref} · {waktu(l.waktu)}</span>
            </span>
            <span className="shrink-0 text-[12.5px] font-medium" style={{ color: INK }}>Buka</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LampiranOwner({ lampiran }: Pick<DataOwner, "lampiran">) {
  const [galat, setGalat] = useState<string | null>(null);
  const [, mulai] = useTransition();
  const buka = (id: string) => {
    setGalat(null);
    // Jendela dibuka dulu (dalam klik) biar nggak diblokir browser; alamatnya diisi abis server jawab.
    const w = window.open("", "_blank");
    mulai(async () => {
      const r = await urlDokumen(id);
      if (r.url && w) w.location.href = r.url;
      else {
        w?.close();
        setGalat(r.error ?? "Berkasnya nggak bisa dibuka.");
      }
    });
  };
  return (
    <Kotak judul="Invoice, kwitansi, bukti bayar" testid="lampiran-owner">
      {galat && <p role="alert" className="mb-2 rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{galat}</p>}
      {lampiran.length === 0 ? (
        <Kosong>Belum ada invoice, kwitansi, atau bukti bayar yg dilampirin.</Kosong>
      ) : (
        <>
          <DaftarLampiran daftar={lampiran.slice(0, 5)} buka={buka} />
          {lampiran.length > 5 && (
            <details className="group mt-2">
              <summary className="flex h-10 cursor-pointer list-none items-center justify-center rounded-full bg-white text-[13px] font-medium" style={{ color: INK }}>
                <span className="group-open:hidden">Lihat {lampiran.length - 5} lainnya</span><span className="hidden group-open:inline">Sembunyikan</span>
              </summary>
              <div className="mt-1.5"><DaftarLampiran daftar={lampiran.slice(5)} buka={buka} /></div>
            </details>
          )}
        </>
      )}
    </Kotak>
  );
}
