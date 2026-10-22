"use client";

import { useState } from "react";
import { Btn } from "@/components/ui";
import { INK } from "@/components/ui/tokens";

type Props = {
  label: string;
  pesan: React.ReactNode;
  labelYa: string;
  pending?: boolean;
  disabled?: boolean;
  full?: boolean;
  size?: "sm" | "md";
};

/* Tombol berisiko dua langkah: klik pertama hanya membuka ringkasan, klik kedua (tombol kirim form) yang menjalankan.
   Tombol "Batal" ada di baris sendiri, tidak bersebelahan dengan tombol lanjut. Dipakai di dalam <form>. */
export function KonfirmasiDua({ label, pesan, labelYa, pending, disabled, full, size }: Props) {
  const [buka, setBuka] = useState(false);
  if (!buka) return <Btn size={size} full={full} disabled={disabled || pending} onClick={() => setBuka(true)}>{label}</Btn>;
  return (
    <div role="alertdialog" aria-label="Konfirmasi" className="space-y-3 rounded-2xl p-3.5" style={{ background: "#FBF0D5" }}>
      <p className="text-[13px] font-medium" style={{ color: INK }}>{pesan}</p>
      <Btn type="submit" full disabled={pending}>{pending ? "Memproses..." : labelYa}</Btn>
      <div className="flex justify-center pt-1">
        <Btn size="sm" v="ghost" onClick={() => setBuka(false)}>Batal, kembali</Btn>
      </div>
    </div>
  );
}
