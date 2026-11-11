"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Btn, Field, Inner, Modal, Pill, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { mintaPerbaikan, periksaProduksi, selesaikanProduksi, setujuiProduksi, simpanEkor, simpanKomponen, simpanLoinTotal } from "@/lib/actions/produksi";
import type { DetailProduksi as Detail } from "@/lib/data/produksi";
import { tanggal, waktu } from "@/lib/format";
import { gramKeTeks, keGram, tampilKg } from "@/lib/logic/grid";
import { formatPct, hitungNeraca, type BatasHasil } from "@/lib/logic/neraca";
import { LABEL_PRODUKSI } from "@/lib/logic/produksi";
import { bacaDraf } from "@/lib/offline/draft";
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
export function DetailProduksi({ detail, grade, samping, pengguna, batas, bolehTulis, bolehPeriksa, bolehSetuju, onTutup }: Props) {
  const { produksi: p, alokasi, loin, ekor, riwayat } = detail;
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
        {p.siklus_kode && <Pill t={p.siklus_kode} />}
        <span className="ml-auto flex gap-2">
          <Btn size="sm" v="light" onClick={() => { if (!cetakFormulir(detail, namaGrade, namaSamping)) alert("Jendela cetak diblokir browser. Izinkan pop-up dulu, terus coba lagi."); }}>Cetak formulir</Btn>
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

      {caraAktif === "total" ? (
        <Bagian judul="Loin total per grade" kanan={bolehEdit && !adaTotal && <Btn size="sm" v="ghost" onClick={() => setCara("potong")}>Timbang per potong</Btn>}>
          {bolehEdit ? <FormLoinTotal key={p.id} detail={detail} grade={grade} /> : <DaftarLoinTotal total={detail.total} namaGrade={namaGrade} />}
          {bolehEdit && <p className="mt-2 text-[12px]" style={{ color: MUTED }}>Cukup isi berat total loin tiap grade. Kalau mau nimbang satu per satu, pakai Timbang per potong sebelum ngisi total.</p>}
        </Bagian>
      ) : (
        <Bagian judul="Loin per potong" kanan={bolehEdit && !adaPotong && <Btn size="sm" v="ghost" onClick={() => setCara("total")}>Isi total per grade</Btn>}>
          <GridLoin key={p.id + ":" + p.status}produksiId={p.id} kode={p.kode} loin={loin} grade={grade} ekor={ekor} bolehEdit={bolehEdit} />
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
    </Modal>
  );
}
