"use client";

import { useSyncExternalStore } from "react";

/* ===================================================================
 * Shared demo store. Desktop and mobile demos read and write the same
 * state; it is persisted to localStorage and mirrored across windows
 * and iframes with the `storage` event, so an action in one shows
 * up in the other.  All figures are sample data except where noted
 * "Siklus 1" (real data supplied by the owner).
 * =================================================================== */

export type Role = "Owner" | "Pembelian" | "Gudang" | "Keuangan";
export const ROLES: Role[] = ["Owner", "Pembelian", "Gudang", "Keuangan"];

export interface PO { id: string; supplier: string; kg: number; price: number; status: "Menunggu persetujuan" | "Disetujui" | "Ditolak" | "Diterima" | "Dibayar"; date: string }
export interface Approval { id: string; kind: "Pembelian" | "Gudang" | "Keuangan"; title: string; amount: string; rows: [string, string][]; warn?: string; who: string; date: string; status: "pending" | "approved" | "rejected"; ref?: string; reason?: string; adj?: number; cost?: number }
export interface Lot { id: string; po?: string; supplier: string; kg: number; left: number; qc: "Menunggu" | "Lulus" | "Ditahan"; grade: "A" | "B" | "C" | "-" }
/** Hasil produksi diisi dari timbangan; `sisa` = hasil samping. Selisih tidak pernah diisi otomatis. */
export interface Prod { id: string; lot: string; inKg: number; status: "Berjalan" | "Selesai"; yieldPct?: number; loin?: number; sisa?: number; limbah?: number; susut?: number; date: string }
export interface Titipan { id: string; customer: string; kg: number; days: number; status: "Disimpan" | "Diambil" }
export interface Sale { id: string; buyer: string; kg: number; price: number; status: "Draf" | "Dikirim" | "Lunas"; invoice?: string; date: string }
export interface Invoice { id: string; buyer: string; amount: number; due: number; status: "Belum jatuh tempo" | "Jatuh tempo" | "Terlambat" | "Lunas"; kind: "Penjualan" | "Gudang dingin"; ref?: string }
export interface Ledger { id: string; date: string; desc: string; amount: number }
export interface Booking { id: string; day: string; start: number; end: number; who: string; kg: number; kind: "Produksi" | "ABF" }
export interface Scenario { id: string; name: string; fish: number; price: number; machine: number; impact: number }
export interface LogItem { id: string; t: string; who: string; text: string }

export interface State {
  v: number;
  ctr: Record<string, number>;
  pos: PO[]; approvals: Approval[]; lots: Lot[]; prods: Prod[];
  stock: { loin: number; sisa: number };
  titipan: Titipan[]; sales: Sale[]; invoices: Invoice[]; ledger: Ledger[];
  bookings: Booking[]; scenarios: Scenario[]; log: LogItem[];
  closed: boolean;
}

export const COLD_CAP = 17500;
export const COLD_OWN_BASE = 2000;
export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const SUPPLIERS: { name: string; last: number }[] = [{ name: "Pemasok A", last: 44500 }, { name: "Pemasok B", last: 45000 }, { name: "Pemasok C", last: 46200 }];
export const BUYERS = ["Pembeli A", "Pembeli B", "Pembeli C"];

/** Examples taken from the owner's "Monitor Dana Fasilitas Bungus" workbook (JURNAL, ASET, REKAP BULANAN). */
export const MONITOR = {
  docs: { total: 243, notaOk: 243, buktiOk: 164, buktiMissing: 55, buktiNa: 24 },
  categories: [["Bangunan & Renovasi", 337010000], ["Mesin ABF", 327000000], ["Mesin produksi", 249864102], ["Refrigerasi", 223320000], ["Chiller room", 180000000]] as [string, number][],
  months: [["Agustus 2026", 60, 1264349128], ["September 2026", 76, 657207652], ["Oktober 2026", 105, 238984100]] as [string, number, number][],
  assets: [
    ["Air Blast Freezer (ABF) ±4 Ton", "Mesin", 327000000, "Terpasang"],
    ["Sistem Cold Storage", "Refrigerasi", 125000000, "Terpasang"],
    ["Pintu Insulated Cold Storage", "Fasilitas", 72500000, "Terpasang"],
    ["Lantai Produksi Epoxy Food Grade", "Bangunan", 105000000, "Selesai"],
    ["Sistem Kelistrikan Utama", "Kelistrikan", 73000000, "Finalisasi"],
    ["Ruang Sortir Grading dan Packing", "Bangunan", 35000000, "Selesai"],
  ] as [string, string, number, string][],
};

