import type { Metadata } from "next";
import { Suspense } from "react";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { StokKelola } from "@/components/stok/StokKelola";
import { requireSesi } from "@/lib/data/auth";
import { daftarProduksi } from "@/lib/data/produksi";
import { daftarRuangan, daftarUnit, ikanUtuh, isiGudang, koreksiMenunggu } from "@/lib/data/stok";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Stok" };

export default function StokPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ikan utuh, yg lagi diproduksi, hasil siap jual, sama titipan. Semua kebaca sendiri dari datanya" judul="Stok" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <StokData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function StokData() {
  const sesi = await requireSesi();
  if (!boleh(sesi, "stok.read")) return <TanpaIzin />;
  const bolehSetuju = boleh(sesi, "stok.setuju");
  const bacaProduksi = boleh(sesi, "produksi.read");
  const bacaLot = boleh(sesi, "mutu.read");
  const [ikan, produksi, units, isi, ruangan, koreksi] = await Promise.all([
    bacaLot ? ikanUtuh() : Promise.resolve([]),
    bacaProduksi ? daftarProduksi() : Promise.resolve([]),
    daftarUnit(),
    isiGudang(),
    daftarRuangan(),
    bolehSetuju ? koreksiMenunggu() : Promise.resolve([]),
  ]);
  return (
    <StokKelola ikan={ikan} produksi={produksi} units={units} isi={isi} ruangan={ruangan} koreksi={koreksi}
      bolehProduksi={boleh(sesi, "produksi.write")} bolehSetuju={bolehSetuju} />
  );
}
