"use client";

import { useMemo, useState } from "react";
import { Btn, Card, Icon, Pill } from "@/components/ui";
import { KotakCari, useCari } from "@/components/ui/Cari";
import { INK, MUTED } from "@/components/ui/tokens";
import { rp, tanggal } from "@/lib/format";
import { buatCsv } from "@/lib/logic/grid";
import type { BarisKas } from "@/lib/types/keuangan";

type Arah = "semua" | "masuk" | "keluar";
const HIJAU = "#0B6B4A";
const KOLOM = "md:grid md:grid-cols-[minmax(0,1fr)_200px_150px] md:gap-6";

/** Uraian kas ditulis satu baris: "Barang — Pemasok [KODE-NOTA] (catatan)". Dipecah supaya tiap bagian bisa ditata sendiri. */
function urai(u: string) {
  let s = u.trim();
  const cat = s.match(/\(([^()]*)\)\s*$/);
  if (cat?.index !== undefined) s = s.slice(0, cat.index).trim();
  const kode = s.match(/\[([^\]]+)\]\s*$/);
  if (kode?.index !== undefined) s = s.slice(0, kode.index).trim();
  const [judul, ...sisa] = s.split(" — ");
  return { judul: judul.trim() || u, pihak: sisa.join(" — ").trim() || null, ref: kode?.[1] ?? null, catatan: cat?.[1]?.trim() || null };
}