/** Siklus 1: real data supplied by the owner. */
export const SIKLUS1 = {
  yields: [63.1, 61.3, 61.4, 63.7, 52.2, 64.4, 70.2, 63.5, 63.3, 63.3, 60.2],
  kg: [44, 55, 39, 58, 27, 64, 23, 34, 59, 42, 36],
  costs: [["Ikan utuh", 59.7, 22130000], ["Ongkos kirim", 29.9, 11080000], ["Penanganan", 5.0, 1850000], ["Kemasan", 4.9, 1820000], ["Jasa", 0.5, 200000]] as [string, number, number][],
  total: 37080000, profit: 4503468, margin: 10.8, fishKg: 481, yieldAvg: 62.6,
};

/** Who may do what. */
export const PERMS: Record<string, Role[]> = {
  "po.create": ["Owner", "Pembelian"],
  "approval.decide": ["Owner"],
  "po.receive": ["Owner", "Gudang"],
  "po.pay": ["Owner", "Keuangan"],
  "lot.qc": ["Owner", "Gudang"],
  "prod.start": ["Owner", "Gudang"],
  "prod.finish": ["Owner", "Gudang"],
  "sale.create": ["Owner", "Pembelian", "Keuangan"],
  "sale.ship": ["Owner", "Gudang", "Pembelian"],
  "inv.pay": ["Owner", "Keuangan"],
  "inv.remind": ["Owner", "Keuangan", "Pembelian"],
  "tit.in": ["Owner", "Gudang"],
  "tit.out": ["Owner", "Gudang", "Keuangan"],
  "stock.adjust": ["Owner", "Gudang"],
  "cost.add": ["Owner", "Keuangan"],
  "book.add": ["Owner", "Gudang"],
  "book.move": ["Owner", "Gudang"],
  "book.remove": ["Owner", "Gudang"],
  "scen.save": ["Owner", "Keuangan"],
  "scen.remove": ["Owner", "Keuangan"],
  "month.close": ["Owner", "Keuangan"],
  "month.reopen": ["Owner"],
};
export const can = (role: Role, a: string) => (PERMS[a] ?? ROLES).includes(role);
export const who = (a: string) => (PERMS[a] ?? []).filter((r) => r !== "Owner").join("/") || "Owner";

export const coldUsed = (s: State) => s.titipan.filter((t) => t.status === "Disimpan").reduce((a, t) => a + t.kg, 0) + COLD_OWN_BASE + s.stock.loin + s.stock.sisa;
export const cash = (s: State) => s.ledger.reduce((a, l) => a + l.amount, 0);
export const receivable = (s: State) => s.invoices.filter((i) => i.status !== "Lunas").reduce((a, i) => a + i.amount, 0);
export const freshKg = (s: State) => s.lots.reduce((a, l) => a + l.left, 0);
export const coldTariff = (days: number) => 75 * Math.max(days, 10);
/** Berat yang belum jelas ke mana: ikan masuk dikurangi semua komponen yang ditimbang. */
export const selisih = (p: Pick<Prod, "inKg" | "loin" | "sisa" | "limbah" | "susut">) => +(p.inKg - (p.loin ?? 0) - (p.sisa ?? 0) - (p.limbah ?? 0) - (p.susut ?? 0)).toFixed(3);
export const YIELD_PLAN = 60, YIELD_MIN = 40, YIELD_MAX = 80;
export const kgf = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 3 });

export const rp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
export const jt = (n: number, d = 1) => "Rp" + (n / 1e6).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }) + " jt";

