"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Btn, Card, DataList, Pill, Stat } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import type { DetailPO as Detail } from "@/lib/data/pembelian";
import { rp, tanggal } from "@/lib/format";
import { formatKg } from "@/lib/logic/neraca";
import { kodePO, LABEL_BAYAR, LABEL_PO } from "@/lib/logic/pembelian";
import type { Opsi, Pengguna, POBaris } from "@/lib/types/pembelian";
import { DetailPO, type Kelengkapan } from "./DetailPO";

/** Diajukan tanpa nota dan notanya belum dilampirkan. */
const notaMenyusul = (p: POBaris) => p.nota_menyusul && p.jml_nota === 0;

type Props = {
  daftar: POBaris[];
  pemasok: Opsi[];
  siklus: Opsi[];
  pengguna: Record<string, Pengguna>;
  detail: Detail | null;
  kelengkapan: Kelengkapan;
  bolehTulis: boolean;
  bolehBayar: boolean;
  bolehDokumen: boolean;
  hariIni: string;
};

/* PO lahir dari penerimaan: ikan diterima dan digrading di Mutu dan Penerimaan, diajukan, terus disetujui (kode PO terbit).
   Halaman ini buat ngecek PO, bayar pemasok, lampiran, dan koreksi. */
export function PembelianKelola({ daftar, pemasok, siklus, pengguna, detail, kelengkapan, bolehTulis, bolehBayar, bolehDokumen, hariIni }: Props) {
  const router = useRouter();
  const bukaPO = useCallback((id: string) => router.push(`/pembelian?po=${id}`), [router]);

  const menunggu = daftar.filter((p) => p.status_persetujuan === "diajukan").length;
  const belumBayar = daftar.filter((p) => p.status_persetujuan === "disetujui" && p.status_bayar !== "lunas");
  const sisaHutang = belumBayar.reduce((a, p) => a + Math.round((p.total - p.total_bayar) * 100), 0) / 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <Stat value={String(daftar.length)} label="Total pembelian" />
        <Stat value={String(menunggu)} label="Nunggu persetujuan" tone={menunggu > 0 ? "warn" : undefined} />
        <Stat value={rp(sisaHutang)} label={`Belum dibayar (${belumBayar.length} PO)`} />
      </div>

      <Card title="Daftar PO">
        <DataList
          rows={daftar}
          empty="Belum ada pembelian. Pembelian diajukan dari menu Mutu dan Penerimaan, habis ikannya diterima dan digrading."
          cari={(p) => `${kodePO(p.kode)} ${p.supplier_nama} ${p.siklus_kode ?? ""} ${p.proyek_nama ?? ""} ${p.lot_kode ?? ""} ${LABEL_PO[p.status_persetujuan]} ${LABEL_BAYAR[p.status_bayar]} ${notaMenyusul(p) ? "nota menyusul" : ""}`}
          cols={[
            { h: "PO", r: (p: POBaris) => <><span className="font-medium">{kodePO(p.kode)}</span>{notaMenyusul(p) && <span className="ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Nota menyusul</span>}<span className="block text-[12px]" style={{ color: MUTED }}>{p.supplier_nama} · {tanggal(p.tanggal)}{p.siklus_kode && ` · ${p.siklus_kode}`}{p.lot_kode && ` · ${p.lot_kode}`}</span></> },
            { h: "Berat", r: (p) => `${formatKg(p.kg)} kg`, right: true },
            { h: "Total", r: (p) => rp(p.total), right: true },
            { h: "Persetujuan", r: (p) => <Pill t={LABEL_PO[p.status_persetujuan]} /> },
            { h: "Bayar", r: (p) => (p.status_persetujuan === "disetujui" ? <Pill t={LABEL_BAYAR[p.status_bayar]} /> : <span style={{ color: MUTED }}>-</span>) },
          ]}
          actions={(p) => <Btn size="sm" v="light" onClick={() => bukaPO(p.id)}>Buka</Btn>}
        />
      </Card>

      {detail && (
        <DetailPO key={detail.po.id} detail={detail} kelengkapan={kelengkapan} pengguna={pengguna} pemasok={pemasok} siklus={siklus} bolehTulis={bolehTulis} bolehBayar={bolehBayar}
          bolehDokumen={bolehDokumen} hariIni={hariIni} onTutup={() => router.push("/pembelian")} />
      )}
    </div>
  );
}
