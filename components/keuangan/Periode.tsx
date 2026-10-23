"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Card, DataList, Field, Inner, Modal, Pill, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm } from "@/components/ui/PesanForm";
import { MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { bukaKembaliPeriode, tutupPeriode } from "@/lib/actions/keuangan";
import { rp, waktu } from "@/lib/format";
import type { BukuBulanan } from "@/lib/types/keuangan";

const namaBulan = (b: string) => new Date(`${b}T00:00:00Z`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const kode = (b: string) => b.slice(0, 7);

function FormTutup({ b, onTutup }: { b: BukuBulanan; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(tutupPeriode, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bulan" value={kode(b.bulan)} />
      <PesanForm state={state?.error ? state : undefined} />
      <Inner className="!p-3.5">
        <div className="space-y-1 text-[13px]">
          <div className="flex justify-between"><span style={{ color: MUTED }}>Saldo awal</span><b>{rp(b.saldo_awal)}</b></div>
          <div className="flex justify-between"><span style={{ color: MUTED }}>Uang masuk</span><b>{rp(b.masuk)}</b></div>
          <div className="flex justify-between"><span style={{ color: MUTED }}>Uang keluar</span><b>{rp(b.keluar)}</b></div>
          <div className="flex justify-between border-t border-[#E2E4EA] pt-1"><span>Saldo akhir</span><b>{rp(b.saldo_akhir)}</b></div>
          <p className="pt-1 text-[12px]" style={{ color: MUTED }}>{b.jumlah_transaksi} transaksi di buku kas bulan ini.</p>
        </div>
      </Inner>
      <p className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
        Setelah ditutup, pembayaran, biaya, dan catatan kas bertanggal di bulan ini tidak bisa ditambah atau diubah. Hanya Owner yang bisa membukanya kembali, dengan alasan tercatat.
      </p>
      <Field label="Catatan penutupan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
      <label className="flex items-start gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]">
        <input type="checkbox" name="akui" className="mt-0.5 h-4 w-4 accent-[#00171F]" />
        <span>Tutup meskipun ada transaksi bulan ini yang belum punya nota atau bukti (bila ada, sistem akan memberi tahu jumlahnya).</span>
      </label>
      <KonfirmasiDua full label={`Tutup buku ${namaBulan(b.bulan)}`} labelYa="Ya, tutup dan kunci bulan ini" pending={pending} pesan={`Buku ${namaBulan(b.bulan)} dikunci dengan saldo akhir ${rp(b.saldo_akhir)}.`} />
    </form>
  );
}

function FormBuka({ b, onTutup }: { b: BukuBulanan; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(bukaKembaliPeriode, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bulan" value={kode(b.bulan)} />
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[13px]" style={{ color: MUTED }}>Ditutup {waktu(b.ditutup_pada)}{b.catatan ? ` · "${b.catatan}"` : ""}. Sudah pernah dibuka kembali {b.dibuka_kali} kali.</p>
      <Field label="Alasan membuka kembali" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={300} required placeholder="Misalnya nota menyusul atau salah jumlah" /></Field>
      <KonfirmasiDua full label="Buka kembali" labelYa="Ya, buka kembali bulan ini" pending={pending} pesan="Transaksi di bulan ini bisa ditambah atau diubah lagi. Alasan ini tercatat." />
    </form>
  );
}

export function Periode({ buku, bolehTutup }: { buku: BukuBulanan[]; bolehTutup: boolean }) {
  const [tutup, setTutup] = useState<BukuBulanan | null>(null);
  const [buka, setBuka] = useState<BukuBulanan | null>(null);
  const urut = buku; // sudah terbaru dulu
  const tertua = [...buku].reverse().find((b) => b.status === "terbuka" && !b.bulan_berjalan && b.jumlah_transaksi > 0);
  const terbaruDitutup = buku.find((b) => b.status === "ditutup");
  return (
    <Card title="Tutup buku per bulan">
      <DataList
        rows={urut}
        empty="Belum ada transaksi kas, jadi belum ada bulan yang bisa ditutup."
        cols={[
          { h: "Bulan", r: (b: BukuBulanan) => <><span className="font-medium">{namaBulan(b.bulan)}</span><span className="block text-[12px]" style={{ color: MUTED }}>{b.jumlah_transaksi} transaksi</span></> },
          { h: "Masuk", r: (b) => rp(b.masuk), right: true },
          { h: "Keluar", r: (b) => rp(b.keluar), right: true },
          { h: "Saldo akhir", r: (b) => rp(b.saldo_akhir), right: true },
          { h: "Status", r: (b) => <Pill t={b.status === "ditutup" ? "Ditutup" : b.bulan_berjalan ? "Berjalan" : "Terbuka"} /> },
        ]}
        actions={(b) => {
          if (!bolehTutup) return null;
          if (b.status === "ditutup") return b.bulan === terbaruDitutup?.bulan ? <Btn size="sm" v="ghost" onClick={() => setBuka(b)}>Buka kembali</Btn> : null;
          if (b.bulan_berjalan) return null;
          return b.bulan === tertua?.bulan || b.jumlah_transaksi === 0 ? <Btn size="sm" v="light" onClick={() => setTutup(b)}>Tutup buku</Btn> : null;
        }}
      />
      <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>
        Ditutup berurutan dari bulan tertua. Biaya yang masih menunggu keputusan menahan penutupan. Bulan yang ditutup terkunci di database, termasuk dari impor dan jalur lain.
      </p>
      {tutup && <Modal title={`Tutup buku ${namaBulan(tutup.bulan)}`} onClose={() => setTutup(null)}><FormTutup b={tutup} onTutup={() => setTutup(null)} /></Modal>}
      {buka && <Modal title={`Buka kembali ${namaBulan(buka.bulan)}`} onClose={() => setBuka(null)}><FormBuka b={buka} onTutup={() => setBuka(null)} /></Modal>}
    </Card>
  );
}
