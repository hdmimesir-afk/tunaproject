"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn, Card, Modal } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { FormMulai } from "@/components/produksi/ProduksiKelola";
import type { Opsi } from "@/lib/types/pembelian";
import type { ProyekOpsi } from "@/lib/types/produksi";

/** Proyek lini Titip barang yang masih terbuka, plus tombol bikin proyek titip baru (form yang sama kayak mulai produksi,
    lininya dikunci ke titip). Abis proyeknya jadi, form Terima titipan langsung kebuka. */
export function ProyekTitip({ proyek, pt, hariIni, bolehBuat }: { proyek: ProyekOpsi[]; pt: Opsi[]; hariIni: string; bolehBuat: boolean }) {
  const router = useRouter();
  const [buat, setBuat] = useState(false);
  const titip = proyek.filter((x) => x.lini_bisnis === "titip");
  const namaPT = new Map(pt.map((x) => [x.id, x.label]));
  return (
    <Card title="Proyek titip" right={bolehBuat && <Btn size="sm" onClick={() => setBuat(true)}>Buat proyek titipan</Btn>}>
      {titip.length === 0 ? (
        <p className="px-2.5 pb-2 text-[13px]" style={{ color: MUTED }}>Belum ada proyek titip yang terbuka.</p>
      ) : (
        <ul className="space-y-1.5 px-1 pb-1" data-testid="proyek-titip">
          {titip.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium" style={{ color: INK }}>{x.label}</span>
                {x.pt_id && <span className="block truncate text-[12px]" style={{ color: MUTED }}>{namaPT.get(x.pt_id) ?? "PT pemilik"}</span>}
              </span>
              {bolehBuat && (
                <Link href={`/produksi/titip?titip=${x.id}`} className="inline-flex h-10 items-center rounded-full bg-[#EEF0F5] px-4 text-[13px] font-medium md:h-8 md:text-[12.5px]" style={{ color: INK }}>
                  Terima titipan
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {buat && (
        <Modal title="Buat proyek titipan" onClose={() => setBuat(false)}>
          <FormMulai lotSiap={[]} proyek={proyek} pt={pt} hariIni={hariIni} liniTetap="titip"
            onSelesai={() => setBuat(false)}
            onTitip={(id) => { setBuat(false); router.push(`/produksi/titip?titip=${id}`); }} />
        </Modal>
      )}
    </Card>
  );
}
