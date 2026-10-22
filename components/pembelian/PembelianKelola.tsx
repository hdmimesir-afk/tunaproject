"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Btn, Card, DataList, Modal, Pill, Stat } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import type { DetailPO as Detail } from "@/lib/data/pembelian";
import { rp, tanggal } from "@/lib/format";
import { formatKg } from "@/lib/logic/neraca";
import { LABEL_BAYAR, LABEL_PO, LABEL_TERIMA } from "@/lib/logic/pembelian";
import type { Opsi, Pengguna, POBaris } from "@/lib/types/pembelian";
import { DetailPO } from "./DetailPO";
import { FormPO } from "./FormPO";

type Props = {
  daftar: POBaris[];
  pemasok: Opsi[];
  siklus: Opsi[];
  pengguna: Record<string, Pengguna>;
  detail: Detail | null;
  bolehTulis: boolean;
  bolehBayar: boolean;
  bolehDokumen: boolean;
  bolehSiklusBaru: boolean;
  hariIni: string;
};

export function PembelianKelola({ daftar, pemasok, siklus, pengguna, detail, bolehTulis, bolehBayar, bolehDokumen, bolehSiklusBaru, hariIni }: Props) {
  const router = useRouter();
  const [buat, setBuat] = useState(false);
  const bukaPO = useCallback((id: string) => router.push(`/pembelian?po=${id}`), [router]);

  const menunggu = daftar.filter((p) => p.status_persetujuan === "diajukan").length;
  const belumBayar = daftar.filter((p) => p.status_persetujuan === "disetujui" && p.status_bayar !== "lunas");
  const sisaHutang = belumBayar.reduce((a, p) => a + Math.round((p.total - p.total_bayar) * 100), 0) / 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <Stat value={String(daftar.length)} label="Total PO" />
        <Stat value={String(menunggu)} label="Menunggu persetujuan" tone={menunggu > 0 ? "warn" : undefined} />
        <Stat value={rp(sisaHutang)} label={`Belum dibayar (${belumBayar.length} PO disetujui)`} />
      </div>

      <Card title="Daftar PO" right={bolehTulis && <Btn size="sm" onClick={() => setBuat(true)}>Buat PO</Btn>}>
        <DataList
          rows={daftar}
          empty={bolehTulis ? "Belum ada PO. Ketuk Buat PO untuk mulai." : "Belum ada PO."}
          cols={[
            { h: "PO", r: (p: POBaris) => <><span className="font-medium">{p.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{p.supplier_nama} · {tanggal(p.tanggal)}</span></> },
            { h: "Berat", r: (p) => `${formatKg(p.kg)} kg`, right: true },
            { h: "Total", r: (p) => rp(p.total), right: true },
            { h: "Persetujuan", r: (p) => <Pill t={LABEL_PO[p.status_persetujuan]} /> },
            { h: "Diterima", r: (p) => <Pill t={LABEL_TERIMA[p.status_terima]} /> },
            { h: "Bayar", r: (p) => (p.status_persetujuan === "disetujui" ? <Pill t={LABEL_BAYAR[p.status_bayar]} /> : <span style={{ color: MUTED }}>-</span>) },
          ]}
          actions={(p) => <Btn size="sm" v="light" onClick={() => bukaPO(p.id)}>Buka</Btn>}
        />
      </Card>

      {buat && (
        <Modal title="Buat PO" onClose={() => setBuat(false)}>
          <FormPO po={null} pemasok={pemasok} siklus={siklus} bolehSiklusBaru={bolehSiklusBaru} hariIni={hariIni}
            onSelesai={(id) => { setBuat(false); if (id) bukaPO(id); }} />
        </Modal>
      )}

      {detail && (
        <DetailPO key={detail.po.id} detail={detail} pengguna={pengguna} pemasok={pemasok} siklus={siklus} bolehTulis={bolehTulis} bolehBayar={bolehBayar}
          bolehDokumen={bolehDokumen} bolehSiklusBaru={bolehSiklusBaru} hariIni={hariIni} onTutup={() => router.push("/pembelian")} />
      )}
    </div>
  );
}