/** "Senin, 12 Okt 2026" untuk tanggal 'YYYY-MM-DD'; selain itu jatuh ke format pendek biasa. */
function hariLengkap(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return tanggal(s);
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const sen = (n: number) => Math.round(n * 100);
const teksKas = (k: BarisKas) => `${k.kode} ${k.uraian} ${k.kategori_nama} ${k.arah === "masuk" ? "uang masuk" : "uang keluar"} ${tanggal(k.tanggal)} ${k.jumlah}`;

/** Buku kas: ringkasan, filter arah, dan transaksi dikelompokkan per hari. Tabel di desktop, kartu di HP. */
export function BukuKas({ kas, hariIni }: { kas: BarisKas[]; hariIni: string }) {
  const [arah, setArah] = useState<Arah>("semua");
  const dasar = useMemo(() => kas.filter((k) => arah === "semua" || k.arah === arah), [kas, arah]);
  const { q, setQ, hasil: tampil } = useCari(dasar, teksKas);
  const jumlah = { semua: kas.length, masuk: kas.filter((k) => k.arah === "masuk").length, keluar: kas.filter((k) => k.arah === "keluar").length };
  const masuk = tampil.filter((k) => k.arah === "masuk").reduce((a, k) => a + sen(k.jumlah), 0) / 100;
  const keluar = tampil.filter((k) => k.arah === "keluar").reduce((a, k) => a + sen(k.jumlah), 0) / 100;

  // Kelompok per tanggal, urutan mengikuti data (sudah terbaru dulu dari server).
  const perHari = useMemo(() => {
    const peta = new Map<string, BarisKas[]>();
    for (const k of tampil) peta.set(k.tanggal, [...(peta.get(k.tanggal) ?? []), k]);
    return [...peta.entries()];
  }, [tampil]);

  const unduh = () => {
    const csv = buatCsv(["Kode", "Tanggal", "Arah", "Kategori", "Uraian", "Jumlah (Rp)"], tampil.map((k) => [k.kode, k.tanggal, k.arah, k.kategori_nama, k.uraian, String(k.jumlah).replace(".", ",")]));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `buku-kas-${hariIni}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Di HP label dipendekkan supaya tiga pilihan muat satu baris.
  const pilihan: { id: Arah; label: string; pendek: string }[] = [{ id: "semua", label: "Semua", pendek: "Semua" }, { id: "masuk", label: "Uang masuk", pendek: "Masuk" }, { id: "keluar", label: "Uang keluar", pendek: "Keluar" }];

  return (
    <Card title="Buku kas" right={<Btn size="sm" v="light" onClick={unduh} disabled={tampil.length === 0}><Icon n="download" s={15} />Unduh CSV</Btn>}>
      <div className="space-y-3">
        {/* Filter arah + ringkasan untuk yang sedang ditampilkan */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label="Filter arah" className="flex w-full gap-1 rounded-full bg-white p-1 md:w-auto">
            {pilihan.map((p) => (
              <button key={p.id} type="button" aria-pressed={arah === p.id} onClick={() => setArah(p.id)}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[13px] font-medium transition md:h-9 md:flex-none md:px-4"
                style={arah === p.id ? { background: INK, color: "#fff" } : { color: MUTED }}>
                <span className="md:hidden">{p.pendek}</span><span className="hidden md:inline">{p.label}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums" style={arah === p.id ? { background: "rgba(255,255,255,.18)" } : { background: "#EEF0F5" }}>{jumlah[p.id]}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 md:flex md:gap-2.5">
            <Ringkas label="Masuk" nilai={rp(masuk)} warna={HIJAU} />
            <Ringkas label="Keluar" nilai={rp(keluar)} warna={INK} />
            <Ringkas label="Selisih" nilai={rp(masuk - keluar)} warna={masuk - keluar < 0 ? "#B4443C" : HIJAU} />
          </div>
        </div>
        {kas.length > 0 && <KotakCari q={q} onUbah={setQ} placeholder="Cari uraian, kode, kategori, atau jumlah" tampil={tampil.length} total={dasar.length} />}

        {perHari.length === 0 ? (
          <div className="rounded-[20px] bg-white px-4 py-8 text-center text-[13px]" style={{ color: MUTED }}>
            {kas.length === 0 ? "Belum ada transaksi kas. Pembayaran pemasok, pembayaran pembeli, dan biaya yang disetujui masuk otomatis." : q.trim() ? `Tidak ada transaksi yang cocok dengan “${q.trim()}”.` : "Tidak ada transaksi untuk filter ini."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[20px] bg-white">
            <div className={`hidden border-b border-[#EEF0F4] px-5 py-3 text-[12px] font-medium ${KOLOM}`} style={{ color: MUTED }} aria-hidden>
              <span>Transaksi</span><span>Kategori</span><span className="text-right">Jumlah</span>
            </div>
            {perHari.map(([tgl, baris]) => {
              const bersih = baris.reduce((a, k) => a + (k.arah === "masuk" ? 1 : -1) * sen(k.jumlah), 0) / 100;
              return (
                <section key={tgl} aria-label={hariLengkap(tgl)}>
                  <div className="flex items-center justify-between gap-3 bg-[#F6F7FA] px-4 py-2 text-[12px] md:px-5" style={{ color: MUTED }}>
                    <span className="font-semibold" style={{ color: INK }}>{hariLengkap(tgl)}</span>
                    <span className="tabular-nums">{baris.length} transaksi · <span style={{ color: bersih < 0 ? "#B4443C" : HIJAU }}>{bersih < 0 ? "-" : "+"}{rp(Math.abs(bersih))}</span></span>
                  </div>
                  <ul>
                    {baris.map((k) => <Baris key={k.id} k={k} />)}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function Ringkas({ label, nilai, warna }: { label: string; nilai: string; warna: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white px-2.5 py-2 md:min-w-[128px] md:px-3.5">
      <div className="text-[11px]" style={{ color: MUTED }}>{label}</div>
      <div className="whitespace-nowrap text-[12px] font-semibold tabular-nums tracking-tight md:text-[14.5px] md:tracking-normal" style={{ color: warna }}>{nilai}</div>
    </div>
  );
}

function Baris({ k }: { k: BarisKas }) {
  const u = urai(k.uraian);
  const masuk = k.arah === "masuk";
  return (
    <li className={`flex items-start gap-3 border-t border-[#EEF0F4] px-4 py-3.5 first:border-t-0 md:items-center md:px-5 ${KOLOM} hover:bg-[#FAFBFD]`}>
      <div className="flex min-w-0 flex-1 items-start gap-3 md:items-center">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:mt-0" style={{ background: masuk ? "#DDF3E8" : "#FBE9E7" }} title={masuk ? "Uang masuk" : "Uang keluar"}>
          <Icon n={masuk ? "masuk" : "arrow"} s={17} c={masuk ? HIJAU : "#A8322B"} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium leading-snug" style={{ color: INK }}>{u.judul}</div>
          {u.pihak && <div className="text-[12.5px] leading-snug" style={{ color: MUTED }}>{u.pihak}</div>}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11.5px] tabular-nums" style={{ color: MUTED }}>{k.kode}</span>
            {u.ref && <span className="rounded-md bg-[#EEF0F5] px-1.5 py-0.5 text-[11px] leading-none" style={{ color: "#4A5560" }}>{u.ref}</span>}
            {u.catatan && <span className="rounded-md bg-[#FBF0D5] px-1.5 py-0.5 text-[11px] leading-snug" style={{ color: "#8A5A00" }}>{u.catatan}</span>}
          </div>
          <div className="mt-1.5 md:hidden"><Pill t={k.kategori_nama} /></div>
        </div>
      </div>
      <div className="hidden md:block"><Pill t={k.kategori_nama} /></div>
      <div className="shrink-0 text-right text-[14px] font-semibold tabular-nums md:text-[15px]" style={{ color: masuk ? HIJAU : INK }}>
        {masuk ? "+" : "-"}{rp(k.jumlah)}
      </div>
    </li>
  );
}
