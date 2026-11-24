import type { Metadata } from "next";
import { Suspense } from "react";
import { RingkasanWarehouse } from "@/components/owner/RingkasanWarehouse";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { daftarBarang, daftarBooking, daftarRuangan, daftarUnit, isiGudang, riwayatBarang } from "@/lib/data/stok";
import { supabaseConfigured } from "@/lib/env";
import { hariIni } from "@/lib/format";
import { boleh, bolehSalahSatu } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Warehouse" };

export default function WarehousePage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Gudang dingin sama barang penunjang, kebaca dari yang diinput tim" judul="Ringkasan Warehouse" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <WarehouseData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function WarehouseData() {
  const sesi = await requireSesi();
  if (!bolehSalahSatu(sesi, ["gudang.read", "stok.read"])) return <TanpaIzin />;
  const bacaGudang = boleh(sesi, "gudang.read");
  const bacaStok = boleh(sesi, "stok.read");
  const [units, isi, ruangan, barang, gerak, booking] = await Promise.all([
    daftarUnit(),
    isiGudang(),
    daftarRuangan(),
    bacaStok ? daftarBarang() : Promise.resolve([]),
    bacaStok ? riwayatBarang() : Promise.resolve([]),
    bacaGudang ? daftarBooking() : Promise.resolve([]),
  ]);
  return <RingkasanWarehouse units={units} isi={isi} ruangan={ruangan} barang={barang} gerak={gerak} booking={booking} hariIni={hariIni()} />;
}
