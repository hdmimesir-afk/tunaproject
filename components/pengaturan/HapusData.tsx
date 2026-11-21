"use client";

import { useState, useTransition } from "react";
import { Btn, Card, Field, Inner, Modal, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { hapusData, pratinjauHapus } from "@/lib/actions/hapus";
import { waktu } from "@/lib/format";
import { BAGIAN_HAPUS, namaBagian, type LogHapus, type RincianHapus } from "@/lib/logic/hapus";

const MERAH = "#A8322B";

function DaftarRincian({ rincian, kode }: { rincian: RincianHapus[]; kode?: boolean }) {
  const [buka, setBuka] = useState<string | null>(null);
  return (
    <ul className="overflow-hidden rounded-2xl bg-white" data-testid="rincian-hapus">
      {rincian.map((r) => (
        <li key={r.tabel} className="border-t border-[#EEF0F4] px-3.5 py-2 text-[13px] first:border-t-0" style={{ color: INK }}>
          <div className="flex items-center justify-between gap-3">
            <span>{r.label}</span>
            <span className="flex items-center gap-2">
              <b className="font-semibold tabular-nums">{r.jumlah.toLocaleString("id-ID")}</b>
              {kode && r.kode.length > 0 && (
                <button type="button" className="text-[12px] underline" style={{ color: MUTED }} onClick={() => setBuka(buka === r.tabel ? null : r.tabel)}>
                  {buka === r.tabel ? "Tutup" : "Kode"}
                </button>
              )}
            </span>
          </div>
          {kode && buka === r.tabel && (
            <div className="mt-2 flex flex-wrap gap-1">
              {r.kode.map((k) => <span key={k} className="rounded-md bg-[#F1F3F7] px-1.5 py-0.5 text-[11.5px] tabular-nums" style={{ color: INK }}>{k}</span>)}
              {r.jumlah > r.kode.length && <span className="px-1 text-[11.5px]" style={{ color: MUTED }}>dan {r.jumlah - r.kode.length} lainnya</span>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Pop up detail satu catatan hapus. */
function DetailLog({ log, onTutup }: { log: LogHapus; onTutup: () => void }) {
  return (
    <Modal title={`Log hapus #${log.id}`} onClose={onTutup}>
      <div className="space-y-3">
        <Inner className="!p-3.5">
          <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
            <dt style={{ color: MUTED }}>Waktu</dt><dd style={{ color: INK }}>{waktu(log.waktu)}</dd>
            <dt style={{ color: MUTED }}>Dihapus oleh</dt><dd style={{ color: INK }}>{log.oleh_nama}</dd>
            <dt style={{ color: MUTED }}>Bagian</dt><dd style={{ color: INK }}>{log.bagian.map(namaBagian).join(", ")}</dd>
            <dt style={{ color: MUTED }}>Alasan</dt><dd style={{ color: INK }}>{log.alasan}</dd>
            <dt style={{ color: MUTED }}>Total</dt><dd className="font-semibold tabular-nums" style={{ color: INK }}>{log.total.toLocaleString("id-ID")} data</dd>
          </dl>
        </Inner>
        <p className="text-[12.5px]" style={{ color: MUTED }}>Rincian per jenis data. Tekan Kode buat lihat kode yg kehapus.</p>
        <DaftarRincian rincian={log.rincian} kode />
      </div>
    </Modal>
  );
}

export function HapusData({ log }: { log: LogHapus[] }) {
  const [pilih, setPilih] = useState<string[]>([]);
  const [rincian, setRincian] = useState<RincianHapus[] | null>(null);
  const [alasan, setAlasan] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [pesan, setPesan] = useState<{ error?: string; pesan?: string } | null>(null);
  const [detail, setDetail] = useState<LogHapus | null>(null);
  const [pending, mulai] = useTransition();
  const semua = pilih.includes("semua");
  const total = (rincian ?? []).reduce((a, r) => a + r.jumlah, 0);

  const ganti = (id: string, on: boolean) => {
    setRincian(null);
    setPesan(null);
    setKonfirmasi("");
    if (id === "semua") setPilih(on ? ["semua"] : []);
    else setPilih((p) => (on ? [...p.filter((x) => x !== "semua"), id] : p.filter((x) => x !== id)));
  };
  const lihat = () => mulai(async () => {
    const r = await pratinjauHapus(pilih);
    setPesan(r.error ? { error: r.error } : null);
    setRincian(r.rincian ?? null);
  });
  const hapus = () => mulai(async () => {
    const r = await hapusData({ bagian: pilih, alasan, konfirmasi });
    setPesan(r);
    if (r.pesan) { setPilih([]); setRincian(null); setAlasan(""); setKonfirmasi(""); }
  });

  return (
    <div className="space-y-3">
      <Card title="Hapus data">
        <div className="space-y-3 px-1 pb-1">
          <p className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBE5E3", color: MERAH }}>
            Data yg dihapus gak bisa dibalikin. Data master (pemasok, pembeli, produk, grade, ruangan, tarif, akun, daftar barang) gak ikut kehapus. Tiap hapus kecatat di log di bawah.
          </p>
          {pesan?.error && <p role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: MERAH }}>{pesan.error}</p>}
          {pesan?.pesan && <p role="status" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>{pesan.pesan}</p>}

          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-[13px] font-medium" style={{ color: INK }}>Pilih yg mau dihapus</legend>
            <label className="flex items-start gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }}>
              <input type="checkbox" checked={semua} onChange={(e) => ganti("semua", e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#A8322B]" />
              <span><b className="font-semibold">Semua data transaksi</b><span className="block text-[12px]" style={{ color: MUTED }}>Semua bagian di bawah sekaligus. Kode mulai lagi dari 0001.</span></span>
            </label>
            <div className="grid gap-1.5 md:grid-cols-2">
              {BAGIAN_HAPUS.map((b) => (
                <label key={b.id} className="flex items-start gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: semua ? MUTED : INK }}>
                  <input type="checkbox" disabled={semua} checked={semua || pilih.includes(b.id)} onChange={(e) => ganti(b.id, e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#A8322B]" />
                  <span><b className="font-medium">{b.label}</b><span className="block text-[12px]" style={{ color: MUTED }}>{b.isi}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          {rincian === null ? (
            <Btn v="light" disabled={pilih.length === 0 || pending} onClick={lihat}>{pending ? "Ngitung..." : "Lihat yg bakal kehapus"}</Btn>
          ) : total === 0 ? (
            <p className="text-[13px]" style={{ color: MUTED }}>Nggak ada data di bagian yg dipilih.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] font-medium" style={{ color: INK }}>Bakal kehapus {total.toLocaleString("id-ID")} data, termasuk yg nyambung:</p>
              <DaftarRincian rincian={rincian} />
              <Field label="Alasan" hint="Wajib, kecatat di log."><TextIn value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={500} aria-label="Alasan hapus" placeholder="Misalnya buang data latihan sebelum dipake beneran" /></Field>
              <Field label="Ketik HAPUS buat konfirmasi"><TextIn value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} autoComplete="off" aria-label="Ketik HAPUS buat konfirmasi" /></Field>
              <Btn v="danger" full disabled={pending || konfirmasi !== "HAPUS" || alasan.trim() === ""} onClick={hapus}>
                {pending ? "Menghapus..." : `Hapus ${total.toLocaleString("id-ID")} data`}
              </Btn>
            </div>
          )}
        </div>
      </Card>

      <Card title={`Log hapus · ${log.length}`}>
        {log.length === 0 ? (
          <Inner><p className="py-2 text-center text-[13px]" style={{ color: MUTED }}>Belum pernah ada data yg dihapus.</p></Inner>
        ) : (
          <ul className="space-y-1.5 px-1 pb-1">
            {log.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5">
                <div className="min-w-0 text-[13px]" style={{ color: INK }}>
                  <span className="font-medium">{l.bagian.map(namaBagian).join(", ")}</span>
                  <span className="block text-[12px]" style={{ color: MUTED }}>{waktu(l.waktu)} · {l.oleh_nama} · {l.total.toLocaleString("id-ID")} data</span>
                </div>
                <Btn size="sm" v="light" onClick={() => setDetail(l)}>Detail</Btn>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {detail && <DetailLog log={detail} onTutup={() => setDetail(null)} />}
    </div>
  );
}