const initial = (): State => ({
  v: 5, ctr: { PO: 2, APV: 103, LOT: 2, PRD: 1, SAL: 3, INV: 3, KAS: 5, CST: 2, BK: 7, SC: 0, L: 3 },
  pos: [
    { id: "PO-0001", supplier: "Pemasok B", kg: 640, price: 45000, status: "Diterima", date: "9 Okt" },
    { id: "PO-0002", supplier: "Pemasok A", kg: 640, price: 45500, status: "Menunggu persetujuan", date: "12 Okt" },
  ],
  approvals: [
    { id: "APV-0101", kind: "Pembelian", title: "Beli ikan 640 kg", amount: "Rp29,1 jt", who: "Pembelian", date: "12 Okt", status: "pending", ref: "PO-0002", rows: [["Pemasok", "Pemasok A"], ["Harga per kg", "Rp45.500"], ["Dibanding terakhir", "+Rp1.000"]], warn: "Harga naik Rp1.000/kg dari pembelian terakhir." },
    { id: "APV-0102", kind: "Gudang", title: "Koreksi stok loin −20 kg", amount: "−20 kg", who: "Gudang", date: "12 Okt", status: "pending", adj: -20, rows: [["Penyebab", "Susut timbang"], ["Diajukan oleh", "Tim gudang"], ["Tanggal", "12 Okt"]] },
    { id: "APV-0103", kind: "Keuangan", title: "Locker VIP VG-420", amount: "Rp3,6 jt", who: "Keuangan", date: "13 Okt", status: "pending", cost: 3600000, rows: [["Pemasok", "PT. WIRA AGUNG JAYA ABADI"], ["Kategori", "Furnitur & peralatan kantor"], ["Nota", "Lengkap"]] },
  ],
  lots: [
    { id: "LOT-001", po: "Siklus 1", supplier: "Pemasok A", kg: 481, left: 0, qc: "Lulus", grade: "A" },
    { id: "LOT-002", po: "PO-0001", supplier: "Pemasok B", kg: 640, left: 640, qc: "Ditahan", grade: "-" },
  ],
  // Siklus 1 dari owner: loin 300,94 kg, hasil samping terjual 87 kg (toro, kepala, tetelan coklat, daging kerok),
  // 65 kg tulang tengah dan tetelan hitam dibuang. Susut belum ditimbang.
  prods: [{ id: "PRD-0001", lot: "LOT-001", inKg: 481, status: "Selesai", yieldPct: 62.6, loin: 300.94, sisa: 87, limbah: 65, date: "3 Okt" }],
  stock: { loin: 120, sisa: 65 },
  titipan: [
    { id: "CST-0001", customer: "Pelanggan A", kg: 8000, days: 6, status: "Disimpan" },
    { id: "CST-0002", customer: "Pelanggan B", kg: 5000, days: 12, status: "Disimpan" },
  ],
  sales: [
    { id: "SAL-0001", buyer: "Pembeli A", kg: 105, price: 135000, status: "Dikirim", invoice: "INV-0001", date: "1 Okt" },
    { id: "SAL-0002", buyer: "Pembeli B", kg: 72, price: 135000, status: "Dikirim", invoice: "INV-0002", date: "28 Sep" },
    { id: "SAL-0003", buyer: "Pembeli A", kg: 56, price: 135000, status: "Dikirim", invoice: "INV-0003", date: "20 Sep" },
  ],
  invoices: [
    { id: "INV-0001", buyer: "Pembeli A", amount: 14200000, due: 20, status: "Belum jatuh tempo", kind: "Penjualan", ref: "SAL-0001" },
    { id: "INV-0002", buyer: "Pembeli B", amount: 9800000, due: 0, status: "Jatuh tempo", kind: "Penjualan", ref: "SAL-0002" },
    { id: "INV-0003", buyer: "Pembeli A", amount: 7600000, due: -6, status: "Terlambat", kind: "Penjualan", ref: "SAL-0003" },
  ],
  ledger: [
    { id: "KAS-001", date: "1 Okt", desc: "Saldo awal (contoh)", amount: 250000000 },
    { id: "KAS-002", date: "3 Okt", desc: "Bayar pemasok PO-0001", amount: -28800000 },
    { id: "KAS-003", date: "1 Okt", desc: "Rak Italiano · PT. WIRA AGUNG JAYA ABADI", amount: -2000000 },
    { id: "KAS-004", date: "1 Okt", desc: "Kursi Chairman AC1040 · PT. WIRA AGUNG JAYA ABADI", amount: -2350000 },
    { id: "KAS-005", date: "1 Okt", desc: "Engsel tengah Solid · KUNCI MAS", amount: -786000 },
  ],
  bookings: [
    { id: "BK-1", day: "Senin", start: 8, end: 17, who: "CV DUS", kg: 3000, kind: "Produksi" },
    { id: "BK-2", day: "Selasa", start: 8, end: 17, who: "PT SNS", kg: 3000, kind: "Produksi" },
    { id: "BK-3", day: "Rabu", start: 8, end: 17, who: "CV DUS", kg: 3000, kind: "Produksi" },
    { id: "BK-4", day: "Kamis", start: 8, end: 17, who: "PT SNS", kg: 3000, kind: "Produksi" },
    { id: "BK-5", day: "Jumat", start: 8, end: 17, who: "CV DUS", kg: 3000, kind: "Produksi" },
    { id: "BK-6", day: "Sabtu", start: 8, end: 12, who: "PT SNS", kg: 1333, kind: "Produksi" },
    { id: "BK-7", day: "Senin", start: 10, end: 11, who: "Pesanan ABF", kg: 500, kind: "ABF" },
  ],
  scenarios: [],
  log: [
    { id: "L-3", t: "13 Okt", who: "Keuangan", text: "Mengajukan biaya kirim Rp1,2 jt" },
    { id: "L-2", t: "12 Okt", who: "Pembelian", text: "Mengajukan PO-0002 (640 kg, Pemasok A)" },
    { id: "L-1", t: "9 Okt", who: "Gudang", text: "Menerima PO-0001 menjadi LOT-002 (640 kg), mutu ditahan" },
  ],
  closed: false,
});

