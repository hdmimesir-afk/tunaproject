"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui";
import { INK } from "@/components/ui/tokens";

/* Pasang KATALIS ERP di HP. Tombol cuma muncul kalau browser emang bisa masang langsung (Chrome/Edge di Android dan
   laptop, lewat beforeinstallprompt, atau navigator.install di browser yang udah punya). Di iPhone/iPad (Safari nggak
   punya tombol pasang dari halaman) yang muncul petunjuk singkat. Kalau udah kepasang, nggak muncul apa-apa. */

type PromptPasang = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Status = "kosong" | "bisa" | "ios";

let simpanan: PromptPasang | null = null;
const pendengar = new Set<() => void>();
const kabari = () => pendengar.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    simpanan = e as PromptPasang;
    kabari();
  });
  window.addEventListener("appinstalled", () => {
    simpanan = null;
    kabari();
  });
}

const punyaInstall = () => typeof navigator !== "undefined" && typeof (navigator as Navigator & { install?: unknown }).install === "function";
const terpasang = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function bacaStatus(): Status {
  if (terpasang()) return "kosong";
  if (punyaInstall() || simpanan) return "bisa";
  if (ios()) return "ios";
  return "kosong";
}
function langganan(f: () => void) {
  pendengar.add(f);
  return () => { pendengar.delete(f); };
}

async function pasang() {
  try {
    const nav = navigator as Navigator & { install?: () => Promise<void> };
    if (nav.install) {
      // Dipanggil langsung dari klik supaya izin dari ketukan pengguna nggak hilang.
      await nav.install();
    } else if (simpanan) {
      const p = simpanan;
      simpanan = null; // sekali pakai
      await p.prompt();
      await p.userChoice;
    }
  } catch {
    // Batal pasang itu pilihan pengguna, tombol tetap ada buat coba lagi kalau browser ngizinin.
  } finally {
    kabari();
  }
}

/** Daftarin service worker (cuma di build produksi, biar mode dev nggak nyimpen file lama). */
export function DaftarSw() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}

/** Tombol "Pasang aplikasi": versi menu samping (gelap) dan versi lembar Menu di HP (terang). */
export function PasangAplikasi({ varian, ringkas }: { varian: "samping" | "hp"; ringkas?: boolean }) {
  const status = useSyncExternalStore(langganan, bacaStatus, () => "kosong" as Status);
  if (status === "kosong") return null;

  if (status === "ios") {
    if (varian === "samping") return null;
    return (
      <p className="mb-4 rounded-2xl bg-white px-4 py-3 text-[12.5px] leading-snug" style={{ color: INK }}>
        <b className="font-semibold">Pasang di iPhone:</b> buka di Safari, tekan tombol Bagikan, terus pilih Tambah ke Layar Utama.
      </p>
    );
  }

  if (varian === "hp") {
    return (
      <button type="button" onClick={pasang} className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl text-[13.5px] font-semibold text-white" style={{ background: INK }}>
        <Icon n="download" s={18} c="#fff" />Pasang aplikasi di HP ini
      </button>
    );
  }
  return (
    <button type="button" onClick={pasang} title={ringkas ? "Pasang aplikasi" : undefined} aria-label={ringkas ? "Pasang aplikasi" : undefined}
      className={`flex w-full items-center rounded-full text-[14px] text-[#C6CCD3] transition hover:bg-white/[0.07] ${ringkas ? "mx-auto h-11 w-11 justify-center" : "gap-3 px-3.5 py-2.5"}`}>
      <Icon n="download" s={19} c="#9AA2AB" />
      {!ringkas && <span className="truncate">Pasang aplikasi</span>}
    </button>
  );
}
