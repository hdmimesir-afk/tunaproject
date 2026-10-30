"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Btn, Card, DataList, Field, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { mulaiProduksi } from "@/lib/actions/produksi";
import type { DetailProduksi as Detail } from "@/lib/data/produksi";
import { tanggal } from "@/lib/format";
import { gramKeTeks, tampilKg } from "@/lib/logic/grid";
import { formatPct, type BatasHasil } from "@/lib/logic/neraca";
import { LABEL_PRODUKSI } from "@/lib/logic/produksi";
import type { Opsi, Pengguna } from "@/lib/types/pembelian";
import type { LotSiap, ProduksiBaris } from "@/lib/types/produksi";
import { DetailProduksi } from "./DetailProduksi";

type Props = {
  daftar: ProduksiBaris[];
  lotSiap: LotSiap[];
  grade: Opsi[];
  samping: Opsi[];
  pengguna: Record<string, Pengguna>;
  detail: Detail | null;
  batas: BatasHasil;
  bolehTulis: boolean;
  bolehPeriksa: boolean;
  bolehSetuju: boolean;
  hariIni: string;
};

const kgTeks = (n: number) => tampilKg(Math.round(n * 1000));

function FormMulai({ lotSiap, hariIni, onSelesai }: { lotSiap: LotSiap[]; hariIni: string; onSelesai: (id: string) => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(mulaiProduksi, undefined);
  const [pilih, setPilih] = useState<Record<string, string>>({});
  useEffect(() => {
    if (state?.id && !state.error) onSelesai(state.id);
  }, [state, onSelesai]);
  const alokasi = Object.entries(pilih).map(([lot_id, kg]) => ({ lot_id, kg }));
  const alih = (l: LotSiap, on: boolean) =>
    setPilih((p) => {
      const n = { ...p };
      if (on) n[l.id] = gramKeTeks(Math.round(l.sisa_kg * 1000)).replace(".", ",");
      else delete n[l.id];
      return n;
    });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="alokasi" value={JSON.stringify(alokasi)} />
      {state?.error && <div role="alert" className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>}
      {lotSiap.length === 0 ? (
        <p className="text-[13px]" style={{ color: MUTED }}>Belum ada lot yang lulus mutu dan masih bersisa. Cek mutu lot dulu di menu Mutu dan Penerimaan.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-[12px] font-medium" style={{ color: MUTED }}>Pilih lot yang masuk produksi ini</p>
          {lotSiap.map((l) => {
            const aktif = l.id in pilih;
            return (
              <div key={l.id} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5">
                <input type="checkbox" className="h-4 w-4 accent-[#00171F]" checked={aktif} onChange={(e) => alih(l, e.target.checked)} aria-label={`Pakai ${l.kode}`} />
                <div className="min-w-0 flex-1 text-[13px]">
                  <div className="font-medium">{l.kode}{l.grade_kode ? ` · ${l.grade_kode}` : ""}</div>
                  <div style={{ color: MUTED }}>{l.supplier_nama} · sisa {kgTeks(l.sisa_kg)} kg</div>
                </div>
                {aktif && (
                  <input aria-label={`Berat dari ${l.kode} (kg)`} inputMode="decimal" className="h-9 w-28 rounded-lg border border-[#E2E4EA] px-2 text-right text-[13px]"
                    value={pilih[l.id]} onChange={(e) => setPilih((p) => ({ ...p, [l.id]: e.target.value }))} />
                )}
              </div>
            );
          })}
        </div>
      )}
      <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={hariIni} required /></Field>
      <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
      <Btn type="submit" full disabled={pending || alokasi.length === 0}>{pending ? "Memulai..." : "Mulai produksi"}</Btn>
    </form>
  );
}

export function ProduksiKelola({ daftar, lotSiap, grade, samping, pengguna, detail, batas, bolehTulis, bolehPeriksa, bolehSetuju, hariIni }: Props) {
  const router = useRouter();
  const [mulai, setMulai] = useState(false);
  const buka = (id: string) => router.push(`/produksi?p=${id}`);
  const berjalan = daftar.filter((p) => p.status === "berjalan").length;
  const menunggu = daftar.filter((p) => p.status === "selesai" || p.status === "diperiksa_qc").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={String(daftar.length)} label="Total produksi" />
        <Stat value={String(berjalan)} label="Sedang berjalan" />
        <Stat value={String(menunggu)} label="Menunggu pemeriksaan" tone={menunggu > 0 ? "warn" : undefined} />
      </div>

      <Card title="Daftar produksi" right={bolehTulis && <Btn size="sm" onClick={() => setMulai(true)}>Mulai produksi</Btn>}>
        <DataList
          rows={daftar}
          empty={bolehTulis ? "Belum ada produksi. Ketuk Mulai produksi dan pilih lot yang lulus mutu." : "Belum ada produksi."}
          cari={(p) => `${p.kode} ${p.siklus_kode ?? ""} ${p.status.replace("_", " ")} ${p.tanggal}`}
          cols={[
            { h: "Produksi", r: (p: ProduksiBaris) => <><span className="font-medium">{p.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{tanggal(p.tanggal)}{p.siklus_kode ? ` · ${p.siklus_kode}` : ""}</span></> },
            { h: "Ikan masuk", r: (p) => `${kgTeks(p.masuk_kg)} kg`, right: true },
            { h: "Loin", r: (p) => `${kgTeks(p.loin_kg)} kg · ${p.jumlah_loin} potong`, right: true },
            { h: "Hasil", r: (p) => `${formatPct(p.hasil_pct)}%`, right: true },
            { h: "Belum jelas", r: (p) => `${kgTeks(p.belum_jelas_kg)} kg (${formatPct(p.belum_jelas_pct)}%)`, right: true },
            { h: "Status", r: (p) => <Pill t={LABEL_PRODUKSI[p.status]} /> },
          ]}
          actions={(p) => <Btn size="sm" v="light" onClick={() => buka(p.id)}>Buka</Btn>}
        />
      </Card>

      {mulai && (
        <Modal title="Mulai produksi" onClose={() => setMulai(false)}>
          <FormMulai lotSiap={lotSiap} hariIni={hariIni} onSelesai={(id) => { setMulai(false); buka(id); }} />
        </Modal>
      )}

      {detail && (
        <DetailProduksi key={detail.produksi.id} detail={detail} grade={grade} samping={samping} pengguna={pengguna} batas={batas}
          bolehTulis={bolehTulis} bolehPeriksa={bolehPeriksa} bolehSetuju={bolehSetuju} onTutup={() => router.push("/produksi")} />
      )}
    </div>
  );
}
