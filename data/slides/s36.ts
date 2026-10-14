import { C, txt, rect } from "@/lib/kit";
import type { El } from "@/lib/scene";
import { R, O, X, L } from "@/lib/phone";
import { D, glass, logoMark, pill, stat } from "@/lib/demoMock";
import { mk, std } from "./_h";

/**
 * Dashboard Owner mockup that mirrors the interactive desktop demo (/demo/desktop):
 * dark sidebar, frosted cards, soft stat tiles, black accents.
 */
const head: El[] = [
  txt(120, 170, 1100, 40, "Satu layar untuk memantau, memutuskan, dan mengendalikan seluruh usaha.", 28, { color: C.muted, weight: 500, va: "m", lh: 1 }),
  rect(1560, 172, 240, 40, C.ice, { r: 20 }),
  txt(1560, 172, 240, 40, "Data contoh", 18, { color: C.teal, weight: 700, align: "c", va: "m", lh: 1 }),
];

const els: El[] = [];
const FX = 120, FY = 262, FW = 1680, FH = 690;
els.push(R(FX, FY, FW, FH, D.ink, { r: 30 }));

// ---- sidebar
els.push({ t: "img", x: FX + 18, y: FY + 18, w: 196, h: 80, src: "/brand/katalis-logo-white.png" });
const nav = ["Dashboard", "Persetujuan", "Pembelian", "Produksi", "Mutu & Asal", "Stok", "Penjualan", "Gudang Dingin", "Keuangan", "Jadwal", "Skenario"];
nav.forEach((n, i) => {
  const y = FY + 108 + i * 48;
  const on = i === 0;
  if (on) els.push(R(FX + 12, y, 208, 42, "#EEF0F5", { r: 21 }));
  els.push(R(FX + 32, y + 12, 18, 18, undefined, { r: 5, line: on ? D.ink : "#9AA2AB", lw: 2 }));
  els.push(X(FX + 62, y, 140, 42, n, 17, { color: on ? D.ink : "#C6CCD3", weight: on ? 700 : 400, va: "m", lh: 1 }));
  if (i === 1) els.push(R(FX + 180, y + 10, 30, 22, D.red, { r: 11 }), X(FX + 180, y + 10, 30, 22, "3", 13, { color: "#fff", weight: 700, align: "c", va: "m", lh: 1 }));
});

