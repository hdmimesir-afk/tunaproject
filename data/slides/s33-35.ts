import { C, txt, rect, ell, ln, footer } from "@/lib/kit";
import type { El } from "@/lib/scene";
import { TOTAL_SLIDES } from "@/data/figures";
import { mk } from "./_h";

/** Green top half with the brand wordmark, big bold title bottom-left, short text bottom-right. */
const opener = (id: number, tag: string, title: string, lead: string, body: string): El[] => [
  rect(0, 0, 1920, 540, C.ocean),
  txt(1000, 186, 800, 130, "Dar Dev", 96, { color: C.white, weight: 800, align: "r", va: "m", lh: 1 }),
  txt(1000, 312, 800, 40, "KATALIS ERP", 26, { color: C.aquaOnDark, weight: 600, align: "r", va: "m", lh: 1 }),
  txt(120, 590, 820, 330, title, 100, { color: C.ink, weight: 800, lh: 1.04, va: "m" }),
  txt(1000, 640, 800, 120, lead, 38, { color: C.ink, weight: 500, lh: 1.3 }),
  txt(1000, 790, 760, 150, body, 26, { color: C.muted, lh: 1.45 }),
  ...footer(id, TOTAL_SLIDES, undefined, false, tag),
];

export const s34 = mk(
  34,
  "Pembatas — Masalah yang kami lihat",
  opener(34, "Masalah", "Masalah\nyang kami\nlihat.", "Tujuh masalah dari data usaha Anda", "Dari data Siklus 1 dan proposal Katalis. Tiap masalah punya fitur yang menjawabnya."),
  "Pembatas bagian pertama: masalah yang terlihat dari data Siklus 1 dan proposal.",
  [{ kind: "proposed", ref: "Susunan deck", claim: "Slide pembatas bagian masalah" }],
);

export const s35 = mk(
  35,
  "Pembatas — Paket dan tahapan",
  opener(35, "Paket dan tahapan", "Paket dan\ntahapan\npengerjaan.", "Isi paket dan cara kerjanya", "Dibangun bertahap, mulai dari diskusi kebutuhan. Harga dibahas setelah fitur disepakati."),
  "Pembatas bagian kedua: paket, tahapan, layanan, dan langkah berikutnya.",
  [{ kind: "proposed", ref: "Susunan deck", claim: "Slide pembatas bagian paket dan tahapan" }],
);

/* ---------------- OUTLINE ---------------- */
const items33 = ["Masalah yang kami lihat", "Dashboard owner", "Fitur yang menjawab masalah", "Paket dan tahapan", "Langkah berikutnya"];
export const s33 = mk(
  33,
  "Isi penawaran",
  [
    txt(120, 90, 1000, 150, "Isi penawaran", 92, { color: C.ink, weight: 800, lh: 1.05, va: "m" }),
    txt(120, 250, 1100, 110, "Aplikasi untuk mengurus seluruh usaha perikanan Katalis, dari pembelian ikan sampai laporan keuangan.", 28, { color: C.muted, lh: 1.4 }),
    ...items33.flatMap((t, i): El[] => {
      const y = 420 + i * 100;
      return [
        txt(120, y, 120, 70, String(i + 1).padStart(2, "0"), 44, { color: i % 2 ? C.teal : C.ocean, weight: 800, va: "m", lh: 1 }),
        txt(250, y, 1100, 70, t, 44, { color: C.ink, weight: 500, va: "m", lh: 1 }),
        ln(120, y + 86, 1800, y + 86, C.border, 1.5),
      ];
    }),
    ...footer(33, TOTAL_SLIDES, undefined, false, "Isi penawaran"),
  ],
  "Daftar isi penawaran: masalah, dashboard owner, fitur penjawab, paket dan tahapan, langkah berikutnya.",
  [{ kind: "proposed", ref: "Susunan deck", claim: "Slide daftar isi" }],
);