/* ----------------------------------------------------------- store core */
const KEY = "katalis-demo-state-v5";
let state: State = initial();
let loaded = false;
const listeners = new Set<() => void>();
const SERVER = initial();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s?.v === 5) state = s; } } catch { /* ignore */ }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try { state = JSON.parse(e.newValue); emit(); } catch { /* ignore */ }
  });
}
function emit() { listeners.forEach((l) => l()); }
function commit(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  emit();
}
export function useDemoState(): State {
  return useSyncExternalStore(
    (cb) => { load(); listeners.add(cb); return () => listeners.delete(cb); },
    () => { load(); return state; },
    () => SERVER,
  );
}
export const resetDemo = () => commit(initial());

/* ------------------------------------------------------------- actions */
export type Action =
  | { a: "po.create"; supplier: string; kg: number; price: number }
  | { a: "approval.decide"; id: string; ok: boolean; reason?: string }
  | { a: "po.receive"; id: string }
  | { a: "po.pay"; id: string }
  | { a: "lot.qc"; id: string; qc: "Lulus" | "Ditahan"; grade: "A" | "B" | "C" | "-" }
  | { a: "prod.start"; lot: string }
  | { a: "prod.finish"; id: string; loin: number; sisa: number; limbah: number; susut: number }
  | { a: "sale.create"; buyer: string; kg: number; price: number }
  | { a: "sale.ship"; id: string }
  | { a: "inv.pay"; id: string }
  | { a: "inv.remind"; id: string }
  | { a: "tit.in"; customer: string; kg: number }
  | { a: "tit.out"; id: string; days: number }
  | { a: "stock.adjust"; kg: number; reason: string }
  | { a: "cost.add"; desc: string; amount: number }
  | { a: "book.add"; day: string; start: number; end: number; who: string; kg: number; kind: "Produksi" | "ABF" }
  | { a: "book.move"; id: string }
  | { a: "book.remove"; id: string }
  | { a: "scen.save"; name: string; fish: number; price: number; machine: number; impact: number }
  | { a: "scen.remove"; id: string }
  | { a: "month.close" }
  | { a: "month.reopen" };

export interface Result { ok: boolean; msg: string; go?: string }
const bad = (msg: string): Result => ({ ok: false, msg });
const fail = (r: Result | null) => r;

