"use client";

import { useActionState, useEffect, useState } from "react";
import { Btn, Card, Field, Modal, Pill, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { catatBiayaTetap, catatTotalBiayaTetap, simpanBiayaTetap } from "@/lib/actions/keuangan";
import { rp } from "@/lib/format";
import { jatuhTempo, KELOMPOK_BIAYA, NAMA_BULAN, totalPos, type CaraBayar, type KelompokBiaya } from "@/lib/logic/biayaTetap";
import type { Biaya, BiayaTetap as Pos } from "@/lib/types/keuangan";

/* Pos biaya tetap (format tim finance 23 Nov 2026), satu layar: pos dikelompokin per kelompok (Tenaga kerja, Overhead pabrik,
   Sertifikasi dan izin, Kantor, Keuangan). Tiap pos bayarnya bulanan (dicatat tiap bulan) atau tahunan (sekali setahun di bulan
   bayarnya). Kelompok sekaligus jadi kategori biaya di buku kas. Komponen posnya diisi sendiri sama tim finance. */

const bulanTeks = (b: string) => `${NAMA_BULAN[Number(b.slice(5, 7)) - 1]} ${b.slice(0, 4)}`;
const caraTeks = (p: Pick<Pos, "cara_bayar" | "bulan_bayar">) =>
  p.cara_bayar === "tahunan" ? `Tahunan, bayar tiap ${NAMA_BULAN[(p.bulan_bayar ?? 1) - 1]}` : "Bulanan";

function FormPos({ awal, kelompokAwal, onSelesai }: { awal: Pos | null; kelompokAwal: KelompokBiaya; onSelesai: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanBiayaTetap, undefined);
  const [cara, setCara] = useState<CaraBayar>(awal?.cara_bayar ?? "bulanan");
  useEffect(() => { if (state?.pesan && !state.error) onSelesai(); }, [state, onSelesai]);
  return (
    <form action={action} className="space-y-3">
      {awal && <input type="hidden" name="tetapId" value={awal.id} />}
      <PesanForm state={state?.error ? state : undefined} />
      <Field label="Nama pos" hint="Misalnya Gaji karyawan, Listrik pabrik, Izin HACCP." error={state?.kolom?.nama?.[0]}>
        <TextIn name="nama" maxLength={120} defaultValue={awal?.nama} required />
      </Field>
      <Field label="Kelompok" error={state?.kolom?.kelompok?.[0]}>
        <select name="kelompok" className={pilihCls} defaultValue={awal?.kelompok ?? kelompokAwal} required>
          {KELOMPOK_BIAYA.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cara bayar" error={state?.kolom?.caraBayar?.[0]}>
          <select name="caraBayar" className={pilihCls} value={cara} onChange={(e) => setCara(e.target.value as CaraBayar)}>
            <option value="bulanan">Bulanan</option>
            <option value="tahunan">Tahunan</option>
          </select>
        </Field>
        <Field label={cara === "tahunan" ? "Nominal per tahun (Rp)" : "Nominal per bulan (Rp)"} error={state?.kolom?.jumlah?.[0]}>
          <TextIn name="jumlah" inputMode="decimal" defaultValue={awal ? String(awal.jumlah).replace(".", ",") : ""} required />
        </Field>
      </div>
      {cara === "tahunan" && (
        <Field label="Bulan bayar" hint="Pos tahunan dicatat sekali setahun di bulan ini." error={state?.kolom?.bulanBayar?.[0]}>
          <select name="bulanBayar" className={pilihCls} defaultValue={awal?.bulan_bayar ?? ""} required>
            <option value="" disabled>Pilih bulan</option>
            {NAMA_BULAN.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
          </select>
        </Field>
      )}
      <Field label="Catatan" hint="Boleh dikosongin.">
        <TextIn name="catatan" maxLength={300} defaultValue={awal?.catatan} />
      </Field>
      <Field label="Status">
        <select name="aktif" className={pilihCls} defaultValue={awal && !awal.aktif ? "tidak" : "ya"}>
          <option value="ya">Aktif (ikut dicatat)</option>
          <option value="tidak">Nonaktif (nggak dicatat lagi)</option>
        </select>
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : awal ? "Simpan perubahan" : "Tambah pos"}</Btn>
    </form>
  );
}

function CatatBulanIni({ bulan, hariIni, jatuh }: { bulan: string; hariIni: string; jatuh: Pos[] }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(catatBiayaTetap, undefined);
  const total = jatuh.reduce((a, b) => a + Math.round(b.jumlah * 100), 0) / 100;
  const tahunan = jatuh.filter((p) => p.cara_bayar === "tahunan").length;
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="bulan" value={bulan} />
      <PesanForm state={state} />
      <Field label="Tanggal dicatat" hint={`Harus di bulan ${bulanTeks(bulan)}.`} error={state?.kolom?.tanggal?.[0]}>
        <TextIn name="tanggal" type="date" defaultValue={hariIni.startsWith(bulan) ? hariIni : `${bulan}-01`} min={`${bulan}-01`} max={`${bulan}-31`} required />
      </Field>
      <KonfirmasiDua full label={`Catat biaya tetap ${bulanTeks(bulan)}`} labelYa="Ya, catat sekarang" pending={pending} disabled={jatuh.length === 0}
        pesan={`${jatuh.length} pos${tahunan > 0 ? ` (${tahunan} di antaranya tahunan)` : ""}, total ${rp(total)}, bakal dicatat jadi biaya ${bulanTeks(bulan)}. Yg kategorinya wajib nota masuk draf dulu, sisanya langsung diajukan ke Owner.`} />
    </form>
  );
}

const akhirBulan = (b: string) => new Date(Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)), 0)).toISOString().slice(0, 10);
const STATUS_TOTAL: Record<Biaya["status"], string> = { draf: "draf", diajukan: "nunggu Owner", disetujui: "disetujui", ditolak: "ditolak" };

