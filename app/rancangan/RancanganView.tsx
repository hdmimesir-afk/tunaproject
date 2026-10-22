"use client";

/* Halaman Rancangan Final, memakai gaya dan komponen yang sama dengan demo aplikasi (components/demo/ui.tsx). */

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Boxes, CalendarDays, ChartColumn, Check, CircleCheck, CircleQuestionMark, CreditCard, FileText,
  Fish, FlaskConical, LayoutGrid, Layers, Link2, ListChecks, Lock, MapPin, PackageCheck, Receipt, Scale, Search, ShieldCheck,
  Ship, ShoppingCart, Smartphone, Snowflake, Sparkles, Thermometer, TrendingUp, Users, Wallet, Workflow, type LucideIcon,
} from "lucide-react";
import { Card, Inner, INK, MUTED, TILE } from "@/components/demo/ui";
import { ALUR, BAHAN, BAHAN_KIRIM, JADWAL, NERACA, PERTANYAAN, PERUBAHAN, PRINSIP, SETUJU, SYARAT } from "./data";
import { JawabanProvider, KirimBar, SetujuPilih, SetujuSemua, TanyaPilih } from "./Jawaban";

const ICONS: Record<string, LucideIcon> = {
  Boxes, CalendarDays, ChartColumn, CreditCard, FileText, Fish, FlaskConical, Layers, Link2, Lock, MapPin, Receipt, Scale,
  Search, ShieldCheck, Ship, ShoppingCart, Smartphone, Snowflake, Sparkles, Thermometer, TrendingUp, Users, Wallet,
};

/* warna status sama dengan Pill di demo */
const TONE = {
  green: ["#DDF3E8", "#0B6B4A"],
  blue: ["#E4EEFB", "#2D5F9A"],
  amber: ["#FBF0D5", "#8A5A00"],
  red: ["#FBE5E3", "#A8322B"],
  grey: ["#ECEDF1", "#5A5F68"],
} as const;
type Tone = keyof typeof TONE;

const NERACA_C = [INK, "#2D5F9A", "#8FB3D9", "#C9D6E6", "#D9962B"];
const WAJIB = PERTANYAAN.filter((q) => q.wajib).length;

const NAV = [
  { id: "ringkasan", label: "Ringkasan", icon: LayoutGrid },
  { id: "perubahan", label: "Yang developer ubah", icon: ListChecks },
  { id: "alur", label: "Cara kerja", icon: Workflow },
  { id: "contoh", label: "Contoh", icon: Scale },
  { id: "jadwal", label: "Jadwal 1 bulan", icon: CalendarDays },
  { id: "setuju", label: "Perlu disetujui", icon: BadgeCheck },
  { id: "tanya", label: "Perlu dijawab", icon: CircleQuestionMark },
  { id: "bahan", label: "Bahan dikirim", icon: PackageCheck },
];

/* ------------------------------------------------------------- bits */

function Chip({ t, tone = "grey" }: { t: ReactNode; tone?: Tone }) {
  const [bg, fg] = TONE[tone];
  return <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none" style={{ background: bg, color: fg }}>{t}</span>;
}

function LinkBtn({ href, children, v = "dark" }: { href: string; children: ReactNode; v?: "dark" | "light" }) {
  const st = v === "dark" ? { background: INK, color: "#fff" } : { background: "#fff", color: INK, boxShadow: "0 1px 2px rgba(20,24,40,.08)" };
  return <a href={href} style={st} className="inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-5 text-[14px] font-medium transition active:scale-[0.96]">{children}</a>;
}

function IconDot({ icon: Ic, dark }: { icon: LucideIcon; dark?: boolean }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={dark ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>
      <Ic size={19} strokeWidth={1.8} />
    </span>
  );
}

function Num({ n, dark = true }: { n: number; dark?: boolean }) {
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold" style={dark ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>{n}</span>;
}

function Section({ id, children }: { id: string; children: ReactNode }) {
  return <div id={id} className="scroll-mt-32 lg:scroll-mt-6">{children}</div>;
}

