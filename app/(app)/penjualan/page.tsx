import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { PenjualanKelola } from "@/components/penjualan/PenjualanKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { daftarInvoice, daftarJasa, daftarPesanan, detailInvoice, detailPesanan, hasilBelumSiapJual, jasaBelumDitagih, pajakBawaan, pembeliAktif, siklusTerbuka, unitDijual } from "@/lib/data/penjualan";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh, PERAN_OWNER } from "@/lib/izin";
import { riwayatKoreksi } from "@/lib/data/koreksi";
import { petaPengguna } from "@/lib/data/pembelian";
import { PenjualanOwner } from "@/components/owner/PenjualanOwner";
import { laporanPenjualanOwner } from "@/lib/data/laporanOwner";
import { isPeriodeOwner } from "@/lib/logic/laporanOwner";

export const metadata: Metadata = { title: "KATALIS ERP | Penjualan" };

export default function PenjualanPage(props: PageProps<"/penjualan">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Dari pesanan, kirim barang, nagih, sampai uang masuk" judul="Penjualan" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <PenjualanData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function PenjualanData({ searchParams }: { searchParams: PageProps<"/penjualan">["searchParams"] }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "penjualan.read")) return <TanpaIzin />;
  const sp = await searchParams;
  const p = z.uuid().safeParse(typeof sp.p === "string" ? sp.p : "");
  const inv = z.uuid().safeParse(typeof sp.inv === "string" ? sp.inv : "");
  if (sesi.roleId === PERAN_OWNER && sp.lengkap !== "1" && !p.success && !inv.success) {
    return <PenjualanOwner lap={await laporanPenjualanOwner(isPeriodeOwner(sp.periode) ? sp.periode : "30")} />;
  }
  const bolehBuat = boleh(sesi, "penjualan.write");
  const bolehInvoice = boleh(sesi, "invoice.write");
  const [pesanan, invoice, unit, pembeli, siklus, jasa, detailP, detailI, tertunda, daftarHarga, pajak] = await Promise.all([
    daftarPesanan(),
    daftarInvoice(),
    bolehBuat ? unitDijual(p.success ? p.data : undefined) : Promise.resolve([]),
    bolehBuat ? pembeliAktif() : Promise.resolve([]),
    bolehBuat ? siklusTerbuka() : Promise.resolve([]),
    bolehInvoice ? jasaBelumDitagih() : Promise.resolve([]),
    p.success ? detailPesanan(p.data) : Promise.resolve(null),
    inv.success ? detailInvoice(inv.data) : Promise.resolve(null),
    bolehBuat && boleh(sesi, "produksi.read") ? hasilBelumSiapJual() : Promise.resolve([]),
    daftarJasa(),
    pajakBawaan(),
  ]);
  // Riwayat koreksi pesanan atau uang masuk yg lagi dibuka, plus riwayat koreksi harga jasa.
  const [koreksi, pengguna, koreksiJasa] = await Promise.all([
    detailP ? riwayatKoreksi(["sales_orders"], [detailP.pesanan.id]) : detailI ? riwayatKoreksi(["customer_payments"], detailI.pembayaran.map((x) => x.id)) : Promise.resolve([]),
    detailP || detailI || daftarHarga.length > 0 ? petaPengguna() : Promise.resolve({}),
    riwayatKoreksi(["service_items"], daftarHarga.map((x) => x.id)),
  ]);
  return (
    <PenjualanKelola koreksi={koreksi} pengguna={pengguna} daftarJasa={daftarHarga} pajakBawaan={pajak} koreksiJasa={koreksiJasa}
      pesanan={pesanan} invoice={invoice} unit={unit} pembeli={pembeli} siklus={siklus} jasa={jasa} detailP={detailP} detailI={detailI} tertunda={tertunda}
      bolehBuat={bolehBuat} bolehKirim={boleh(sesi, "pengiriman.write")} bolehInvoice={bolehInvoice} bolehBayar={boleh(sesi, "terima_bayar.write")}
      bolehDokumen={boleh(sesi, "dokumen.write")} hariIni={hariIni()}
    />
  );
}
