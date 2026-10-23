"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Btn, Card, Inner } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { JawabanTeks, TabelHasil, type TabelAsisten } from "./Jawaban";
import { tanyaCepat, tanyaModel, type JawabanAsisten } from "@/lib/actions/asisten";

type Pesan = { peran: "user" | "assistant"; teks: string; baris?: string[]; tabel?: TabelAsisten; tautan?: { label: string; href: string }[]; galat?: boolean };
type Props = { alat: { nama: string; label: string }[]; modelAktif: boolean; jatah: { batas: number; sisa: number } };

const CONTOH = ["Piutang mana yang sudah terlambat?", "Berapa saldo kas bulan ini?", "Apa saja yang menunggu persetujuan saya?", "Berapa isi gudang dingin sekarang?"];

export function AsistenKelola({ alat, modelAktif, jatah }: Props) {
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [teks, setTeks] = useState("");
  const [sisa, setSisa] = useState(jatah.sisa);
  const [sibuk, mulai] = useTransition();
  const ujung = useRef<HTMLDivElement>(null);

  const tampil = (p: Pesan) => {
    setPesan((x) => [...x, p]);
    setTimeout(() => ujung.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  };
  const hasil = (j: JawabanAsisten): Pesan => (j.error ? { peran: "assistant", teks: j.error, galat: true } : { peran: "assistant", teks: j.jawaban ?? "", baris: j.baris, tabel: j.tabel, tautan: j.tautan });

  const cepat = (nama: string, label: string) => {
    if (sibuk) return;
    tampil({ peran: "user", teks: label });
    mulai(async () => tampil(hasil(await tanyaCepat(nama))));
  };

  const kirim = (isi: string) => {
    const t = isi.trim();
    if (!t || sibuk) return;
    const riwayat = pesan.filter((p) => !p.galat).slice(-6).map((p) => ({ peran: p.peran, teks: p.baris ? [...p.baris, ...(p.tabel ? p.tabel.baris.map((b) => b.join(" | ")) : [])].join("\n") : p.teks }));
    tampil({ peran: "user", teks: t });
    setTeks("");
    mulai(async () => {
      const j = await tanyaModel({ pertanyaan: t, riwayat });
      if (j.sisa !== undefined) setSisa(j.sisa);
      tampil(hasil(j));
    });
  };

  return (
    <div className="space-y-4">
      <Card title="Pertanyaan cepat">
        <div className="flex flex-wrap gap-2 px-2.5 pb-2.5">
          {alat.length === 0 && <p className="text-[13px]" style={{ color: MUTED }}>Belum ada data yang bisa dibaca Asisten untuk peran Anda.</p>}
          {alat.map((a) => <Btn key={a.nama} size="sm" v="light" disabled={sibuk} onClick={() => cepat(a.nama, a.label)}>{a.label}</Btn>)}
        </div>
        <p className="px-2.5 pb-2 text-[12px]" style={{ color: MUTED }}>Menampilkan data apa adanya dari sistem, tanpa menebak. Tidak memakai jatah harian.</p>
      </Card>

      <Card title="Percakapan">
        <div className="space-y-3 px-2.5 pb-2.5" aria-live="polite">
          {pesan.length === 0 && (
            <Inner className="!p-3.5">
              <p className="text-[13px]" style={{ color: MUTED }}>{modelAktif ? "Tanyakan dengan kalimat biasa, misalnya:" : "Pertanyaan bebas belum diaktifkan di server ini. Contoh yang bisa dijawab setelah diaktifkan:"}</p>
              <ul className="mt-1.5 space-y-1 text-[13px]" style={{ color: INK }}>
                {CONTOH.map((c) => <li key={c}>{modelAktif ? <button type="button" className="underline decoration-dotted underline-offset-4" onClick={() => kirim(c)}>{c}</button> : c}</li>)}
              </ul>
            </Inner>
          )}
          {pesan.map((p, i) => (
            <div key={i} className={p.peran === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className="max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13.5px]" style={p.peran === "user" ? { background: INK, color: "#fff" } : p.galat ? { background: "#FBE5E3", color: "#A8322B" } : { background: "#fff", color: INK }}>
                {p.baris ? <><ul className="space-y-1">{p.baris.map((b, j) => <li key={j}>{b}</li>)}</ul>{p.tabel && <TabelHasil t={p.tabel} />}</> : p.peran === "assistant" && !p.galat ? <JawabanTeks teks={p.teks} /> : <p className="whitespace-pre-wrap">{p.teks}</p>}
                {p.tautan && p.tautan.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.tautan.map((l) => <Link key={l.href} href={l.href} className="rounded-full bg-[#F1F3F8] px-2.5 py-1 text-[12px] font-medium underline-offset-2 hover:underline" style={{ color: INK }}>{l.label}</Link>)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sibuk && <p className="text-[12.5px]" style={{ color: MUTED }}>Asisten sedang membaca data...</p>}
          <div ref={ujung} />
        </div>

        <form className="space-y-2 px-2.5 pb-2.5" onSubmit={(e) => { e.preventDefault(); kirim(teks); }}>
          <textarea aria-label="Pertanyaan untuk Asisten" rows={2} maxLength={500} disabled={!modelAktif || sibuk || sisa <= 0} value={teks} onChange={(e) => setTeks(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); kirim(teks); } }}
            placeholder={modelAktif ? "Tulis pertanyaan..." : "Pertanyaan bebas belum aktif"} className="w-full resize-none rounded-2xl border border-[#E2E4EA] bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-[#00171F] disabled:opacity-50" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px]" style={{ color: sisa <= 0 ? "#A8322B" : MUTED }}>{modelAktif ? `Sisa ${sisa} dari ${jatah.batas} pertanyaan hari ini` : "Asisten hanya membaca; tidak bisa mengubah data."}</span>
            <Btn type="submit" size="sm" disabled={!modelAktif || sibuk || sisa <= 0 || teks.trim().length < 2}>{sibuk ? "Membaca..." : "Tanya"}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
