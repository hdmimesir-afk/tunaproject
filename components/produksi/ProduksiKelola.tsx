"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Btn, Card, DataList, Field, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { mulaiProduksi } from "@/lib/actions/produksi";
import type { DetailProduksi as Detail, GradeProduksi } from "@/lib/data/produksi";
import { unduhExcel } from "@/lib/excel";
import { tanggal } from "@/lib/format";
import { gramKeTeks, keGram, tampilKg } from "@/lib/logic/grid";
import { formatPct, type BatasHasil } from "@/lib/logic/neraca";
import { LABEL_PRODUKSI } from "@/lib/logic/produksi";
import type { Opsi, Pengguna } from "@/lib/types/pembelian";
import { LABEL_LINI, type LiniBisnis, type LotSiap, type ProduksiBaris, type ProyekOpsi } from "@/lib/types/produksi";
import { DetailProduksi } from "./DetailProduksi";

type Props = {
  /** Halaman lini bisnis yang lagi dibuka (/produksi/jual atau /produksi/jasa). */
  lini: "jual" | "jasa";
  daftar: ProduksiBaris[];
  lotSiap: LotSiap[];
  proyek: ProyekOpsi[];
  pt: Opsi[];
  koreksiAwal: boolean;
  grade: Opsi[];
  samping: Opsi[];
  pengguna: Record<string, Pengguna>;
  detail: Detail | null;
  batas: BatasHasil;
  bolehTulis: boolean;
  bolehPeriksa: boolean;
  bolehSetuju: boolean;
  hariIni: string;
  /** Grade loin (grading akhir) dan grade tuna utuh lot asal per produksi, buat laporan. */
  ringkasGrade: Record<string, GradeProduksi>;
  /** Dari tombol Mulai produksi di Rincian Proyek: form langsung kebuka, proyeknya udah kepilih ("" = tanpa proyek). */
  mulaiAwal?: string | null;
  /** Dari halaman Stok (Produksi dari ikan ini): lot yang langsung kecentang. */
  lotAwal?: string[];
};

const kgTeks = (n: number) => tampilKg(Math.round(n * 1000));

/** Isi sel dua baris: angka utama, keterangan kecil di bawahnya. */
function Dua({ atas, bawah }: { atas: React.ReactNode; bawah?: string | null }) {
  return (
    <>
      <span className="font-medium tabular-nums">{atas}</span>
      {bawah && <span className="block text-[11.5px] font-normal tabular-nums md:ml-auto md:max-w-[12rem] md:whitespace-normal" style={{ color: MUTED }}>{bawah}</span>}
    </>
  );
}

/** Kode dan nama proyek; nama PT nggak diulang kalau udah jadi nama proyeknya. */
const namaProyek = (p: ProduksiBaris) => {
  const nama = p.proyek_nama?.trim() ?? "";
  const pt = p.lini_bisnis === "jasa" && p.pt_nama && !nama.toLowerCase().includes(p.pt_nama.toLowerCase()) ? p.pt_nama : "";
  return [p.siklus_kode, nama, pt].filter(Boolean).join(" · ");
};