/** Input total biaya tetap sebulan tanpa rincian per pos (27 Nov 2026, data finance confidential). */
export function FormTotal({ hariIni, onSelesai }: { hariIni: string; onSelesai: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(catatTotalBiayaTetap, undefined);
  const [bulan, setBulan] = useState(hariIni.slice(0, 7));
  useEffect(() => { if (state?.pesan && !state.error) onSelesai(); }, [state, onSelesai]);
  const tglAwal = hariIni.startsWith(bulan) ? hariIni : akhirBulan(bulan);
  return (
    <form action={action} className="space-y-3">
      <PesanForm state={state?.error ? state : undefined} />
      <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>
        Cukup isi total biaya tetap sebulan, rinciannya nggak perlu dimasukin ke sistem. Totalnya masuk jadi biaya, diajukan ke Owner, dan abis disetujui ngurangin laba bulan itu.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bulan" error={state?.kolom?.bulan?.[0]}>
          <TextIn name="bulan" type="month" value={bulan} max={hariIni.slice(0, 7)} onChange={(e) => setBulan(e.target.value)} required />
        </Field>
        <Field label="Tanggal dicatat" error={state?.kolom?.tanggal?.[0]}>
          <TextIn key={bulan} name="tanggal" type="date" defaultValue={bulan ? tglAwal : ""} min={bulan ? `${bulan}-01` : undefined} max={bulan ? akhirBulan(bulan) : undefined} required />
        </Field>
      </div>
      <Field label="Total biaya tetap (Rp)" hint="Contoh 200.000.000" error={state?.kolom?.jumlah?.[0]}>
        <TextIn name="jumlah" inputMode="decimal" required />
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan total"}</Btn>
    </form>
  );
}

export function BiayaTetap({ daftar, biaya, bolehTulis, hariIni }: { daftar: Pos[]; biaya: Biaya[]; bolehTulis: boolean; hariIni: string }) {
  const [form, setForm] = useState<{ pos: Pos | null; kelompok: KelompokBiaya } | null>(null);
  const [formTotal, setFormTotal] = useState(false);
  const bulan = hariIni.slice(0, 7);
  const totalBulanan = biaya.filter((b) => b.total_tetap).sort((a, b) => (a.total_tetap as string).localeCompare(b.total_tetap as string));
  const totalBulanIni = totalBulanan.find((b) => b.total_tetap?.startsWith(bulan));
  const bulanKe = Number(bulan.slice(5, 7));
  const sudah = new Set(biaya.filter((b) => b.fixed_cost_id && b.bulan_tetap?.startsWith(bulan)).map((b) => b.fixed_cost_id as string));
  const jatuh = daftar.filter((p) => jatuhTempo(p, bulanKe));
  const belum = jatuh.filter((p) => !sudah.has(p.id));
  const total = totalPos(daftar);
  const status = (p: Pos) => !p.aktif ? "nonaktif"
    : !jatuhTempo(p, bulanKe) ? `dicatat ${NAMA_BULAN[(p.bulan_bayar ?? 1) - 1]}`
    : sudah.has(p.id) ? `udah dicatat ${NAMA_BULAN[bulanKe - 1]}` : "belum dicatat";

  return (
    <Card title="Biaya tetap" right={bolehTulis && <Btn size="sm" v="light" onClick={() => setForm({ pos: null, kelompok: "tenaga_kerja" })}>Tambah pos</Btn>}>
      <div data-testid="biaya-tetap" className="space-y-4">
        <section data-testid="total-biaya-tetap" className="rounded-2xl bg-white px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold" style={{ color: INK }}>Total sebulan (tanpa rincian)</span>
              <span className="block text-[12px]" style={{ color: MUTED }}>Satu bulan pilih salah satu: input total di sini, atau catat per pos di bawah.</span>
            </span>
            {bolehTulis && <Btn size="sm" v="light" onClick={() => setFormTotal(true)}>Input total bulanan</Btn>}
          </div>
          {totalBulanan.length > 0 && (
            <ul className="mt-2 divide-y divide-black/5">
              {totalBulanan.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                  <span style={{ color: INK }}>{bulanTeks(b.total_tetap as string)}</span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums" style={{ color: INK }}>{rp(b.jumlah)}</span>
                    <span className="block text-[11.5px]" style={{ color: MUTED }}>{b.kode} · {STATUS_TOTAL[b.status]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white px-3.5 py-2.5">
            <p className="text-[12px]" style={{ color: MUTED }}>Per bulan</p>
            <p className="text-[16px] font-semibold tabular-nums" style={{ color: INK }}>{rp(total.perBulan)}</p>
          </div>
          <div className="rounded-2xl bg-white px-3.5 py-2.5">
            <p className="text-[12px]" style={{ color: MUTED }}>Setahun (bulanan + tahunan)</p>
            <p className="text-[16px] font-semibold tabular-nums" style={{ color: INK }}>{rp(total.perTahun)}</p>
          </div>
        </div>

        {KELOMPOK_BIAYA.map((k) => {
          const pos = daftar.filter((p) => p.kelompok === k.id);
          const sub = totalPos(pos);
          return (
            <section key={k.id} data-testid={`kelompok-${k.id}`}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
                <h4 className="text-[13.5px] font-semibold" style={{ color: INK }}>{k.label}</h4>
                {pos.length > 0
                  ? <span className="text-[12px] tabular-nums" style={{ color: MUTED }}>{rp(sub.perTahun)} setahun</span>
                  : bolehTulis && <button type="button" onClick={() => setForm({ pos: null, kelompok: k.id })} className="text-[12px] font-medium underline" style={{ color: MUTED }}>Tambah</button>}
              </div>
              {pos.length === 0 ? (
                <p className="rounded-2xl bg-white/60 px-3.5 py-2.5 text-[12.5px]" style={{ color: MUTED }}>Belum ada pos. Contohnya {k.contoh}.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                  {pos.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5" style={{ opacity: p.aktif ? 1 : 0.6 }}>
                      <span className="min-w-0">
                        <span className="block break-words text-[14px] font-semibold leading-snug" style={{ color: INK }}>{p.nama}</span>
                        <span className="block text-[12px]" style={{ color: MUTED }}>{caraTeks(p)}{p.catatan ? ` · ${p.catatan}` : ""}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="text-right">
                          <span className="block text-[13.5px] font-semibold tabular-nums" style={{ color: INK }}>{rp(p.jumlah)}</span>
                          <span className="block text-[11.5px]" style={{ color: MUTED }}>{status(p)}</span>
                        </span>
                        {bolehTulis && <Btn size="sm" v="ghost" onClick={() => setForm({ pos: p, kelompok: p.kelompok })}>Ubah</Btn>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {bolehTulis && jatuh.length > 0 && (
          totalBulanIni
            ? <div className="flex justify-center"><Pill t={`Biaya tetap ${bulanTeks(bulan)} udah diinput totalnya`} /></div>
            : belum.length > 0
            ? <CatatBulanIni bulan={bulan} hariIni={hariIni} jatuh={belum} />
            : <div className="flex justify-center"><Pill t={`Semua pos ${bulanTeks(bulan)} udah dicatat`} /></div>
        )}
      </div>
      {form && (
        <Modal title={form.pos ? `Ubah ${form.pos.nama}` : "Tambah pos"} onClose={() => setForm(null)}>
          <FormPos awal={form.pos} kelompokAwal={form.kelompok} onSelesai={() => setForm(null)} />
        </Modal>
      )}
      {formTotal && (
        <Modal title="Input total biaya tetap" onClose={() => setFormTotal(false)}>
          <FormTotal hariIni={hariIni} onSelesai={() => setFormTotal(false)} />
        </Modal>
      )}
    </Card>
  );
}
