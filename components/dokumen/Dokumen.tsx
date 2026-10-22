"use client";

import { useRef, useState, useTransition } from "react";
import { Btn, Icon } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { catatDokumen, urlDokumen } from "@/lib/actions/pembelian";
import { ukuranBerkas, waktu } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Dokumen, JenisDokumen, RefDokumen } from "@/lib/types/pembelian";

/* Berkas diunggah langsung dari browser ke bucket privat (dengan sesi pengguna, jadi kebijakan Storage berlaku),
   lalu dicatat lewat Server Action. Batas 10 MB; foto dari HP sudah JPEG. */

const TIPE = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const BATAS = 10 * 1024 * 1024;
export const LABEL_JENIS: Record<JenisDokumen, string> = {
  nota: "Nota", bukti_transfer: "Bukti transfer", surat_jalan: "Surat jalan", foto_timbangan: "Foto timbangan", lainnya: "Lainnya",
};

const namaAman = (n: string) => n.normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").slice(-80) || "berkas";

export function Unggah({ refTabel, refId, jenis, label = "Lampirkan berkas" }: { refTabel: RefDokumen; refId: string; jenis: JenisDokumen; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, mulai] = useTransition();

  const pilih = (file: File | undefined) => {
    if (!file) return;
    setGalat(null);
    const tipe = TIPE.find((t) => t === file.type);
    if (!tipe) return setGalat("Pilih foto (JPEG, PNG, WebP) atau PDF.");
    if (file.size > BATAS) return setGalat("Berkas lebih dari 10 MB. Kecilkan dulu.");
    mulai(async () => {
      const supabase = createClient();
      const path = `${refTabel}/${refId}/${crypto.randomUUID()}-${namaAman(file.name)}`;
      const { error } = await supabase.storage.from("dokumen").upload(path, file, { contentType: file.type, upsert: false });
      if (error) return setGalat("Unggah gagal. Periksa sinyal lalu coba lagi.");
      const r = await catatDokumen({ refTabel, refId, jenis, path, namaAsli: file.name, ukuran: file.size, tipe });
      if (r?.error) setGalat(r.error);
      if (input.current) input.current.value = "";
    });
  };

  return (
    <div>
      <input ref={input} type="file" accept={TIPE.join(",")} className="sr-only" aria-label={label} onChange={(e) => pilih(e.target.files?.[0])} />
      <Btn size="sm" v="light" disabled={sibuk} onClick={() => input.current?.click()}>
        <Icon n="plus" s={14} />{sibuk ? "Mengunggah..." : label}
      </Btn>
      {galat && <div role="alert" className="mt-2 text-[12.5px]" style={{ color: "#A8322B" }}>{galat}</div>}
    </div>
  );
}

export function DaftarDokumen({ dokumen, kosong = "Belum ada berkas." }: { dokumen: Dokumen[]; kosong?: string }) {
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, mulai] = useTransition();
  const buka = (id: string) => {
    setGalat(null);
    // Jendela dibuka dulu (dalam klik) supaya tidak diblokir; alamatnya diisi setelah server menjawab.
    const w = window.open("", "_blank");
    mulai(async () => {
      const r = await urlDokumen(id);
      if (r.url && w) w.location.href = r.url;
      else {
        w?.close();
        setGalat(r.error ?? "Berkas tidak bisa dibuka.");
      }
    });
  };
  if (dokumen.length === 0) return <p className="text-[13px]" style={{ color: MUTED }}>{kosong}</p>;
  return (
    <div>
      <ul className="space-y-1.5">
        {dokumen.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-medium" style={{ color: INK }}>{LABEL_JENIS[d.jenis]} · {d.nama_asli}</div>
              <div className="text-[12px]" style={{ color: MUTED }}>{ukuranBerkas(d.ukuran)} · {waktu(d.dibuat_pada)}</div>
            </div>
            <Btn size="sm" v="light" disabled={sibuk} onClick={() => buka(d.id)}>Buka</Btn>
          </li>
        ))}
      </ul>
      {galat && <div role="alert" className="mt-2 text-[12.5px]" style={{ color: "#A8322B" }}>{galat}</div>}
    </div>
  );
}
