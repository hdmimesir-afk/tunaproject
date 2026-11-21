"use client";

import { useState } from "react";
import { Icon, Modal } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";

/** Bagikan teks laporan: di HP pakai menu Bagikan bawaan (WhatsApp ada di situ), di laptop disalin ke clipboard.
    Kalau browser nolak dua-duanya, teksnya ditampilin di jendela kecil biar bisa disalin manual. */
export function BagikanLaporan({ teks }: { teks: string }) {
  const [status, setStatus] = useState<"" | "disalin">("");
  const [manual, setManual] = useState(false);
  const bagikan = async () => {
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "Laporan KATALIS", text: teks });
        return;
      }
      await navigator.clipboard.writeText(teks);
      setStatus("disalin");
      setTimeout(() => setStatus(""), 2500);
    } catch (e) {
      // Batal dari menu Bagikan itu pilihan pengguna, bukan galat.
      if ((e as Error)?.name !== "AbortError") setManual(true);
    }
  };
  return (
    <>
      <button type="button" onClick={bagikan} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium text-white" style={{ background: INK }}>
        <Icon n="send" s={14} c="#fff" />
        <span aria-live="polite">{status === "disalin" ? "Udah disalin" : "Bagikan"}</span>
      </button>
      {manual && (
        <Modal title="Teks laporan" onClose={() => setManual(false)}>
          <p className="mb-2 text-[12.5px]" style={{ color: MUTED }}>Browser ini nggak ngizinin nyalin otomatis. Pilih semua teksnya, salin, terus tempel di WhatsApp.</p>
          <textarea readOnly value={teks} rows={Math.min(14, teks.split("\n").length + 1)} onFocus={(e) => e.currentTarget.select()} autoFocus aria-label="Teks laporan"
            className="w-full rounded-2xl border border-[#E2E4EA] bg-white p-3 text-[13px] leading-relaxed outline-none" style={{ color: INK }} />
        </Modal>
      )}
    </>
  );
}
