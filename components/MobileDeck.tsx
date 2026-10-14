"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, CalendarClock, ChartColumn, Factory, FileSignature, FlaskConical, LayoutDashboard, Lock, Package, ReceiptText, Scale, ShieldCheck, ShoppingCart, Snowflake, Truck, Wallet, type LucideIcon } from "lucide-react";
import { slides } from "@/data/slides";

/**
 * Mobile-first version of the pitch deck for portrait phones.
 * Not a scaled-down slide: every slide is re-composed as a full-screen vertical card with big type,
 * short points, native charts and real demo screenshots.  Same order and numbers as the slide deck.
 */
const GREEN = "#12A676", DEEP = "#0E5C46", INK = "#1F2A26", MUTED = "#5E6B66", PAPER = "#FAF9F6", SOFT = "#F0EFE9";
const SECTION_TITLES = ["Cover", "Ringkasan", "Ongkos kirim", "Hasil tiap ekor", "Sisa olahan", "Gudang dingin", "Jadwal", "Keuangan", "Dashboard Owner", "Aplikasi ponsel", "Asisten AI", "Paket", "Jadwal kerja", "Penutup"];
const DARK_CARDS = new Set([0, 13]);

const DEMOS = [
  { href: "/demo", label: "Demo ponsel", hint: "Aplikasi ponsel interaktif" },
  { href: "/demo/desktop", label: "Demo desktop", hint: "Semua modul dan laporan" },
  { href: "/demo/live", label: "Demo berdampingan", hint: "Desktop dan ponsel sinkron" },
];

/* ---------------------------------------------------------------- pieces */
const Tag = ({ children, dark }: { children: React.ReactNode; dark?: boolean }) => {
  const problem = typeof children === "string" && children.startsWith("Masalah");
  return (
  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: dark ? "rgba(255,255,255,.16)" : "#fff", color: dark ? "#fff" : DEEP, boxShadow: dark ? "none" : "0 1px 2px rgba(20,30,25,.08)" }}>
    <span className="h-2 w-2 rounded-full" style={{ background: dark ? "#CFF3E5" : problem ? "#C98A1B" : GREEN }} />{children}
  </span>
  );
};
const H = ({ children, dark }: { children: React.ReactNode; dark?: boolean }) => <h2 className="mt-3 text-[24px] font-extrabold leading-[1.1] tracking-tight" style={{ color: dark ? "#fff" : INK }}>{children}</h2>;
const Lead = ({ children, dark }: { children: React.ReactNode; dark?: boolean }) => <p className="mt-2 text-[14px] leading-relaxed" style={{ color: dark ? "rgba(255,255,255,.85)" : MUTED }}>{children}</p>;
const Panel = ({ children, className = "", tone = "white" }: { children: React.ReactNode; className?: string; tone?: "white" | "soft" | "green" | "ink" }) => (
  <div className={`rounded-[22px] p-4 ${className}`} style={{ background: { white: "#fff", soft: SOFT, green: DEEP, ink: INK }[tone], color: tone === "green" || tone === "ink" ? "#fff" : INK, boxShadow: tone === "white" ? "0 1px 3px rgba(20,30,25,.08)" : "none" }}>{children}</div>
);
const Stat = ({ v, l, tone = "soft" }: { v: string; l: string; tone?: "soft" | "green" | "white" }) => (
  <div className="rounded-[22px] p-4" style={{ background: tone === "green" ? DEEP : tone === "white" ? "#fff" : SOFT, color: tone === "green" ? "#fff" : INK }}>
    <div className="font-extrabold leading-none tracking-tight" style={{ fontSize: v.length > 9 ? 19 : v.length > 7 ? 21 : 24 }}>{v}</div>
    <div className="mt-1.5 text-[11.5px] leading-snug" style={{ color: tone === "green" ? "rgba(255,255,255,.8)" : MUTED }}>{l}</div>
  </div>
);
const Dot = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <li className="flex gap-3">
    <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: GREEN }}>✓</span>
    <span><span className="block text-[14.5px] font-bold leading-snug" style={{ color: INK }}>{children}</span>{sub && <span className="block text-[12.5px] leading-snug" style={{ color: MUTED }}>{sub}</span>}</span>
  </li>
);
const Bar = ({ l, p, v, hot }: { l: string; p: number; v: string; hot?: boolean }) => (
  <div>
    <div className="mb-1.5 flex justify-between text-[13.5px]"><span className="font-semibold">{l}</span><span style={{ color: MUTED }}>{v}</span></div>
    <div className="h-2.5 rounded-full" style={{ background: "#E7E6DF" }}><div className="h-2.5 rounded-full" style={{ width: `${Math.max(3, p)}%`, background: hot ? "#D9902B" : GREEN }} /></div>
  </div>
);
const Pill = ({ t, k = "g" }: { t: string; k?: "g" | "a" | "r" | "b" | "n" }) => {
  const m = { g: ["#DDF3E8", "#0B6B4A"], a: ["#FBF0D5", "#8A5A00"], r: ["#FBE5E3", "#A8322B"], b: ["#E4EEFB", "#2D5F9A"], n: ["#ECEBE6", "#5E6B66"] }[k];
  return <span className="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: m[0], color: m[1] }}>{t}</span>;
};
function Zoomable({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative mt-5 block w-full overflow-hidden rounded-2xl text-left" style={{ boxShadow: "0 10px 30px rgba(20,30,25,.2)" }} aria-label="Perbesar gambar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block w-full" />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-3 py-1.5 text-[12px] font-semibold text-white">🔍 Perbesar</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 text-[13px] text-white"><span className="opacity-70">Geser dan cubit untuk melihat detail</span><button type="button" onClick={() => setOpen(false)} className="rounded-full bg-white/20 px-4 py-1.5 font-semibold">Tutup</button></div>
          <div className="min-h-0 flex-1 overflow-auto" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-w-none" style={{ width: 1100 }} />
          </div>
        </div>
      )}
    </>
  );
}
const Shot = ({ src, cap }: { src: string; cap: string }) => (
  <figure className="w-[196px] shrink-0 snap-center">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={cap} className="w-full" style={{ boxShadow: "0 10px 24px rgba(20,30,25,.22)", border: "4px solid #111214", borderRadius: 26 }} />
    <figcaption className="mt-2 text-center text-[12px] font-semibold" style={{ color: MUTED }}>{cap}</figcaption>
  </figure>
);
const DemoBtns = ({ list, dark }: { list: typeof DEMOS; dark?: boolean }) => (
  <div className="mt-5 grid gap-2">
    {list.map((d) => (
      <a key={d.href} href={d.href} className="flex items-center justify-between rounded-2xl px-4 py-3 active:scale-[0.98]" style={{ background: dark ? "#fff" : GREEN, color: dark ? DEEP : "#fff" }}>
        <span><span className="block text-[15px] font-bold">▶ {d.label}</span><span className="text-[12px] opacity-80">{d.hint}</span></span><span className="text-xl">›</span>
      </a>
    ))}
  </div>
);
const Section = ({ id, bg = PAPER, children, dark }: { id: number; bg?: string; children: React.ReactNode; dark?: boolean }) => (
  <section data-card={id} className="snap-start px-4 pb-24 pt-[68px]" style={{ background: bg, color: dark ? "#fff" : INK, minHeight: "100dvh" }}>{children}</section>
);

