"use client";

import { useState, useTransition } from "react";
import { Btn, Field, TextIn } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import { tambahPemasok } from "@/lib/actions/pembelian";
import type { Opsi } from "@/lib/types/pembelian";

/** Isian pemasok baru di dalam form lain. Bukan form terpisah (form nggak boleh bersarang), jadi dikirim lewat tombol. */
export function PemasokBaru({ onDibuat, onBatal }: { onDibuat: (p: Opsi) => void; onBatal: () => void }) {
  const [nama, setNama] = useState("");
  const [kontak, setKontak] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, mulai] = useTransition();
  const simpan = () => mulai(async () => {
    setGalat(null);
    const r = await tambahPemasok({ nama, kontak });
    if (r.error || !r.id) return setGalat(r.error ?? "Pemasok gagal disimpan.");
    onDibuat({ id: r.id, label: r.label ?? nama.trim() });
  });
  return (
    <div className="space-y-2.5 rounded-2xl bg-white p-3">
      <p className="text-[12.5px] font-medium" style={{ color: MUTED }}>Pemasok atau nelayan baru</p>
      {galat && <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{galat}</div>}
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Nama"><TextIn value={nama} onChange={(e) => setNama(e.target.value)} maxLength={120} /></Field>
        <Field label="Kontak" hint="Boleh kosong."><TextIn value={kontak} onChange={(e) => setKontak(e.target.value)} maxLength={120} /></Field>
      </div>
      <div className="flex gap-2">
        <Btn size="sm" disabled={sibuk || nama.trim() === ""} onClick={simpan}>{sibuk ? "Menyimpan..." : "Simpan pemasok"}</Btn>
        <Btn size="sm" v="ghost" onClick={onBatal}>Batal</Btn>
      </div>
    </div>
  );
}
