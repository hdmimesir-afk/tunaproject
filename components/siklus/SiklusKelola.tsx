"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Btn, Card, DataList, Inner, Modal, Pill, Stat } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { RantaiSiklus } from "@/lib/data/laporan";
import { rp, tanggal } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import { LABEL_TAGIHAN, type StatusTagihan } from "@/lib/logic/penjualan";
import type { RingkasSiklus } from "@/lib/types/keuangan";

const kgT = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;

function Tahap({ judul, ringkas, children, kosong }: { judul: string; ringkas: string; children: React.ReactNode; kosong?: boolean }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold" style={{ color: INK }}>{judul}</h4>
        <span className="text-[12px]" style={{ color: MUTED }}>{ringkas}</span>
      </div>
      {kosong ? <p className="text-[13px]" style={{ color: MUTED }}>Belum ada.</p> : <div className="space-y-1.5">{children}</div>}
    </section>
  );
}

const Baris = ({ href, kiri, kanan }: { href: string; kiri: React.ReactNode; kanan?: React.ReactNode }) => (
  <Link href={href} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }}>
    <span className="min-w-0">{kiri}</span>{kanan && <span className="shrink-0 text-right font-medium">{kanan}</span>}
  </Link>
);

function Rantai({ d, onTutup }: { d: RantaiSiklus; onTutup: () => void }) {
  const r = d.ringkas;
  return (
    <Modal title={`${r.kode}${r.ref_po_pembeli ? ` · ${r.ref_po_pembeli}` : ""}`} onClose={onTutup} lebar>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill t={r.status === "terbuka" ? "Terbuka" : "Ditutup"} />
        {r.no_bongkar && <Pill t={`Bongkar ${r.no_bongkar}`} />}
        {r.tanggal_bongkar && <span className="text-[12px]" style={{ color: MUTED }}>{tanggal(r.tanggal_bongkar)}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Stat value={rp(r.nilai_beli)} label={`Beli ikan · ${r.jumlah_po} PO`} />
        <Stat value={kgT(r.loin_kg)} label="Loin dihasilkan" />
        <Stat value={rp(r.nilai_invoice)} label="Ditagihkan" />
        <Stat value={rp(r.uang_masuk)} label="Uang masuk" tone="ok" />
      </div>
      <Tahap judul="1. Beli ikan" ringkas={`${d.po.length} PO`} kosong={d.po.length === 0}>
        {d.po.map((p) => <Baris key={p.id} href={`/pembelian?po=${p.id}`} kiri={<>{p.kode} · {p.supplier_nama} · {kgT(p.kg)}</>} kanan={<>{rp(p.total)} · dibayar {rp(p.total_bayar)}</>} />)}
      </Tahap>
      <Tahap judul="2. Terima dan cek mutu" ringkas={`${d.lot.length} lot`} kosong={d.lot.length === 0}>
        {d.lot.map((l) => <Baris key={l.id} href="/mutu" kiri={<>{l.kode} dari {l.po_kode}</>} kanan={<>{kgT(l.kg)} · {l.qc}</>} />)}
      </Tahap>
      <Tahap judul="3. Produksi" ringkas={`${d.produksi.length} produksi`} kosong={d.produksi.length === 0}>
        {d.produksi.map((p) => <Baris key={p.id} href={`/produksi?p=${p.id}`} kiri={<>{p.kode} · {p.status.replace("_", " ")}</>} kanan={<>masuk {kgT(p.masuk_kg)} → loin {kgT(p.loin_kg)}</>} />)}
      </Tahap>
      <Tahap judul="4. Jual dan kirim" ringkas={`${d.pesanan.length} pesanan`} kosong={d.pesanan.length === 0}>
        {d.pesanan.map((p) => <Baris key={p.id} href={`/penjualan?p=${p.id}`} kiri={<>{p.kode} · {p.buyer_nama} · {p.status}</>} kanan={rp(p.status === "terkirim" ? p.total_final : p.total_pesan)} />)}
      </Tahap>
      <Tahap judul="5. Tagihan dan uang masuk" ringkas={`${d.invoice.length} invoice`} kosong={d.invoice.length === 0}>
        {d.invoice.map((i) => <Baris key={i.id} href={`/penjualan?inv=${i.id}`} kiri={<>{i.kode} · {LABEL_TAGIHAN[i.status_tagihan as StatusTagihan] ?? i.status_tagihan}</>} kanan={<>{rp(i.total)} · sisa {rp(i.sisa)}</>} />)}
      </Tahap>
      <Tahap judul="6. Biaya lain" ringkas={`${d.biaya.length} biaya`} kosong={d.biaya.length === 0}>
        {d.biaya.map((b) => <Baris key={b.id} href={`/keuangan?b=${b.id}`} kiri={<>{b.kode} · {b.kategori_nama} · {b.status}</>} kanan={rp(b.jumlah)} />)}
      </Tahap>
      <Inner className="!p-3.5"><p className="text-[12.5px]" style={{ color: MUTED }}>Semua baris di atas ditarik dari catatan yang sama, tanpa input ulang. Ketuk satu baris untuk membuka transaksinya beserta nota.</p></Inner>
    </Modal>
  );
}

export function SiklusKelola({ daftar, detail }: { daftar: RingkasSiklus[]; detail: RantaiSiklus | null }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <Card title="Daftar siklus">
        <DataList
          rows={daftar}
          empty="Belum ada siklus. Siklus dibuat otomatis saat PO memilih Siklus baru."
          cols={[
            { h: "Siklus", r: (s: RingkasSiklus) => <><span className="font-medium">{s.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{s.ref_po_pembeli || "tanpa PO pembeli"}</span></> },
            { h: "Beli ikan", r: (s) => rp(s.nilai_beli), right: true },
            { h: "Loin", r: (s) => kgT(s.loin_kg), right: true },
            { h: "Ditagihkan", r: (s) => rp(s.nilai_invoice), right: true },
            { h: "Uang masuk", r: (s) => rp(s.uang_masuk), right: true },
            { h: "Status", r: (s) => <Pill t={s.status === "terbuka" ? "Terbuka" : "Ditutup"} /> },
          ]}
          actions={(s) => <Btn size="sm" v="light" onClick={() => router.push(`/siklus?c=${s.cycle_id}`)}>Telusuri</Btn>}
        />
      </Card>
      {detail && <Rantai d={detail} onTutup={() => router.push("/siklus")} />}
    </div>
  );
}