// ---- main panel
const MX = FX + 232, MY = FY + 8, MW = FW - 240, MH = FH - 16;
els.push(R(MX, MY, MW, MH, D.bg, { r: 28 }));
const ix = MX + 28, iw = MW - 56;
// top bar
els.push(R(ix, MY + 16, 440, 44, "#fff", { r: 22 }), O(ix + 16, MY + 28, 20, 20, undefined, { line: D.muted, lw: 2.2 }), X(ix + 50, MY + 16, 380, 44, "Cari modul, mis. Pembelian", 16, { color: D.muted, va: "m", lh: 1 }));
els.push(R(ix + iw - 400, MY + 16, 290, 44, "#fff", { r: 22 }), X(ix + iw - 384, MY + 16, 130, 44, "Masuk sebagai", 15, { color: D.muted, va: "m", lh: 1 }), R(ix + iw - 262, MY + 22, 112, 32, "#F1F2F6", { r: 16 }), X(ix + iw - 250, MY + 22, 90, 32, "Owner  ▾", 15, { color: D.ink, weight: 600, va: "m", lh: 1 }));
els.push(O(ix + iw - 98, MY + 16, 44, 44, "#fff"), R(ix + iw - 84, MY + 30, 16, 16, undefined, { r: 8, line: D.ink, lw: 2 }), O(ix + iw - 62, MY + 12, 20, 20, D.red), X(ix + iw - 62, MY + 12, 20, 20, "3", 12, { color: "#fff", weight: 700, align: "c", va: "m", lh: 1 }));
els.push(O(ix + iw - 44, MY + 16, 44, 44, D.ink), X(ix + iw - 44, MY + 16, 44, 44, "O", 18, { color: "#fff", weight: 700, align: "c", va: "m", lh: 1 }));
// title
els.push(X(ix, MY + 74, 500, 22, "Selamat pagi, 14 Oktober 2026", 15, { color: D.muted, va: "m", lh: 1 }), X(ix, MY + 96, 600, 44, "Dashboard Owner", 34, { color: D.ink, weight: 700, va: "m", lh: 1 }));
// stats 4 x 2
const tw = (iw - 3 * 14) / 4, th = 100;
const stats: [string, string, boolean][] = [
  ["1.121 kg", "Total ikan diterima", false], ["62,6%", "Hasil olahan, rencana 60%", false], ["Rp216,1 jt", "Saldo kas", false], ["Rp31,6 jt", "Piutang pembeli", false],
  ["3", "Perlu keputusan", true], ["1", "Tagihan terlambat", true], ["87%", "Gudang dingin terisi", false], ["120 kg", "Stok loin siap jual", false],
];
stats.forEach(([v, l, w], i) => {
  els.push(...stat(ix + (i % 4) * (tw + 14), MY + 148 + Math.floor(i / 4) * (th + 10), tw, th, v, l, 32, 15, w));
});
// cards row
const cy = MY + 148 + 2 * (th + 10) + 2, ch = MY + MH - cy - 14;
const cw = (iw - 2 * 14) / 3;
const cardTitle = (x: number, t: string) => [glass(x, cy, cw, ch, 26), X(x + 20, cy + 10, cw - 120, 32, t, 17, { color: D.ink, weight: 600, va: "m", lh: 1 })];
// 1 decisions
const c1 = ix;
els.push(...cardTitle(c1, "Perlu Keputusan"), R(c1 + cw - 84, cy + 11, 66, 30, "#fff", { r: 15 }), X(c1 + cw - 84, cy + 11, 66, 30, "Semua", 13, { color: D.ink, weight: 600, align: "c", va: "m", lh: 1 }));
[["Beli ikan 640 kg", "Rp29,1 jt", "Pembelian"], ["Koreksi stok loin", "−20 kg", "Gudang"]].forEach(([a, b, k], i) => {
  const y = cy + 48 + i * 82;
  els.push(R(c1 + 12, y, cw - 24, 76, D.tile, { r: 20 }), X(c1 + 28, y + 8, cw - 190, 24, a, 15.5, { color: D.ink, weight: 600, va: "m", lh: 1 }), X(c1 + 28, y + 36, 160, 28, b, 20, { color: D.ink, weight: 500, va: "m", lh: 1 }));
  els.push(...pill(c1 + cw - 150, y + 8, 114, k, k === "Pembelian" ? "amber" : "blue", 24, 12.5));
  els.push(R(c1 + cw - 166, y + 40, 66, 30, "#fff", { r: 15 }), X(c1 + cw - 166, y + 40, 66, 30, "Tolak", 13, { color: D.ink, weight: 600, align: "c", va: "m", lh: 1 }), R(c1 + cw - 94, y + 40, 76, 30, D.ink, { r: 15 }), X(c1 + cw - 94, y + 40, 76, 30, "Setujui", 13, { color: "#fff", weight: 600, align: "c", va: "m", lh: 1 }));
});
// 2 attention
const c2 = ix + cw + 14;
els.push(...cardTitle(c2, "Perlu Perhatian"));
[["INV-0003 terlambat 6 hari", "Pembeli A · Rp7,6 jt", D.red, "Tindak lanjut"], ["LOT-002 belum lulus cek mutu", "Pemasok B · 640 kg", "#D9902B", "Cek mutu"], ["55 transaksi belum ada bukti", "Dokumen keuangan · Monitor Dana", D.red, "Lengkapi"], ["Gudang dingin 87% terisi", "Sisa ruang 2.315 kg", "#D9902B", "Lihat"]].forEach(([a, b, c, btn], i) => {
  const y = cy + 48 + i * 50;
  els.push(R(c2 + 12, y, cw - 24, 45, D.tile, { r: 16 }), O(c2 + 24, y + 17, 10, 10, c as string), X(c2 + 44, y + 4, cw - 190, 22, a as string, 13.5, { color: D.ink, weight: 600, va: "m", lh: 1 }), X(c2 + 44, y + 25, cw - 190, 16, b as string, 11.5, { color: D.muted, va: "m", lh: 1 }));
  els.push(R(c2 + cw - 124, y + 8, 104, 29, "#fff", { r: 15 }), X(c2 + cw - 124, y + 8, 104, 29, btn as string, 12, { color: D.ink, weight: 600, align: "c", va: "m", lh: 1 }));
});
// 3 chart (Siklus 1)
const c3 = ix + 2 * (cw + 14);
els.push(...cardTitle(c3, "Hasil Tiap Ekor"));
const ys = [63.1, 61.3, 61.4, 63.7, 52.2, 64.4, 70.2, 63.5, 63.3, 63.3, 60.2], lo = 50, hi = 72, gx0 = c3 + 40, gx1 = c3 + cw - 26, gy0 = cy + 62, gy1 = cy + ch - 36;
const px = (i: number) => gx0 + (i / 10) * (gx1 - gx0);
const py = (v: number) => gy1 - ((v - lo) / (hi - lo)) * (gy1 - gy0);
els.push(R(c3 + 12, cy + 48, cw - 24, ch - 60, D.tile, { r: 20 }));
[50, 60, 70].forEach((g) => els.push(L(gx0, py(g), gx1, py(g), "#D5D9E2", 1.2), X(c3 + 14, py(g) - 9, 20, 18, String(g), 11, { color: D.muted, align: "r", va: "m", lh: 1 })));
els.push({ t: "line", x1: gx0, y1: py(60), x2: gx1, y2: py(60), color: "#8A929C", lw: 1.6, dash: true });
for (let i = 0; i < ys.length - 1; i++) els.push(L(px(i), py(ys[i]), px(i + 1), py(ys[i + 1]), D.ink, 2.6));
ys.forEach((v, i) => els.push(O(px(i) - 5, py(v) - 5, 10, 10, v < 55 ? "#D9902B" : "#fff", { line: v < 55 ? "#D9902B" : D.ink, lw: 2 })));
[["001", 0], ["006", 5], ["011", 10]].forEach(([l, i]) => els.push(X(px(i as number) - 20, gy1 + 8, 40, 16, l as string, 11, { color: D.muted, align: "c", va: "m", lh: 1 })));
els.push(X(c3 + cw - 150, cy + 14, 130, 22, "Garis putus: rencana 60%", 11.5, { color: D.muted, align: "r", va: "m", lh: 1 }));

export const s36 = mk(
  36,
  "Dashboard Owner",
  [...std(36, "Dashboard Owner", "Dashboard Owner: semua aktivitas terkendali"), ...head, ...els],
  "Contoh tampilan dashboard owner, sama dengan demo desktop (/demo/desktop). Hasil olahan 62,6% dan hasil tiap ekor berasal dari data Siklus 1; angka lain adalah contoh.",
  [
    { kind: "proposed", ref: "Brief — dashboard owner", claim: "Dashboard sebagai pusat kendali: angka utama, persetujuan, peringatan, dan perbandingan hasil dengan rencana" },
    { kind: "source", ref: "Data Siklus 1 dari owner (ringkasan web)", claim: "Hasil olahan 62,6% (rencana 60%); hasil olahan per ekor 63,1; 61,3; 61,4; 63,7; 52,2; 64,4; 70,2; 63,5; 63,3; 63,3; 60,2" },
    { kind: "illustrative", ref: "Contoh tampilan", claim: "Total ikan, saldo kas, piutang, persetujuan, peringatan, dan isi gudang dingin adalah data contoh" },
  ],
);