export const closeChecks = (s: State) => [
  { ok: s.approvals.every((a) => a.status !== "pending"), text: "Semua persetujuan sudah diputuskan" },
  { ok: s.pos.every((p) => p.status !== "Diterima"), text: "Semua ikan yang diterima sudah dibayar" },
  { ok: s.invoices.every((i) => i.status !== "Terlambat"), text: "Tidak ada tagihan yang terlambat" },
];

export function overlaps(b: { day: string; start: number; end: number; id?: string }, all: Booking[]) {
  return all.filter((x) => x.day === b.day && x.id !== b.id && b.start < x.end && x.start < b.end);
}

export function act(role: Role, a: Action): Result {
  load();
  if (!can(role, a.a)) return bad(`Peran ${role} tidak bisa melakukan ini. Butuh: ${PERMS[a.a].join(", ")}.`);
  const s: State = JSON.parse(JSON.stringify(state));
  const nid = (p: string) => `${p}-${String((s.ctr[p] = (s.ctr[p] ?? 0) + 1)).padStart(p === "LOT" ? 3 : 4, "0")}`;
  const log = (text: string) => s.log.unshift({ id: nid("L"), t: "14 Okt", who: role, text });
  const locked = () => (s.closed ? bad("Periode sudah ditutup. Buka kembali dulu (Owner).") : null);
  let res: Result = { ok: true, msg: "Berhasil" };

  switch (a.a) {
    case "po.create": {
      if (a.kg <= 0 || a.price <= 0) return bad("Jumlah dan harga harus lebih dari nol.");
      const id = nid("PO");
      s.pos.unshift({ id, supplier: a.supplier, kg: a.kg, price: a.price, status: "Menunggu persetujuan", date: "14 Okt" });
      const last = SUPPLIERS.find((x) => x.name === a.supplier)?.last ?? a.price;
      const total = a.kg * a.price;
      s.approvals.unshift({ id: nid("APV"), kind: "Pembelian", title: `Beli ikan ${a.kg} kg`, amount: jt(total), who: role, date: "14 Okt", status: "pending", ref: id, rows: [["Pemasok", a.supplier], ["Harga per kg", rp(a.price)], ["Dibanding terakhir", (a.price - last >= 0 ? "+" : "−") + rp(Math.abs(a.price - last))]], warn: a.price > last ? `Harga naik ${rp(a.price - last)}/kg dari pembelian terakhir.` : undefined });
      log(`Mengajukan ${id} (${a.kg} kg, ${a.supplier})`);
      res = { ok: true, msg: `${id} diajukan, menunggu persetujuan Owner` };
      break;
    }
    case "approval.decide": {
      const ap = s.approvals.find((x) => x.id === a.id);
      if (!ap || ap.status !== "pending") return bad("Persetujuan ini sudah diputuskan.");
      if (a.ok) {
        if (ap.kind === "Keuangan" && ap.cost) { const l = locked(); if (l) return l; s.ledger.unshift({ id: nid("KAS"), date: "14 Okt", desc: ap.title, amount: -ap.cost }); }
        if (ap.kind === "Gudang" && ap.adj !== undefined) s.stock.loin = Math.max(0, +(s.stock.loin + ap.adj).toFixed(1));
        if (ap.kind === "Pembelian" && ap.ref) { const p = s.pos.find((x) => x.id === ap.ref); if (p) p.status = "Disetujui"; }
      } else if (ap.kind === "Pembelian" && ap.ref) { const p = s.pos.find((x) => x.id === ap.ref); if (p) p.status = "Ditolak"; }
      ap.status = a.ok ? "approved" : "rejected"; ap.reason = a.reason;
      log(`${a.ok ? "Menyetujui" : "Menolak"} ${ap.title}${a.reason ? ` (${a.reason})` : ""}`);
      res = { ok: true, msg: `${a.ok ? "Disetujui" : "Ditolak"}: ${ap.title}` };
      break;
    }
    case "po.receive": {
      const p = s.pos.find((x) => x.id === a.id);
      if (!p || p.status !== "Disetujui") return bad("Hanya pembelian yang sudah disetujui yang bisa diterima.");
      const id = nid("LOT");
      s.lots.push({ id, po: p.id, supplier: p.supplier, kg: p.kg, left: p.kg, qc: "Menunggu", grade: "-" });
      p.status = "Diterima";
      log(`Menerima ${p.id} menjadi ${id} (${p.kg} kg), menunggu cek mutu`);
      res = { ok: true, msg: `Ikan diterima sebagai ${id}. Lanjut cek mutu`, go: "mutu" };
      break;
    }
    case "po.pay": {
      const p = s.pos.find((x) => x.id === a.id);
      if (!p || p.status !== "Diterima") return bad("Hanya pembelian yang sudah diterima yang bisa dibayar.");
      const l = locked(); if (l) return l;
      s.ledger.unshift({ id: nid("KAS"), date: "14 Okt", desc: `Bayar pemasok ${p.id}`, amount: -p.kg * p.price });
      p.status = "Dibayar";
      log(`Membayar ${p.id} ${jt(p.kg * p.price)}`);
      res = { ok: true, msg: `${p.id} dibayar ${jt(p.kg * p.price)}` };
      break;
    }
    case "lot.qc": {
      const l = s.lots.find((x) => x.id === a.id); if (!l) return bad("Lot tidak ditemukan.");
      l.qc = a.qc; l.grade = a.qc === "Lulus" ? (a.grade === "-" ? "A" : a.grade) : "-";
      log(`Cek mutu ${l.id}: ${a.qc}${a.qc === "Lulus" ? ` kelas ${l.grade}` : ""}`);
      res = { ok: true, msg: `${l.id}: ${a.qc}` };
      break;
    }
    case "prod.start": {
      const l = s.lots.find((x) => x.id === a.lot);
      if (!l || l.qc !== "Lulus" || l.left <= 0) return bad("Lot harus lulus cek mutu dan masih punya stok.");
      const id = nid("PRD");
      s.prods.unshift({ id, lot: l.id, inKg: l.left, status: "Berjalan", date: "14 Okt" });
      log(`Memulai ${id} dari ${l.id} (${l.left} kg)`);
      l.left = 0;
      res = { ok: true, msg: `${id} dimulai` };
      break;
    }
    case "prod.finish": {
      const p = s.prods.find((x) => x.id === a.id);
      if (!p || p.status !== "Berjalan") return bad("Produksi ini tidak sedang berjalan.");
      const parts = [a.loin, a.sisa, a.limbah, a.susut];
      if (parts.some((n) => Number.isNaN(n) || n < 0)) return bad("Isi semua berat hasil timbangan (boleh 0).");
      if (!(a.loin > 0)) return bad("Berat loin harus lebih dari nol.");
      const gap = selisih({ inKg: p.inKg, ...a });
      if (gap < 0) return bad(`Total timbangan melebihi ikan masuk ${kgf(-gap)} kg. Periksa lagi beratnya.`);
      p.loin = a.loin; p.sisa = a.sisa; p.limbah = a.limbah; p.susut = a.susut;
      p.yieldPct = +((a.loin / p.inKg) * 100).toFixed(1); p.status = "Selesai";
      s.stock.loin = +(s.stock.loin + p.loin).toFixed(3); s.stock.sisa = +(s.stock.sisa + p.sisa).toFixed(3);
      const warn = p.yieldPct < YIELD_MIN || p.yieldPct > YIELD_MAX ? ` Hasil ${kgf(p.yieldPct)}% di luar batas wajar ${YIELD_MIN}–${YIELD_MAX}%, perlu diperiksa.` : "";
      log(`Menyelesaikan ${p.id}: ${kgf(p.loin)} kg loin (${kgf(p.yieldPct)}%), ${kgf(p.sisa)} kg hasil samping, selisih belum jelas ${kgf(gap)} kg`);
      res = { ok: true, msg: `${p.id} selesai: +${kgf(p.loin)} kg loin masuk stok.${gap > 0 ? ` Selisih ${kgf(gap)} kg belum jelas.` : ""}${warn}`, go: "stok" };
      break;
    }
    case "sale.create": {
      if (a.kg <= 0 || a.price <= 0) return bad("Berat dan harga harus lebih dari nol.");
      const reserved = s.sales.filter((x) => x.status === "Draf").reduce((t, x) => t + x.kg, 0);
      if (a.kg + reserved > s.stock.loin) return bad(`Stok loin tidak cukup (tersedia ${(s.stock.loin - reserved).toFixed(1)} kg).`);
      const id = nid("SAL");
      s.sales.unshift({ id, buyer: a.buyer, kg: a.kg, price: a.price, status: "Draf", date: "14 Okt" });
      log(`Membuat pesanan ${id}: ${a.kg} kg untuk ${a.buyer}`);
      res = { ok: true, msg: `Pesanan ${id} dibuat` };
      break;
    }
    case "sale.ship": {
      const x = s.sales.find((q) => q.id === a.id);
      if (!x || x.status !== "Draf") return bad("Pesanan ini sudah dikirim.");
      if (x.kg > s.stock.loin) return bad("Stok loin tidak cukup untuk dikirim.");
      s.stock.loin = +(s.stock.loin - x.kg).toFixed(1);
      const iid = nid("INV");
      s.invoices.unshift({ id: iid, buyer: x.buyer, amount: x.kg * x.price, due: 14, status: "Belum jatuh tempo", kind: "Penjualan", ref: x.id });
      x.status = "Dikirim"; x.invoice = iid;
      log(`Mengirim ${x.id} (${x.kg} kg) dan menerbitkan ${iid}`);
      res = { ok: true, msg: `${x.id} dikirim, tagihan ${iid} terbit` };
      break;
    }
    case "inv.pay": {
      const i = s.invoices.find((q) => q.id === a.id);
      if (!i || i.status === "Lunas") return bad("Tagihan ini sudah lunas.");
      const l = locked(); if (l) return l;
      s.ledger.unshift({ id: nid("KAS"), date: "14 Okt", desc: `Pembayaran ${i.id} (${i.buyer})`, amount: i.amount });
      i.status = "Lunas";
      const sale = s.sales.find((q) => q.id === i.ref); if (sale) sale.status = "Lunas";
      log(`Mencatat pembayaran ${i.id} ${jt(i.amount)}`);
      res = { ok: true, msg: `${i.id} lunas, kas bertambah ${jt(i.amount)}` };
      break;
    }
    case "inv.remind": {
      const i = s.invoices.find((q) => q.id === a.id); if (!i) return bad("Tagihan tidak ditemukan.");
      log(`Mengirim pengingat ${i.id} ke ${i.buyer}`);
      res = { ok: true, msg: `Pengingat ${i.id} terkirim ke ${i.buyer}` };
      break;
    }
    case "tit.in": {
      if (a.kg <= 0) return bad("Berat harus lebih dari nol.");
      if (coldUsed(s) + a.kg > COLD_CAP) return bad(`Gudang dingin penuh. Sisa ruang ${(COLD_CAP - coldUsed(s)).toLocaleString("id-ID")} kg.`);
      const id = nid("CST");
      s.titipan.push({ id, customer: a.customer, kg: a.kg, days: 0, status: "Disimpan" });
      log(`Menerima titipan ${id}: ${a.kg} kg dari ${a.customer}`);
      res = { ok: true, msg: `Titipan ${id} diterima` };
      break;
    }
    case "tit.out": {
      const t = s.titipan.find((q) => q.id === a.id);
      if (!t || t.status !== "Disimpan") return bad("Titipan tidak ditemukan.");
      const amount = t.kg * coldTariff(a.days);
      const iid = nid("INV");
      s.invoices.unshift({ id: iid, buyer: t.customer, amount, due: 14, status: "Belum jatuh tempo", kind: "Gudang dingin", ref: t.id });
      t.status = "Diambil"; t.days = a.days;
      log(`Titipan ${t.id} diambil setelah ${a.days} hari, tagihan ${iid} ${jt(amount)}`);
      res = { ok: true, msg: `Tagihan ${iid} ${jt(amount)} terbit untuk ${t.customer}` };
      break;
    }
    case "stock.adjust": {
      if (!a.kg) return bad("Isi jumlah koreksi.");
      s.approvals.unshift({ id: nid("APV"), kind: "Gudang", title: `Koreksi stok loin ${a.kg > 0 ? "+" : "−"}${Math.abs(a.kg)} kg`, amount: `${a.kg > 0 ? "+" : "−"}${Math.abs(a.kg)} kg`, who: role, date: "14 Okt", status: "pending", adj: a.kg, rows: [["Penyebab", a.reason || "-"], ["Diajukan oleh", role], ["Tanggal", "14 Okt"]] });
      log(`Mengajukan koreksi stok loin ${a.kg} kg`);
      res = { ok: true, msg: "Koreksi diajukan, menunggu persetujuan Owner" };
      break;
    }
    case "cost.add": {
      if (a.amount <= 0 || !a.desc.trim()) return bad("Isi keterangan dan jumlah biaya.");
      s.approvals.unshift({ id: nid("APV"), kind: "Keuangan", title: a.desc, amount: jt(a.amount), who: role, date: "14 Okt", status: "pending", cost: a.amount, rows: [["Untuk", a.desc], ["Diajukan oleh", role], ["Tanggal", "14 Okt"]] });
      log(`Mengajukan biaya ${a.desc} ${jt(a.amount)}`);
      res = { ok: true, msg: "Biaya diajukan, menunggu persetujuan Owner" };
      break;
    }
    case "book.add": {
      if (a.end <= a.start) return bad("Jam selesai harus setelah jam mulai.");
      const id = nid("BK");
      s.bookings.push({ id, day: a.day, start: a.start, end: a.end, who: a.who, kg: a.kg, kind: a.kind });
      const c = overlaps({ day: a.day, start: a.start, end: a.end, id }, s.bookings);
      log(`Menambah jadwal ${a.who} ${a.day} ${a.start}.00-${a.end}.00`);
      res = { ok: true, msg: c.length ? `Jadwal tersimpan, tapi bentrok dengan ${c.map((x) => x.who).join(", ")}` : "Jadwal tersimpan tanpa bentrok" };
      break;
    }
    case "book.move": {
      const b = s.bookings.find((x) => x.id === a.id); if (!b) return bad("Jadwal tidak ditemukan.");
      const dur = b.end - b.start;
      for (const d of DAYS) for (let st = 8; st + dur <= 17; st++) {
        if (overlaps({ day: d, start: st, end: st + dur, id: b.id }, s.bookings).length === 0) {
          b.day = d; b.start = st; b.end = st + dur; log(`Memindahkan ${b.who} ke ${d} ${st}.00`);
          return commitResult(s, { ok: true, msg: `${b.who} dipindah ke ${d} ${st}.00-${st + dur}.00, tidak bentrok` });
        }
      }
      return bad("Tidak ada slot kosong minggu ini.");
    }
    case "book.remove": {
      s.bookings = s.bookings.filter((x) => x.id !== a.id);
      log("Menghapus satu jadwal");
      res = { ok: true, msg: "Jadwal dihapus" };
      break;
    }
    case "scen.save": {
      s.scenarios.unshift({ id: nid("SC"), name: a.name || "Skenario", fish: a.fish, price: a.price, machine: a.machine, impact: a.impact });
      log(`Menyimpan skenario ${a.name}`);
      res = { ok: true, msg: "Skenario disimpan" };
      break;
    }
    case "scen.remove": {
      s.scenarios = s.scenarios.filter((x) => x.id !== a.id);
      res = { ok: true, msg: "Skenario dihapus" };
      break;
    }
    case "month.close": {
      const bad1 = closeChecks(s).filter((c) => !c.ok);
      if (bad1.length) return bad(`Belum bisa tutup buku: ${bad1.map((c) => c.text.toLowerCase()).join("; ")}.`);
      s.closed = true; log("Menutup buku Oktober 2026");
      res = { ok: true, msg: "Buku Oktober 2026 ditutup. Catatan terkunci." };
      break;
    }
    case "month.reopen": {
      s.closed = false; log("Membuka kembali buku Oktober 2026");
      res = { ok: true, msg: "Buku dibuka kembali" };
      break;
    }
  }
  return commitResult(s, res);
}

function commitResult(s: State, r: Result): Result { commit(s); return r; }
void fail;
