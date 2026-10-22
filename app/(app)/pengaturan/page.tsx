import type { Metadata } from "next";
import { Suspense } from "react";
import { PengaturanKelola, type BarisMaster, type NilaiPengaturan } from "@/components/pengaturan/PengaturanKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { requireIzin } from "@/lib/data/auth";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";
import { TABEL_MASTER, type TabelMaster } from "@/lib/master";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "KATALIS ERP | Pengaturan" };

export default function PengaturanPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Data master dan target" judul="Pengaturan" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <PengaturanData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function PengaturanData() {
  const sesi = await requireIzin("master.read");
  const supabase = await createClient();
  const [tabel, { data: pengaturan }] = await Promise.all([
    Promise.all(TABEL_MASTER.map(async (t) => {
      const { data } = await supabase.from(t).select("*").order("aktif", { ascending: false }).order(t === "grades" || t === "component_categories" || t === "expense_categories" ? "urutan" : "nama");
      return [t, (data ?? []) as BarisMaster[]] as const;
    })),
    supabase.from("settings").select("kunci, nilai"),
  ]);
  return (
    <PengaturanKelola
      data={Object.fromEntries(tabel) as Record<TabelMaster, BarisMaster[]>}
      pengaturan={(pengaturan ?? []) as NilaiPengaturan[]}
      bolehUbah={boleh(sesi, "master.write")}
      bolehAtur={boleh(sesi, "pengaturan.write")}
    />
  );
}