/** Judul bagian di luar kartu, untuk bagian yang perlu tindakan owner. */
function Heading({ kicker, title, lead }: { kicker: string; title: string; lead: string }) {
  return (
    <div className="mb-3 px-1">
      <div className="text-[13px] font-medium" style={{ color: MUTED }}>{kicker}</div>
      <h2 className="mt-0.5 text-[24px] font-medium leading-tight tracking-tight sm:text-[28px]" style={{ color: INK }}>{title}</h2>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed" style={{ color: MUTED }}>{lead}</p>
    </div>
  );
}

/* ------------------------------------------------------------- sections */

function Ringkasan() {
  const stats = [
    { v: "12", l: "Catatan owner yang developer kerjakan", href: "#perubahan" },
    { v: "1 bulan", l: "Total waktu pengerjaan, 4 minggu", href: "#jadwal" },
    { v: `${PERTANYAAN.length}`, l: `Pertanyaan butuh konfirmasi owner, ${WAJIB} di antaranya wajib di minggu 1`, href: "#tanya", tone: "warn" as const },
    { v: `${SETUJU.length}`, l: "Hal yang perlu owner setujui", href: "#setuju" },
  ];
  return (
    <Section id="ringkasan">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[14px]" style={{ color: MUTED }}>Disusun dari catatan pertemuan Bungus Barat 5 · 21 Oktober 2026</div>
          <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-tight sm:text-[38px]" style={{ color: INK }}>Rancangan Final Sistem</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed" style={{ color: MUTED }}>Halaman ini menjelaskan apa saja yang developer buat, kapan selesainya, dan apa yang developer butuhkan dari owner supaya bisa mulai.</p>
        </div>
        <div className="flex gap-2">
          <LinkBtn href="#tanya" v="light">Lihat pertanyaan</LinkBtn>
          <LinkBtn href="/demo/desktop"><Sparkles size={16} /> Coba demo</LinkBtn>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <a key={s.l} href={s.href} className="relative block rounded-[22px] p-4 pt-5 transition active:scale-[0.97]" style={{ background: "rgba(248,249,252,.78)", border: "1px solid rgba(255,255,255,.95)", boxShadow: "0 6px 24px rgba(40,50,80,.05)" }}>
            <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white"><ArrowUpRight size={14} /></span>
            <div className="pr-8 text-[22px] font-normal leading-none tracking-tight sm:text-[28px]" style={{ color: s.tone === "warn" ? "#B4443C" : INK }}>{s.v}</div>
            <div className="mt-4 pr-2 text-[12.5px] leading-snug" style={{ color: MUTED }}>{s.l}</div>
          </a>
        ))}
      </div>

      <Card title="Tiga hal yang developer pegang" className="mt-3" right={<Chip t="Dari catatan owner" tone="blue" />}>
        <div className="grid gap-2 md:grid-cols-3">
          {PRINSIP.map((p) => (
            <Inner key={p.t} className="flex gap-3">
              <IconDot icon={ICONS[p.icon]} />
              <div>
                <div className="text-[15px] font-medium" style={{ color: INK }}>{p.t}</div>
                <p className="mt-0.5 text-[13px] leading-snug" style={{ color: MUTED }}>{p.d}</p>
              </div>
            </Inner>
          ))}
        </div>
      </Card>
    </Section>
  );
}

function Perubahan() {
  return (
    <Section id="perubahan">
      <Card title="Yang developer ubah dari catatan owner" right={<Chip t="12 catatan" tone="blue" />}>
        <div className="grid gap-2 md:grid-cols-2">
          {PERUBAHAN.map((u) => (
            <Inner key={u.no} className="flex flex-col">
              <div className="flex items-start gap-3">
                <IconDot icon={ICONS[u.icon]} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15.5px] font-medium" style={{ color: INK }}>{u.judul}</span>
                    <Chip t={`Selesai minggu ${u.minggu}`} tone={u.minggu <= 2 ? "green" : "blue"} />
                  </div>
                  <div className="text-[12px]" style={{ color: MUTED }}>Catatan {u.no}</div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-white px-3.5 py-2.5">
                <div className="text-[11.5px] font-semibold" style={{ color: MUTED }}>Catatan rapat</div>
                <p className="mt-0.5 text-[13px] leading-snug" style={{ color: INK }}>“{u.kata}”</p>
              </div>
              <div className="mt-3 text-[11.5px] font-semibold" style={{ color: MUTED }}>Yang developer buat</div>
              <ul className="mt-1.5 grid gap-1.5">
                {u.jadi.map((j) => (
                  <li key={j} className="flex gap-2 text-[13.5px] leading-snug" style={{ color: INK }}>
                    <CircleCheck size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" color="#0B6B4A" />{j}
                  </li>
                ))}
              </ul>
            </Inner>
          ))}
        </div>
      </Card>
    </Section>
  );
}

