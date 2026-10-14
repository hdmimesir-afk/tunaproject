"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUYERS, COLD_CAP, DAYS, MONITOR, PERMS, ROLES, SIKLUS1, SUPPLIERS, closeChecks, coldTariff, coldUsed, cash, freshKg, jt, overlaps, receivable, rp, useDemoState,
  type Approval, type Booking, type Invoice, type Lot, type PO, type Prod, type Sale, type Titipan,
} from "@/lib/demo/store";
import { Bar, Btn, Card, Field, GBtn, INK, Icon, Inner, MUTED, GREEN, Modal, NumIn, Pill, SelectIn, Stat, TextIn, DataList, downloadCSV, useDemo, useModal, useRun, type IconName } from "./ui";

export const MODULES: { id: string; label: string; icon: IconName; hint: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid", hint: "Ringkasan seluruh usaha" },
  { id: "asisten", label: "Asisten AI", icon: "sparkles", hint: "Tanya dengan kalimat biasa" },
  { id: "pembelian", label: "Pembelian", icon: "cart", hint: "Beli ikan dan bayar pemasok" },
  { id: "produksi", label: "Produksi", icon: "factory", hint: "Olah ikan, catat hasil" },
  { id: "mutu", label: "Mutu & Asal", icon: "shield", hint: "Cek mutu dan lacak asal" },
  { id: "stok", label: "Stok", icon: "box", hint: "Stok dan koreksi" },
  { id: "penjualan", label: "Penjualan", icon: "truck", hint: "Pesanan, kirim, tagihan" },
  { id: "gudang", label: "Gudang Dingin", icon: "snow", hint: "Titipan dan tagihan simpan" },
  { id: "keuangan", label: "Keuangan", icon: "cash", hint: "Kas, biaya, tutup buku" },
  { id: "jadwal", label: "Jadwal", icon: "calendar", hint: "Giliran mitra dan ABF" },
  { id: "skenario", label: "Skenario", icon: "flask", hint: "Coba perubahan harga" },
  { id: "akses", label: "Akses", icon: "lock", hint: "Siapa boleh apa" },
  { id: "laporan", label: "Laporan", icon: "chart", hint: "Laporan dan unduh CSV" },
];

