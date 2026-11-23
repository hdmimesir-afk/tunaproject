"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Btn, Field, Inner, Modal, Pill, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { aturKondisiHasil, mintaPerbaikan, periksaProduksi, selesaikanProduksi, setujuiProduksi, simpanEkor, simpanKomponen, simpanLoinTotal, simpanTotalLoin } from "@/lib/actions/produksi";
import type { DetailProduksi as Detail } from "@/lib/data/produksi";
import { tanggal, waktu } from "@/lib/format";
import { gramKeTeks, keGram, tampilKg } from "@/lib/logic/grid";
import { formatPct, hitungNeraca, type BatasHasil } from "@/lib/logic/neraca";
import { LABEL_PRODUKSI } from "@/lib/logic/produksi";
import { bacaDraf } from "@/lib/offline/draft";
import type { Opsi, Pengguna } from "@/lib/types/pembelian";
import { LABEL_LINI, type ProyekOpsi } from "@/lib/types/produksi";
import { RiwayatKoreksi } from "@/components/ui/RiwayatKoreksi";
import { cetakFormulir } from "./cetak";
import { GridLoin } from "./GridLoin";
import { BukaLagi, KoreksiProduksi, KoreksiTimbangan } from "./KoreksiProduksi";

type Props = {
  detail: Detail;
  grade: Opsi[];
  samping: Opsi[];
  pengguna: Record<string, Pengguna>;
  batas: BatasHasil;
  bolehTulis: boolean;
  bolehPeriksa: boolean;
  bolehSetuju: boolean;
  proyek: ProyekOpsi[];
  koreksiAwal?: boolean;
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

/* ------------------------------------------------------- kondisi hasil */
/** Fresh atau beku: kebawa ke stok otomatis. Dikunci kalau stoknya udah ada yang keluar. */
function KondisiHasil({ produksiId, kondisi, bolehUbah, sudahStok }: { produksiId: string; kondisi: Detail["kondisi"]; bolehUbah: boolean; sudahStok: boolean }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(aturKondisiHasil, undefined);
  const bisa = bolehUbah && !kondisi.terkunci;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="produksiId" value={produksiId} />
      <div role="radiogroup" aria-label="Kondisi hasil" className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 sm:w-80">
        {(["beku", "fresh"] as const).map((k) => (
          <button key={k} type="submit" name="kondisi" value={k} role="radio" aria-checked={kondisi.nilai === k}
            disabled={!bisa || pending || kondisi.nilai === k}
            className="h-10 rounded-xl text-[13.5px] font-medium disabled:cursor-default"
            style={kondisi.nilai === k ? { background: INK, color: "#fff" } : { color: bisa ? INK : MUTED }}>
            {k === "beku" ? "Beku" : "Fresh"}
          </button>
        ))}
      </div>
      <p className="text-[12px]" style={{ color: MUTED }}>
        {kondisi.terkunci ? "Stoknya udah ada yg keluar, jadi kondisinya udah gak bisa diganti."
          : sudahStok ? "Stok hasil produksi ini ikut berubah kalau kondisinya diganti."
            : "Hasilnya masuk stok dengan kondisi ini begitu produksinya disetujui Owner."}
      </p>
      <Pesan state={state} />
    </form>
  );
}