function Alur() {
  return (
    <Section id="alur">
      <Card title="Cara kerja: dari beli ikan sampai laporan" right={<Chip t="Tidak ada ketik ulang" tone="green" />}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {ALUR.map((a, i) => {
            const Ic = ICONS[a.icon];
            return (
              <Inner key={a.t} className="relative flex items-center gap-3 lg:block">
                <div className="flex items-center justify-between lg:mb-4">
                  <IconDot icon={Ic} dark={i === ALUR.length - 1} />
                  <span className="hidden text-[11px] font-semibold tabular-nums lg:inline" style={{ color: MUTED }}>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div>
                  <div className="text-[14.5px] font-medium" style={{ color: INK }}>{a.t}</div>
                  <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: MUTED }}>{a.d}</p>
                </div>
                {i < ALUR.length - 1 && <span className="absolute -right-[13px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-white shadow-sm lg:grid"><ArrowRight size={12} /></span>}
              </Inner>
            );
          })}
        </div>
        <p className="px-2.5 pb-1 pt-3 text-[13px]" style={{ color: MUTED }}>Setiap langkah memakai data dari langkah sebelumnya. Petugas tidak perlu mengetik ulang nomor atau berat.</p>
      </Card>
    </Section>
  );
}

function Neraca() {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <Card title="Contoh: 400 kg ikan masuk, jadi apa saja?" right={<Chip t="Angka contoh" />}>
      <Inner>
        <div className="flex h-3 gap-1 overflow-hidden rounded-full" role="img" aria-label="Daging loin 65%, hasil samping 15%, limbah 12,5%, susut 5%, belum ketahuan 2,5%">
          {NERACA.map((n, i) => (
            <span key={n.t} className="h-full rounded-full transition-opacity" style={{ width: `${(n.kg / BAHAN) * 100}%`, background: NERACA_C[i], opacity: hover === null || hover === i ? 1 : 0.3 }} />
          ))}
        </div>
        <ul className="mt-4 grid gap-1">
          {NERACA.map((n, i) => (
            <li key={n.t}>
              <button type="button" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(hover === i ? null : i)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[14px] transition" style={{ background: hover === i ? "#fff" : "transparent", color: INK }}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: NERACA_C[i] }} />
                <span className="flex-1">{n.t}</span>
                <span className="tabular-nums">{n.kg} kg</span>
                <span className="w-12 text-right tabular-nums" style={{ color: MUTED }}>{((n.kg / BAHAN) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span>
              </button>
            </li>
          ))}
        </ul>
      </Inner>
      <div className="mt-2.5 rounded-2xl px-4 py-3 text-[13px] leading-snug" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
        Berat yang <b className="font-semibold">belum ketahuan ke mana</b> tetap ditampilkan sampai diperiksa. Tidak dimasukkan ke susut supaya totalnya kelihatan pas.
      </div>
    </Card>
  );
}

function Track({ label, steps, at }: { label: string; steps: string[]; at: number }) {
  return (
    <div>
      <div className="text-[12px] font-medium" style={{ color: MUTED }}>{label}</div>
      <div className="mt-2 flex items-center">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
              style={i < at ? { background: "#0B6B4A", color: "#fff" } : i === at ? { background: INK, color: "#fff" } : { background: "#fff", color: MUTED }}>
              {i < at ? <Check size={12} /> : i + 1}
            </span>
            {i < steps.length - 1 && <span className="h-[2px] flex-1" style={{ background: i < at ? "#0B6B4A" : "#fff" }} />}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex text-[11.5px]" style={{ color: MUTED }}>
        {steps.map((s, i) => <span key={s} className={`flex-1 last:flex-none last:text-right ${i === at ? "font-semibold" : ""}`} style={i === at ? { color: INK } : undefined}>{s}</span>)}
      </div>
    </div>
  );
}

function Persetujuan() {
  return (
    <Card title="Contoh: sudah disetujui, tapi belum dibayar" right={<Chip t="Dua status terpisah" tone="blue" />}>
      <Inner>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium" style={{ color: INK }}>Beli ikan 640 kg</div>
            <div className="text-[12.5px]" style={{ color: MUTED }}>PO-0012 · Pemasok A · contoh</div>
          </div>
          <Chip t="Pembelian" tone="amber" />
        </div>
        <div className="mt-3 text-[26px] font-normal leading-none tracking-tight" style={{ color: INK }}>Rp29,1 jt</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip t={<><FileText size={12} /> Nota terlampir</>} tone="blue" />
          <Chip t="Disetujui" tone="green" />
          <Chip t="Belum dibayar" tone="amber" />
        </div>
        <div className="mt-5 grid gap-4">
          <Track label="Persetujuan" steps={["Diajukan", "Diperiksa", "Disetujui"]} at={2} />
          <Track label="Pembayaran" steps={["Belum", "Dicicil", "Lunas"]} at={0} />
        </div>
      </Inner>
      <ul className="mt-2.5 grid gap-1 px-1.5 pb-1">
        {["Nota terlihat sebelum owner menekan Setuju", "Setuju banyak sekaligus? Daftar dan totalnya muncul dulu", "Tercatat siapa yang melakukan dan jam berapa"].map((t) => (
          <li key={t} className="flex gap-2 text-[13.5px]" style={{ color: INK }}><CircleCheck size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" color="#0B6B4A" />{t}</li>
        ))}
      </ul>
    </Card>
  );
}

function Jadwal() {
  return (
    <Section id="jadwal">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Jadwal pengerjaan · 1 bulan" right={<Chip t="4 minggu" tone="green" />}>
          <div className="grid gap-1.5">
            {JADWAL.map((w) => (
              <Inner key={w.m} className="flex items-start gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-center leading-none" style={w.flag ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>
                  <span><span className="block text-[9px] opacity-70">Minggu</span><span className="text-[17px] font-medium">{w.m}</span></span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium" style={{ color: INK }}>{w.t}</div>
                  <ul className="mt-1.5 grid gap-1">
                    {w.isi.map((x) => (
                      <li key={x} className="flex gap-2 text-[13px] leading-snug" style={{ color: MUTED }}><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ background: MUTED }} />{x}</li>
                    ))}
                  </ul>
                  {w.flag && <div className="mt-2.5"><Chip t={w.flag} tone={w.m === 4 ? "green" : "blue"} /></div>}
                </div>
              </Inner>
            ))}
          </div>
        </Card>

        <div className="grid content-start gap-3">
          <Card title="Supaya selesai dalam 1 bulan" right={<Chip t="Butuh bantuan owner" tone="amber" />}>
            <ul className="grid gap-1 px-1 pb-1">
              {SYARAT.map((s, i) => (
                <li key={s} className="flex gap-3 rounded-2xl px-2 py-2.5 text-[13.5px] leading-snug" style={{ color: INK }}><Num n={i + 1} />{s}</li>
              ))}
            </ul>
          </Card>
          <Card title="Setiap akhir minggu">
            <p className="px-2.5 pb-2 text-[13.5px] leading-relaxed" style={{ color: INK }}>
              Developer tunjukkan hasilnya langsung di sistem percobaan, jadi owner bisa mencoba dan memberi masukan sebelum lanjut ke minggu berikutnya.
            </p>
          </Card>
        </div>
      </div>
    </Section>
  );
}

