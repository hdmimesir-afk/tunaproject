"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Btn, Card, DataList, Field, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { mulaiProduksi } from "@/lib/actions/produksi";
import type { DetailProduksi as Detail } from "@/lib/data/produksi";
import { tanggal } from "@/lib/format";
import { gramKeTeks, tampilKg } from "@/lib/logic/grid";
import { formatPct, type BatasHasil } from "@/lib/logic/neraca";
import { LABEL_PRODUKSI } from "@/lib/logic/produksi";
import type { Opsi, Pengguna } from "@/lib/types/pembelian";
import { LABEL_LINI, type LiniBisnis, type LotSiap, type ProduksiBaris, type ProyekOpsi } from "@/lib/types/produksi";
import { DetailProduksi } from "./DetailProduksi";

type Props = {
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
};

const kgTeks = (n: number) => tampilKg(Math.round(n * 1000));

const selectCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]";

/** Form mulai produksi: lini bisnis, proyek (pilih atau baru), tanggal, PT, lalu ikannya (lot buat jual, berat dari PT buat jasa).
    Titip saja nggak diproduksi: proyeknya dibikin, terus lanjut terima titipan di Gudang Dingin. */
function FormMulai({ lotSiap, proyek, pt, hariIni, onSelesai, onTitip }: {
  lotSiap: LotSiap[]; proyek: ProyekOpsi[]; pt: Opsi[]; hariIni: string; onSelesai: (id: string) => void; onTitip: (proyekId: string) => void;
}) {
  const [lini, setLini] = useState<LiniBisnis>("jual");
  const [siklusId, setSiklusId] = useState("baru");
  const [state, action, pending] = useActionState<HasilForm, FormData>(async (prev: HasilForm, fd: FormData) => {
    const r = await mulaiProduksi(prev, fd);
    if (r?.id && !r.error) (fd.get("lini") === "titip" ? onTitip : onSelesai)(r.id);
    return r;
  }, undefined);
  const [pilih, setPilih] = useState<Record<string, string>>({});
  const alokasi = Object.entries(pilih).map(([lot_id, kg]) => ({ lot_id, kg }));
  const pilihanProyek = proyek.filter((x) => x.lini_bisnis === lini);
  const proyekDipilih = proyek.find((x) => x.id === siklusId);
  const ptProyek = proyekDipilih?.pt_id ? pt.find((x) => x.id === proyekDipilih.pt_id)?.label : null;
  const gantiLini = (l: LiniBisnis) => { setLini(l); setSiklusId("baru"); };
  const alih = (l: LotSiap, on: boolean) =>
    setPilih((p) => {
      const n = { ...p };
      if (on) n[l.id] = gramKeTeks(Math.round(l.sisa_kg * 1000)).replace(".", ",");
      else delete n[l.id];
      return n;
    });
  const siap = lini === "titip" || lini === "jasa" || alokasi.length > 0;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="alokasi" value={JSON.stringify(alokasi)} />
      <input type="hidden" name="lini" value={lini} />
      {state?.error && <div role="alert" className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>}

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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Proyek" error={state?.kolom?.siklusId?.[0]}>
          <select name="siklusId" value={siklusId} onChange={(e) => setSiklusId(e.target.value)} className={selectCls}>
            <option value="baru">Proyek baru</option>
            {pilihanProyek.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </Field>
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={hariIni} required /></Field>
      </div>
      {siklusId === "baru" && (
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
      ) : lotSiap.length === 0 ? (
        <p className="text-[13px]" style={{ color: MUTED }}>Belum ada lot yang masih ada sisanya. Terima ikannya dulu di menu Mutu dan Penerimaan.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-[12px] font-medium" style={{ color: MUTED }}>Pilih lot yang masuk produksi ini</p>
          {lotSiap.map((l) => {
            const aktif = l.id in pilih;
            return (
              <div key={l.id} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5">
                <input type="checkbox" className="h-4 w-4 accent-[#00171F]" checked={aktif} onChange={(e) => alih(l, e.target.checked)} aria-label={`Pakai ${l.kode}`} />
                <div className="min-w-0 flex-1 text-[13px]">
                  <div className="font-medium">{l.kode}{l.grade_kode ? ` · ${l.grade_kode}` : " · belum digrading"}</div>
                  <div style={{ color: MUTED }}>{l.supplier_nama} · sisa {kgTeks(l.sisa_kg)} kg</div>
                </div>
                {aktif && (
                  <input aria-label={`Berat dari ${l.kode} (kg)`} inputMode="decimal" className="h-9 w-28 rounded-lg border border-[#E2E4EA] px-2 text-right text-[13px]"
                    value={pilih[l.id]} onChange={(e) => setPilih((p) => ({ ...p, [l.id]: e.target.value }))} />
                )}
              </div>
            );
          })}
        </div>
      )}
      <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
      <Btn type="submit" full disabled={pending || !siap}>{pending ? "Menyimpan..." : lini === "titip" ? "Buat proyek titipan" : "Mulai produksi"}</Btn>
    </form>
  );
}

