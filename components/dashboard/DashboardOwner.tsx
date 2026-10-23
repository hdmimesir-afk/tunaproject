import Link from "next/link";
import { Card, Stat } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import { rp } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import type { Dashboard } from "@/lib/types/keuangan";

type Izin = { persetujuan: boolean; keuangan: boolean; penjualan: boolean; pembelian: boolean; produksi: boolean; stok: boolean; mutu: boolean };

const kgT = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;

/* Ringkasan dulu, rincian saat diketuk: tiap angka adalah tautan ke halaman yang menjelaskannya.
   Hanya angka yang boleh dilihat peran ini yang tampil; halaman tujuan tetap dijaga izin dan RLS. */
function Kartu({ href, value, label, tone }: { href: string; value: string; label: string; tone?: "warn" | "ok" }) {
  return (
    <Link href={href} className="block transition active:scale-[0.97]" aria-label={`${label}: ${value}`}>
      <Stat value={value} label={label} tone={tone} />
    </Link>
  );
}

export function DashboardOwner({ d, izin }: { d: Dashboard; izin: Izin }) {
  const keputusan = [
    izin.persetujuan && { href: "/persetujuan", v: d.persetujuan_menunggu, label: "PO menunggu persetujuan" },
    izin.keuangan && { href: "/keuangan", v: d.biaya_menunggu, label: "Biaya menunggu keputusan" },
    izin.stok && { href: "/stok", v: d.koreksi_menunggu, label: "Koreksi stok menunggu" },
    izin.produksi && { href: "/produksi", v: d.produksi_menunggu, label: "Produksi menunggu pemeriksaan" },
    izin.mutu && { href: "/mutu", v: d.lot_menunggu_mutu, label: "Lot menunggu cek mutu" },
  ].filter(Boolean) as { href: string; v: number; label: string }[];

  return (
    <div className="space-y-4">
      {keputusan.length > 0 && (
        <Card title="Perlu tindakan">
          <div className="grid grid-cols-2 gap-2.5 px-2.5 pb-2.5 md:grid-cols-5">
            {keputusan.map((k) => <Kartu key={k.href} href={k.href} value={String(k.v)} label={k.label} tone={k.v > 0 ? "warn" : undefined} />)}
          </div>
        </Card>
      )}

      {(izin.penjualan || izin.keuangan || izin.pembelian) && (
        <Card title="Uang">
          <div className="grid grid-cols-2 gap-2.5 px-2.5 pb-2.5 md:grid-cols-3">
            {izin.penjualan && <Kartu href="/penjualan" value={rp(d.piutang)} label="Piutang (belum dibayar pembeli)" />}
            {izin.penjualan && <Kartu href="/penjualan" value={rp(d.piutang_terlambat)} label={`Piutang terlambat · ${d.invoice_terlambat} invoice`} tone={d.invoice_terlambat > 0 ? "warn" : undefined} />}
            {izin.pembelian && <Kartu href="/pembelian" value={rp(d.hutang_pemasok)} label="Utang ke pemasok (PO disetujui belum lunas)" />}
            {izin.keuangan && <Kartu href="/keuangan" value={rp(d.kas_masuk_bulan_ini)} label="Uang masuk bulan ini" tone="ok" />}
            {izin.keuangan && <Kartu href="/keuangan" value={rp(d.kas_keluar_bulan_ini)} label="Uang keluar bulan ini" />}
          </div>
        </Card>
      )}

      {(izin.stok || izin.produksi || izin.penjualan) && (
        <Card title="Barang">
          <div className="grid grid-cols-2 gap-2.5 px-2.5 pb-2.5 md:grid-cols-4">
            {izin.stok && <Kartu href="/stok" value={kgT(d.stok_sendiri_kg)} label="Stok milik sendiri" />}
            {izin.stok && <Kartu href="/gudang" value={kgT(d.stok_titipan_kg)} label="Titipan pelanggan" />}
            {izin.produksi && <Kartu href="/produksi" value={String(d.produksi_berjalan)} label="Produksi sedang berjalan" />}
            {izin.penjualan && <Kartu href="/penjualan" value={String(d.pesanan_belum_dikirim)} label="Pesanan belum dikirim" />}
          </div>
        </Card>
      )}

      {(izin.keuangan || izin.pembelian) && (
        <Card title="Kelengkapan dokumen">
          <div className="px-2.5 pb-2.5">
            <Kartu href="/keuangan" value={String(d.dokumen_kurang)} label="Transaksi tanpa nota atau bukti" tone={d.dokumen_kurang > 0 ? "warn" : "ok"} />
            <p className="pt-2 text-[12px]" style={{ color: MUTED }}>Dihitung dari PO, biaya, dan pembayaran yang belum punya nota atau bukti transfer.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