/** Laporan produksi ke Excel: ikan masuk (ekor dan berat), grade tuna utuh, loin per grade, yield, hasil samping, limbah, susut, selisih. */
function unduhLaporan(daftar: ProduksiBaris[], ringkas: Record<string, GradeProduksi>) {
  const kg = (n: number | null) => (n === null ? "" : n);
  const baris = daftar.map((p) => [
    p.kode, p.tanggal, [p.siklus_kode, p.proyek_nama].filter(Boolean).join(" "), LABEL_LINI[p.lini_bisnis ?? "jual"], p.pt_nama ?? (p.kg_masuk_pt ? "" : "PT Katalis"),
    p.jumlah_ekor ?? "", kg(p.masuk_kg), ringkas[p.id]?.utuh ?? "", kg(p.loin_kg), ringkas[p.id]?.loin ?? "", p.hasil_pct,
    kg(p.samping_kg), kg(p.limbah_kg), kg(p.susut_kg), kg(p.belum_jelas_kg), p.belum_jelas_pct, LABEL_PRODUKSI[p.status],
  ]);
  const jumlah = (f: (p: ProduksiBaris) => number | null | undefined) => Math.round(daftar.reduce((a, p) => a + Math.round(Number(f(p) ?? 0) * 1000), 0)) / 1000;
  const masuk = jumlah((p) => p.masuk_kg);
  const loin = jumlah((p) => p.loin_kg);
  void unduhExcel("laporan-produksi", {
    judul: "Laporan produksi",
    bagian: [{
      kolom: [
        { judul: "Kode" }, { judul: "Tanggal" }, { judul: "Proyek" }, { judul: "Lini bisnis" }, { judul: "PT" },
        { judul: "Jumlah ekor", jenis: "angka" }, { judul: "Ikan masuk (kg)", jenis: "kg" }, { judul: "Grade tuna utuh (lot asal)" },
        { judul: "Loin (kg)", jenis: "kg" }, { judul: "Grading akhir loin" }, { judul: "Yield (%)", jenis: "persen" },
        { judul: "Hasil samping (kg)", jenis: "kg" }, { judul: "Limbah (kg)", jenis: "kg" }, { judul: "Susut (kg)", jenis: "kg" },
        { judul: "Selisih belum jelas (kg)", jenis: "kg" }, { judul: "Selisih (%)", jenis: "persen" }, { judul: "Status" },
      ],
      baris: [...baris, [
        "TOTAL", "", "", "", "", daftar.reduce((a, p) => a + (p.jumlah_ekor ?? 0), 0) || "", masuk, "", loin, "",
        masuk > 0 ? Math.round((loin / masuk) * 1000) / 10 : "", jumlah((p) => p.samping_kg), jumlah((p) => p.limbah_kg), jumlah((p) => p.susut_kg),
        jumlah((p) => p.belum_jelas_kg), "", "",
      ]],
      tebal: [baris.length],
    }],
  });
}

const selectCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]";

/** Form mulai produksi: lini bisnis, proyek (pilih atau baru), tanggal, PT, lalu ikannya (lot buat jual, berat dari PT buat jasa).
    Titip saja nggak diproduksi: proyeknya dibikin, terus lanjut terima titipan di Gudang Dingin. */