const Grid = ({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) => {
  const { compact } = useDemo();
  return <div className={`grid gap-3.5 ${compact ? "grid-cols-1" : cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>{children}</div>;
};
const Stats = ({ children, n = 4 }: { children: React.ReactNode; n?: 3 | 4 }) => {
  const { compact } = useDemo();
  return <div className={`grid gap-2.5 ${compact ? "grid-cols-2" : n === 3 ? "grid-cols-3" : "grid-cols-4"}`}>{children}</div>;
};
const Head = ({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) => {
  const { compact } = useDemo();
  if (compact) return right ? <div className="flex gap-2 [&>*]:flex-1">{right}</div> : null;
  return (
    <div className="mb-5 flex items-end justify-between">
      <div><div className="text-[13px]" style={{ color: MUTED }}>{sub}</div><h1 className="text-[28px] font-semibold leading-tight" style={{ color: INK }}>{title}</h1></div>
      <div className="flex gap-2">{right}</div>
    </div>
  );
};
const Stack = ({ children }: { children: React.ReactNode }) => <div className="space-y-3.5">{children}</div>;

/* ------------------------------------------------------------ charts */
export function YieldChart({ h = 150 }: { h?: number }) {
  const Y = SIKLUS1.yields, W = 360, lo = 50, hi = 72, top = 12, bot = h - 24;
  const x = (i: number) => 14 + (i / 10) * (W - 28);
  const y = (v: number) => bot - ((v - lo) / (hi - lo)) * (bot - top);
  const pts = Y.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full">
      <defs><linearGradient id="yg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={GREEN} stopOpacity=".28" /><stop offset="1" stopColor={GREEN} stopOpacity="0" /></linearGradient></defs>
      <line x1="14" x2={W - 14} y1={y(60)} y2={y(60)} stroke="#C9CDD4" strokeDasharray="4 4" />
      <text x="14" y={y(60) + 14} fontSize="10" fill={MUTED}>Rencana 60%</text>
      <polygon points={`${x(0)},${bot} ${pts} ${x(10)},${bot}`} fill="url(#yg)" />
      <polyline points={pts} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {Y.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={v < 55 ? 4.5 : 3} fill={v < 55 ? "#D9902B" : "#fff"} stroke={v < 55 ? "#D9902B" : INK} strokeWidth="1.8" />)}
      {[0, 5, 10].map((i) => <text key={i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="10" fill={MUTED}>{String(i + 1).padStart(3, "0")}</text>)}
    </svg>
  );
}
function Donut({ pct }: { pct: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 90 90" width="96" height="96">
      <circle cx="45" cy="45" r={r} fill="none" stroke="#E4E6EC" strokeWidth="12" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={pct > 90 ? "#D9902B" : INK} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90 45 45)" />
      <text x="45" y="50" textAnchor="middle" fontSize="16" fontWeight="600" fill={INK}>{pct}%</text>
    </svg>
  );
}

/* ----------------------------------------------------------- approvals */
export function RejectModal({ a, onClose }: { a: Approval; onClose: () => void }) {
  const run = useRun();
  return (
    <Modal title="Kenapa ditolak?" onClose={onClose}>
      <div className="text-[13px]" style={{ color: MUTED }}>{a.title}</div>
      <div className="space-y-2">
        {["Harga terlalu tinggi", "Jumlah tidak sesuai", "Perlu info tambahan"].map((w) => (
          <button key={w} type="button" onClick={() => { run({ a: "approval.decide", id: a.id, ok: false, reason: w }); onClose(); }} className="flex h-12 w-full items-center rounded-2xl bg-white px-4 text-left text-[14px] transition active:scale-[0.98]" style={{ color: INK }}>{w}</button>
        ))}
      </div>
    </Modal>
  );
}
export function ApprovalItem({ a }: { a: Approval }) {
  const run = useRun();
  const [rej, setRej] = useModal<Approval>();
  const [open, setOpen] = useState(false);
  return (
    <Inner>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><div className="truncate text-[14px] font-medium" style={{ color: INK }}>{a.title}</div><div className="text-[12px]" style={{ color: MUTED }}>{a.id} · {a.who} · {a.date}</div></div>
        <Pill t={a.kind} />
      </div>
      <div className="mt-2 text-[22px] tracking-tight" style={{ color: INK }}>{a.amount}</div>
      {open && (
        <div className="mt-2 divide-y divide-[#E4E6EC] border-t border-[#E4E6EC]">
          {a.rows.map(([k, v]) => <div key={k} className="flex justify-between py-2 text-[12.5px]"><span style={{ color: MUTED }}>{k}</span><span className="font-medium" style={{ color: INK }}>{v}</span></div>)}
        </div>
      )}
      {a.warn && <div className="mt-2 rounded-2xl px-3 py-2 text-[12px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>{a.warn}</div>}
      <div className="mt-3 flex gap-2">
        <Btn size="sm" v="ghost" onClick={() => setOpen(!open)}>{open ? "Tutup" : "Rincian"}</Btn>
        <div className="flex-1" />
        <GBtn perm="approval.decide" size="sm" v="light" onClick={() => setRej(a)}>Tolak</GBtn>
        <GBtn perm="approval.decide" size="sm" onClick={() => run({ a: "approval.decide", id: a.id, ok: true })}>Setujui</GBtn>
      </div>
      {rej && <RejectModal a={rej} onClose={() => setRej(null)} />}
    </Inner>
  );
}

/* ------------------------------------------------------------ dashboard */
export function Dashboard() {
  const s = useDemoState();
  const { go, compact } = useDemo();
  const pending = s.approvals.filter((a) => a.status === "pending");
  const late = s.invoices.filter((i) => i.status === "Terlambat");
  const held = s.lots.filter((l) => l.qc !== "Lulus");
  const conflicts = s.bookings.filter((b) => overlaps(b, s.bookings).length > 0);
  const cold = Math.round((coldUsed(s) / COLD_CAP) * 100);
  const fin = s.prods.filter((p) => p.status === "Selesai" && p.yieldPct);
  const yieldAvg = fin.length ? fin.reduce((a, p) => a + p.yieldPct! * p.inKg, 0) / fin.reduce((a, p) => a + p.inKg, 0) : 0;
  const alerts: { t: string; sub: string; go: string; btn: string; tone: "red" | "amber" }[] = [];
  late.forEach((i) => alerts.push({ t: `${i.id} terlambat ${Math.abs(i.due)} hari`, sub: `${i.buyer} · ${jt(i.amount)}`, go: "penjualan", btn: "Tindak lanjut", tone: "red" }));
  held.forEach((l) => alerts.push({ t: `${l.id} belum lulus cek mutu`, sub: `${l.supplier} · ${l.kg} kg`, go: "mutu", btn: "Cek mutu", tone: "amber" }));
  conflicts.length && alerts.push({ t: `${conflicts.length} jadwal bentrok`, sub: conflicts.map((c) => c.who).join(", "), go: "jadwal", btn: "Atur jadwal", tone: "red" });
  alerts.push({ t: `${MONITOR.docs.buktiMissing} transaksi belum ada bukti transfer`, sub: "Dokumen keuangan · Monitor Dana", go: "keuangan", btn: "Lengkapi", tone: "red" });
  cold >= 85 && alerts.push({ t: `Gudang dingin ${cold}% terisi`, sub: `Sisa ruang ${(COLD_CAP - coldUsed(s)).toLocaleString("id-ID")} kg`, go: "gudang", btn: "Lihat", tone: "amber" });
  return (
    <Stack>
      <Head title="Dashboard Owner" sub="Selamat pagi, 14 Oktober 2026" right={<Btn size="sm" onClick={() => go("asisten")}><Icon n="sparkles" s={15} c="#fff" />Tanya Asisten AI</Btn>} />
      <Stats>
        <Stat value={`${s.lots.reduce((a, l) => a + l.kg, 0).toLocaleString("id-ID")} kg`} label="Total ikan diterima" />
        <Stat value={yieldAvg ? `${yieldAvg.toFixed(1).replace(".", ",")}%` : "-"} label="Hasil olahan, rencana 60%" />
        <Stat value={jt(cash(s))} label="Saldo kas" onClick={() => go("keuangan")} />
        <Stat value={jt(receivable(s))} label="Piutang pembeli" onClick={() => go("penjualan")} />
        <Stat value={String(pending.length)} label="Perlu keputusan" tone={pending.length ? "warn" : "ok"} onClick={() => go("setuju")} />
        <Stat value={String(late.length)} label="Tagihan terlambat" tone={late.length ? "warn" : "ok"} onClick={() => go("penjualan")} />
        <Stat value={`${cold}%`} label="Gudang dingin terisi" onClick={() => go("gudang")} />
        <Stat value={`${(s.stock.loin).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg`} label="Stok loin siap jual" onClick={() => go("stok")} />
      </Stats>
      <Grid>
        <Card title="Perlu Keputusan" right={<Btn size="sm" v="light" onClick={() => go("setuju")}>Semua</Btn>}>
          <div className="space-y-2.5">
            {pending.length === 0 && <Inner><div className="py-2 text-center text-[13px]" style={{ color: MUTED }}>Semua sudah diputuskan.</div></Inner>}
            {pending.slice(0, compact ? 2 : 3).map((a) => <ApprovalItem key={a.id} a={a} />)}
          </div>
        </Card>
        <Card title="Perlu Perhatian">
          <div className="space-y-2.5">
            {alerts.length === 0 && <Inner><div className="py-2 text-center text-[13px]" style={{ color: MUTED }}>Tidak ada yang perlu ditindak.</div></Inner>}
            {alerts.map((a, i) => (
              <Inner key={i} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.tone === "red" ? "#E0524A" : "#D9902B" }} />
                  <div className="min-w-0"><div className="truncate text-[13.5px] font-medium" style={{ color: INK }}>{a.t}</div><div className="truncate text-[12px]" style={{ color: MUTED }}>{a.sub}</div></div>
                </div>
                <Btn size="sm" v="light" onClick={() => go(a.go)}>{a.btn}</Btn>
              </Inner>
            ))}
          </div>
        </Card>
      </Grid>
      <Grid>
        <Card title="Hasil Tiap Ekor · Siklus 1"><Inner><YieldChart /><div className="mt-1 text-[12px]" style={{ color: MUTED }}>Ekor 005 hanya 52,2% (terendah). Tertinggi ekor 007, 70,2%. Data nyata Siklus 1.</div></Inner></Card>
        <Card title="Aktivitas Terbaru" right={<Btn size="sm" v="light" onClick={() => go("laporan")}>Riwayat</Btn>}>
          <div className="space-y-2">
            {s.log.slice(0, 6).map((l) => (
              <Inner key={l.id} className="!p-3"><div className="text-[13px]" style={{ color: INK }}>{l.text}</div><div className="mt-0.5 text-[11.5px]" style={{ color: MUTED }}>{l.t} · {l.who}</div></Inner>
            ))}
          </div>
        </Card>
      </Grid>
    </Stack>
  );
}

/* -------------------------------------------------------------- setuju */
export function Persetujuan() {
  const s = useDemoState();
  const pending = s.approvals.filter((a) => a.status === "pending");
  const decided = s.approvals.filter((a) => a.status !== "pending");
  return (
    <Stack>
      <Head title="Persetujuan" sub={`${pending.length} menunggu keputusan`} />
      <Grid>
        <Card title="Menunggu Keputusan">
          <div className="space-y-2.5">
            {pending.length === 0 && <Inner><div className="py-3 text-center text-[13px]" style={{ color: MUTED }}>Semua sudah diputuskan. Ajukan pembelian atau biaya baru untuk melihat alurnya.</div></Inner>}
            {pending.map((a) => <ApprovalItem key={a.id} a={a} />)}
          </div>
        </Card>
        <Card title="Sudah Diputuskan">
          <DataList rows={decided} empty="Belum ada keputusan." cols={[
            { h: "Hal", r: (a) => a.title }, { h: "Jumlah", r: (a) => a.amount }, { h: "Hasil", r: (a) => <Pill t={a.status === "approved" ? "Disetujui" : "Ditolak"} /> },
          ]} />
        </Card>
      </Grid>
    </Stack>
  );
}

/* ----------------------------------------------------------- pembelian */
function POForm({ onClose }: { onClose: () => void }) {
  const run = useRun();
  const [sup, setSup] = useState(SUPPLIERS[0].name);
  const [kg, setKg] = useState(500);
  const last = SUPPLIERS.find((x) => x.name === sup)!.last;
  const [price, setPrice] = useState(last);
  return (
    <Modal title="Buat pembelian" onClose={onClose} footer={<><Btn v="light" full onClick={onClose}>Batal</Btn><Btn full onClick={() => { const r = run({ a: "po.create", supplier: sup, kg, price }); if (r.ok) onClose(); }}>Ajukan</Btn></>}>
      <Field label="Pemasok"><SelectIn value={sup} onChange={(v) => { setSup(v); setPrice(SUPPLIERS.find((x) => x.name === v)!.last); }} options={SUPPLIERS.map((x) => x.name)} /></Field>
      <Field label="Berat (kg)"><NumIn value={kg} onChange={setKg} /></Field>
      <Field label="Harga per kg (Rp)" hint={`Pembelian terakhir ${rp(last)}/kg`}><NumIn value={price} onChange={setPrice} /></Field>
      <Inner><div className="text-[12px]" style={{ color: MUTED }}>Total</div><div className="text-[24px] tracking-tight" style={{ color: INK }}>{rp((kg || 0) * (price || 0))}</div>{price > last && <div className="mt-1 text-[12px]" style={{ color: "#8A5A00" }}>Harga naik {rp(price - last)}/kg dari terakhir.</div>}</Inner>
    </Modal>
  );
}
export function Pembelian() {
  const s = useDemoState();
  const run = useRun();
  const [form, setForm] = useModal();
  return (
    <Stack>
      <Head title="Pembelian" sub="Beli ikan dan bayar pemasok" right={<GBtn perm="po.create" onClick={() => setForm(true)}><Icon n="plus" s={16} c="#fff" />Buat pembelian</GBtn>} />
      <Card title="Daftar Pembelian">
        <DataList rows={s.pos} cols={[
          { h: "PO", r: (p: PO) => <>{p.id} · {p.supplier}</> }, { h: "Berat", r: (p) => `${p.kg} kg`, right: true }, { h: "Harga/kg", r: (p) => rp(p.price), right: true },
          { h: "Total", r: (p) => jt(p.kg * p.price), right: true }, { h: "Status", r: (p) => <Pill t={p.status} /> },
        ]} actions={(p) => (
          <>
            {p.status === "Disetujui" && <GBtn perm="po.receive" size="sm" onClick={() => run({ a: "po.receive", id: p.id })}>Terima ikan</GBtn>}
            {p.status === "Diterima" && <GBtn perm="po.pay" size="sm" onClick={() => run({ a: "po.pay", id: p.id })}>Bayar</GBtn>}
            {p.status === "Menunggu persetujuan" && <span className="text-[12px]" style={{ color: MUTED }}>Menunggu Owner</span>}
          </>
        )} />
      </Card>
      <Card title="Pemasok & Harga Terakhir">
        <Stats n={3}>{SUPPLIERS.map((x) => <Stat key={x.name} value={rp(x.last)} label={`${x.name} per kg`} />)}</Stats>
      </Card>
      {form && <POForm onClose={() => setForm(null)} />}
    </Stack>
  );
}

/* ------------------------------------------------------------- produksi */
export function Produksi() {
  const s = useDemoState();
  const run = useRun();
  const [fin, setFin] = useModal<Prod>();
  const [y, setY] = useState(62);
  const ready = s.lots.filter((l) => l.qc === "Lulus" && l.left > 0);
  return (
    <Stack>
      <Head title="Produksi" sub="Olah ikan dan catat hasil" />
      <Grid>
        <Card title="Siap Diproduksi">
          <DataList rows={ready} empty="Belum ada ikan yang lulus cek mutu. Terima ikan di Pembelian lalu cek mutu." cols={[
            { h: "Lot", r: (l: Lot) => <>{l.id} · {l.supplier}</> }, { h: "Berat", r: (l) => `${l.left} kg` }, { h: "Kelas", r: (l) => l.grade },
          ]} actions={(l) => <GBtn perm="prod.start" size="sm" onClick={() => run({ a: "prod.start", lot: l.id })}>Mulai produksi</GBtn>} />
        </Card>
        <Card title="Hasil Tiap Ekor · Siklus 1"><Inner><YieldChart /><div className="text-[12px]" style={{ color: MUTED }}>Rata-rata 62,6%. Data nyata Siklus 1.</div></Inner></Card>
      </Grid>
      <Card title="Daftar Produksi">
        <DataList rows={s.prods} cols={[
          { h: "Produksi", r: (p: Prod) => <>{p.id} · {p.lot}</> }, { h: "Masuk", r: (p) => `${p.inKg} kg`, right: true }, { h: "Loin", r: (p) => (p.loin ? `${p.loin} kg` : "-"), right: true },
          { h: "Sisa olahan", r: (p) => (p.sisa ? `${p.sisa} kg` : "-"), right: true }, { h: "Hasil", r: (p) => (p.yieldPct ? `${p.yieldPct}%` : "-"), right: true }, { h: "Status", r: (p) => <Pill t={p.status} /> },
        ]} actions={(p) => p.status === "Berjalan" && <GBtn perm="prod.finish" size="sm" onClick={() => { setY(62); setFin(p); }}>Selesaikan</GBtn>} />
      </Card>
      {fin && (
        <Modal title={`Selesaikan ${fin.id}`} onClose={() => setFin(null)} footer={<><Btn v="light" full onClick={() => setFin(null)}>Batal</Btn><Btn full onClick={() => { const r = run({ a: "prod.finish", id: fin.id, yieldPct: y }); if (r.ok) setFin(null); }}>Simpan hasil</Btn></>}>
          <Field label="Ikan masuk"><div className="text-[18px]" style={{ color: INK }}>{fin.inKg} kg</div></Field>
          <Field label="Hasil olahan (%)" hint="Rencana 60%. Siklus 1 rata-rata 62,6%."><NumIn value={y} onChange={setY} /></Field>
          <Inner><div className="text-[12px]" style={{ color: MUTED }}>Masuk stok</div><div className="text-[22px] tracking-tight" style={{ color: INK }}>{((fin.inKg * (y || 0)) / 100).toFixed(1)} kg loin</div><div className="text-[12px]" style={{ color: MUTED }}>+ {Math.round(fin.inKg * 0.18)} kg sisa olahan</div></Inner>
        </Modal>
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------ mutu & asal */
export function Mutu() {
  const s = useDemoState();
  const run = useRun();
  const [qc, setQc] = useModal<Lot>();
  const [grade, setGrade] = useState<"A" | "B" | "C">("A");
  const [trace, setTrace] = useState("LOT-001");
  const t = s.lots.find((l) => l.id === trace) ?? s.lots[0];
  const prods = s.prods.filter((p) => p.lot === t?.id);
  const sold = s.sales.reduce((a, x) => a + x.kg, 0);
  return (
    <Stack>
      <Head title="Mutu & Asal Produk" sub="Cek mutu dan lacak asal" />
      <Card title="Cek Mutu Tiap Lot">
        <DataList rows={s.lots} cols={[
          { h: "Lot", r: (l: Lot) => <>{l.id} · {l.supplier}</> }, { h: "Berat", r: (l) => `${l.kg} kg`, right: true }, { h: "Kelas", r: (l) => l.grade }, { h: "Mutu", r: (l) => <Pill t={l.qc} /> },
        ]} actions={(l) => (
          <>
            <Btn size="sm" v="light" onClick={() => setTrace(l.id)}>Lacak</Btn>
            <GBtn perm="lot.qc" size="sm" onClick={() => { setGrade("A"); setQc(l); }}>Cek mutu</GBtn>
          </>
        )} />
      </Card>
      <Card title={`Lacak Asal · ${t?.id}`}>
        <div className={`grid gap-2.5 ${useDemo().compact ? "grid-cols-1" : "grid-cols-4"}`}>
          {[
            ["Pemasok", t ? t.supplier : "-", t?.po ?? ""],
            ["Penerimaan", t ? `${t.kg} kg` : "-", t ? `Mutu ${t.qc}, kelas ${t.grade}` : ""],
            ["Produksi", prods.length ? prods.map((p) => p.id).join(", ") : "Belum diproduksi", prods.length ? `${prods.reduce((a, p) => a + (p.loin ?? 0), 0).toFixed(1)} kg loin` : t && t.left > 0 ? `${t.left} kg menunggu` : ""],
            ["Penjualan", prods.length ? `${sold} kg terjual` : "Belum ada", prods.length ? "Asal bisa ditelusuri ke pembeli" : ""],
          ].map(([a, b, c], i) => (
            <Inner key={a}><div className="text-[11.5px]" style={{ color: MUTED }}>{i + 1}. {a}</div><div className="mt-1 text-[15px] font-medium" style={{ color: INK }}>{b}</div><div className="text-[12px]" style={{ color: MUTED }}>{c}</div></Inner>
          ))}
        </div>
      </Card>
      {qc && (
        <Modal title={`Cek mutu ${qc.id}`} onClose={() => setQc(null)} footer={<><Btn v="danger" full onClick={() => { run({ a: "lot.qc", id: qc.id, qc: "Ditahan", grade: "-" }); setQc(null); }}>Tahan</Btn><Btn full onClick={() => { run({ a: "lot.qc", id: qc.id, qc: "Lulus", grade }); setQc(null); }}>Lulus</Btn></>}>
          <div className="text-[13px]" style={{ color: MUTED }}>{qc.supplier} · {qc.kg} kg</div>
          <Field label="Kelas mutu bila lulus"><SelectIn value={grade} onChange={(v) => setGrade(v as "A" | "B" | "C")} options={["A", "B", "C"]} /></Field>
        </Modal>
      )}
    </Stack>
  );
}

/* ----------------------------------------------------------------- stok */
export function Stok() {
  const s = useDemoState();
  const [adj, setAdj] = useModal();
  const run = useRun();
  const [kg, setKg] = useState(-10);
  const [why, setWhy] = useState("Susut timbang");
  const used = coldUsed(s);
  return (
    <Stack>
      <Head title="Stok" sub="Stok milik Katalis dan titipan" right={<GBtn perm="stock.adjust" v="light" onClick={() => setAdj(true)}>Ajukan koreksi stok</GBtn>} />
      <Stats n={3}>
        <Stat value={`${freshKg(s)} kg`} label="Ikan segar belum diolah" />
        <Stat value={`${s.stock.loin.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg`} label="Loin siap jual" />
        <Stat value={`${s.stock.sisa} kg`} label="Sisa olahan" />
      </Stats>
      <Grid>
        <Card title="Isi Gudang Dingin">
          <Inner className="flex items-center gap-4">
            <Donut pct={Math.round((used / COLD_CAP) * 100)} />
            <div className="text-[12.5px]" style={{ color: MUTED }}>
              <div>Stok sendiri <b style={{ color: INK }}>{(used - s.titipan.filter((t) => t.status === "Disimpan").reduce((a, t) => a + t.kg, 0)).toLocaleString("id-ID", { maximumFractionDigits: 0 })} kg</b></div>
              <div>Titipan <b style={{ color: INK }}>{s.titipan.filter((t) => t.status === "Disimpan").reduce((a, t) => a + t.kg, 0).toLocaleString("id-ID")} kg</b></div>
              <div>Sisa ruang <b style={{ color: INK }}>{(COLD_CAP - used).toLocaleString("id-ID", { maximumFractionDigits: 0 })} kg</b></div>
            </div>
          </Inner>
        </Card>
        <Card title="Stok per Lot Ikan Segar">
          <DataList rows={s.lots} cols={[{ h: "Lot", r: (l: Lot) => `${l.id} · ${l.supplier}` }, { h: "Sisa", r: (l) => `${l.left} kg`, right: true }, { h: "Mutu", r: (l) => <Pill t={l.qc} /> }]} />
        </Card>
      </Grid>
      {adj && (
        <Modal title="Ajukan koreksi stok loin" onClose={() => setAdj(null)} footer={<><Btn v="light" full onClick={() => setAdj(null)}>Batal</Btn><Btn full onClick={() => { const r = run({ a: "stock.adjust", kg, reason: why }); if (r.ok) setAdj(null); }}>Ajukan</Btn></>}>
          <Field label="Koreksi (kg)" hint="Minus untuk mengurangi, plus untuk menambah."><NumIn value={kg} onChange={setKg} /></Field>
          <Field label="Penyebab"><SelectIn value={why} onChange={setWhy} options={["Susut timbang", "Salah catat", "Rusak", "Selisih hitung"]} /></Field>
          <div className="text-[12px]" style={{ color: MUTED }}>Koreksi baru berlaku setelah Owner menyetujui.</div>
        </Modal>
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------- penjualan */
export function Penjualan() {
  const s = useDemoState();
  const run = useRun();
  const [form, setForm] = useModal();
  const [buyer, setBuyer] = useState(BUYERS[0]);
  const [kg, setKg] = useState(50);
  const [price, setPrice] = useState(135000);
  const open = s.invoices.filter((i) => i.status !== "Lunas");
  return (
    <Stack>
      <Head title="Penjualan" sub="Pesanan, kirim, dan tagihan" right={<GBtn perm="sale.create" onClick={() => setForm(true)}><Icon n="plus" s={16} c="#fff" />Buat pesanan</GBtn>} />
      <Stats n={3}>
        <Stat value={`${s.stock.loin.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg`} label="Stok loin tersedia" />
        <Stat value={jt(receivable(s))} label="Piutang belum dibayar" />
        <Stat value={String(s.invoices.filter((i) => i.status === "Terlambat").length)} label="Tagihan terlambat" tone={s.invoices.some((i) => i.status === "Terlambat") ? "warn" : "ok"} />
      </Stats>
      <Stack>
        <Card title="Pesanan Jual">
          <DataList rows={s.sales} cols={[
            { h: "Pesanan", r: (x: Sale) => <>{x.id} · {x.buyer}</> }, { h: "Berat", r: (x) => `${x.kg} kg`, right: true }, { h: "Total", r: (x) => jt(x.kg * x.price), right: true }, { h: "Status", r: (x) => <Pill t={x.status} /> },
          ]} actions={(x) => x.status === "Draf" && <GBtn perm="sale.ship" size="sm" onClick={() => run({ a: "sale.ship", id: x.id })}>Kirim</GBtn>} />
        </Card>
        <Card title="Tagihan dan Pembayaran">
          <DataList rows={s.invoices} cols={[
            { h: "Tagihan", r: (i: Invoice) => <>{i.id} · {i.buyer}<div className="text-[11.5px]" style={{ color: MUTED }}>{i.kind}</div></> }, { h: "Jumlah", r: (i) => jt(i.amount), right: true }, { h: "Status", r: (i) => <Pill t={i.status} /> },
          ]} actions={(i) => i.status !== "Lunas" && (
            <>
              {i.status !== "Belum jatuh tempo" && <GBtn perm="inv.remind" size="sm" v="light" onClick={() => run({ a: "inv.remind", id: i.id })}>Ingatkan</GBtn>}
              <GBtn perm="inv.pay" size="sm" onClick={() => run({ a: "inv.pay", id: i.id })}>Catat bayar</GBtn>
            </>
          )} />
          {open.length === 0 && <div className="px-3 pb-2 pt-1 text-[12px]" style={{ color: MUTED }}>Semua tagihan lunas.</div>}
        </Card>
      </Stack>
      {form && (
        <Modal title="Buat pesanan jual" onClose={() => setForm(null)} footer={<><Btn v="light" full onClick={() => setForm(null)}>Batal</Btn><Btn full onClick={() => { const r = run({ a: "sale.create", buyer, kg, price }); if (r.ok) setForm(null); }}>Simpan pesanan</Btn></>}>
          <Field label="Pembeli"><SelectIn value={buyer} onChange={setBuyer} options={BUYERS} /></Field>
          <Field label="Berat (kg)" hint={`Stok loin ${s.stock.loin.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg`}><NumIn value={kg} onChange={setKg} /></Field>
          <Field label="Harga per kg (Rp, contoh)"><NumIn value={price} onChange={setPrice} /></Field>
          <Inner><div className="text-[12px]" style={{ color: MUTED }}>Total tagihan</div><div className="text-[24px] tracking-tight" style={{ color: INK }}>{rp((kg || 0) * (price || 0))}</div></Inner>
        </Modal>
      )}
    </Stack>
  );
}

/* --------------------------------------------------------- gudang dingin */
export function GudangDingin() {
  const s = useDemoState();
  const run = useRun();
  const [out, setOut] = useModal<Titipan>();
  const [days, setDays] = useState(10);
  const [inn, setInn] = useModal();
  const [cust, setCust] = useState("Pelanggan C");
  const [kg, setKg] = useState(2000);
  const used = coldUsed(s);
  return (
    <Stack>
      <Head title="Gudang Dingin" sub="Titipan pelanggan dan tagihan simpan" right={<GBtn perm="tit.in" onClick={() => setInn(true)}><Icon n="plus" s={16} c="#fff" />Terima titipan</GBtn>} />
      <Stats n={3}>
        <Stat value={`${Math.round((used / COLD_CAP) * 100)}%`} label="Gudang terisi" />
        <Stat value={`${(COLD_CAP - used).toLocaleString("id-ID", { maximumFractionDigits: 0 })} kg`} label="Sisa ruang" />
        <Stat value={`${s.titipan.filter((t) => t.status === "Disimpan").length}`} label="Titipan aktif" />
      </Stats>
      <Stack>
        <Card title="Titipan Pelanggan">
          <DataList rows={s.titipan} cols={[
            { h: "Titipan", r: (t: Titipan) => <>{t.id} · {t.customer}</> }, { h: "Berat", r: (t) => `${t.kg.toLocaleString("id-ID")} kg`, right: true }, { h: "Lama", r: (t) => `${t.days} hari`, right: true }, { h: "Status", r: (t) => <Pill t={t.status} /> },
          ]} actions={(t) => t.status === "Disimpan" && <GBtn perm="tit.out" size="sm" onClick={() => { setDays(Math.max(t.days, 1)); setOut(t); }}>Ambil & tagih</GBtn>} />
        </Card>
        <Card title="Tarif Penyimpanan">
          <Inner>
            <div className="space-y-2 text-[13px]">
              {[["Sampai 24 jam", "Rp75/kg"], ["Sampai 10 hari (minimum)", "Rp750/kg"], ["Hari ke-11", "Rp825/kg"], ["30 hari", "Rp2.250/kg"], ["ABF (pembekuan cepat)", "Rp3.500/kg"]].map(([a, b]) => (
                <div key={a} className="flex justify-between"><span style={{ color: MUTED }}>{a}</span><b style={{ color: INK }}>{b}</b></div>
              ))}
            </div>
            <div className="mt-3 text-[12px]" style={{ color: MUTED }}>Contoh hitungan; tarif bisa diubah di pengaturan.</div>
          </Inner>
        </Card>
      </Stack>
      <Card title="Peralatan dan Aset Fasilitas">
        <DataList rows={MONITOR.assets} cols={[
          { h: "Aset", r: (a) => a[0] }, { h: "Kategori", r: (a) => a[1] }, { h: "Nilai", r: (a) => jt(a[2]), right: true }, { h: "Kondisi", r: (a) => <Pill t={a[3]} /> },
        ]} />
        <div className="px-3 pb-1 pt-2 text-[12px]" style={{ color: MUTED }}>Contoh dari daftar aset Monitor Dana Fasilitas Bungus, Padang.</div>
      </Card>
      {out && (
        <Modal title={`Ambil ${out.id}`} onClose={() => setOut(null)} footer={<><Btn v="light" full onClick={() => setOut(null)}>Batal</Btn><Btn full onClick={() => { const r = run({ a: "tit.out", id: out.id, days }); if (r.ok) setOut(null); }}>Terbitkan tagihan</Btn></>}>
          <div className="text-[13px]" style={{ color: MUTED }}>{out.customer} · {out.kg.toLocaleString("id-ID")} kg</div>
          <Field label="Lama simpan (hari)"><NumIn value={days} onChange={setDays} /></Field>
          <Inner><div className="text-[12px]" style={{ color: MUTED }}>Tarif {rp(coldTariff(days || 0))}/kg</div><div className="text-[24px] tracking-tight" style={{ color: INK }}>{rp(out.kg * coldTariff(days || 0))}</div><div className="text-[12px]" style={{ color: MUTED }}>Rumus: berat × hari × Rp75/kg, minimum 10 hari.</div></Inner>
        </Modal>
      )}
      {inn && (
        <Modal title="Terima titipan" onClose={() => setInn(null)} footer={<><Btn v="light" full onClick={() => setInn(null)}>Batal</Btn><Btn full onClick={() => { const r = run({ a: "tit.in", customer: cust, kg }); if (r.ok) setInn(null); }}>Simpan</Btn></>}>
          <Field label="Pelanggan"><TextIn value={cust} onChange={(e) => setCust(e.target.value)} /></Field>
          <Field label="Berat (kg)" hint={`Sisa ruang ${(COLD_CAP - used).toLocaleString("id-ID", { maximumFractionDigits: 0 })} kg`}><NumIn value={kg} onChange={setKg} /></Field>
        </Modal>
      )}
    </Stack>
  );
}

/* -------------------------------------------------------------- keuangan */
export function Keuangan() {
  const s = useDemoState();
  const run = useRun();
  const [form, setForm] = useModal();
  const [desc, setDesc] = useState("Biaya listrik gudang");
  const [amt, setAmt] = useState(2500000);
  const checks = closeChecks(s);
  const inc = s.ledger.filter((l) => l.amount > 0 && l.desc !== "Saldo awal (contoh)").reduce((a, l) => a + l.amount, 0);
  const exp = s.ledger.filter((l) => l.amount < 0).reduce((a, l) => a - l.amount, 0);
  return (
    <Stack>
      <Head title="Keuangan" sub="Kas, biaya, dan tutup buku" right={<GBtn perm="cost.add" v="light" onClick={() => setForm(true)}>Ajukan biaya</GBtn>} />
      <Stats n={4}>
        <Stat value={jt(cash(s))} label="Saldo kas" />
        <Stat value={jt(inc)} label="Pemasukan bulan ini" tone="ok" />
        <Stat value={jt(exp)} label="Pengeluaran bulan ini" />
        <Stat value={s.closed ? "Terkunci" : "Terbuka"} label="Buku Oktober 2026" />
      </Stats>
      <Grid>
        <Card title="Buku Kas">
          <DataList rows={s.ledger} cols={[{ h: "Keterangan", r: (l) => l.desc }, { h: "Tanggal", r: (l) => l.date }, { h: "Jumlah", r: (l) => <span style={{ color: l.amount < 0 ? "#B4443C" : "#0B6B4A" }}>{l.amount < 0 ? "−" : "+"}{jt(Math.abs(l.amount))}</span>, right: true }]} />
        </Card>
        <Card title="Tutup Buku Bulanan" right={<Pill t={s.closed ? "Terkunci" : "Terbuka"} />}>
          <Inner>
            <div className="space-y-2.5">
              {checks.map((c) => (
                <div key={c.text} className="flex items-center gap-3 text-[13px]"><span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold" style={{ background: c.ok ? INK : "#FBE5E3", color: c.ok ? "#fff" : "#A8322B" }}>{c.ok ? "✓" : "!"}</span><span style={{ color: c.ok ? INK : "#A8322B" }}>{c.text}</span></div>
              ))}
            </div>
            <div className="mt-4">
              {s.closed
                ? <GBtn perm="month.reopen" v="light" full onClick={() => run({ a: "month.reopen" })}>Buka kembali (Owner)</GBtn>
                : <GBtn perm="month.close" full onClick={() => run({ a: "month.close" })}><Icon n="lock" s={16} c="#fff" />Tutup buku Oktober</GBtn>}
            </div>
            <div className="mt-2 text-[12px]" style={{ color: MUTED }}>Setelah ditutup, kas dan biaya tidak bisa diubah. Selesaikan tanda ! dulu agar bisa menutup.</div>
          </Inner>
        </Card>
      </Grid>
      <Grid>
        <Card title="Kelengkapan Dokumen">
          <Inner>
            <div className="space-y-3.5">
              {([["Nota lengkap", MONITOR.docs.notaOk, MONITOR.docs.total], ["Bukti transfer lengkap", MONITOR.docs.buktiOk, MONITOR.docs.total - MONITOR.docs.buktiNa]] as [string, number, number][]).map(([l, a, b]) => (
                <div key={l}><div className="mb-1 flex justify-between text-[12.5px]"><span className="font-medium" style={{ color: INK }}>{l}</span><span style={{ color: MUTED }}>{a} dari {b} · {Math.round((a / b) * 100)}%</span></div><Bar pct={(a / b) * 100} color={a === b ? INK : "#D9902B"} /></div>
              ))}
            </div>
            <div className="mt-3 text-[12px]" style={{ color: MUTED }}>{MONITOR.docs.buktiMissing} transaksi belum ada bukti transfer. Contoh dari Monitor Dana Fasilitas Bungus.</div>
          </Inner>
        </Card>
        <Card title="Pengeluaran per Kategori">
          <Inner>
            <div className="space-y-3">
              {MONITOR.categories.map(([l, v], i) => (
                <div key={l}><div className="mb-1 flex justify-between text-[12.5px]"><span className="font-medium" style={{ color: INK }}>{l}</span><span style={{ color: MUTED }}>{jt(v)}</span></div><Bar pct={(v / MONITOR.categories[0][1]) * 100} color={i === 0 ? INK : "#5A5F68"} /></div>
              ))}
            </div>
          </Inner>
        </Card>
      </Grid>
      {form && (
        <Modal title="Ajukan biaya" onClose={() => setForm(null)} footer={<><Btn v="light" full onClick={() => setForm(null)}>Batal</Btn><Btn full onClick={() => { const r = run({ a: "cost.add", desc, amount: amt }); if (r.ok) setForm(null); }}>Ajukan</Btn></>}>
          <Field label="Keterangan"><TextIn value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Jumlah (Rp)"><NumIn value={amt} onChange={setAmt} /></Field>
          <div className="text-[12px]" style={{ color: MUTED }}>Biaya masuk kas setelah Owner menyetujui.</div>
        </Modal>
      )}
    </Stack>
  );
}

/* ---------------------------------------------------------------- jadwal */
export function Jadwal() {
  const s = useDemoState();
  const run = useRun();
  const { compact } = useDemo();
  const [form, setForm] = useModal();
  const [day, setDay] = useState("Selasa");
  const [st, setSt] = useState(10);
  const [en, setEn] = useState(11);
  const [name, setName] = useState("Pesanan ABF");
  const [kg, setKg] = useState(500);
  const conflict = (b: Booking) => overlaps(b, s.bookings).length > 0;
  const preview = overlaps({ day, start: st, end: en }, s.bookings);
  const prod = s.bookings.filter((b) => b.kind === "Produksi");
  const abf = s.bookings.filter((b) => b.kind === "ABF");
  const clash = abf.filter(conflict);
  const colorOf = (b: Booking) => (conflict(b) ? "#E0524A" : b.kind === "ABF" ? "#8E6BC4" : b.who.includes("DUS") ? INK : "#0E5C46");
  const total = prod.reduce((a, b) => a + b.kg, 0);
  const LABEL = compact ? 56 : 92;
  const x = (h: number) => `${((h - 8) / 9) * 100}%`;
  return (
    <Stack>
      <Head title="Jadwal" sub="Giliran mitra dan pesanan ABF" right={<GBtn perm="book.add" onClick={() => setForm(true)}><Icon n="plus" s={16} c="#fff" />Tambah jadwal</GBtn>} />
      <Stats n={3}>
        <Stat value={String(clash.length)} label="Jadwal bentrok" tone={clash.length ? "warn" : "ok"} />
        {!compact && <Stat value={`${total.toLocaleString("id-ID")} kg`} label="Kapasitas produksi minggu ini" />}
        <Stat value={String(abf.length)} label="Pesanan ABF terjadwal" />
      </Stats>

      {clash.length > 0 && (
        <div className="rounded-[26px] p-3" style={{ background: "#FBE5E3" }}>
          <div className="flex items-center gap-2 px-2 pb-2 pt-1 text-[14px] font-semibold" style={{ color: "#A8322B" }}><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#E0524A" }} />{clash.length} jadwal bentrok, perlu dipindah</div>
          <div className="space-y-2">
            {clash.map((b) => {
              const other = overlaps(b, s.bookings).map((o) => o.who).join(", ");
              return (
                <div key={b.id} className={`rounded-[20px] bg-white p-3.5 ${compact ? "" : "flex items-center justify-between gap-4"}`}>
                  <div>
                    <div className="text-[13.5px] font-medium" style={{ color: INK }}>{b.who} menabrak {other}</div>
                    <div className="mt-0.5 text-[12px]" style={{ color: MUTED }}>{b.day}, {b.start}.00–{b.end}.00 · {b.kg.toLocaleString("id-ID")} kg</div>
                  </div>
                  <div className={`flex gap-2 ${compact ? "mt-3" : ""}`}>
                    <GBtn perm="book.move" size="sm" onClick={() => run({ a: "book.move", id: b.id })}>Pindah ke jam kosong</GBtn>
                    <GBtn perm="book.remove" size="sm" v="light" onClick={() => run({ a: "book.remove", id: b.id })}>Hapus</GBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Card title="Minggu Ini">
        <div className="rounded-[20px] bg-white p-3.5">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px]" style={{ color: MUTED }}>
            {([["CV DUS", INK], ["PT SNS", "#0E5C46"], ["ABF", "#8E6BC4"], ["Bentrok", "#E0524A"]] as [string, string][]).map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>)}
          </div>
          <div className="flex" style={{ paddingLeft: LABEL }}>
            <div className="relative h-5 flex-1 text-[10.5px]" style={{ color: MUTED }}>
              {[8, 10, 12, 14, 16].map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: x(h) }}>{h}.00</span>)}
            </div>
          </div>
          <div className="mt-1 space-y-1.5">
            {DAYS.map((d) => {
              const bs = s.bookings.filter((b) => b.day === d);
              const kgDay = bs.filter((b) => b.kind === "Produksi").reduce((a, b) => a + b.kg, 0);
              return (
                <div key={d} className="flex items-center">
                  <div className="shrink-0 text-[12.5px] font-medium" style={{ width: LABEL, color: INK }}>{compact ? d.slice(0, 3) : d}</div>
                  <div className="relative flex-1 overflow-hidden rounded-xl" style={{ height: compact ? 40 : 44, background: "#F1F2F6" }}>
                    {[10, 12, 14, 16].map((h) => <span key={h} className="absolute top-0 h-full w-px" style={{ left: x(h), background: "#E4E6EC" }} />)}
                    {bs.filter((b) => b.kind === "Produksi").map((b) => (
                      <div key={b.id} className="absolute top-1 flex items-center rounded-lg px-2 text-[11.5px] font-semibold text-white" style={{ left: x(b.start), width: `calc(${x(b.end)} - ${x(b.start)})`, height: "calc(100% - 8px)", background: colorOf(b), opacity: conflict(b) ? 0.55 : 1 }}>
                        <span className="truncate">{b.who}{!compact && ` · ${kgDay.toLocaleString("id-ID")} kg`}</span>
                      </div>
                    ))}
                    {bs.filter((b) => b.kind === "ABF").map((b) => (
                      <div key={b.id} className="absolute top-1 flex items-center justify-center rounded-lg border-2 border-white text-[11px] font-bold text-white" style={{ left: x(b.start), width: `calc(${x(b.end)} - ${x(b.start)})`, height: "calc(100% - 8px)", minWidth: 34, background: colorOf(b), boxShadow: "0 2px 6px rgba(20,24,40,.25)" }}>ABF</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-2 pb-1 pt-2.5 text-[12px]" style={{ color: MUTED }}>Jam kerja 8.00–17.00, Sabtu sampai 12.00. Garis tebal ABF = pesanan pembekuan.</div>
      </Card>

      <Card title="Pesanan ABF">
        <DataList rows={abf} empty="Belum ada pesanan ABF." cols={[
          { h: "Pesanan", r: (b: Booking) => b.who }, { h: "Waktu", r: (b) => `${b.day}, ${b.start}.00–${b.end}.00` }, { h: "Berat", r: (b) => `${b.kg.toLocaleString("id-ID")} kg`, right: true }, { h: "Status", r: (b) => <Pill t={conflict(b) ? "Bentrok" : "Aman"} /> },
        ]} actions={(b) => (<>
          {conflict(b) && <GBtn perm="book.move" size="sm" onClick={() => run({ a: "book.move", id: b.id })}>Pindahkan</GBtn>}
          <GBtn perm="book.remove" size="sm" v="ghost" onClick={() => run({ a: "book.remove", id: b.id })}>Hapus</GBtn>
        </>)} />
      </Card>

      {form && (
        <Modal title="Tambah jadwal" onClose={() => setForm(null)} footer={<><Btn v="light" full onClick={() => setForm(null)}>Batal</Btn><Btn full onClick={() => { const r = run({ a: "book.add", day, start: st, end: en, who: name, kg, kind: "ABF" }); if (r.ok) setForm(null); }}>Simpan</Btn></>}>
          <Field label="Kegiatan"><TextIn value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Hari"><SelectIn value={day} onChange={setDay} options={DAYS} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Mulai (jam)"><NumIn value={st} onChange={setSt} /></Field><Field label="Selesai (jam)"><NumIn value={en} onChange={setEn} /></Field></div>
          <Field label="Berat (kg)"><NumIn value={kg} onChange={setKg} /></Field>
          <Inner><div className="text-[13px]" style={{ color: preview.length ? "#A8322B" : "#0B6B4A" }}>{preview.length ? `Bentrok dengan ${preview.map((p) => p.who).join(", ")}` : "Tidak bentrok"}</div></Inner>
        </Modal>
      )}
    </Stack>
  );
}

/* -------------------------------------------------------------- skenario */
export function Skenario() {
  const s = useDemoState();
  const run = useRun();
  const [fish, setFish] = useState(1000);
  const [price, setPrice] = useState(0);
  const [mach, setMach] = useState(75);
  const [name, setName] = useState("Skenario saya");
  const impact = (11.92 * fish) / 1000 + (11.916 * price) / 1000 + 5.326 * (75 - mach);
  const base = 475.7;
  const Sl = ({ label, v, set, min, max, step, unit }: { label: string; v: number; set: (n: number) => void; min: number; max: number; step: number; unit: string }) => (
    <Inner><div className="flex justify-between text-[13px]"><span style={{ color: MUTED }}>{label}</span><b style={{ color: INK }}>{v.toLocaleString("id-ID")}{unit}</b></div><input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} className="mt-2 w-full" style={{ accentColor: INK }} aria-label={label} /></Inner>
  );
  return (
    <Stack>
      <Head title="Skenario" sub="Coba perubahan sebelum terjadi" />
      <Grid>
        <Card title="Atur Perubahan">
          <div className="space-y-2.5">
            <Sl label="Harga ikan naik" v={fish} set={setFish} min={0} max={3000} step={250} unit=" Rp/kg" />
            <Sl label="Harga jual turun" v={price} set={setPrice} min={0} max={10000} step={500} unit=" Rp/kg" />
            <Sl label="Pemakaian mesin" v={mach} set={setMach} min={50} max={100} step={1} unit="%" />
          </div>
        </Card>
        <Card title="Dampak ke Laba Bulanan">
          <Inner>
            <div className="text-[12px]" style={{ color: MUTED }}>Laba per bulan (contoh, kondisi sedang {jt(base * 1e6, 1)})</div>
            <div className="text-[34px] leading-tight tracking-tight" style={{ color: base - impact < 0 ? "#B4443C" : INK }}>{jt((base - impact) * 1e6)}</div>
            <div className="mt-1 text-[13px]" style={{ color: impact > 0 ? "#B4443C" : "#0B6B4A" }}>{impact > 0 ? "−" : "+"}{jt(Math.abs(impact) * 1e6, 2)} dari kondisi sedang</div>
            <div className="mt-3"><Bar pct={Math.max(0, ((base - impact) / base) * 100)} color={base - impact < 0 ? "#B4443C" : INK} /></div>
            <div className="mt-3 flex gap-2"><TextIn value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama skenario" /><GBtn perm="scen.save" onClick={() => run({ a: "scen.save", name, fish, price, machine: mach, impact })}>Simpan</GBtn></div>
            <div className="mt-2 text-[11.5px]" style={{ color: MUTED }}>Perkiraan dari contoh hitungan, bukan laba nyata.</div>
          </Inner>
        </Card>
      </Grid>
      <Card title="Skenario Tersimpan">
        <DataList rows={s.scenarios} empty="Belum ada skenario tersimpan." cols={[
          { h: "Nama", r: (x) => x.name }, { h: "Ikan naik", r: (x) => `${x.fish.toLocaleString("id-ID")}/kg` }, { h: "Jual turun", r: (x) => `${x.price.toLocaleString("id-ID")}/kg` }, { h: "Mesin", r: (x) => `${x.machine}%` },
          { h: "Dampak", r: (x) => `${x.impact > 0 ? "−" : "+"}${jt(Math.abs(x.impact) * 1e6, 2)}`, right: true },
        ]} actions={(x) => (<><Btn size="sm" v="light" onClick={() => { setFish(x.fish); setPrice(x.price); setMach(x.machine); setName(x.name); }}>Muat</Btn><GBtn perm="scen.remove" size="sm" v="ghost" onClick={() => run({ a: "scen.remove", id: x.id })}>Hapus</GBtn></>)} />
      </Card>
    </Stack>
  );
}

/* ------------------------------------------------------------------ akses */
const PERM_LABEL: Record<string, string> = {
  "po.create": "Buat pembelian", "approval.decide": "Setujui / tolak", "po.receive": "Terima ikan", "po.pay": "Bayar pemasok", "lot.qc": "Cek mutu", "prod.start": "Mulai produksi", "prod.finish": "Selesaikan produksi",
  "sale.create": "Buat pesanan jual", "sale.ship": "Kirim pesanan", "inv.pay": "Catat pembayaran", "inv.remind": "Kirim pengingat", "tit.in": "Terima titipan", "tit.out": "Ambil & tagih titipan",
  "stock.adjust": "Ajukan koreksi stok", "cost.add": "Ajukan biaya", "book.add": "Tambah jadwal", "book.move": "Pindahkan jadwal", "book.remove": "Hapus jadwal", "scen.save": "Simpan skenario", "scen.remove": "Hapus skenario",
  "month.close": "Tutup buku", "month.reopen": "Buka kembali buku",
};
export function Akses() {
  const { role, setRole, compact } = useDemo();
  return (
    <Stack>
      <Head title="Akses" sub="Siapa boleh melakukan apa" />
      <Card title="Masuk Sebagai">
        <Inner>
          <div className="mb-3 text-[13px]" style={{ color: MUTED }}>Ganti peran untuk melihat tombol yang aktif atau terkunci. Berlaku di tampilan ini.</div>
          <div className="flex flex-wrap gap-2">{ROLES.map((r) => <Btn key={r} size="sm" v={r === role ? "dark" : "light"} onClick={() => setRole(r)}>{r}</Btn>)}</div>
        </Inner>
      </Card>
      <Card title="Daftar Izin">
        {compact ? (
          <div className="space-y-2">{Object.keys(PERMS).map((k) => (
            <Inner key={k} className="!p-3"><div className="text-[13px] font-medium" style={{ color: INK }}>{PERM_LABEL[k]}</div><div className="mt-1.5 flex flex-wrap gap-1.5">{ROLES.map((r) => <span key={r} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: PERMS[k].includes(r) ? "#DDF3E8" : "#ECEDF1", color: PERMS[k].includes(r) ? "#0B6B4A" : "#9AA0A8" }}>{r}</span>)}</div></Inner>
          ))}</div>
        ) : (
          <div className="overflow-x-auto rounded-[20px] bg-white">
            <table className="w-full text-[13.5px]"><thead><tr className="text-left text-[12px]" style={{ color: MUTED }}><th className="px-4 py-3 font-medium">Aksi</th>{ROLES.map((r) => <th key={r} className="px-4 py-3 text-center font-medium" style={{ color: r === role ? INK : MUTED }}>{r}</th>)}</tr></thead>
              <tbody>{Object.keys(PERMS).map((k) => <tr key={k} className="border-t border-[#EEF0F4]"><td className="px-4 py-2.5" style={{ color: INK }}>{PERM_LABEL[k]}</td>{ROLES.map((r) => <td key={r} className="px-4 py-2.5 text-center" style={{ background: r === role ? "#F4F5F9" : undefined }}>{PERMS[k].includes(r) ? "✓" : <span style={{ color: "#C5C9D0" }}>–</span>}</td>)}</tr>)}</tbody></table>
          </div>
        )}
      </Card>
    </Stack>
  );
}

/* ---------------------------------------------------------------- laporan */
export function Laporan() {
  const s = useDemoState();
  const [r, setR] = useState(0);
  const names = ["Laba rugi", "Piutang", "Stok", "Hasil per ekor", "Biaya Siklus 1", "Pengeluaran fasilitas", "Riwayat"];
  const inc = s.ledger.filter((l) => l.amount > 0 && l.desc !== "Saldo awal (contoh)").reduce((a, l) => a + l.amount, 0);
  const exp = s.ledger.filter((l) => l.amount < 0).reduce((a, l) => a - l.amount, 0);
  const rep = useMemo(() => {
    const aging = (k: Invoice["status"]) => s.invoices.filter((i) => i.status === k).reduce((a, i) => a + i.amount, 0);
    return [
      { note: "Dari buku kas bulan berjalan (data contoh).", rows: [["Pos", "Jumlah (Rp)"], ["Pemasukan", inc], ["Pengeluaran", exp], ["Selisih", inc - exp]] },
      { note: "Tagihan belum lunas menurut umur (data contoh).", rows: [["Umur", "Jumlah (Rp)"], ["Belum jatuh tempo", aging("Belum jatuh tempo")], ["Jatuh tempo", aging("Jatuh tempo")], ["Terlambat", aging("Terlambat")], ["Lunas", aging("Lunas")]] },
      { note: "Stok saat ini.", rows: [["Barang", "Jumlah (kg)"], ["Ikan segar belum diolah", freshKg(s)], ["Loin siap jual", s.stock.loin], ["Sisa olahan", s.stock.sisa], ["Titipan pelanggan", s.titipan.filter((t) => t.status === "Disimpan").reduce((a, t) => a + t.kg, 0)]] },
      { note: "Data nyata Siklus 1.", rows: [["Ekor", "Berat (kg)", "Hasil olahan (%)"], ...SIKLUS1.yields.map((y, i) => [String(i + 1).padStart(3, "0"), SIKLUS1.kg[i], y])] },
      { note: "Data nyata Siklus 1. Total Rp37,08 juta.", rows: [["Biaya", "Persen", "Jumlah (Rp)"], ...SIKLUS1.costs.map(([a, p, v]) => [a, p, v])] },
      { note: "Rekap pengeluaran fasilitas per bulan dari Monitor Dana Fasilitas Bungus.", rows: [["Bulan", "Transaksi", "Pengeluaran (Rp)"], ...MONITOR.months.map(([a, b, c]) => [a, b, c])] },
      { note: "Semua tindakan di tampilan desktop dan ponsel.", rows: [["Tanggal", "Peran", "Tindakan"], ...s.log.map((l) => [l.t, l.who, l.text])] },
    ][r];
  }, [s, r, inc, exp]);
  return (
    <Stack>
      <Head title="Laporan" sub="Lihat dan unduh" right={<Btn v="light" onClick={() => downloadCSV(`laporan-${names[r].toLowerCase().replace(/\s+/g, "-")}.csv`, rep.rows as (string | number)[][])}><Icon n="download" s={16} />Unduh CSV</Btn>} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {names.map((n, i) => <Btn key={n} size="sm" v={i === r ? "dark" : "light"} onClick={() => setR(i)}>{n}</Btn>)}
      </div>
      <Card title={names[r]}>
        <div className="overflow-x-auto rounded-[20px] bg-white">
          <table className="w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px]" style={{ color: MUTED }}>{(rep.rows[0] as string[]).map((h, i) => <th key={h} className={`px-4 py-3 font-medium ${i > 0 && r !== names.length - 1 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>{rep.rows.slice(1).map((row, i) => <tr key={i} className="border-t border-[#EEF0F4]">{row.map((c, j) => <td key={j} className={`px-4 py-2.5 ${j > 0 && r !== names.length - 1 ? "text-right" : ""}`} style={{ color: INK }}>{typeof c === "number" ? c.toLocaleString("id-ID", { maximumFractionDigits: 1 }) : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="px-3 pb-1 pt-2 text-[12px]" style={{ color: MUTED }}>{rep.note}</div>
      </Card>
      {r === 3 && <Card title="Grafik"><Inner><YieldChart /></Inner></Card>}
    </Stack>
  );
}

/* ----------------------------------------------------------- asisten AI */
interface Chat { id: number; from: "me" | "ai"; text: string; lines?: string[]; go?: [string, string] }
const SUGGEST = ["Tagihan mana yang telat?", "Berapa saldo kas sekarang?", "Ekor mana hasilnya paling rendah?", "Apa yang perlu saya setujui?", "Apakah jadwal ada yang bentrok?", "Berapa ongkos kirim Siklus 1?"];
let chatLog: Chat[] = [];

function answer(q: string, s: ReturnType<typeof useDemoState>): Omit<Chat, "id" | "from"> {
  const t = q.toLowerCase();
  const has = (...k: string[]) => k.some((x) => t.includes(x));
  if (has("sisa olahan")) return { text: `Sisa olahan di stok ${s.stock.sisa} kg. Itu bagian ikan selain loin yang belum ada pembelinya.`, go: ["stok", "Buka Stok"] };
  if (has("telat", "piutang", "tagihan", "jatuh tempo")) {
    const late = s.invoices.filter((i) => i.status === "Terlambat" || i.status === "Jatuh tempo");
    if (!late.length) return { text: "Tidak ada tagihan yang telat atau jatuh tempo hari ini.", go: ["penjualan", "Buka Penjualan"] };
    return { text: `Ada ${late.length} tagihan yang perlu ditindak. Total piutang belum dibayar ${jt(receivable(s))}.`, lines: late.map((i) => `${i.id} · ${i.buyer} · ${jt(i.amount)} · ${i.status === "Terlambat" ? `telat ${Math.abs(i.due)} hari` : "jatuh tempo hari ini"}`), go: ["penjualan", "Buka Penjualan"] };
  }
  if (has("kas", "saldo", "uang")) {
    const inc = s.ledger.filter((l) => l.amount > 0 && l.desc !== "Saldo awal (contoh)").reduce((a, l) => a + l.amount, 0);
    const exp = s.ledger.filter((l) => l.amount < 0).reduce((a, l) => a - l.amount, 0);
    return { text: `Saldo kas sekarang ${jt(cash(s))}. Bulan ini pemasukan ${jt(inc)} dan pengeluaran ${jt(exp)}.`, go: ["keuangan", "Buka Keuangan"] };
  }
  if (has("ekor", "hasil olahan", "rendah", "tertinggi")) return { text: "Rata-rata hasil olahan Siklus 1 adalah 62,6% (rencana 60%).", lines: ["Terendah: ekor 005, 52,2%", "Tertinggi: ekor 007, 70,2%", "Data nyata Siklus 1, 11 ekor"], go: ["produksi", "Buka Produksi"] };
  if (has("ongkos", "kirim")) return { text: "Ongkos kirim Siklus 1 Rp11,08 jt, yaitu 29,9% dari total biaya Rp37,08 jt.", lines: ["Bila tarif turun ke Rp29.500/kg, hemat sekitar Rp1.840 per kg loin", "Data nyata Siklus 1"], go: ["laporan", "Buka Laporan"] };
  if (has("setuju", "keputusan", "persetujuan", "approval")) {
    const p = s.approvals.filter((a) => a.status === "pending");
    if (!p.length) return { text: "Semua sudah diputuskan. Tidak ada yang menunggu.", go: ["setuju", "Buka Persetujuan"] };
    return { text: `Ada ${p.length} hal yang menunggu keputusan Owner.`, lines: p.map((a) => `${a.title} · ${a.amount}`), go: ["setuju", "Buka Persetujuan"] };
  }
  if (has("bentrok", "jadwal")) {
    const c = s.bookings.filter((b) => overlaps(b, s.bookings).length > 0);
    if (!c.length) return { text: "Tidak ada jadwal yang bentrok minggu ini.", go: ["jadwal", "Buka Jadwal"] };
    return { text: `Ada ${c.length} jadwal yang bentrok.`, lines: c.map((b) => `${b.day} ${b.start}.00–${b.end}.00 · ${b.who}`), go: ["jadwal", "Buka Jadwal"] };
  }
  if (has("gudang", "dingin")) return { text: `Gudang dingin terisi ${Math.round((coldUsed(s) / COLD_CAP) * 100)}%, sisa ruang ${(COLD_CAP - coldUsed(s)).toLocaleString("id-ID", { maximumFractionDigits: 0 })} kg.`, lines: s.titipan.filter((x) => x.status === "Disimpan").map((x) => `${x.customer} · ${x.kg.toLocaleString("id-ID")} kg`), go: ["gudang", "Buka Gudang Dingin"] };
  if (has("stok", "loin")) return { text: `Stok loin siap jual ${s.stock.loin.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg, ikan segar belum diolah ${freshKg(s)} kg, sisa olahan ${s.stock.sisa} kg.`, go: ["stok", "Buka Stok"] };
  if (has("bukti", "nota", "transfer")) return { text: `Nota sudah lengkap ${MONITOR.docs.notaOk} dari ${MONITOR.docs.total}. Bukti transfer lengkap ${MONITOR.docs.buktiOk} dari ${MONITOR.docs.total - MONITOR.docs.buktiNa}, jadi ${MONITOR.docs.buktiMissing} transaksi belum ada bukti.`, go: ["keuangan", "Buka Keuangan"] };
  if (has("untung", "laba")) return { text: `Untung Siklus 1 ${rp(SIKLUS1.profit)} (margin ${SIKLUS1.margin}%). Ini data nyata Siklus 1.`, go: ["laporan", "Buka Laporan"] };
  if (has("halo", "hai", "bantu", "bisa apa")) return { text: "Halo! Saya bisa menjawab soal tagihan, kas, stok, hasil produksi, persetujuan, jadwal, gudang dingin, dan kelengkapan dokumen. Coba salah satu pertanyaan di atas." };
  return { text: "Maaf, di demo ini saya baru bisa menjawab pertanyaan tentang tagihan, kas, stok, hasil tiap ekor, ongkos kirim, persetujuan, jadwal, gudang dingin, dan bukti transfer." };
}

export function AsistenAI() {
  const s = useDemoState();
  const { go, compact } = useDemo();
  const [log, setLog] = useState<Chat[]>(chatLog);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { chatLog = log; end.current?.scrollIntoView({ block: "nearest" }); }, [log, busy]);
  const ask = (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setLog((l) => [...l, { id: l.length + 1, from: "me", text: question }]);
    setText(""); setBusy(true);
    setTimeout(() => { setLog((l) => [...l, { id: l.length + 1, from: "ai", ...answer(question, s) }]); setBusy(false); }, 650);
  };
  return (
    <Stack>
      <Head title="Asisten AI" sub="Tanya dengan kalimat biasa, jawabnya dari data usaha" right={log.length ? <Btn size="sm" v="light" onClick={() => setLog([])}>Mulai lagi</Btn> : undefined} />
      <Card>
        <div className={`no-scrollbar overflow-y-auto px-1.5 ${compact ? "max-h-[46dvh] min-h-[200px]" : "max-h-[48vh] min-h-[260px]"}`}>
          {log.length === 0 && (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: INK }}><Icon n="sparkles" s={26} c="#fff" /></span>
              <div className="text-[17px] font-medium" style={{ color: INK }}>Halo, ada yang mau ditanyakan?</div>
              <div className="mt-1 max-w-sm text-[13px]" style={{ color: MUTED }}>Pilih salah satu pertanyaan di bawah atau ketik sendiri. Jawaban diambil dari data yang ada di aplikasi.</div>
            </div>
          )}
          <div className="space-y-3 py-2">
            {log.map((m) => (
              <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                {m.from === "ai" && <span className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: INK }}><Icon n="sparkles" s={14} c="#fff" /></span>}
                <div className="max-w-[86%] rounded-[20px] px-4 py-3 text-[13.5px] leading-relaxed" style={m.from === "me" ? { background: INK, color: "#fff", borderBottomRightRadius: 6 } : { background: "#fff", color: INK, borderBottomLeftRadius: 6, boxShadow: "0 1px 2px rgba(20,24,40,.06)" }}>
                  <div>{m.text}</div>
                  {m.lines && <ul className="mt-2 space-y-1">{m.lines.map((l) => <li key={l} className="flex gap-2 text-[12.5px]" style={{ color: MUTED }}><span>•</span><span>{l}</span></li>)}</ul>}
                  {m.go && <div className="mt-3"><Btn size="sm" v="light" onClick={() => go(m.go![0])}>{m.go[1]} ›</Btn></div>}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: INK }}><Icon n="sparkles" s={14} c="#fff" /></span>
                <span className="rounded-[20px] bg-white px-4 py-3 text-[13px]" style={{ color: MUTED }}>Mencari di data…</span></div>
            )}
            <div ref={end} />
          </div>
        </div>
        <div className="no-scrollbar mt-1 flex gap-2 overflow-x-auto px-1.5 pb-2 pt-1">
          {SUGGEST.map((q) => <button key={q} type="button" disabled={busy} onClick={() => ask(q)} className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-medium transition active:scale-95 disabled:opacity-40" style={{ color: INK }}>{q}</button>)}
        </div>
        <form className="flex items-center gap-2 p-1.5" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
          <div className="flex-1"><TextIn value={text} onChange={(e) => setText(e.target.value)} placeholder="Ketik pertanyaan, mis. piutang yang telat" aria-label="Pertanyaan untuk asisten" /></div>
          <button type="submit" aria-label="Kirim" disabled={busy || !text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-40" style={{ background: INK }}><Icon n="send" s={18} c="#fff" /></button>
        </form>
      </Card>
      <div className="px-2 text-[11.5px]" style={{ color: MUTED }}>Demo: jawaban disusun dari data contoh di aplikasi. Asisten AI sungguhan akan membaca data asli usaha.</div>
    </Stack>
  );
}

export const VIEWS: Record<string, () => React.ReactElement> = {
  dashboard: Dashboard, setuju: Persetujuan, pembelian: Pembelian, produksi: Produksi, mutu: Mutu, stok: Stok, penjualan: Penjualan,
  gudang: GudangDingin, asisten: AsistenAI, keuangan: Keuangan, jadwal: Jadwal, skenario: Skenario, akses: Akses, laporan: Laporan,
};