/* ----------------------------------------------------------------- cards */
function Solusi({ modul, points }: { modul: string; points: string[] }) {
  return (
    <div className="mt-4 rounded-[22px] p-4 text-white" style={{ background: DEEP }}>
      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-white/80"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">✓</span>Solusi di KATALIS ERP · {modul}</div>
      <ul className="mt-2.5 space-y-1.5">{points.map((t) => <li key={t} className="flex gap-2 text-[14px] font-semibold leading-snug"><span className="text-[#9BE7C8]">✓</span>{t}</li>)}</ul>
    </div>
  );
}
function Layar({ src, cap }: { src: string; cap: string }) {
  return (
    <figure className="mt-3 flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={cap} className="w-[290px]" />
      <figcaption className="-mt-2 text-center text-[12px] font-semibold" style={{ color: MUTED }}>Begini tampilannya di ponsel · {cap}</figcaption>
    </figure>
  );
}
const Mean = ({ children }: { children: React.ReactNode }) => <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>{children}</p>;

function Cards() {
  const yv = [63.1, 61.3, 61.4, 63.7, 52.2, 64.4, 70.2, 63.5, 63.3, 63.3, 60.2];
  const pos = (v: number) => `${((v - 50) / 22) * 100}%`;
  return (
    <>
{/* 1 cover */}
      <Section id={0} bg={GREEN} dark>
        <div className="flex min-h-[calc(100dvh-11rem)] flex-col justify-between">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/katalis-logo-white.png" alt="Katalis Lintas Global" className="w-[230px]" />
            <p className="mt-5 text-[15px] font-semibold text-white/90">Disiapkan untuk PT Katalis Lintas Global · Oktober 2026</p>
          </div>
          <div>
            <h1 className="text-[50px] font-extrabold leading-[0.95] tracking-tight">KATALIS<br />ERP.</h1>
            <p className="mt-4 text-[16px] font-medium leading-snug text-white/90">Kelola usaha perikanan lebih mudah dalam satu aplikasi.</p>
            <div className="mt-6 flex items-center gap-3 text-[14px] font-semibold text-white/85"><span className="rounded-full bg-white/20 px-3 py-1.5">Penawaran dari Dar Dev</span><span>Geser ke atas ↑</span></div>
          </div>
        </div>
      </Section>
      
      {/* 2 ringkasan */}
      <Section id={1}>
        <Tag>Ringkasan</Tag>
        <H>Enam masalah di usaha Katalis, dan jawabannya</H>
        <div className="mt-4 space-y-2.5">
          {[["Hampir sepertiga uang keluar habis buat ongkos kirim", "Ongkos tiap kiriman dicatat dan dibandingkan"], ["Hasil daging tiap ekor beda jauh, 52 sampai 70 kg dari 100 kg ikan", "Hasil tiap ekor dicatat dan dibandingkan dengan rencana"], ["65 kg sisa potongan ikan belum laku", "Sisa potongan tercatat, harga ikut kelas mutu"], ["Tagihan gudang dingin dihitung pakai tangan", "Tagihan keluar otomatis, tinggal dicek"], ["Jadwal dua mitra bisa saling tabrak", "Bentrok ketahuan sebelum hari H"], ["55 transaksi belum punya bukti transfer", "Daftar cek sebelum tutup buku"]].map(([a, b], i) => (
            <div key={a} className="rounded-[18px] bg-white p-3.5" style={{ boxShadow: "0 1px 3px rgba(20,30,25,.08)" }}>
              <div className="flex gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold" style={{ background: "#FBE5E3", color: "#A8322B" }}>{i + 1}</span><span className="text-[13.5px] font-semibold leading-snug" style={{ color: INK }}>{a}</span></div>
              <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-[13.5px] font-bold leading-snug" style={{ background: "#DDF3E8", color: "#0B6B4A" }}><span>→</span><span>{b}</span></div>
            </div>
          ))}
        </div>
      </Section>

      {/* 3 ongkos kirim */}
      <Section id={2} bg="#F3EEE2">
        <Tag>Masalah 1 dari 6 · Ongkos kirim</Tag>
        <H>Hampir sepertiga uang keluar habis buat ongkos kirim</H>
        <Mean>Biaya Siklus 1 totalnya Rp37 juta. Rp11 juta di antaranya cuma buat kirim barang. Tanpa catatan, susah tahu ongkos mana yang kemahalan.</Mean>
        <Panel className="mt-3">
          <div className="text-[13px] font-semibold">Dari tiap Rp100 yang keluar:</div>
          <div className="mt-2.5 grid grid-cols-10 gap-1">{Array.from({ length: 100 }, (_, i) => <span key={i} className="block h-[22px] rounded-md" style={{ background: i < 30 ? "#C98A1B" : "#D3E4DB" }} />)}</div>
          <div className="mt-2.5 flex items-center gap-2 text-[12.5px] font-semibold"><span className="h-3 w-3 rounded-sm" style={{ background: "#C98A1B" }} />Rp30 habis buat ongkos kirim</div>
        </Panel>
        <Solusi modul="Laporan biaya" points={["Ongkos tiap kiriman dicatat", "Tarif lama dan baru bisa dibandingkan", "Ada tanda kalau ongkos naik"]} />
        <Layar src="/mobile/m-biaya.png" cap="Laporan biaya" />
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>Data nyata Siklus 1.</p>
      </Section>

      {/* 4 hasil tiap ekor */}
      <Section id={3} bg="#F3EEE2">
        <Tag>Masalah 2 dari 6 · Hasil tiap ekor</Tag>
        <H>Dari 100 kg ikan, loin yang jadi bisa 52 kg atau 70 kg</H>
        <Mean>Rencananya 60 kg. Rata-rata Siklus 1 sudah 62,6 kg, tapi ekor 005 cuma 52,2 kg. Tanpa catatan per ekor, sebabnya sulit dicari.</Mean>
        <Panel className="mt-3">
          <div className="text-[13px] font-semibold">Dari 100 kg ikan, berapa kg yang jadi loin?</div>
          <div className="relative mx-3 mb-14 mt-14 h-2 rounded-full" style={{ background: "#E6E4DC" }}>
            {yv.map((v, i) => <span key={i} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: pos(v), background: "#9CC8B4" }} />)}
            {[[52.2, "Terendah", "52,2", "#C98A1B", true], [60, "Rencana", "60", "#14201B", true], [62.6, "Rata-rata", "62,6", "#0E5C46", false], [70.2, "Tertinggi", "70,2", "#12A676", false]].map(([v, l, n, c, up]) => (
              <span key={l as string} className="absolute" style={{ left: pos(v as number) }}>
                <span className="absolute -top-[7px] h-[22px] w-[22px] -translate-x-1/2 rounded-full border-[3px] border-white" style={{ background: c as string }} />
                <span className="absolute -translate-x-1/2 text-center" style={{ [up ? "bottom" : "top"]: up ? 22 : 24, width: 80 } as React.CSSProperties}><span className="block text-[10.5px]" style={{ color: MUTED }}>{l as string}</span><span className="block text-[16px] font-extrabold leading-none" style={{ color: c as string }}>{n as string}</span></span>
              </span>
            ))}
            {[50, 60, 70].map((t) => <span key={t} className="absolute top-6 -translate-x-1/2 text-[10px]" style={{ left: pos(t), color: "#8C968F" }}>{t}</span>)}
          </div>
          <div className="text-[11px]" style={{ color: MUTED }}>kg loin dari tiap 100 kg ikan utuh · tiap titik = satu ekor</div>
        </Panel>
        <Solusi modul="Produksi" points={["Hasil tiap ekor dicatat", "Langsung dibandingkan dengan rencana", "Ekor yang hasilnya rendah ketahuan"]} />
        <Layar src="/mobile/m-produksi.png" cap="Modul Produksi" />
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>Data nyata Siklus 1: 11 ekor, 481 kg.</p>
      </Section>

      {/* 5 sisa olahan */}
      <Section id={4} bg="#F3EEE2">
        <Tag>Masalah 3 dari 6 · Sisa potongan dan mutu</Tag>
        <H>65 kg sisa potongan ikan belum laku</H>
        <Mean>Kepala, tetelan, dan potongan lain tertinggal setelah daging diambil. Harga tiap kelas mutu juga beda, jadi gampang salah patok.</Mean>
        <Panel className="mt-3">
          <div className="text-[64px] font-extrabold leading-none tracking-tight" style={{ color: "#C98A1B" }}>65 kg</div>
          <div className="mt-1 text-[14px] font-semibold">sisa potongan di stok yang belum ada pembelinya</div>
          <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold" style={{ background: "#F0EFE9" }}>🏷 6 kelas mutu, 6 harga berbeda</div>
        </Panel>
        <Solusi modul="Stok dan mutu" points={["Sisa potongan tercatat di stok", "Calon pembeli bisa dicatat", "Harga otomatis ikut kelas mutu"]} />
        <Layar src="/mobile/m-stok.png" cap="Modul Stok" />
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>Data nyata Siklus 1.</p>
      </Section>

      {/* 6 gudang dingin */}
      <Section id={5} bg="#F3EEE2">
        <Tag>Masalah 4 dari 6 · Gudang dingin</Tag>
        <H>Tagihan gudang dingin dihitung pakai tangan, gampang salah</H>
        <Mean>Tarifnya naik sesuai lama simpan: Rp75 per kg untuk sehari, Rp2.250 per kg untuk sebulan. Salah hitung sedikit, tagihan pelanggan ikut salah.</Mean>
        <Panel className="mt-3">
          {[["Sampai 24 jam", "Rp75/kg"], ["Sampai 10 hari", "Rp750/kg"], ["30 hari", "Rp2.250/kg"]].map(([a, b], i) => (
            <div key={a} className="flex justify-between py-2 text-[13.5px]" style={{ borderTop: i ? "1px solid #ECEBE6" : "none" }}><span style={{ color: MUTED }}>{a}</span><b>{b}</b></div>
          ))}
        </Panel>
        <Panel className="mt-3" tone="green">
          <div className="text-[12px] text-white/75">Contoh: 10.000 kg disimpan 15 hari</div>
          <div className="mt-1 text-[32px] font-extrabold leading-none">Rp11.250.000</div>
          <div className="mt-1.5 text-[12px] text-white/80">dihitung otomatis, tanpa kalkulator</div>
        </Panel>
        <Solusi modul="Gudang dingin" points={["Tarif tersimpan di aplikasi", "Tagihan keluar sendiri, tinggal dicek", "Tarif bisa diubah kalau berubah"]} />
        <Layar src="/mobile/m-gudang.png" cap="Modul Gudang Dingin" />
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>Contoh hitungan, bukan tagihan nyata.</p>
      </Section>

      {/* 7 jadwal */}
      <Section id={6} bg="#F3EEE2">
        <Tag>Masalah 5 dari 6 · Jadwal</Tag>
        <H>Dua mitra bergantian pakai mesin, jadwal bisa saling tabrak</H>
        <Mean>CV DUS pakai mesin Senin, Rabu, Jumat. PT SNS Selasa, Kamis, Sabtu. Pesanan ABF jam 10.00 hari Senin menabrak jadwal CV DUS.</Mean>
        <div className="mt-3 space-y-1.5">
          {[["Senin", "CV DUS"], ["Selasa", "PT SNS"], ["Rabu", "CV DUS"], ["Kamis", "PT SNS"], ["Jumat", "CV DUS"], ["Sabtu", "PT SNS"]].map(([d, w], i) => (
            <div key={d} className="flex items-center gap-2"><span className="w-14 text-[13px] font-semibold">{d}</span><span className="flex flex-1 items-center justify-between rounded-xl px-3 py-2 text-[13px] font-bold text-white" style={{ background: w === "CV DUS" ? "#14201B" : DEEP }}>{w}{i === 0 && <span className="rounded-lg px-2 py-0.5 text-[11px]" style={{ background: "#B4443C" }}>⚠ ABF</span>}</span></div>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] font-semibold" style={{ color: "#B4443C" }}>Senin: pesanan ABF menabrak produksi</p>
        <Solusi modul="Jadwal" points={["Jadwal semua mitra dalam satu kalender", "Bentrok ketahuan sebelum hari H", "Pesanan ABF bisa dipindah ke jam kosong"]} />
        <Layar src="/mobile/m-jadwal.png" cap="Modul Jadwal" />
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>Angka kapasitas adalah perkiraan.</p>
      </Section>

      {/* 8 keuangan */}
      <Section id={7} bg="#F3EEE2">
        <Tag>Masalah 6 dari 6 · Keuangan</Tag>
        <H>55 transaksi belum punya bukti transfer</H>
        <Mean>Nota sudah lengkap semua. Tapi dari 219 transaksi, baru 164 yang ada bukti transfernya. Tanpa bukti, tutup buku jadi tebak-tebakan.</Mean>
        <Panel className="mt-3">
          <div className="text-[13px] font-semibold">Bukti transfer yang sudah lengkap</div>
          <div className="mt-1 flex items-end gap-2"><span className="text-[64px] font-extrabold leading-none tracking-tight" style={{ color: DEEP }}>164</span><span className="pb-2 text-[16px]" style={{ color: MUTED }}>dari 219</span></div>
          <div className="mt-2 h-2.5 rounded-full" style={{ background: "#E6E4DC" }}><div className="h-2.5 rounded-full" style={{ width: `${(164 / 219) * 100}%`, background: DEEP }} /></div>
          <div className="mt-2 text-[13px] font-bold" style={{ color: "#C98A1B" }}>55 transaksi belum ada bukti</div>
          <div className="mt-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>✓ Nota: 243 dari 243 sudah lengkap</div>
        </Panel>
        <Solusi modul="Keuangan" points={["Tiap transaksi punya nota dan bukti", "Ada daftar cek sebelum tutup buku", "Setelah ditutup, catatan terkunci"]} />
        <Layar src="/mobile/m-keuangan.png" cap="Modul Keuangan" />
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>Data Monitor Dana Fasilitas Bungus.</p>
      </Section>

{/* 2 dashboard */}
      <Section id={8}>
        <Tag>Dashboard Owner</Tag>
        <H>Semua aktivitas usaha terkendali</H>
        <Lead>Satu layar untuk memantau, memutuskan, dan mengendalikan seluruh usaha.</Lead>
        <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-3" style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mobile/desktop-dashboard.png" alt="Dashboard Owner" className="h-[330px] max-w-none rounded-2xl" style={{ boxShadow: "0 10px 30px rgba(20,30,25,.2)" }} />
        </div>
        <div className="text-[12px]" style={{ color: MUTED }}>← Geser ke samping untuk melihat seluruh dashboard · Data contoh</div>
        <ul className="mt-6 space-y-4">
          <Dot sub="Total ikan, saldo kas, piutang, stok.">Angka utama langsung terlihat</Dot>
          <Dot sub="Setujui atau tolak, tanpa menunggu.">Persetujuan di satu tempat</Dot>
          <Dot sub="Tagihan telat, mutu ditahan, bukti belum ada.">Peringatan lebih awal</Dot>
        </ul>
        <DemoBtns list={[DEMOS[1], DEMOS[2]]} />
      </Section>
      {/* 3 ponsel */}
      <Section id={9} bg="#E9EDF5">
        <Tag>Aplikasi ponsel</Tag>
        <H>Pantau dan putuskan dari ponsel</H>
        <Lead>Keputusan tidak perlu menunggu sampai di kantor.</Lead>
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3">
          <Shot src="/mobile/phone-home.png" cap="Beranda" /><Shot src="/mobile/phone-approve.png" cap="Persetujuan" /><Shot src="/mobile/phone-modul.png" cap="Modul" /><Shot src="/mobile/phone-laporan.png" cap="Laporan" />
        </div>
        <div className="mb-3 text-[12px]" style={{ color: MUTED }}>← Geser ke samping untuk melihat layar lain</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Lihat", "Untung, stok, tagihan"], ["Putuskan", "Setujui dari mana saja"], ["Pantau", "Aktivitas dan peringatan"]].map(([a, b]) => (
            <div key={a} className="rounded-2xl bg-white p-3"><div className="text-[15px] font-extrabold" style={{ color: DEEP }}>{a}</div><div className="mt-1 text-[11.5px] leading-snug" style={{ color: MUTED }}>{b}</div></div>
          ))}
        </div>
        <DemoBtns list={[DEMOS[0], DEMOS[2]]} />
      </Section>
      {/* asisten AI */}
      <Section id={10}>
        <Tag>Asisten AI</Tag>
        <H>Tanya saja, asisten yang mencarikan jawabannya</H>
        <Mean>Tidak perlu buka banyak menu. Tulis pertanyaan dengan kalimat biasa, jawabannya diambil dari data usaha sendiri.</Mean>
        <div className="mt-3 space-y-2">
          {["Tagihan mana yang telat?", "Ekor mana hasilnya paling rendah?", "Berapa saldo kas sekarang?"].map((q) => (
            <div key={q} className="flex items-center gap-2.5 rounded-full bg-white px-4 py-3 text-[13.5px] font-medium" style={{ boxShadow: "0 1px 3px rgba(20,30,25,.08)" }}><Sparkles size={16} color={DEEP} strokeWidth={1.8} />{q}</div>
          ))}
        </div>
        <Layar src="/mobile/m-asisten.png" cap="Asisten AI" />
        <DemoBtns list={[DEMOS[0]]} />
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>Demo: jawaban dari data contoh dan Siklus 1. Versi sebenarnya membaca data asli usaha.</p>
      </Section>

      {/* 14 paket */}
      <Section id={11} bg="#F4F3EE">
        <Tag>Paket</Tag>
        <H>Satu paket lengkap, semua sudah termasuk</H>
        <Lead>Harga dibahas bersama setelah fitur disepakati.</Lead>
        <div className="mt-5 rounded-[28px] p-5 text-white" style={{ background: DEEP }}>
          <div className="text-[22px] font-extrabold">Paket Lengkap</div>
          <div className="text-[13px] opacity-80">Dari beli ikan sampai laporan keuangan.</div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl p-3.5" style={{ background: "#14735A" }}>
            <Sparkles size={22} color="#fff" strokeWidth={1.8} className="mt-0.5 shrink-0" />
            <div><div className="text-[15px] font-extrabold">Asisten AI</div><div className="text-[12.5px] leading-snug text-white/85">Tanya dengan kalimat biasa, jawabnya dari data usaha sendiri.</div></div>
          </div>
          {[["Setiap hari", ["Dashboard owner", "Pembelian dan pemasok", "Produksi dan hasil tiap ekor", "Cek mutu dan asal produk", "Stok dan titipan", "Gudang dingin dan pembekuan", "Penjualan dan tagihan", "Jadwal produksi"]], ["Keuangan dan kendali", ["Biaya tiap produksi", "Tutup buku dan laporan bulanan", "Laporan untuk direksi", "Coba skenario harga", "Pengingat tagihan dan jadwal", "Akses per peran", "Aplikasi ponsel"]]].map(([t, items]) => (
            <div key={t as string} className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#9BE7C8]">{t as string}</div>
              <ul className="mt-2 space-y-2">{(items as string[]).map((i) => <li key={i} className="flex gap-2 text-[14px] font-medium"><span style={{ color: "#9BE7C8" }}>✓</span>{i}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px]" style={{ color: MUTED }}>Estimasi selesai 1 bulan, tiap tahap diuji dulu sebelum lanjut.</p>
      </Section>
      {/* jadwal pengerjaan */}
      <Section id={12}>
        <Tag>Jadwal pengerjaan</Tag>
        <H>Selesai dalam 1 bulan</H>
        <Mean>Tahap dikerjakan bersamaan, jadi total 4 minggu. Tiap minggu ada hasil yang bisa dicoba.</Mean>
        <div className="mt-4 space-y-3">
          {([["Minggu 1", "Rancang", ["Diskusi dan wawancara tim", "Rancangan disetujui", "Aplikasi inti mulai dibuat"], "Rancangan siap"], ["Minggu 2", "Bangun inti", ["Pembelian, produksi, stok", "Penjualan dan tagihan", "Mutu, gudang dingin, jadwal"], "Modul harian bisa dicoba"], ["Minggu 3", "Keuangan", ["Biaya dan tutup buku", "Laporan bulanan", "Asisten AI mulai dibuat"], "Laporan keuangan jalan"], ["Minggu 4", "Uji dan pakai", ["Asisten AI selesai", "Uji bersama pengguna", "Pelatihan dan mulai dipakai"], "Siap dipakai"]] as [string, string, string[], string][]).map(([w, t, items, out], i) => {
            const last = i === 3;
            return (
              <div key={w} className="rounded-[22px] p-4" style={{ background: last ? DEEP : "#fff", color: last ? "#fff" : INK, boxShadow: last ? "none" : "0 1px 3px rgba(20,30,25,.08)" }}>
                <div className="flex items-center gap-2.5"><span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: last ? "#14735A" : "#E4EFE9", color: last ? "#fff" : DEEP }}>{w}</span><span className="text-[17px] font-extrabold">{t}</span></div>
                <ul className="mt-2.5 space-y-1.5">{items.map((x) => <li key={x} className="flex gap-2 text-[13.5px] font-medium"><span style={{ color: last ? "#9BE7C8" : GREEN }}>✓</span>{x}</li>)}</ul>
                <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-bold" style={{ background: last ? "#14735A" : "#E4EFE9", color: last ? "#fff" : DEEP }}>⚑ {out}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Sebelum mulai</div>
        <ol className="mt-2 space-y-2">
          {[["Diskusi kebutuhan", "Presentasi dan prioritas"], ["Pastikan kebutuhan", "Lengkapi informasi"], ["Rancangan disetujui", "Kebutuhan dan rencana"], ["Penawaran final", "Harga dan jadwal"], ["Mulai dibuat", "Pembayaran awal"]].map(([a2, b2], i) => (
            <li key={a2} className="flex items-center gap-3 rounded-2xl bg-white p-3" style={{ boxShadow: "0 1px 3px rgba(20,30,25,.08)" }}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: GREEN }}>{i + 1}</span><span><span className="block text-[13.5px] font-bold">{a2}</span><span className="text-[12px]" style={{ color: MUTED }}>{b2}</span></span></li>
          ))}
        </ol>
      </Section>

      {/* 17 penutup */}
      <Section id={13} bg={DEEP} dark>
        <div className="flex min-h-[calc(100dvh-11rem)] flex-col justify-between">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/katalis-logo-white.png" alt="Katalis Lintas Global" className="w-[200px]" />
            <h2 className="mt-10 text-[34px] font-extrabold leading-[1.05] tracking-tight">Mari kelola usaha perikanan lebih mudah dan jelas.</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/85">Semua aktivitas terlihat dan terkendali dari satu dashboard. Penawaran ini belum mengikat; harga dibahas setelah fitur disepakati.</p>
          </div>
          <div>
            <div className="rounded-full bg-white px-5 py-3 text-center text-[15px] font-extrabold" style={{ color: GREEN }}>Jadwalkan diskusi kebutuhan</div>
            <DemoBtns list={DEMOS} dark />
            <a href="/KATALIS-ERP-Proposal.pdf" download className="mt-3 block rounded-2xl bg-white/15 px-5 py-3.5 text-center text-[15px] font-bold">⬇ Unduh PDF</a>
            <p className="mt-5 text-center text-[13px] text-white/70">Dar Dev · KATALIS ERP</p>
          </div>
        </div>
      </Section>
        </>
  );
}

/* ------------------------------------------------------------- the shell */
export default function MobileDeck({ idx, go }: { idx: number; go: (n: number) => void }) {
  const total = slides.length;
  const scroller = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState(idx);
  const started = useRef(false);

  // jump to the card in the URL hash on first render (instant, then start tracking)
  useEffect(() => {
    const root = scroller.current;
    const el = root?.querySelector<HTMLElement>(`[data-card="${idx}"]`);
    if (root) { root.style.scrollBehavior = "auto"; if (el) root.scrollTop = el.offsetTop; setActive(idx); }
    const t = setTimeout(() => { if (root) root.style.scrollBehavior = ""; started.current = true; go(idx); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reveal each card's content the first time it comes into view
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add("in"); io.unobserve(e.target); } }), { root, threshold: 0.12 });
    root.querySelectorAll("section[data-card]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // active card from scroll position (cards can be taller than the screen)
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const probe = root.scrollTop + root.clientHeight * 0.3;
        const els = Array.from(root.querySelectorAll<HTMLElement>("[data-card]"));
        let cur = 0;
        els.forEach((el, i) => { if (el.offsetTop <= probe) cur = i; });
        setActive(cur);
        if (started.current) go(cur);
      });
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => { root.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = (n: number) => {
    const root = scroller.current;
    const el = root?.querySelector<HTMLElement>(`[data-card="${Math.max(0, Math.min(total - 1, n))}"]`);
    if (el && root) root.scrollTo({ top: el.offsetTop, behavior: "smooth" });
    setMenu(false);
  };
  const onDark = DARK_CARDS.has(active);

  return (
    <div className="fixed inset-0" style={{ background: PAPER }}>
      <style>{`
        .mscroll::-webkit-scrollbar{display:none}.mscroll{scrollbar-width:none}
      `}</style>
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pb-2" style={{ paddingTop: "max(12px, env(safe-area-inset-top))", background: onDark ? "linear-gradient(180deg, rgba(14,92,70,.96), rgba(14,92,70,0))" : "linear-gradient(180deg, rgba(250,249,246,.97), rgba(250,249,246,0))" }}>
        <span className="rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: onDark ? "rgba(255,255,255,.2)" : "#fff", color: onDark ? "#fff" : INK, boxShadow: onDark ? "none" : "0 1px 2px rgba(20,30,25,.1)" }}>{String(active + 1).padStart(2, "0")} / {total} · {SECTION_TITLES[active]}</span>
        <button type="button" aria-label="Menu" onClick={() => setMenu(true)} className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90" style={{ background: onDark ? "rgba(255,255,255,.2)" : "#fff", boxShadow: onDark ? "none" : "0 1px 2px rgba(20,30,25,.1)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={onDark ? "#fff" : INK} strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>

      <div className="absolute right-1 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5">
        {Array.from({ length: total }, (_, i) => <span key={i} className="block w-1 rounded-full transition-all" style={{ height: i === active ? 16 : 5, background: onDark ? (i === active ? "#fff" : "rgba(255,255,255,.4)") : (i === active ? GREEN : "#CFD3D0") }} />)}
      </div>
      <div ref={scroller} className="mscroll h-full snap-y snap-proximity overflow-y-auto scroll-smooth"><Cards /></div>

      {active < total - 1 && (
        <button type="button" aria-label="Berikutnya" onClick={() => jump(active + 1)} className="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full shadow-lg active:scale-90" style={{ background: onDark ? "#fff" : GREEN, marginBottom: "env(safe-area-inset-bottom)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={onDark ? GREEN : "#fff"} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
        </button>
      )}

      {menu && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/50" onClick={() => setMenu(false)}>
          <div className="max-h-[88%] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#D9DBD8]" />
            <div className="mb-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Coba demo</div>
            <div className="grid gap-2">{DEMOS.map((d) => <a key={d.href} href={d.href} className="rounded-2xl px-5 py-3 text-white" style={{ background: GREEN }}><span className="block text-[15px] font-bold">▶ {d.label}</span><span className="text-[12px] opacity-85">{d.hint}</span></a>)}</div>
            <a href="/KATALIS-ERP-Proposal.pdf" download className="mt-2 block rounded-2xl px-5 py-3 text-[15px] font-bold" style={{ background: SOFT }}>⬇ Unduh PDF</a>
            <div className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Loncat ke</div>
            <div className="grid grid-cols-1 gap-1">
              {SECTION_TITLES.map((t, i) => (
                <button key={t} type="button" onClick={() => jump(i)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-[#F0EFE9]" style={{ background: i === active ? "#DDF3E8" : "transparent" }}>
                  <span className="w-6 text-[12px] font-bold tabular-nums" style={{ color: MUTED }}>{String(i + 1).padStart(2, "0")}</span><span className="text-[15px] font-semibold">{t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
