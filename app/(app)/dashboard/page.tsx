import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardOwner } from "@/components/dashboard/DashboardOwner";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { requireSesi } from "@/lib/data/auth";
import { ambilDashboard } from "@/lib/data/keuangan";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Ringkasan dulu, rincian saat diketuk" judul="Dashboard" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <DashboardData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function DashboardData() {
  const sesi = await requireSesi();
  const d = await ambilDashboard();
  return (
    <DashboardOwner
      d={d}
      izin={{
        persetujuan: boleh(sesi, "persetujuan.read"), keuangan: boleh(sesi, "keuangan.read"), penjualan: boleh(sesi, "penjualan.read"),
        pembelian: boleh(sesi, "pembelian.read"), produksi: boleh(sesi, "produksi.read"), stok: boleh(sesi, "stok.read"), mutu: boleh(sesi, "mutu.read"),
      }}
    />
  );
}