/* ------------------------------------------------------------- neraca */
function Neraca({ p, batas }: { p: Detail["produksi"]; batas: BatasHasil }) {
  const n = hitungNeraca({ masukKg: p.masuk_kg, loinKg: p.loin_kg, hasilSampingKg: p.samping_kg, limbahKg: p.limbah_kg, susutKg: p.susut_kg }, batas);
  return (
    <Inner className="!p-3.5">
      <Baris k="Ikan masuk" v={`${p.jumlah_ekor ? `${p.jumlah_ekor} ekor · ` : ""}${kgTeks(n.masukKg)} kg`} tebal />
      {!!p.jumlah_ekor && n.masukKg > 0 && <Baris k="Rata-rata per ekor" v={`${kgTeks(Math.round((n.masukKg / p.jumlah_ekor) * 1000) / 1000)} kg utuh${n.loinKg > 0 ? ` · ${kgTeks(Math.round((n.loinKg / p.jumlah_ekor) * 1000) / 1000)} kg loin` : ""}`} />}
      <Baris k={`Loin · ${formatPct(n.hasilPct)}% dari ikan masuk`} v={`${kgTeks(n.loinKg)} kg`} />
      <Baris k="Hasil samping" v={`${kgTeks(n.hasilSampingKg)} kg`} />
      <Baris k="Limbah" v={n.limbahKg === null ? "belum ditimbang" : `${kgTeks(n.limbahKg)} kg`} />
      <Baris k="Susut" v={n.susutKg === null ? "belum ditimbang" : `${kgTeks(n.susutKg)} kg`} />
      <div className="mt-1 border-t border-[#E2E4EA] pt-1">
        <Baris k={`Selisih belum jelas · ${formatPct(n.belumJelasPct)}%`} v={`${kgTeks(n.belumJelasKg)} kg`} tebal warna={n.belumJelasKg > 0 ? "#8A5A00" : "#0B6B4A"} />
      </div>
      <p className="mt-1 text-[11.5px]" style={{ color: MUTED }}>Selisih itu sisa hitungan: ikan masuk dikurangi semua yang ditimbang. Nggak diisi otomatis dan nggak dipindah ke susut.</p>
      {n.perluDiperiksa && p.loin_kg > 0 && (
        <p className="mt-2 rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
          Hasil {formatPct(n.hasilPct)}% di luar batas wajar {batas.minPct} sampai {batas.maxPct}%. Cek lagi timbangan sama nomor loinnya.
        </p>
      )}
      {p.loin_kg > 0 && <p className="mt-1.5 text-[12px]" style={{ color: MUTED }}>Rencana hasil {batas.rencanaPct}%: {n.diAtasRencana ? "tercapai" : "belum tercapai"}.</p>}
    </Inner>
  );
}

/* ---------------------------------------- total loin sebelum grading (24 Nov 2026) */
/** Total berat loin + jumlah keping loin habis fillet, sebelum retouching (suntik gas CO) dan grading loin.
    Grade asli baru ketahuan abis dibekuin, jadi total per grade bisa beda sama total ini; selisihnya cuma diinfoin. */
function TotalLoin({ p, bolehTulis }: { p: Detail["produksi"]; bolehTulis: boolean }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanTotalLoin, undefined);
  const berjalan = p.status === "berjalan";
  const [ubah, setUbah] = useState(false);
  // Abis kesimpan, angkanya berubah dan komponen ini dipasang ulang (key di pemanggil), jadi form koreksinya ketutup sendiri.
  const bisaIsi = bolehTulis && (berjalan || ubah);
  const total = p.loin_berat_total ?? null;
  const perGrade = p.loin_kg ?? 0;
  const selisih = total !== null && perGrade > 0 ? Math.round((total - perGrade) * 1000) / 1000 : null;
  const ringkas = (
    <div className="space-y-1 text-[13px] tabular-nums" data-testid="total-loin-fillet">
      <Baris k="Total berat loin" v={total !== null ? `${kgTeks(total)} kg` : "belum diisi"} />
      <Baris k="Jumlah loin" v={p.loin_jumlah_total ? `${p.loin_jumlah_total} keping` : "belum diisi"} />
      {perGrade > 0 && <Baris k="Total per grade" v={`${kgTeks(perGrade)} kg`} />}
      {selisih !== null && selisih !== 0 && (
        <p className="text-[12px]" style={{ color: MUTED }}>Beda {kgTeks(Math.abs(selisih))} kg sama total per grade ({selisih > 0 ? "total habis fillet lebih berat" : "total per grade lebih berat"}).</p>
      )}
    </div>
  );
  if (!bisaIsi) {
    return (
      <div className="space-y-2">
        <Inner className="!p-3.5">{ringkas}</Inner>
        {bolehTulis && !berjalan && <Btn size="sm" v="light" onClick={() => setUbah(true)}>Koreksi total loin</Btn>}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3" data-testid="form-total-loin">
      <input type="hidden" name="produksiId" value={p.id} />
      <Pesan state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Total berat loin (kg)" error={state?.kolom?.kg?.[0]}>
          <TextIn name="kg" inputMode="decimal" placeholder="0" defaultValue={total !== null ? inputKg(total) : ""} />
        </Field>
        <Field label="Jumlah loin (keping)" error={state?.kolom?.jumlah?.[0]}>
          <TextIn name="jumlah" inputMode="numeric" placeholder="0" defaultValue={p.loin_jumlah_total ?? ""} />
        </Field>
      </div>
      {!berjalan && (
        <Field label="Alasan koreksi" hint="Produksi ini udah selesai, jadi perubahannya kecatat sebagai koreksi.">
          <TextIn name="alasan" maxLength={500} required />
        </Field>
      )}
      <p className="text-[12px]" style={{ color: MUTED }}>Isi abis fillet, sebelum retouching dan grading loin.{perGrade > 0 ? ` Total per grade sekarang ${kgTeks(perGrade)} kg.` : ""}</p>
      <div className="flex flex-wrap gap-2">
        <Btn type="submit" size="sm" disabled={pending}>{pending ? "Menyimpan..." : "Simpan total loin"}</Btn>
        {!berjalan && <Btn size="sm" v="ghost" onClick={() => setUbah(false)}>Batal</Btn>}
      </div>
    </form>
  );
}