function Setuju() {
  return (
    <Section id="setuju">
      <Heading kicker="Butuh konfirmasi owner · 1 dari 3" title="Hal yang perlu owner setujui" lead="Developer akan bekerja dengan ketentuan di bawah ini. Ketuk Setuju atau Mau diubah di setiap poin, atau Setuju semua sekaligus. Jawaban dikirim lewat tombol di bawah layar." />
      <Card title={`${SETUJU.length} hal`} right={<SetujuSemua />}>
        <ol className="grid gap-1.5">
          {SETUJU.map((s, i) => (
            <li key={s.t}>
              <Inner className="flex gap-3.5">
                <Num n={i + 1} dark={false} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium" style={{ color: INK }}>{s.t}</div>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed" style={{ color: MUTED }}>{s.d}</p>
                  <SetujuPilih i={i} />
                </div>
              </Inner>
            </li>
          ))}
        </ol>
      </Card>
    </Section>
  );
}

function Tanya() {
  return (
    <Section id="tanya">
      <Heading kicker="Butuh konfirmasi owner · 2 dari 3" title="Pertanyaan yang perlu dijawab" lead={`Ada ${PERTANYAAN.length} pertanyaan. Yang bertanda merah wajib dijawab paling lambat hari ke-2 minggu pertama. Ketuk pilihan, atau Pakai usulan developer kalau setuju dengan usulannya. Jawaban tersimpan di HP ini sampai dikirim.`} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
        {PERTANYAAN.map((q, i) => (
          <Card key={q.t} className="h-full">
            <div className="flex h-full flex-col p-2.5">
              <div className="flex items-start gap-3">
                <Num n={i + 1} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5">{q.wajib ? <Chip t="Wajib minggu 1" tone="red" /> : <Chip t="Bisa menyusul" tone="grey" />}</div>
                  <p className="text-[15px] font-medium leading-snug" style={{ color: INK }}>{q.t}</p>
                  <p className="mt-1 text-[12.5px] leading-snug" style={{ color: MUTED }}>Kenapa ditanya: {q.kenapa}</p>
                </div>
              </div>
              <TanyaPilih i={i} />
              <div className="mt-auto pt-3">
                <div className="rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-snug" style={{ background: TILE, color: INK }}>
                  <span className="font-semibold">Usulan developer:</span> {q.bawaan}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function Bahan() {
  return (
    <Section id="bahan">
      <Heading kicker="Butuh konfirmasi owner · 3 dari 3" title="Bahan yang perlu dikirim" lead="Kirim di minggu pertama. Foto dari HP sudah cukup, tidak perlu dirapikan." />
      <Card>
        <div className="grid gap-2 sm:grid-cols-2">
          {BAHAN_KIRIM.map((b) => {
            const Ic = ICONS[b.icon];
            return (
              <Inner key={b.t} className="flex gap-3 !p-3.5">
                <IconDot icon={Ic} />
                <p className="self-center text-[13.5px] leading-snug" style={{ color: INK }}>{b.t}</p>
              </Inner>
            );
          })}
        </div>
      </Card>
      <p className="mt-4 px-1 text-[13px] leading-relaxed" style={{ color: MUTED }}>
        Jadwal 1 bulan berlaku kalau jawaban wajib dan bahan di atas masuk tepat waktu. Kalau ada yang terlambat, developer kabari dampaknya ke jadwal.
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------- shell */

function useActive() {
  const [active, setActive] = useState("ringkasan");
  useEffect(() => {
    const on = () => {
      const line = window.innerHeight * 0.3;
      let cur = NAV[0].id;
      for (const n of NAV) {
        const el = document.getElementById(n.id);
        if (el && el.getBoundingClientRect().top <= line) cur = n.id;
      }
      setActive(cur);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return active;
}

export default function RancanganView() {
  const active = useActive();
  useEffect(() => {
    const chip = document.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    const bar = chip?.parentElement;
    if (chip && bar) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);
  return (
    <JawabanProvider>
    <div className="min-h-dvh" style={{ background: INK }}>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none} html{scroll-behavior:smooth} @media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}`}</style>

      {/* header ponsel */}
      <div className="sticky top-0 z-30 px-4 pb-3 pt-4 lg:hidden" style={{ background: INK }}>
        <div className="flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/katalis-logo-white.png" alt="Katalis Lintas Global" style={{ width: 150, height: "auto" }} />
          <a href="/demo" className="rounded-full bg-white px-3.5 py-2 text-[12.5px] font-medium" style={{ color: INK }}>Coba demo</a>
        </div>
        <nav className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4" aria-label="Bagian halaman">
          {NAV.map((n) => (
            <a key={n.id} data-chip={n.id} href={`#${n.id}`} className="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] transition"
              style={active === n.id ? { background: "#EEF0F5", color: INK, fontWeight: 600 } : { background: "#1B1D21", color: "#C6CCD3" }}>{n.label}</a>
          ))}
        </nav>
      </div>

      <div className="flex">
        {/* sidebar desktop */}
        <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col px-3 pb-4 pt-5 text-white lg:flex">
          <div className="mb-5 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/katalis-logo-white.png" alt="Katalis Lintas Global" style={{ width: 190, height: "auto" }} />
            <div className="mt-1 px-1 text-[11.5px] text-[#8A9199]">Rancangan final · dari Dar Dev</div>
          </div>
          <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto" aria-label="Bagian halaman">
            {NAV.map((n, i) => {
              const on = active === n.id;
              const Ic = n.icon;
              return (
                <div key={n.id}>
                  {i === 5 && <div className="px-3.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A9199]">Butuh konfirmasi owner</div>}
                  <a href={`#${n.id}`} className="flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] transition"
                    style={{ background: on ? "#EEF0F5" : "transparent", color: on ? INK : "#C6CCD3", fontWeight: on ? 600 : 400 }}>
                    <Ic size={20} strokeWidth={1.8} color={on ? INK : "#9AA2AB"} />
                    <span className="flex-1">{n.label}</span>
                    {n.id === "tanya" && <span className="rounded-full bg-[#E0524A] px-1.5 py-0.5 text-[11px] font-semibold text-white">{PERTANYAAN.length}</span>}
                  </a>
                </div>
              );
            })}
          </nav>
          <div className="mt-3 rounded-2xl p-3 text-[12px] text-[#8A9199]" style={{ background: "#1B1D21" }}>
            Pengerjaan mulai begitu jawaban wajib dan bahan masuk.
            <a href="/demo/desktop" className="mt-2 block w-full rounded-full bg-white py-2 text-center text-[12.5px] font-medium" style={{ color: INK }}>Coba demo aplikasi</a>
            <a href="/penawaran" className="mt-1.5 block w-full rounded-full py-2 text-center text-[12.5px] text-[#C6CCD3]">Kembali ke penawaran</a>
          </div>
        </aside>

        {/* konten */}
        <main className="min-w-0 flex-1 rounded-t-[28px] lg:rounded-l-[32px] lg:rounded-tr-none" style={{ background: "linear-gradient(180deg,#EFF1F6 0%,#E9EDF5 60%,#DFE6F2 100%)" }}>
          <header className="hidden items-center justify-between gap-4 px-8 pb-2 pt-5 lg:flex">
            <div className="flex w-[360px] items-center gap-2.5 rounded-full bg-white px-4 py-2.5 text-[14px] shadow-sm" style={{ color: MUTED }}>
              <Search size={18} color={MUTED} /> Rancangan final · KATALIS ERP
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-sm">
                <span className="text-[12.5px]" style={{ color: MUTED }}>Untuk</span>
                <span className="rounded-full px-3 py-1.5 text-[13px] font-medium" style={{ background: TILE, color: INK }}>Owner</span>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-white" style={{ background: INK }}>DD</span>
            </div>
          </header>

          <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-8 px-4 pb-12 pt-6 sm:px-8 lg:pt-4">
            <Ringkasan />
            <Perubahan />
            <Alur />
            <Section id="contoh">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                <Neraca />
                <Persetujuan />
              </div>
            </Section>
            <Jadwal />
            <Setuju />
            <Tanya />
            <Bahan />
          </div>
          <KirimBar />
          <div className="h-6" />
        </main>
      </div>
    </div>
    </JawabanProvider>
  );
}
