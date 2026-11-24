import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { StokKelola } from "@/components/stok/StokKelola";
import { requireSesi } from "@/lib/data/auth";
import { daftarProduksi, liniDari } from "@/lib/data/produksi";
import { daftarRuangan, daftarUnit, isiGudang, koreksiMenunggu, lotDitahan } from "@/lib/data/stok";
import { supabaseConfigured } from "@/lib/env";
import { boleh, bolehSalahSatu } from "@/lib/izin";

export const metadata: Metadata = { title: "KATALIS ERP | Produksi" };

/* Ringkasan Produksi (dashboard kategori Produksi, permintaan tim 24 Nov 2026). Halaman produksi yang dulu ada di sini
   pindah ke /produksi/jual dan /produksi/jasa; tautan lama (?p=, ?mulai=) diarahin ke halaman lininya. */
export default function ProduksiPage(props: PageProps<"/produksi">) {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Stok yang udah diproduksi, yang lagi dititip, sama yang masih ditahan" judul="Ringkasan Produksi" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <RingkasanData searchParams={props.searchParams} />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function RingkasanData({ searchParams }: { searchParams: PageProps<"/produksi">["searchParams"] }) {
  const sesi = await requireSesi();
  const sp = await searchParams;
  // Tautan lama: buka produksi atau mulai produksi, diarahin ke halaman lini bisnisnya (query-nya dibawa).
  const id = z.uuid().safeParse(typeof sp.p === "string" ? sp.p : "");
  const proyek = z.uuid().safeParse(typeof sp.proyek === "string" ? sp.proyek : "");
  if (id.success || sp.mulai === "1") {
    const lini = id.success ? await liniDari("v_productions", id.data) : proyek.success ? await liniDari("cycles", proyek.data) : "jual";
    const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
    redirect(lini === "titip" ? `/produksi/titip?titip=${proyek.data ?? ""}` : `/produksi/${lini}?${q}`);
  }
  if (!bolehSalahSatu(sesi, ["produksi.read", "stok.read"])) return <TanpaIzin />;
  const bolehSetuju = boleh(sesi, "stok.setuju");
  const [produksi, units, isi, ruangan, koreksi, ditahan] = await Promise.all([
    boleh(sesi, "produksi.read") ? daftarProduksi() : Promise.resolve([]),
    boleh(sesi, "stok.read") ? daftarUnit() : Promise.resolve([]),
    isiGudang(),
    daftarRuangan(),
    bolehSetuju ? koreksiMenunggu() : Promise.resolve([]),
    boleh(sesi, "mutu.read") ? lotDitahan() : Promise.resolve([]),
  ]);
  return <StokKelola produksi={produksi} units={units} isi={isi} ruangan={ruangan} koreksi={koreksi} ditahan={ditahan} bolehSetuju={bolehSetuju} />;
}
