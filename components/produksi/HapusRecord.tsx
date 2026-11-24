"use client";

import { useState } from "react";
import { Btn } from "@/components/ui";
import { HapusItem } from "@/components/ui/HapusItem";
import { INK, MUTED } from "@/components/ui/tokens";
import { hapusBarisProduksi, hapusProduksi } from "@/lib/actions/produksi";
import type { DetailProduksi as Detail } from "@/lib/data/produksi";
import { tampilKg } from "@/lib/logic/grid";
import type { Opsi } from "@/lib/types/pembelian";

/* Hapus record di produksi (permintaan tim 24 Nov 2026, takutnya double input). Per baris selama produksi masih berjalan,
   atau satu produksi utuh. Wajib alasan, dua langkah, kecatat di log hapus. */

type Tabel = "lot_allocations" | "production_loin_totals" | "production_items" | "production_fish" | "production_components";
type Baris = { tabel: Tabel; id: string; label: string };

const kg = (n: number | null | undefined) => `${tampilKg(Math.round(Number(n ?? 0) * 1000))} kg`;
const KELOMPOK: Record<Tabel, string> = {
  lot_allocations: "Pemakaian lot",
  production_loin_totals: "Loin total per grade",
  production_items: "Loin per potong",
  production_fish: "Berat per ekor",
  production_components: "Hasil samping",
};

export function HapusRecordProduksi({ detail, grade, samping }: { detail: Detail; grade: Opsi[]; samping: Opsi[] }) {
  const p = detail.produksi;
  const [pilih, setPilih] = useState<string | null>(null);
  const namaGrade = new Map(grade.map((g) => [g.id, g.label]));
  const namaSamping = new Map(samping.map((g) => [g.id, g.label]));
  const lini = p.lini_bisnis === "jasa" ? "jasa" : "jual";
  const berjalan = p.status === "berjalan";
  const baris: Baris[] = [
    ...detail.alokasi.map((a) => ({ tabel: "lot_allocations" as const, id: a.id, label: `${a.lot_kode} · ${kg(a.kg)}` })),
    ...detail.total.filter((t) => Number(t.kg) > 0).map((t) => ({ tabel: "production_loin_totals" as const, id: t.id, label: `${namaGrade.get(t.grade_id) ?? "Grade"} · ${kg(t.kg)}` })),
    ...detail.loin.filter((l) => !l.batal).map((l) => ({ tabel: "production_items" as const, id: l.id, label: `Loin no ${l.no_loin} · ${namaGrade.get(l.grade_id) ?? ""} · ${kg(l.kg)}` })),
    ...detail.ekor.map((e) => ({ tabel: "production_fish" as const, id: e.id, label: `Ekor no ${e.no_ekor} · ${kg(e.berat_utuh_kg)}` })),
    ...detail.samping.map((c) => ({ tabel: "production_components" as const, id: c.id, label: `${namaSamping.get(c.category_id) ?? "Komponen"} · ${kg(c.kg)}` })),
  ];
  return (
    <details className="rounded-2xl bg-white p-3.5" data-testid="hapus-record-produksi">
      <summary className="cursor-pointer text-[13px] font-medium" style={{ color: INK }}>Hapus data yang dobel</summary>
      <div className="mt-3 space-y-3">
        {!berjalan && <p className="text-[12.5px]" style={{ color: MUTED }}>Produksi ini udah {p.status.replace("_", " ")}. Hapus per baris cuma bisa pas masih berjalan, pencet Buka lagi dulu. Hapus produksi utuh tetap bisa di bawah.</p>}
        {berjalan && baris.length === 0 && <p className="text-[12.5px]" style={{ color: MUTED }}>Belum ada baris yang bisa dihapus.</p>}
        {berjalan && baris.length > 0 && (
          <ul className="space-y-1.5" data-testid="baris-hapus-produksi">
            {baris.map((b) => (
              <li key={b.id} className="rounded-xl border border-[#EEF0F4] px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0" style={{ color: INK }}><span className="block text-[11px]" style={{ color: MUTED }}>{KELOMPOK[b.tabel]}</span>{b.label}</span>
                  {pilih !== b.id && <Btn size="sm" v="ghost" onClick={() => setPilih(b.id)}>Hapus</Btn>}
                </div>
                {pilih === b.id && (
                  <div className="mt-2">
                    <HapusItem terbuka aksi={hapusBarisProduksi} isian={{ tabel: b.tabel, barisId: b.id }} tombol="Hapus baris ini" testId="form-hapus-baris-produksi"
                      keterangan={`${KELOMPOK[b.tabel]} ${b.label} bakal dihapus permanen${b.tabel === "lot_allocations" ? ", beratnya balik ke sisa lot" : ""}.`}
                      konfirmasi={`Yakin hapus ${b.label} dari ${p.kode}?`} onSelesai={() => setPilih(null)} onBatal={() => setPilih(null)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <HapusItem aksi={hapusProduksi} isian={{ produksiId: p.id, lini }} tombol={`Hapus produksi ${p.kode}`} testId="form-hapus-produksi"
          keterangan={`${p.kode} bakal dihapus permanen sama semua isinya. Berat lotnya balik, dan stok hasilnya ikut kehapus kalau belum dijual atau diambil.`}
          konfirmasi={`Yakin hapus seluruh produksi ${p.kode}? Kalau cuma salah angka, pakai Koreksi aja.`} />
      </div>
    </details>
  );
}
