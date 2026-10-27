"use client";

import { Icon, Pill } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { rp, tanggal } from "@/lib/format";
import { formatKg } from "@/lib/logic/neraca";
import { LABEL_PESANAN } from "@/lib/logic/penjualan";
import type { Invoice, Pesanan } from "@/lib/types/penjualan";

const HIJAU = "#0B6B4A";
const MERAH = "#B4443C";
const kgTeks = (n: number) => `${formatKg(n)} kg`;
const KOLOM_PESANAN = "md:grid md:grid-cols-[minmax(0,1.3fr)_120px_150px_120px_110px_20px] md:items-center md:gap-5";
const KOLOM_INVOICE = "md:grid md:grid-cols-[minmax(0,1.3fr)_110px_150px_170px_150px_20px] md:items-center md:gap-5";

function Wadah({ judul, kosong, ada, kepala, kolom, children }: { judul: string; kosong: string; ada: boolean; kepala: string[]; kolom: string; children: React.ReactNode }) {
  if (!ada) return <div className="rounded-[20px] bg-white px-4 py-8 text-center text-[13px]" style={{ color: MUTED }}>{kosong}</div>;
  return (
    <div className="overflow-hidden rounded-[20px] bg-white" role="list" aria-label={judul}>
      <div className={`hidden border-b border-[#EEF0F4] px-5 py-3 text-[12px] font-medium ${kolom}`} style={{ color: MUTED }} aria-hidden>
        {kepala.map((k, i) => <span key={i} className={i === 2 || i === 1 ? "text-right" : ""}>{k}</span>)}
      </div>
      {children}
    </div>
  );
}

const barisCls = "group block w-full border-t border-[#EEF0F4] px-4 py-4 text-left transition first:border-t-0 hover:bg-[#FAFBFD] active:bg-[#F4F6FA] md:px-5";

/** Daftar pesanan jual: satu baris yang bisa diketuk penuh. Kartu bernilai besar di HP, tabel lebar di desktop. */
export function DaftarPesanan({ rows, kosong, onBuka }: { rows: Pesanan[]; kosong: string; onBuka: (id: string) => void }) {
  return (
    <Wadah judul="Pesanan jual" kosong={kosong} ada={rows.length > 0} kolom={KOLOM_PESANAN} kepala={["Pesanan", "Berat", "Total", "Status", "Invoice", ""]}>
      {rows.map((p) => {
        const final = p.status === "terkirim";
        const kg = final ? p.kg_final : p.kg_pesan;
        const total = final ? p.total_final : p.total_pesan;
        return (
          <button key={p.id} type="button" role="listitem" onClick={() => onBuka(p.id)} className={`${barisCls} ${KOLOM_PESANAN}`} aria-label={`Buka pesanan ${p.kode}`}>
            <div className="flex items-start justify-between gap-3 md:block">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold" style={{ color: INK }}>{p.kode}</div>
                <div className="mt-0.5 text-[12.5px] leading-snug" style={{ color: MUTED }}>{p.buyer_nama}</div>
                <div className="text-[12px]" style={{ color: MUTED }}>{tanggal(p.tanggal)}</div>
              </div>
              <span className="shrink-0 md:hidden"><Pill t={LABEL_PESANAN[p.status]} /></span>
            </div>
            {/* HP: nilai besar di tengah kartu */}
            <div className="mt-3 flex items-end justify-between gap-3 md:hidden">
              <div>
                <div className="text-[11.5px]" style={{ color: MUTED }}>{final ? "Total tagihan" : "Total pesanan"}</div>
                <div className="text-[20px] font-semibold leading-tight tabular-nums" style={{ color: INK }}>{rp(total)}</div>
              </div>
              <div className="text-right text-[12.5px] tabular-nums" style={{ color: MUTED }}>{kgTeks(kg)}</div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 md:hidden">
              {p.invoice_kode ? <span className="rounded-md bg-[#EEF0F5] px-2 py-1 text-[11.5px] leading-none" style={{ color: "#4A5560" }}>{p.invoice_kode}</span> : <span className="text-[12px]" style={{ color: MUTED }}>{final ? "Belum ada invoice" : "Belum dikirim"}</span>}
              <span className="flex items-center gap-1 text-[12.5px] font-medium" style={{ color: INK }}>Buka <Icon n="next" s={15} c={INK} /></span>
            </div>
            {/* Desktop: kolom */}
            <div className="hidden text-right text-[13.5px] tabular-nums md:block" style={{ color: INK }}>{kgTeks(kg)}</div>
            <div className="hidden text-right text-[14px] font-semibold tabular-nums md:block" style={{ color: INK }}>{rp(total)}</div>
            <div className="hidden md:block"><Pill t={LABEL_PESANAN[p.status]} /></div>
            <div className="hidden text-[12.5px] md:block" style={{ color: MUTED }}>{p.invoice_kode ?? "-"}</div>
            <span className="hidden md:block"><Icon n="next" s={16} c="#9AA2AB" /></span>
          </button>
        );
      })}
    </Wadah>
  );
}

