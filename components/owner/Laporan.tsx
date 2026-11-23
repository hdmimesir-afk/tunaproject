import Link from "next/link";
import { Icon } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { tanggal } from "@/lib/format";
import { LABEL_PERIODE, type PeriodeOwner } from "@/lib/logic/laporanOwner";

/* Potongan tampilan bareng buat laporan owner (23 Nov 2026): angka besar, kotak bagian, batang persen, tab periode,
   dan tautan ke halaman lengkap. Biar tiap laporan (produksi, mutu, stok, penjualan, keuangan, absensi) seragam. */

export const HIJAU = "#0B6B4A";
export const AMBER = "#8A5A00";
export const BIRU = "#2B4A70";
export const GAYA = { boxShadow: "0 1px 2px rgba(20,24,40,.06)" } as const;
const KOTAK = { background: "rgba(248,249,252,.82)", border: "1px solid rgba(255,255,255,.95)" } as const;

export const persen = (n: number) => `${n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function Angka({ label, nilai, ket, tone }: { label: string; nilai: string; ket?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="min-w-0 rounded-[22px] bg-white p-4" style={GAYA}>
      <p className="text-[12.5px] font-medium" style={{ color: MUTED }}>{label}</p>
      <p className={`mt-1 break-words font-semibold tabular-nums tracking-tight ${nilai.length > 11 ? "text-[17px] leading-tight md:text-[22px]" : "text-[22px] md:text-[26px]"}`} style={{ color: tone === "ok" ? HIJAU : tone === "warn" ? AMBER : INK }}>{nilai}</p>
      {ket && <p className="mt-0.5 text-[12px] leading-snug" style={{ color: tone === "warn" ? AMBER : MUTED }}>{ket}</p>}
    </div>
  );
}

export function DeretAngka({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">{children}</div>;
}

/** Satu baris batang horizontal (satu warna): nama, batang sepanjang persennya, angka. */
export function BarisBatang({ nama, teks, pct, warna = HIJAU }: { nama: string; teks: string; pct: number; warna?: string }) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="min-w-0 truncate font-medium" style={{ color: INK }}>{nama}</span>
        <span className="shrink-0 tabular-nums" style={{ color: MUTED }}>{teks}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF0F5]">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: warna }} />
      </div>
    </li>
  );
}

export function Kotak({ judul, kanan, children, testId }: { judul: string; kanan?: React.ReactNode; children: React.ReactNode; testId?: string }) {
  return (
    <section className="min-w-0 rounded-[26px] p-4 md:p-5" style={KOTAK} data-testid={testId}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: INK }}>{judul}</h2>
        {kanan}
      </div>
      {children}
    </section>
  );
}

export function Kosong({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-white px-4 py-5 text-center text-[13px]" style={{ color: MUTED }}>{children}</p>;
}

export function Lencana({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={warn ? { background: "#FBF0D5", color: AMBER } : { background: "#EEF0F5", color: "#4A5560" }}>
      {children}
    </span>
  );
}

/** Tab periode (7 hari, 30 hari, bulan ini) berupa tautan, plus rentang tanggalnya. */
export function TabPeriode({ path, periode, dari, sampai }: { path: string; periode: PeriodeOwner; dari: string; sampai: string }) {
  return (
    <div className="space-y-1.5">
      <div role="tablist" aria-label="Periode laporan" className="inline-flex gap-1 rounded-full bg-white p-1" style={GAYA}>
        {(Object.keys(LABEL_PERIODE) as PeriodeOwner[]).map((p) => (
          <Link key={p} href={`${path}?periode=${p}`} role="tab" aria-selected={p === periode} scroll={false}
            className="flex h-9 items-center rounded-full px-4 text-[13px] font-medium" style={p === periode ? { background: INK, color: "#fff" } : { color: MUTED }}>{LABEL_PERIODE[p]}</Link>
        ))}
      </div>
      <p className="px-1 text-[12.5px]" style={{ color: MUTED }}>{tanggal(dari)} sampai {tanggal(sampai)}</p>
    </div>
  );
}

/** Baris yg bisa dipencet di daftar (judul, keterangan, angka kanan). */
export function BarisTautan({ href, judul, ket, kanan, tombol }: { href: string; judul: string; ket: string; kanan?: React.ReactNode; tombol?: string }) {
  return (
    <li className="min-w-0">
      <Link href={href} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 transition active:scale-[0.99]" style={GAYA}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold" style={{ color: INK }}>{judul}</span>
          <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>{ket}</span>
        </span>
        {kanan && <span className="shrink-0 text-right text-[13px] tabular-nums">{kanan}</span>}
        {tombol && <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-[12.5px] font-medium text-white" style={{ background: INK }}>{tombol}<Icon n="arrow" s={13} c="#fff" /></span>}
      </Link>
    </li>
  );
}

/** Tautan ke halaman kerja tim (semua data dan tombol persetujuan), ditaruh di bawah laporan. */
export function TautanLengkap({ path, teks = "Buka halaman lengkap" }: { path: string; teks?: string }) {
  return (
    <div className="flex justify-center pt-1">
      <Link href={`${path}?lengkap=1`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-medium" style={{ ...GAYA, color: INK }} data-testid="tautan-lengkap">
        {teks}<Icon n="arrow" s={13} c={INK} />
      </Link>
    </div>
  );
}
