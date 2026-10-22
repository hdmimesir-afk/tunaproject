"use client";

import { useActionState, useMemo, useState } from "react";
import { Btn, Field, Inner, Modal, Pill, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { mintaPerbaikan, periksaProduksi, selesaikanProduksi, setujuiProduksi, simpanEkor, simpanKomponen } from "@/lib/actions/produksi";
import type { DetailProduksi as Detail } from "@/lib/data/produksi";
import { tanggal, waktu } from "@/lib/format";
import { gramKeTeks, tampilKg } from "@/lib/logic/grid";
import { formatPct, hitungNeraca, type BatasHasil } from "@/lib/logic/neraca";
import { LABEL_PRODUKSI } from "@/lib/logic/produksi";
import type { Opsi, Pengguna } from "@/lib/types/pembelian";
import { cetakFormulir } from "./cetak";
import { GridLoin } from "./GridLoin";

type Props = {
  detail: Detail;
  grade: Opsi[];
  samping: Opsi[];
  pengguna: Record<string, Pengguna>;
  batas: BatasHasil;
  bolehTulis: boolean;
  bolehPeriksa: boolean;
  bolehSetuju: boolean;
  onTutup: () => void;
};

const nama = (p: Record<string, Pengguna>, id: string | null) => (id ? p[id]?.nama ?? "pengguna lain" : "-");
const kgTeks = (n: number) => tampilKg(Math.round(n * 1000));
const inputKg = (n: number | null | undefined) => (n === null || n === undefined ? "" : gramKeTeks(Math.round(n * 1000)).replace(".", ","));

function Bagian({ judul, children, kanan }: { judul: string; children: React.ReactNode; kanan?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold" style={{ color: INK }}>{judul}</h4>
        {kanan}
      </div>
      {children}
    </section>
  );
}

function Pesan({ state }: { state: HasilForm }) {
  if (state?.error) return <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>;
  if (state?.pesan) return <div role="status" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>{state.pesan}</div>;
  return null;
}

const Baris = ({ k, v, tebal, warna }: { k: string; v: React.ReactNode; tebal?: boolean; warna?: string }) => (
  <div className="flex justify-between gap-3 py-1.5 text-[13px]">
    <span style={{ color: MUTED }}>{k}</span>
    <span className={`text-right tabular-nums ${tebal ? "font-semibold" : "font-medium"}`} style={{ color: warna ?? INK }}>{v}</span>
  </div>
);

/* ------------------------------------------------------------- neraca */
function Neraca({ p, batas }: { p: Detail["produksi"]; batas: BatasHasil }) {
  const n = hitungNeraca({ masukKg: p.masuk_kg, loinKg: p.loin_kg, hasilSampingKg: p.samping_kg, limbahKg: p.limbah_kg, susutKg: p.susut_kg }, batas);
  return (
    <Inner className="!p-3.5">
      <Baris k="Ikan masuk" v={`${kgTeks(n.masukKg)} kg`} tebal />
      <Baris k={`Loin · ${formatPct(n.hasilPct)}% dari ikan masuk`} v={`${kgTeks(n.loinKg)} kg`} />
      <Baris k="Hasil samping" v={`${kgTeks(n.hasilSampingKg)} kg`} />
      <Baris k="Limbah" v={n.limbahKg === null ? "belum ditimbang" : `${kgTeks(n.limbahKg)} kg`} />
      <Baris k="Susut" v={n.susutKg === null ? "belum ditimbang" : `${kgTeks(n.susutKg)} kg`} />
      <div className="mt-1 border-t border-[#E2E4EA] pt-1">
        <Baris k={`Selisih belum jelas · ${formatPct(n.belumJelasPct)}%`} v={`${kgTeks(n.belumJelasKg)} kg`} tebal warna={n.belumJelasKg > 0 ? "#8A5A00" : "#0B6B4A"} />
      </div>
      <p className="mt-1 text-[11.5px]" style={{ color: MUTED }}>Selisih adalah sisa hitungan: ikan masuk dikurangi semua yang ditimbang. Tidak diisi otomatis dan tidak dipindah ke susut.</p>
      {n.perluDiperiksa && p.jumlah_loin > 0 && (
        <p className="mt-2 rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
          Hasil {formatPct(n.hasilPct)}% di luar batas wajar {batas.minPct}–{batas.maxPct}%. Periksa timbangan dan nomor loin.
        </p>
      )}
      {p.jumlah_loin > 0 && <p className="mt-1.5 text-[12px]" style={{ color: MUTED }}>Rencana hasil {batas.rencanaPct}%: {n.diAtasRencana ? "tercapai" : "belum tercapai"}.</p>}
    </Inner>
  );
}

/* --------------------------------------------------------- ikan utuh */
function FormEkor({ produksiId, ekor }: { produksiId: string; ekor: Detail["ekor"] }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanEkor, undefined);
  const [baris, setBaris] = useState<{ no: string; kg: string }[]>(() => (ekor.length > 0 ? ekor.map((e) => ({ no: String(e.no_ekor), kg: inputKg(e.berat_utuh_kg) })) : [{ no: "1", kg: "" }]));
  const ubah = (i: number, k: "no" | "kg", v: string) => setBaris((b) => b.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="produksiId" value={produksiId} />
      <input type="hidden" name="ekor" value={JSON.stringify(baris)} />
      <Pesan state={state} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {baris.map((b, i) => (
          <div key={i} className="flex gap-1.5 rounded-2xl bg-white p-2">
            <input aria-label={`No. ekor ${i + 1}`} inputMode="numeric" className="h-9 w-12 rounded-lg border border-[#E2E4EA] px-2 text-[13px]" value={b.no} onChange={(e) => ubah(i, "no", e.target.value)} />
            <input aria-label={`Berat utuh ekor ${i + 1}`} inputMode="decimal" placeholder="kg utuh" className="h-9 min-w-0 flex-1 rounded-lg border border-[#E2E4EA] px-2 text-right text-[13px]" value={b.kg} onChange={(e) => ubah(i, "kg", e.target.value)} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Btn size="sm" v="light" onClick={() => setBaris((b) => [...b, { no: String((Number(b[b.length - 1]?.no) || b.length) + 1), kg: "" }])}>+ Tambah ekor</Btn>
        <Btn type="submit" size="sm" disabled={pending}>{pending ? "Menyimpan..." : "Simpan berat utuh"}</Btn>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------- komponen */
function FormKomponen({ detail, samping }: { detail: Detail; samping: Opsi[] }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanKomponen, undefined);
  const awal = useMemo(() => new Map(detail.samping.map((s) => [s.category_id, inputKg(s.kg)])), [detail.samping]);
  const [nilai, setNilai] = useState<Record<string, string>>(() => Object.fromEntries(samping.map((s) => [s.id, awal.get(s.id) ?? ""])));
  const [limbah, setLimbah] = useState(inputKg(detail.produksi.limbah_kg));
  const [susut, setSusut] = useState(inputKg(detail.produksi.susut_kg));
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="produksiId" value={detail.produksi.id} />
      <input type="hidden" name="samping" value={JSON.stringify(samping.map((s) => ({ category_id: s.id, kg: nilai[s.id] ?? "" })))} />
      <Pesan state={state} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {samping.map((s) => (
          <Field key={s.id} label={`${s.label} (kg)`}>
            <TextIn inputMode="decimal" placeholder="belum ditimbang" value={nilai[s.id] ?? ""} onChange={(e) => setNilai((n) => ({ ...n, [s.id]: e.target.value }))} />
          </Field>
        ))}
        <Field label="Limbah, total (kg)" error={state?.kolom?.limbah?.[0]} hint="Kosong = belum ditimbang">
          <TextIn name="limbah" inputMode="decimal" value={limbah} onChange={(e) => setLimbah(e.target.value)} />
        </Field>
        <Field label="Susut, total (kg)" error={state?.kolom?.susut?.[0]} hint="Kosong = belum ditimbang">
          <TextIn name="susut" inputMode="decimal" value={susut} onChange={(e) => setSusut(e.target.value)} />
        </Field>
      </div>
      <Btn type="submit" size="sm" disabled={pending}>{pending ? "Menyimpan..." : "Simpan komponen"}</Btn>
    </form>
  );
}

/* ------------------------------------------------------------- status */
function Selesaikan({ id }: { id: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(selesaikanProduksi, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="produksiId" value={id} />
      <Pesan state={state} />
      <KonfirmasiDua full label="Selesaikan produksi" labelYa="Ya, selesaikan" pending={pending}
        pesan="Setelah selesai, loin dan komponen terkunci dan masuk pemeriksaan QC. Lanjutkan?" />
    </form>
  );
}

function PeriksaQc({ p }: { p: Detail["produksi"] }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(periksaProduksi, undefined);
  const adaSelisih = p.belum_jelas_kg > 0;
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="produksiId" value={p.id} />
      <Pesan state={state} />
      {adaSelisih && (
        <Field label={`Penjelasan selisih ${kgTeks(p.belum_jelas_kg)} kg`} hint="Wajib diisi, atau teruskan ke Owner yang boleh menerima selisih apa adanya.">
          <TextIn name="penjelasan" maxLength={500} placeholder="Misalnya: tulang tengah dan darah belum ditimbang" />
        </Field>
      )}
      <KonfirmasiDua full label="Tandai sudah diperiksa (QC)" labelYa="Ya, sudah saya periksa" pending={pending}
        pesan="Anda memastikan timbangan dan neraca sudah benar. Produksi lalu menunggu Owner." />
    </form>
  );
}

function SetujuiOwner({ p }: { p: Detail["produksi"] }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(setujuiProduksi, undefined);
  const perluTerima = p.belum_jelas_kg > 0 && p.penjelasan_selisih.trim() === "";
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="produksiId" value={p.id} />
      <Pesan state={state} />
      {perluTerima && (
        <label className="flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
          <input type="checkbox" name="terimaSelisih" className="mt-0.5 h-4 w-4 accent-[#8A5A00]" />
          <span>Terima selisih {kgTeks(p.belum_jelas_kg)} kg apa adanya (belum ada penjelasan dari QC).</span>
        </label>
      )}
      <KonfirmasiDua full label="Setujui produksi (Owner)" labelYa="Ya, setujui" pending={pending}
        pesan="Produksi dinyatakan diperiksa dan tidak bisa diubah lagi. Lanjutkan?" />
    </form>
  );
}

function MintaPerbaikan({ id }: { id: string }) {
  const [buka, setBuka] = useState(false);
  const [state, action, pending] = useActionState<HasilForm, FormData>(mintaPerbaikan, undefined);
  if (!buka) return <Btn size="sm" v="ghost" onClick={() => setBuka(true)}>Minta perbaikan</Btn>;
  return (
    <Modal title="Minta perbaikan" onClose={() => setBuka(false)}>
      <form action={action} className="space-y-3">
        <input type="hidden" name="produksiId" value={id} />
        <Pesan state={state} />
        <Field label="Apa yang perlu diperbaiki?" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required /></Field>
        <Btn type="submit" full disabled={pending}>{pending ? "Mengirim..." : "Kembalikan ke petugas"}</Btn>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------- utama */
export function DetailProduksi({ detail, grade, samping, pengguna, batas, bolehTulis, bolehPeriksa, bolehSetuju, onTutup }: Props) {
  const { produksi: p, alokasi, loin, ekor, riwayat } = detail;
  const berjalan = p.status === "berjalan";
  const bolehEdit = bolehTulis && berjalan;
  const namaGrade = useMemo(() => new Map(grade.map((g) => [g.id, g.label])), [grade]);
  const namaSamping = useMemo(() => new Map(samping.map((s) => [s.id, s.label])), [samping]);
  const noLoin = useMemo(() => new Map(loin.map((l) => [l.id, l.no_loin])), [loin]);
  const [tampilRiwayat, setTampilRiwayat] = useState(false);

  return (
    <Modal title={`${p.kode} · ${tanggal(p.tanggal)}`} onClose={onTutup} lebar>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill t={LABEL_PRODUKSI[p.status]} />
        {p.siklus_kode && <Pill t={p.siklus_kode} />}
        <span className="ml-auto flex gap-2">
          <Btn size="sm" v="light" onClick={() => { if (!cetakFormulir(detail, namaGrade, namaSamping)) alert("Jendela cetak diblokir browser. Izinkan pop-up lalu coba lagi."); }}>Cetak formulir</Btn>
        </span>
      </div>

      {p.catatan_perbaikan && berjalan && (
        <p className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Diminta perbaikan: {p.catatan_perbaikan}</p>
      )}

      <Bagian judul="Neraca berat"><Neraca p={p} batas={batas} /></Bagian>

      <Bagian judul="Lot yang diproduksi">
        <div className="flex flex-wrap gap-1.5">
          {alokasi.map((a) => <span key={a.id} className="rounded-full bg-white px-3 py-1.5 text-[12.5px]" style={{ color: INK }}>{a.lot_kode} · {kgTeks(a.kg)} kg</span>)}
        </div>
      </Bagian>

      <Bagian judul="Loin per potong">
        <GridLoin key={p.id + ":" + p.status}produksiId={p.id} kode={p.kode} loin={loin} grade={grade} ekor={ekor} bolehEdit={bolehEdit} />
      </Bagian>

      {(bolehEdit || ekor.length > 0) && (
        <Bagian judul="Berat ikan utuh per ekor (boleh kosong)">
          {bolehEdit ? <FormEkor produksiId={p.id} ekor={ekor} /> : (
            <p className="text-[13px]" style={{ color: MUTED }}>{ekor.map((e) => `Ekor ${e.no_ekor}: ${kgTeks(e.berat_utuh_kg)} kg`).join(" · ")}</p>
          )}
        </Bagian>
      )}

      <Bagian judul="Komponen hasil">
        {bolehEdit ? <FormKomponen key={p.id + ":" + detail.samping.length} detail={detail} samping={samping} /> : (
          <Inner className="!p-3.5">
            {detail.samping.map((s) => <Baris key={s.id} k={namaSamping.get(s.category_id) ?? "Hasil samping"} v={`${kgTeks(s.kg)} kg`} />)}
            <Baris k="Limbah" v={p.limbah_kg === null ? "belum ditimbang" : `${kgTeks(p.limbah_kg)} kg`} />
            <Baris k="Susut" v={p.susut_kg === null ? "belum ditimbang" : `${kgTeks(p.susut_kg)} kg`} />
          </Inner>
        )}
      </Bagian>

      <Bagian judul="Pemeriksaan">
        <div className="space-y-3">
          <Inner className="!p-3.5">
            <ul className="space-y-1 text-[12.5px]" style={{ color: MUTED }}>
              <li>Selesai ditimbang: {p.selesai_oleh ? `${nama(pengguna, p.selesai_oleh)} · ${waktu(p.selesai_pada)}` : "belum"}</li>
              <li>Diperiksa QC: {p.qc_oleh ? `${nama(pengguna, p.qc_oleh)} · ${waktu(p.qc_pada)}` : "belum"}</li>
              <li>Disetujui Owner: {p.owner_oleh ? `${nama(pengguna, p.owner_oleh)} · ${waktu(p.owner_pada)}` : "belum"}</li>
              {p.penjelasan_selisih && <li style={{ color: INK }}>Penjelasan selisih: {p.penjelasan_selisih}</li>}
              {p.selisih_diterima && <li style={{ color: "#8A5A00" }}>Selisih diterima Owner apa adanya.</li>}
            </ul>
          </Inner>
          {berjalan && bolehTulis && <Selesaikan id={p.id} />}
          {p.status === "selesai" && bolehPeriksa && <PeriksaQc p={p} />}
          {p.status === "diperiksa_qc" && bolehSetuju && <SetujuiOwner p={p} />}
          {(p.status === "selesai" || p.status === "diperiksa_qc") && (bolehPeriksa || bolehSetuju) && <MintaPerbaikan id={p.id} />}
        </div>
      </Bagian>

      <Bagian judul="Riwayat koreksi loin" kanan={<Btn size="sm" v="ghost" onClick={() => setTampilRiwayat((x) => !x)}>{tampilRiwayat ? "Sembunyikan" : `Tampilkan (${riwayat.length})`}</Btn>}>
        {tampilRiwayat && (
          riwayat.length === 0 ? <p className="text-[13px]" style={{ color: MUTED }}>Belum ada perubahan.</p> : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {riwayat.map((h) => {
                const s = h.sesudah as { kg?: number; no_loin?: number; batal?: boolean; alasan_batal?: string };
                const b = h.sebelum as { kg?: number } | null;
                return (
                  <li key={h.id} className="rounded-xl bg-white px-3 py-2 text-[12.5px]" style={{ color: INK }}>
                    Loin {s.no_loin ?? noLoin.get(h.item_id) ?? "?"} · {h.aksi === "tambah" ? `ditambah ${kgTeks(Number(s.kg))} kg` : h.aksi === "batal" ? `dibatalkan (${s.alasan_batal})` : `berat ${kgTeks(Number(b?.kg))} → ${kgTeks(Number(s.kg))} kg`}
                    <span style={{ color: MUTED }}> · {nama(pengguna, h.oleh)} · {waktu(h.pada)}</span>
                  </li>
                );
              })}
            </ul>
          )
        )}
      </Bagian>
    </Modal>
  );
}
