"use client";

import { Btn, Card, Inner } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";

/* Batas galat area aplikasi. Pesan teknis tidak ditampilkan; pesan data sudah berbahasa Indonesia dan aman. */
export default function Galat({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const aman = error.message.startsWith("Gagal memuat");
  return (
    <div className="mx-auto max-w-[680px]">
      <Card title="Halaman tidak bisa dimuat">
        <Inner className="space-y-3">
          <p className="text-[14px] leading-relaxed" style={{ color: INK }}>{aman ? error.message : "Terjadi gangguan. Coba lagi sebentar."}</p>
          {error.digest && <p className="text-[12px]" style={{ color: MUTED }}>Kode gangguan: {error.digest}</p>}
          <Btn onClick={reset}>Coba lagi</Btn>
        </Inner>
      </Card>
    </div>
  );
}