export function ProduksiKelola({ daftar, lotSiap, proyek, pt, koreksiAwal, grade, samping, pengguna, detail, batas, bolehTulis, bolehPeriksa, bolehSetuju, hariIni }: Props) {
  const router = useRouter();
  const [mulai, setMulai] = useState(false);
  const buka = (id: string, koreksi = false) => router.push(`/produksi?p=${id}${koreksi ? "&koreksi=1" : ""}`);
  const berjalan = daftar.filter((p) => p.status === "berjalan").length;
  const menunggu = daftar.filter((p) => p.status === "selesai" || p.status === "diperiksa_qc").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={String(daftar.length)} label="Total produksi" />
        <Stat value={String(berjalan)} label="Sedang berjalan" />
        <Stat value={String(menunggu)} label="Menunggu pemeriksaan" tone={menunggu > 0 ? "warn" : undefined} />
      </div>

      <Card title="Daftar produksi" right={bolehTulis && <Btn size="sm" onClick={() => setMulai(true)}>Mulai produksi</Btn>}>
        <DataList
          rows={daftar}
          empty={bolehTulis ? "Belum ada produksi. Ketuk Mulai produksi, terus isi proyek dan ikannya." : "Belum ada produksi."}
          cari={(p) => `${p.kode} ${p.siklus_kode ?? ""} ${p.proyek_nama ?? ""} ${p.pt_nama ?? ""} ${LABEL_LINI[p.lini_bisnis ?? "jual"]} ${p.status.replace("_", " ")} ${p.tanggal}`}
          cols={[
            { h: "Produksi", r: (p: ProduksiBaris) => <><span className="font-medium">{p.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{tanggal(p.tanggal)}{p.siklus_kode ? ` · ${[p.siklus_kode, p.proyek_nama].filter(Boolean).join(" ")}` : ""}{p.lini_bisnis === "jasa" ? ` · jasa ${p.pt_nama ?? ""}` : ""}</span></> },
            { h: "Ikan masuk", r: (p) => `${kgTeks(p.masuk_kg)} kg`, right: true },
            { h: "Loin", r: (p) => `${kgTeks(p.loin_kg)} kg${p.jumlah_loin > 0 ? ` · ${p.jumlah_loin} potong` : ""}`, right: true },
            { h: "Hasil", r: (p) => `${formatPct(p.hasil_pct)}%`, right: true },
            { h: "Belum jelas", r: (p) => `${kgTeks(p.belum_jelas_kg)} kg (${formatPct(p.belum_jelas_pct)}%)`, right: true },
            { h: "Status", r: (p) => <Pill t={LABEL_PRODUKSI[p.status]} /> },
          ]}
          actions={(p) => <>
            <Btn size="sm" v="light" onClick={() => buka(p.id)}>Buka</Btn>
            {bolehTulis && <Btn size="sm" v="ghost" onClick={() => buka(p.id, true)}>Koreksi</Btn>}
          </>}
        />
      </Card>

      {mulai && (
        <Modal title="Mulai produksi" onClose={() => setMulai(false)}>
          <FormMulai lotSiap={lotSiap} proyek={proyek} pt={pt} hariIni={hariIni}
            onSelesai={(id) => { setMulai(false); buka(id); }}
            onTitip={(proyekId) => { setMulai(false); router.push(`/gudang?titip=${proyekId}`); }} />
        </Modal>
      )}

      {detail && (
        <DetailProduksi key={detail.produksi.id} detail={detail} grade={grade} samping={samping} pengguna={pengguna} batas={batas} proyek={proyek} koreksiAwal={koreksiAwal}
          bolehTulis={bolehTulis} bolehPeriksa={bolehPeriksa} bolehSetuju={bolehSetuju} onTutup={() => router.push("/produksi")} />
      )}
    </div>
  );
}