export function FormMulai({ lotSiap, proyek, pt, hariIni, proyekAwal = "", lotAwal = [], liniTetap, onSelesai, onTitip }: {
  lotSiap: LotSiap[]; proyek: ProyekOpsi[]; pt: Opsi[]; hariIni: string; proyekAwal?: string; lotAwal?: string[];
  /** Dibuka dari halaman satu lini bisnis: pilihan lini disembunyiin, lini-nya ngikut halamannya. */
  liniTetap?: LiniBisnis;
  onSelesai: (id: string) => void; onTitip: (proyekId: string) => void;
}) {
  // Dari Rincian Proyek: lini bisnis dan proyeknya ngikut proyek yang dibuka.
  const awal = proyek.find((x) => x.id === proyekAwal);
  // Dari Stok (tombol Mulai Produksi di lot): lotnya udah kepilih, lini otomatis jual (ikan sendiri). Kalau lotnya udah
  // terikat proyek, proyeknya ikut lot dan nggak bisa diganti (satu lot satu proyek, dijaga juga di database).
  const lotStok = lotSiap.filter((l) => lotAwal.includes(l.id));
  const [dariStok, setDariStok] = useState(lotStok.length > 0);
  const ikatan = lotStok.find((l) => l.cycle_id)?.cycle_id ?? null;
  // Proyek dipilih di sini (bukan pas terima ikan). Lot yg belum punya proyek bisa dipakai proyek mana aja,
  // begitu dipakai lotnya ikut proyek produksinya. Lot yg udah punya proyek cuma muncul di proyeknya sendiri.
  const [lini, setLini] = useState<LiniBisnis>(liniTetap ?? (lotStok.length > 0 ? "jual" : awal?.lini_bisnis ?? "jual"));
  const [siklusId, setSiklusId] = useState(ikatan ?? awal?.id ?? "baru");
  const [state, action, pending] = useActionState<HasilForm, FormData>(async (prev: HasilForm, fd: FormData) => {
    const r = await mulaiProduksi(prev, fd);
    if (r?.id && !r.error) (fd.get("lini") === "titip" ? onTitip : onSelesai)(r.id);
    return r;
  }, undefined);
  const [pilih, setPilih] = useState<Record<string, string>>(() => Object.fromEntries(lotSiap
    .filter((l) => lotAwal.includes(l.id) && (!l.cycle_id || l.cycle_id === siklusId))
    .map((l) => [l.id, gramKeTeks(Math.round(l.sisa_kg * 1000)).replace(".", ",")])));
  const alokasi = Object.entries(pilih).map(([lot_id, kg]) => ({ lot_id, kg }));
  const pilihanProyek = proyek.filter((x) => x.lini_bisnis === lini || x.id === siklusId);
  const proyekDipilih = proyek.find((x) => x.id === siklusId);
  const ptProyek = proyekDipilih?.pt_id ? pt.find((x) => x.id === proyekDipilih.pt_id)?.label : null;
  const lotProyek = dariStok ? lotStok : lotSiap.filter((l) => !l.cycle_id || l.cycle_id === siklusId);
  // Lot yg dipilih udah terikat proyek? Proyeknya dikunci ke situ.
  const kunciProyek = lini === "jual" ? lotSiap.find((l) => l.id in pilih && l.cycle_id)?.cycle_id ?? null : null;
  const namaKunci = kunciProyek ? proyek.find((x) => x.id === kunciProyek)?.label ?? lotSiap.find((l) => l.cycle_id === kunciProyek)?.proyek ?? "proyeknya" : null;
  // Berat yg diolah nggak boleh lebih dari yg tersedia (dicek lagi di database).
  const salahLot = (l: LotSiap): string | null => {
    if (!(l.id in pilih)) return null;
    const g = keGram(pilih[l.id] ?? "");
    if (g === null) return "Isi beratnya, lebih dari nol";
    if (g > Math.round(l.sisa_kg * 1000)) return `Maks ${kgTeks(l.sisa_kg)} kg, sesuai yg tersedia`;
    return null;
  };
  const adaSalah = lotSiap.some((l) => salahLot(l) !== null);
  const gantiLini = (l: LiniBisnis) => { setLini(l); setSiklusId("baru"); setPilih({}); };
  // Ganti proyek: lot yg udah terikat proyek lain dilepas, lot bebas tetap kepilih (biar isian dari Stok nggak ilang).
  const gantiProyek = (id: string) => { setSiklusId(id); setPilih((p) => Object.fromEntries(Object.entries(p).filter(([k]) => { const c = lotSiap.find((l) => l.id === k)?.cycle_id; return !c || c === id; }))); };
  const alih = (l: LotSiap, on: boolean) =>
    setPilih((p) => {
      const n = { ...p };
      if (on) n[l.id] = gramKeTeks(Math.round(l.sisa_kg * 1000)).replace(".", ",");
      else delete n[l.id];
      return n;
    });
  const siap = lini === "titip" || lini === "jasa" || (alokasi.length > 0 && !adaSalah);
  // Saran jumlah ekor: jumlah ekor lot yang dipakai utuh (sisa = berat lot). Lot yang dipakai sebagian nggak bisa ditebak.
  const dipilih = lotSiap.filter((l) => l.id in pilih);
  const utuhSemua = dipilih.length > 0 && dipilih.every((l) => l.jumlah_ekor && l.kg !== undefined && l.sisa_kg === l.kg
    && keGram(pilih[l.id]) === Math.round(l.kg * 1000));
  const saranEkor = utuhSemua ? dipilih.reduce((a, l) => a + (l.jumlah_ekor ?? 0), 0) : null;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="alokasi" value={JSON.stringify(alokasi)} />
      <input type="hidden" name="lini" value={lini} />
      {state?.error && <div role="alert" className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>}

      {liniTetap && !dariStok ? (
        <p className="rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }} data-testid="lini-tetap">
          Lini bisnis: <b className="font-medium">{LABEL_LINI[liniTetap]}</b>
        </p>
      ) : dariStok ? (
        <p className="rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }}>
          Produksi dari Stok: <b className="font-medium">{LABEL_LINI.jual}</b>. Cek beratnya, pilih proyeknya, terus simpan.
        </p>
      ) : (
      <fieldset className="space-y-1.5">
        <legend className="mb-1 text-[13px] font-medium" style={{ color: INK }}>Lini bisnis</legend>
        {(["jual", "jasa", "titip"] as LiniBisnis[]).map((l) => (
          <label key={l} className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13.5px]"
            style={lini === l ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>
            <input type="radio" name="liniPilih" value={l} checked={lini === l} onChange={() => gantiLini(l)} className="sr-only" />
            {LABEL_LINI[l]}
          </label>
        ))}
      </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Proyek" error={state?.kolom?.siklusId?.[0]}>
          {kunciProyek ? (
            <>
              <input type="hidden" name="siklusId" value={kunciProyek} />
              <div className="flex h-11 items-center truncate rounded-2xl border border-[#E2E4EA] bg-[#F4F5F8] px-3.5 text-[14px]" style={{ color: INK }} data-testid="proyek-terkunci">{namaKunci}</div>
            </>
          ) : (
            <select name="siklusId" value={siklusId} onChange={(e) => gantiProyek(e.target.value)} className={selectCls} required>
              <option value="baru">Proyek baru</option>
              {pilihanProyek.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          )}
        </Field>
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={hariIni} required /></Field>
      </div>
      {siklusId === "baru" && !kunciProyek && (
        <Field label="Nama proyek" hint="Misalnya nama kapal, pembeli, atau tanggal bongkar." error={state?.kolom?.namaProyek?.[0]}>
          <TextIn name="namaProyek" maxLength={120} required />
        </Field>
      )}
      {lini === "jual" ? (
        <p className="rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }}>PT: <b className="font-medium">PT Katalis (ikan sendiri)</b></p>
      ) : siklusId === "baru" ? (
        <Field label="PT pemilik ikan" hint="Diambil dari daftar pembeli di Pengaturan." error={state?.kolom?.ptId?.[0]}>
          <select name="ptId" defaultValue="" className={selectCls} required>
            <option value="" disabled>Pilih PT</option>
            {pt.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </Field>
      ) : (
        <p className="rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }}>PT: <b className="font-medium">{ptProyek ?? "-"}</b></p>
      )}

      {lini === "titip" ? (
        <p className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#E4ECF7", color: "#2B4A70" }}>Titip saja nggak diproduksi. Habis ini langsung lanjut ke Terima titipan di Gudang Dingin, proyeknya udah keisi.</p>
      ) : lini === "jasa" ? (
        <Field label="Berat ikan dari PT (kg)" error={state?.kolom?.kgPt?.[0]}><TextIn name="kgPt" inputMode="decimal" required /></Field>
      ) : lotProyek.length === 0 ? (
        <p className="text-[13px]" style={{ color: MUTED }}>Belum ada ikan yg siap diolah. Terima ikannya dulu di menu Tally.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-[12px] font-medium" style={{ color: MUTED }}>{dariStok ? "Lot dari Stok. Beratnya udah keisi sebesar yg tersedia, ubah kalau cuma sebagian yg diolah." : "Pilih lot yg masuk produksi."}</p>
          {lotProyek.map((l) => <KartuLot key={l.id} l={l} aktif={l.id in pilih} nilai={pilih[l.id] ?? ""} salah={salahLot(l)}
            onAlih={(on) => alih(l, on)} onUbah={(v) => setPilih((p) => ({ ...p, [l.id]: v }))} />)}
          {dariStok && (
            <Btn type="button" size="sm" v="ghost" onClick={() => setDariStok(false)}>+ Tambah lot lain</Btn>
          )}
          {alokasi.length > 0 && (
            <p className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#E4ECF7", color: "#2B4A70" }} data-testid="info-ikatan-proyek">
              {kunciProyek
                ? `Lot ini udah terikat ke proyek ${namaKunci}. Satu lot cuma buat satu proyek, jadi produksinya otomatis masuk proyek itu.`
                : "Begitu disimpan, lot yg dipakai terikat ke proyek ini. Sisa lotnya nanti cuma bisa dipakai proyek ini juga."}
            </p>
          )}
        </div>
      )}
      {lini !== "titip" && (
        <Field label="Jumlah ekor" hint={saranEkor ? `Dari lot yang dipilih: ${saranEkor} ekor.` : "Boleh kosong, bisa diisi nanti lewat Koreksi."} error={state?.kolom?.jumlahEkor?.[0]}>
          <TextIn key={saranEkor ?? "kosong"} name="jumlahEkor" inputMode="numeric" defaultValue={saranEkor ?? ""} />
        </Field>
      )}
      <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
      <Btn type="submit" full disabled={pending || !siap}>{pending ? "Menyimpan..." : lini === "titip" ? "Buat proyek titipan" : "Simpan dan Mulai Produksi"}</Btn>
    </form>
  );
}

/** Satu lot di form Mulai Produksi: nomor, jenis ikan, berat awal, tersedia, sedang diproses, dan berat yg mau diolah. */
function KartuLot({ l, aktif, nilai, salah, onAlih, onUbah }: {
  l: LotSiap; aktif: boolean; nilai: string; salah: string | null; onAlih: (on: boolean) => void; onUbah: (v: string) => void;
}) {
  const asal = l.jenis ?? "";
  return (
    <div className="space-y-2.5 rounded-2xl bg-white px-3.5 py-3" data-testid="kartu-lot">
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#00171F]" checked={aktif} onChange={(e) => onAlih(e.target.checked)} aria-label={`Pakai ${l.kode}`} />
        <span className="min-w-0 flex-1 text-[13px]">
          <span className="block font-semibold" style={{ color: INK }}>{l.kode}{l.grade_kode ? ` · ${l.grade_kode}` : " · belum digrading"}</span>
          <span className="block truncate" style={{ color: MUTED }}>{[asal || "Jenis ikan belum diisi", l.supplier_nama, l.jumlah_ekor ? `${l.jumlah_ekor} ekor` : ""].filter(Boolean).join(" · ")}</span>
          {l.proyek && <span className="block truncate text-[12px]" style={{ color: "#2B4A70" }}>Proyek {l.proyek}</span>}
        </span>
      </label>
      <dl className="grid grid-cols-3 gap-2 text-[12px] tabular-nums">
        <div><dt style={{ color: MUTED }}>Berat awal</dt><dd className="font-medium" style={{ color: INK }}>{kgTeks(l.kg ?? l.sisa_kg)} kg</dd></div>
        <div><dt style={{ color: MUTED }}>Tersedia</dt><dd className="font-semibold" style={{ color: "#0B6B4A" }}>{kgTeks(l.sisa_kg)} kg</dd></div>
        <div><dt style={{ color: MUTED }}>Sedang diproses</dt><dd className="font-medium" style={{ color: (l.sedang_kg ?? 0) > 0 ? "#8A5A00" : "#B0B6BF" }}>{kgTeks(l.sedang_kg ?? 0)} kg</dd></div>
      </dl>
      {aktif && (
        <div>
          <label className="flex items-center justify-between gap-3 text-[13px]" style={{ color: INK }}>
            <span>Berat diolah</span>
            <span className="relative">
              <input aria-label={`Berat dari ${l.kode} (kg)`} aria-invalid={salah ? true : undefined} inputMode="decimal" value={nilai} onChange={(e) => onUbah(e.target.value)}
                className="h-10 w-32 rounded-xl border bg-white pl-2 pr-8 text-right text-[14px] tabular-nums outline-none focus:border-[#00171F]"
                style={{ borderColor: salah ? "#A8322B" : "#E2E4EA" }} />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: MUTED }}>kg</span>
            </span>
          </label>
          {salah && <p role="alert" className="mt-1 text-right text-[12px]" style={{ color: "#A8322B" }}>{salah}</p>}
        </div>
      )}
    </div>
  );
}

export function ProduksiKelola({ lini, daftar, lotSiap, proyek, pt, koreksiAwal, grade, samping, pengguna, detail, batas, bolehTulis, bolehPeriksa, bolehSetuju, hariIni, ringkasGrade, mulaiAwal, lotAwal }: Props) {
  const router = useRouter();
  const dasar = `/produksi/${lini}`;
  const [mulai, setMulai] = useState(mulaiAwal !== null && mulaiAwal !== undefined && bolehTulis);
  const buka = (id: string, koreksi = false) => router.push(`${dasar}?p=${id}${koreksi ? "&koreksi=1" : ""}`);
  const berjalan = daftar.filter((p) => p.status === "berjalan").length;
  const menunggu = daftar.filter((p) => p.status === "selesai" || p.status === "diperiksa_qc").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={String(daftar.length)} label="Total produksi" />
        <Stat value={String(berjalan)} label="Sedang berjalan" />
        <Stat value={String(menunggu)} label="Menunggu pemeriksaan" tone={menunggu > 0 ? "warn" : undefined} />
      </div>

      <Card title="Daftar produksi" right={<>
        {daftar.length > 0 && <Btn size="sm" v="light" onClick={() => unduhLaporan(daftar, ringkasGrade)}>Unduh laporan</Btn>}
        {bolehTulis && <Btn size="sm" onClick={() => setMulai(true)}>Mulai Produksi</Btn>}
      </>}>
        <DataList
          rows={daftar}
          empty={bolehTulis ? `Belum ada produksi. Ketuk Mulai Produksi${lini === "jual" ? ", atau dari Ringkasan Penerimaan pilih lotnya" : ""}.` : "Belum ada produksi."}
          cari={(p) => `${p.kode} ${p.siklus_kode ?? ""} ${p.proyek_nama ?? ""} ${p.pt_nama ?? ""} ${LABEL_LINI[p.lini_bisnis ?? "jual"]} ${p.status.replace("_", " ")} ${p.tanggal}`}
          cols={[
            { h: "Produksi", r: (p: ProduksiBaris) => (
              <div className="min-w-0 md:min-w-[11rem]">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{p.kode}</span>
                  {p.lini_bisnis === "jasa" && <span className="rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold leading-none" style={{ background: "#E4ECF7", color: "#2B4A70" }}>JASA</span>}
                </div>
                <span className="block text-[12px] font-normal" style={{ color: MUTED }}>{tanggal(p.tanggal)}</span>
                {p.siklus_kode && <span className="block max-w-[16rem] truncate text-[12px] font-normal" style={{ color: MUTED }} title={namaProyek(p)}>{namaProyek(p)}</span>}
              </div>
            ) },
            { h: "Ikan masuk", r: (p) => <Dua atas={`${kgTeks(p.masuk_kg)} kg`} bawah={p.jumlah_ekor ? `${p.jumlah_ekor} ekor` : null} />, right: true },
            { h: "Loin", r: (p) => <Dua atas={`${kgTeks(p.loin_kg)} kg`} bawah={[p.jumlah_loin > 0 ? `${p.jumlah_loin} potong` : "", ringkasGrade[p.id]?.loin ?? ""].filter(Boolean).join(" · ") || null} />, right: true },
            { h: "Hasil", r: (p) => {
              const wajar = p.hasil_pct >= batas.minPct && p.hasil_pct <= batas.maxPct;
              return <Dua atas={<span style={{ color: p.loin_kg > 0 && !wajar ? "#B4443C" : INK }}>{formatPct(p.hasil_pct)}%</span>}
                bawah={p.belum_jelas_kg !== 0 ? `${kgTeks(p.belum_jelas_kg)} kg belum jelas` : "semua jelas"} />;
            }, right: true },
            { h: "Status", r: (p) => <Pill t={LABEL_PRODUKSI[p.status]} /> },
          ]}
          actions={(p) => <>
            <Btn size="sm" v="light" onClick={() => buka(p.id)}>Buka</Btn>
            {bolehTulis && <Btn size="sm" v="light" onClick={() => buka(p.id, true)}>Koreksi</Btn>}
          </>}
        />
      </Card>

      {mulai && (
        <Modal title="Mulai Produksi" onClose={() => setMulai(false)}>
          <FormMulai lotSiap={lotSiap} proyek={proyek} pt={pt} hariIni={hariIni} proyekAwal={mulaiAwal ?? ""} lotAwal={lotAwal} liniTetap={lini}
            onSelesai={(id) => { setMulai(false); buka(id); }}
            onTitip={(proyekId) => { setMulai(false); router.push(`/produksi/titip?titip=${proyekId}`); }} />
        </Modal>
      )}

      {detail && (
        <DetailProduksi key={detail.produksi.id} detail={detail} grade={grade} samping={samping} pengguna={pengguna} batas={batas} proyek={proyek} koreksiAwal={koreksiAwal}
          bolehTulis={bolehTulis} bolehPeriksa={bolehPeriksa} bolehSetuju={bolehSetuju} onTutup={() => router.push(dasar)} />
      )}
    </div>
  );
}
