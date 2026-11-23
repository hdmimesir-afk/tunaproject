import type { Metadata } from "next";
import { Suspense } from "react";
import { PengaturanKelola, type BarisMaster, type NilaiPengaturan } from "@/components/pengaturan/PengaturanKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { requireIzin } from "@/lib/data/auth";
import { aturanLampiran } from "@/lib/data/pembelian";
import { supabaseConfigured } from "@/lib/env";
import { boleh } from "@/lib/izin";
import { TABEL_MASTER, type TabelMaster } from "@/lib/master";
import { IMPOR, JENIS_IMPOR } from "@/lib/imporMaster";
import type { LogImpor } from "@/components/pengaturan/UploadExcel";
import type { Cctv } from "@/components/pengaturan/CctvKelola";
import type { LogHapus } from "@/lib/logic/hapus";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "KATALIS ERP | Pengaturan" };

export default function PengaturanPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Atur data master, target, sama hapus data" judul="Pengaturan" />
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
  // Hapus data cuma buat pemegang izin data.hapus (Owner).
  const bolehHapus = boleh(sesi, "data.hapus");
  // Upload Excel: pemasok, pembeli, produk butuh master.write; barang penunjang butuh stok.write.
  const jenisImpor = JENIS_IMPOR.filter((j) => boleh(sesi, IMPOR[j].izin));
  // Dashboard owner (saldo awal, modal, CCTV) diatur admin yg pegang pengaturan.write.
  const bolehAturOwner = boleh(sesi, "pengaturan.write");
  const [tabel, { data: pengaturan }, aturan, log, logImpor, cctv] = await Promise.all([
    Promise.all(TABEL_MASTER.map(async (t) => {
      const { data } = await supabase.from(t).select("*").order("aktif", { ascending: false }).order(t === "grades" || t === "component_categories" || t === "expense_categories" ? "urutan" : "nama");
      return [t, (data ?? []) as BarisMaster[]] as const;
    })),
    supabase.from("settings").select("kunci, nilai"),
    aturanLampiran(),
    bolehHapus
      ? supabase.from("hapus_data_log").select("id, waktu, oleh_nama, bagian, alasan, rincian, total").order("waktu", { ascending: false }).limit(100)
      : Promise.resolve({ data: null }),
    jenisImpor.length > 0
      ? supabase.from("impor_master_log").select("id, jenis, nama_file, baru, ubah, sama, oleh_nama, dibuat_pada").order("dibuat_pada", { ascending: false }).limit(30)
      : Promise.resolve({ data: [] }),
    bolehAturOwner
      ? supabase.from("cctv_links").select("id, nama, url, urutan, aktif").order("aktif", { ascending: false }).order("urutan").order("nama")
      : Promise.resolve({ data: null }),
  ]);
  return (
    <PengaturanKelola
      data={Object.fromEntries(tabel) as Record<TabelMaster, BarisMaster[]>}
      pengaturan={(pengaturan ?? []) as NilaiPengaturan[]}
      aturan={aturan}
      bolehUbah={boleh(sesi, "master.write")}
      bolehAtur={boleh(sesi, "pengaturan.write")}
      logHapus={bolehHapus ? ((log.data ?? []) as LogHapus[]) : null}
      jenisImpor={jenisImpor}
      logImpor={(logImpor.data ?? []) as LogImpor[]}
      cctv={bolehAturOwner ? ((cctv.data ?? []) as Cctv[]) : null}
    />
  );
}