const STATUS_TAGIHAN: Record<string, string> = { belum_jatuh_tempo: "Belum jatuh tempo", jatuh_tempo: "Jatuh tempo", lunas: "Lunas", terlambat: "Terlambat", dibatalkan: "Dibatalkan" };

/** Daftar piutang dan invoice: sisa tagihan menonjol, batang pembayaran, dan tanda terlambat yang jelas. */
export function DaftarInvoice({ rows, kosong, onBuka }: { rows: Invoice[]; kosong: string; onBuka: (id: string) => void }) {
  return (
    <Wadah judul="Piutang dan invoice" kosong={kosong} ada={rows.length > 0} kolom={KOLOM_INVOICE} kepala={["Invoice", "Jenis", "Total", "Pembayaran", "Status", ""]}>
      {rows.map((i) => {
        const terlambat = i.status_tagihan === "terlambat";
        const lunas = i.status_tagihan === "lunas";
        const batal = i.status_tagihan === "dibatalkan";
        const pct = i.total > 0 ? Math.min(100, (i.dibayar / i.total) * 100) : 0;
        const label = STATUS_TAGIHAN[i.status_tagihan] ?? i.status_tagihan;
        const jenis = i.jenis === "gudang_dingin" ? "Jasa gudang" : "Penjualan";
        const batang = (
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E6E9EF]" role="img" aria-label={`${Math.round(pct)} persen dibayar`}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: lunas ? HIJAU : terlambat ? MERAH : INK }} />
          </div>
        );
        return (
          <button key={i.id} type="button" role="listitem" onClick={() => onBuka(i.id)} className={`${barisCls} ${KOLOM_INVOICE}`} aria-label={`Buka invoice ${i.kode}`}
            style={terlambat ? { boxShadow: "inset 3px 0 0 #D9534F" } : undefined}>
            <div className="flex items-start justify-between gap-3 md:block">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-semibold" style={{ color: INK }}>{i.kode}</span>
                  <span className="rounded-md bg-[#EEF0F5] px-1.5 py-0.5 text-[11px] leading-none md:hidden" style={{ color: "#4A5560" }}>{jenis}</span>
                </div>
                <div className="mt-0.5 text-[12.5px] leading-snug" style={{ color: MUTED }}>{i.buyer_nama}</div>
                <div className="text-[12px]" style={{ color: terlambat ? MERAH : MUTED }}>Jatuh tempo {tanggal(i.jatuh_tempo)}{terlambat ? ` · telat ${i.hari_telat} hari` : ""}</div>
              </div>
              <span className="shrink-0 md:hidden"><Pill t={label} /></span>
            </div>
            {/* HP: sisa menonjol + batang pembayaran */}
            <div className="mt-3 md:hidden">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11.5px]" style={{ color: MUTED }}>{lunas ? "Sudah lunas" : "Sisa tagihan"}</div>
                  <div className="text-[20px] font-semibold leading-tight tabular-nums" style={{ color: lunas ? HIJAU : terlambat ? MERAH : INK }}>{lunas ? rp(i.total) : rp(i.sisa)}</div>
                </div>
                <div className="text-right text-[12px] tabular-nums" style={{ color: MUTED }}>dari {rp(i.total)}</div>
              </div>
              {!batal && <div className="mt-2.5">{batang}</div>}
              <div className="mt-2.5 flex items-center justify-between text-[12px]" style={{ color: MUTED }}>
                <span>{batal ? "Invoice dibatalkan" : `${rp(i.dibayar)} sudah dibayar`}</span>
                <span className="flex items-center gap-1 text-[12.5px] font-medium" style={{ color: INK }}>Buka <Icon n="next" s={15} c={INK} /></span>
              </div>
            </div>
            {/* Desktop: kolom */}
            <div className="hidden text-right text-[12.5px] md:block" style={{ color: MUTED }}>{jenis}</div>
            <div className="hidden text-right text-[14px] font-semibold tabular-nums md:block" style={{ color: INK }}>{rp(i.total)}</div>
            <div className="hidden md:block">
              {!batal && batang}
              <div className="mt-1 text-[12px] tabular-nums" style={{ color: MUTED }}>{lunas ? "Lunas" : `Sisa ${rp(i.sisa)}`}</div>
            </div>
            <div className="hidden md:block"><Pill t={label} /></div>
            <span className="hidden md:block"><Icon n="next" s={16} c="#9AA2AB" /></span>
          </button>
        );
      })}
    </Wadah>
  );
}