/* --------------------------------------------------- loin total per grade */
function FormLoinTotal({ detail, grade }: { detail: Detail; grade: Opsi[] }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanLoinTotal, undefined);
  const awal = useMemo(() => new Map(detail.total.filter((t) => t.kg > 0).map((t) => [t.grade_id, inputKg(t.kg)])), [detail.total]);
  const [nilai, setNilai] = useState<Record<string, string>>(() => Object.fromEntries(grade.map((g) => [g.id, awal.get(g.id) ?? ""])));
  const gram = Object.values(nilai).reduce<number | null>((a, v) => {
    if (a === null) return null;
    if (v.trim() === "" || /^0([.,]0{1,3})?$/.test(v.trim())) return a;
    const g = keGram(v);
    return g === null ? null : a + g;
  }, 0);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="produksiId" value={detail.produksi.id} />
      <input type="hidden" name="baris" value={JSON.stringify(grade.map((g) => ({ grade_id: g.id, kg: nilai[g.id] ?? "" })))} />
      <Pesan state={state} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {grade.map((g) => (
          <Field key={g.id} label={`${g.label} (kg)`}>
            <TextIn inputMode="decimal" placeholder="0" value={nilai[g.id] ?? ""} onChange={(e) => setNilai((n) => ({ ...n, [g.id]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] tabular-nums" style={{ color: gram === null ? "#A8322B" : INK }} data-testid="total-loin-isian">
          {gram === null ? "Cek lagi angkanya, maksimal 3 angka di belakang koma." : `Total ${tampilKg(gram)} kg`}
        </span>
        <Btn type="submit" size="sm" disabled={pending || gram === null}>{pending ? "Menyimpan..." : "Simpan total loin"}</Btn>
      </div>
    </form>
  );
}

function DaftarLoinTotal({ total, namaGrade }: { total: Detail["total"]; namaGrade: Map<string, string> }) {
  const isi = total.filter((t) => t.kg > 0);
  if (isi.length === 0) return <p className="text-[13px]" style={{ color: MUTED }}>Belum ada berat loin.</p>;
  return (
    <Inner className="!p-3.5">
      {isi.map((t) => <Baris key={t.id} k={namaGrade.get(t.grade_id) ?? "Grade"} v={`${kgTeks(t.kg)} kg`} />)}
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
        <Field label="Limbah, total (kg)" error={state?.kolom?.limbah?.[0]} hint="Biarin kosong kalau belum ditimbang.">
          <TextIn name="limbah" inputMode="decimal" value={limbah} onChange={(e) => setLimbah(e.target.value)} />
        </Field>
        <Field label="Susut, total (kg)" error={state?.kolom?.susut?.[0]} hint="Biarin kosong kalau belum ditimbang.">
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
        pesan="Habis diselesaikan, loin dan komponen dikunci terus masuk pemeriksaan QC. Lanjut?" />
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
        <Field label={`Penjelasan selisih ${kgTeks(p.belum_jelas_kg)} kg`} hint="Wajib diisi. Atau terusin ke Owner, nanti Owner yang boleh nerima selisihnya apa adanya.">
          <TextIn name="penjelasan" maxLength={500} placeholder="Misalnya: tulang tengah dan darah belum ditimbang" />
        </Field>
      )}
      <KonfirmasiDua full label="Tandai sudah diperiksa (QC)" labelYa="Ya, sudah saya periksa" pending={pending}
        pesan="Timbangan dan neraca udah dicek dan benar. Habis ini produksi tinggal nunggu Owner." />
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
        pesan="Produksi dianggap udah diperiksa dan nggak bisa diubah lagi. Lanjut?" />
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
export function DetailProduksi({ detail, grade, samping, pengguna, batas, bolehTulis, bolehPeriksa, bolehSetuju, proyek, koreksiAwal, onTutup }: Props) {
  const { produksi: p, alokasi, loin, ekor, riwayat } = detail;
  const [koreksi, setKoreksi] = useState(!!koreksiAwal && bolehTulis);
  const [timbangan, setTimbangan] = useState(false);
  const jasa = p.kg_masuk_pt !== null && p.kg_masuk_pt !== undefined;
  const berjalan = p.status === "berjalan";
  const bolehEdit = bolehTulis && berjalan;
  const namaGrade = useMemo(() => new Map(grade.map((g) => [g.id, g.label])), [grade]);
  const namaSamping = useMemo(() => new Map(samping.map((s) => [s.id, s.label])), [samping]);
  const noLoin = useMemo(() => new Map(loin.map((l) => [l.id, l.no_loin])), [loin]);
  const [tampilRiwayat, setTampilRiwayat] = useState(false);
  // Satu produksi memakai satu cara: total per grade (sehari-hari) atau per potong (pilihan). Database menolak campuran.
  const adaPotong = loin.some((l) => !l.batal);
  const adaTotal = detail.total.some((t) => t.kg > 0);
  const [cara, setCara] = useState<"total" | "potong">(adaPotong ? "potong" : "total");
  const caraAktif = adaPotong ? "potong" : adaTotal ? "total" : cara;
  // Draf grid yang belum terkirim (misalnya sinyal putus) membuka cara per potong supaya drafnya terlihat.
  useEffect(() => {
    if (!bolehEdit || adaPotong || adaTotal) return;
    let batal = false;
    bacaDraf(p.id).then((d) => { if (!batal && d && d.baris.length > 0) setCara("potong"); });
    return () => { batal = true; };
  }, [p.id, bolehEdit, adaPotong, adaTotal]);

  return (
    <Modal title={`${p.kode} · ${tanggal(p.tanggal)}`} onClose={onTutup} lebar>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill t={LABEL_PRODUKSI[p.status]} />
        {p.siklus_kode && <Pill t={[p.siklus_kode, p.proyek_nama].filter(Boolean).join(" · ")} />}
        <span className="ml-auto flex flex-wrap gap-2">
          {bolehTulis && <Btn size="sm" v="light" onClick={() => setKoreksi(true)}>Koreksi</Btn>}
          {bolehTulis && !berjalan && <Btn size="sm" v="light" onClick={() => setTimbangan(true)}>Koreksi timbangan</Btn>}
          {bolehSetuju && p.status === "diperiksa" && !p.sudah_stok && <BukaLagi produksiId={p.id} />}
          <Btn size="sm" v="light" onClick={() => { if (!cetakFormulir(detail, namaGrade, namaSamping)) alert("Jendela cetak diblokir browser. Izinkan pop-up dulu, terus coba lagi."); }}>Cetak formulir</Btn>
        </span>
      </div>
      <p className="text-[12.5px]" style={{ color: MUTED }}>
        {LABEL_LINI[p.lini_bisnis ?? "jual"]} · Pemilik ikan: {p.pt_nama ?? (jasa ? "-" : "PT Katalis (sendiri)")}
      </p>
      {koreksi && <KoreksiProduksi detail={detail} proyek={proyek} onTutup={() => setKoreksi(false)} />}
      {timbangan && <KoreksiTimbangan detail={detail} grade={grade} samping={samping} onTutup={() => setTimbangan(false)} />}

      {p.catatan_perbaikan && berjalan && (
        <p className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Diminta perbaikan: {p.catatan_perbaikan}</p>
      )}

      <Bagian judul="Neraca berat"><Neraca p={p} batas={batas} /></Bagian>

      <Bagian judul="Kondisi hasil">
        <KondisiHasil produksiId={p.id} kondisi={detail.kondisi} bolehUbah={bolehTulis} sudahStok={!!p.sudah_stok} />
      </Bagian>

      {jasa ? (
        <Bagian judul="Ikan dari PT">
          <span className="rounded-full bg-white px-3 py-1.5 text-[12.5px]" style={{ color: INK }}>{p.pt_nama ?? "PT"} · {kgTeks(p.kg_masuk_pt ?? 0)} kg</span>
        </Bagian>
      ) : (
        <Bagian judul="Lot yang diproduksi">
          <ul className="overflow-hidden rounded-2xl bg-white" data-testid="lot-asal">
            {alokasi.map((a) => {
              const l = detail.lotAsal.find((x) => x.id === a.lot_id);
              return (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-[#EEF0F4] px-3.5 py-2 text-[12.5px] first:border-t-0" style={{ color: INK }}>
                  <span><b className="font-semibold">{a.lot_kode}</b> · {kgTeks(a.kg)} kg dipakai{l && Math.round(l.kg * 1000) !== Math.round(a.kg * 1000) ? ` dari ${kgTeks(l.kg)} kg` : ""}{l?.jumlah_ekor ? ` · ${l.jumlah_ekor} ekor` : ""}{l?.jenis ? ` · ${l.jenis}` : ""}</span>
                  <span style={{ color: MUTED }}>Grade tuna utuh: {l && l.grade.length > 0 ? l.grade.map((g) => `${g.kode} ${kgTeks(g.kg)} kg`).join(", ") : "belum digrading"}</span>
                </li>
              );
            })}
          </ul>
        </Bagian>
      )}

      <Bagian judul="Total loin habis fillet">
        <TotalLoin key={`${p.id}:${p.status}:${p.loin_berat_total ?? ""}:${p.loin_jumlah_total ?? ""}`} p={p} bolehTulis={bolehTulis} />
      </Bagian>

      {caraAktif === "total" ? (
        <Bagian judul="Loin total per grade" kanan={bolehEdit && !adaTotal && <Btn size="sm" v="ghost" onClick={() => setCara("potong")}>Timbang per potong</Btn>}>
          {bolehEdit ? <FormLoinTotal key={p.id} detail={detail} grade={grade} /> : <DaftarLoinTotal total={detail.total} namaGrade={namaGrade} />}
          {bolehEdit && <p className="mt-2 text-[12px]" style={{ color: MUTED }}>Cukup isi berat total loin tiap grade. Kalau mau nimbang satu per satu, pakai Timbang per potong sebelum ngisi total.</p>}
        </Bagian>
      ) : (
        <Bagian judul="Loin per potong" kanan={bolehEdit && !adaPotong && <Btn size="sm" v="ghost" onClick={() => setCara("total")}>Isi total per grade</Btn>}>
          <GridLoin key={p.id + ":" + p.status} produksiId={p.id} kode={p.kode} loin={loin} grade={grade} ekor={ekor} bolehEdit={bolehEdit} masukKg={p.masuk_kg} />
        </Bagian>
      )}

      {caraAktif === "potong" && (bolehEdit || ekor.length > 0) && (
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
          {p.status === "diperiksa" && (
            <p className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>
              Produksi udah disetujui. Biar hasilnya bisa dipilih di pesanan, masukin ke stok lewat menu <a href="/stok" className="font-medium underline">Stok</a>, tombol Hasil produksi masuk.
            </p>
          )}
          {berjalan && bolehTulis && <Selesaikan id={p.id} />}
          {p.status === "selesai" && bolehPeriksa && <PeriksaQc p={p} />}
          {p.status === "diperiksa_qc" && bolehSetuju && <SetujuiOwner p={p} />}
          {(p.status === "selesai" || p.status === "diperiksa_qc") && (bolehPeriksa || bolehSetuju) && <MintaPerbaikan id={p.id} />}
        </div>
      </Bagian>

      {caraAktif === "potong" && <Bagian judul="Riwayat koreksi loin" kanan={<Btn size="sm" v="ghost" onClick={() => setTampilRiwayat((x) => !x)}>{tampilRiwayat ? "Sembunyikan" : `Tampilkan (${riwayat.length})`}</Btn>}>
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
      </Bagian>}
      <RiwayatKoreksi daftar={detail.koreksi} pengguna={pengguna} nama={Object.fromEntries(proyek.map((x) => [x.id, x.label]))} />
    </Modal>
  );
}
