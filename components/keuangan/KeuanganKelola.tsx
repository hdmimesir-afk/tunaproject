"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { DaftarDokumen, Unggah } from "@/components/dokumen/Dokumen";
import { BukuKas } from "./BukuKas";
import { Periode } from "./Periode";
import { Btn, Card, DataList, Field, Inner, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { ajukanBiaya, putuskanBiaya, simpanBiaya } from "@/lib/actions/keuangan";
import { rp, tanggal } from "@/lib/format";
import type { Biaya, BarisKas, BukuBulanan, KategoriBiaya } from "@/lib/types/keuangan";
import type { Dokumen, Opsi } from "@/lib/types/pembelian";

type Props = {
  biaya: Biaya[];
  kategori: KategoriBiaya[];
  siklus: Opsi[];
  rujukan: Rujukan;
  kas: BarisKas[];
  buku: BukuBulanan[];
  bolehTutup: boolean;
  detail: { biaya: Biaya; berkas: Dokumen[] } | null;
  bolehTulis: boolean;
  bolehSetuju: boolean;
  bolehDokumen: boolean;
  hariIni: string;
};

const LABEL = { draf: "Draf", diajukan: "Menunggu Owner", disetujui: "Disetujui", ditolak: "Ditolak" } as const;
type Rujukan = { po: Opsi[]; produksi: Opsi[] };
/** "PO-0003 · SIK-0001" dari kolom rujukan yang terisi. */
const rujukanTeks = (b: Biaya) => [b.po_kode, b.produksi_kode, b.siklus_kode].filter(Boolean).join(" · ") || "-";

function FormBiaya({ kategori, siklus, rujukan, hariIni, awal, onSelesai }: { kategori: KategoriBiaya[]; siklus: Opsi[]; rujukan: Rujukan; hariIni: string; awal: Biaya | null; onSelesai: (id: string) => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanBiaya, undefined);
  const [kat, setKat] = useState(awal?.category_id ?? "");
  useEffect(() => { if (state?.id && !state.error) onSelesai(state.id); }, [state, onSelesai]);
  const k = kategori.find((x) => x.id === kat);
  return (
    <form action={action} className="space-y-3">
      {awal && <input type="hidden" name="biayaId" value={awal.id} />}
      <PesanForm state={state?.error ? state : undefined} />
      <Field label="Kategori" error={state?.kolom?.kategoriId?.[0]}>
        <select name="kategoriId" className={pilihCls} value={kat} onChange={(e) => setKat(e.target.value)} required>
          <option value="" disabled>Pilih kategori</option>{kategori.map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
        </select>
      </Field>
      {k && <p className="text-[12px]" style={{ color: k.nota_wajib ? "#8A5A00" : MUTED }}>{k.nota_wajib ? "Kategori ini wajib melampirkan nota sebelum diajukan." : "Kategori ini tidak mewajibkan nota."}</p>}
      <Field label="Uraian" error={state?.kolom?.uraian?.[0]}><TextIn name="uraian" maxLength={200} defaultValue={awal?.uraian} placeholder="Misalnya ongkos kargo 29 Okt" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Jumlah (Rp)" error={state?.kolom?.jumlah?.[0]}><TextIn name="jumlah" inputMode="decimal" defaultValue={awal ? String(awal.jumlah).replace(".", ",") : ""} required /></Field>
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={awal?.tanggal ?? hariIni} required /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="PO terkait" hint="Boleh kosong.">
          <select name="poId" className={pilihCls} defaultValue={awal?.po_id ?? ""}><option value="">Tanpa PO</option>{rujukan.po.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </Field>
        <Field label="Produksi terkait" hint="Boleh kosong.">
          <select name="produksiId" className={pilihCls} defaultValue={awal?.production_id ?? ""}><option value="">Tanpa produksi</option>{rujukan.produksi.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </Field>
      </div>
      <Field label="Siklus" hint="Supaya masuk laba rugi siklus itu. Kosong = ikut siklus PO atau produksinya.">
        <select name="siklusId" className={pilihCls} defaultValue={awal?.cycle_id ?? ""}><option value="">Ikut PO/produksi, atau tanpa siklus</option>{siklus.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
      </Field>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : awal ? "Simpan perubahan" : "Simpan draf biaya"}</Btn>
    </form>
  );
}

function Ajukan({ b }: { b: Biaya }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(ajukanBiaya, undefined);
  const siap = !b.nota_wajib || b.jml_nota > 0;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="biayaId" value={b.id} />
      <PesanForm state={state} />
      <KonfirmasiDua full label="Ajukan ke Owner" labelYa="Ya, ajukan biaya" pending={pending} disabled={!siap} pesan={`Biaya ${rp(b.jumlah)} diajukan untuk disetujui Owner dan tidak bisa diubah lagi.`} />
      {!siap && <p className="text-[12px]" style={{ color: "#8A5A00" }}>Lampirkan nota dulu supaya bisa diajukan.</p>}
    </form>
  );
}

function Putusan({ b }: { b: Biaya }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(putuskanBiaya, undefined);
  const [tolak, setTolak] = useState(false);
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="biayaId" value={b.id} />
      <PesanForm state={state} />
      {!tolak ? (
        <>
          <input type="hidden" name="setuju" value="ya" /><input type="hidden" name="catatan" value="" />
          <KonfirmasiDua full label="Setujui biaya" labelYa="Ya, setujui dan catat ke buku kas" pending={pending} pesan={`Biaya ${rp(b.jumlah)} dicatat sebagai uang keluar di buku kas.`} />
          <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={() => setTolak(true)}>Tolak biaya...</Btn></div>
        </>
      ) : (
        <>
          <input type="hidden" name="setuju" value="tidak" />
          <Field label="Alasan menolak"><TextIn name="catatan" maxLength={300} required /></Field>
          <Btn type="submit" full v="danger" disabled={pending}>{pending ? "Menolak..." : "Tolak biaya"}</Btn>
          <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={() => setTolak(false)}>Kembali</Btn></div>
        </>
      )}
    </form>
  );
}

export function KeuanganKelola({ biaya, kategori, siklus, rujukan, kas, buku, bolehTutup, detail, bolehTulis, bolehSetuju, bolehDokumen, hariIni }: Props) {
  const router = useRouter();
  const [baru, setBaru] = useState(false);
  const [ubah, setUbah] = useState(false);
  const menunggu = biaya.filter((b) => b.status === "diajukan");
  const bulan = hariIni.slice(0, 7);
  const masukBulan = kas.filter((k) => k.arah === "masuk" && k.tanggal.startsWith(bulan)).reduce((a, k) => a + Math.round(k.jumlah * 100), 0) / 100;
  const keluarBulan = kas.filter((k) => k.arah === "keluar" && k.tanggal.startsWith(bulan)).reduce((a, k) => a + Math.round(k.jumlah * 100), 0) / 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Stat value={rp(masukBulan)} label="Uang masuk bulan ini" tone="ok" />
        <Stat value={rp(keluarBulan)} label="Uang keluar bulan ini" />
        <Stat value={rp(masukBulan - keluarBulan)} label="Selisih bulan ini" tone={masukBulan - keluarBulan < 0 ? "warn" : undefined} />
        <Stat value={String(menunggu.length)} label="Biaya menunggu Owner" tone={menunggu.length > 0 ? "warn" : undefined} />
      </div>

      <Card title="Biaya" right={bolehTulis && <Btn size="sm" onClick={() => setBaru(true)}>Catat biaya</Btn>}>
        <DataList
          rows={biaya}
          empty={bolehTulis ? "Belum ada biaya. Ketuk Catat biaya, lampirkan nota, lalu ajukan." : "Belum ada biaya."}
          cols={[
            { h: "Biaya", r: (b: Biaya) => <><span className="font-medium">{b.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{b.uraian}</span></> },
            { h: "Kategori", r: (b) => b.kategori_nama },
            { h: "Rujukan", r: (b) => rujukanTeks(b) },
            { h: "Jumlah", r: (b) => rp(b.jumlah), right: true },
            { h: "Nota", r: (b) => (b.jml_nota > 0 ? `${b.jml_nota} berkas` : b.nota_wajib ? "belum ada" : "tidak wajib") },
            { h: "Status", r: (b) => <Pill t={LABEL[b.status]} /> },
          ]}
          actions={(b) => <Btn size="sm" v="light" onClick={() => router.push(`/keuangan?b=${b.id}`)}>Buka</Btn>}
        />
      </Card>

      <BukuKas kas={kas} hariIni={hariIni} />

      <Periode buku={buku} bolehTutup={bolehTutup} />

      {baru && (
        <Modal title="Catat biaya" onClose={() => setBaru(false)}>
          <FormBiaya kategori={kategori} siklus={siklus} rujukan={rujukan} hariIni={hariIni} awal={null} onSelesai={(id) => { setBaru(false); router.push(`/keuangan?b=${id}`); }} />
        </Modal>
      )}
      {detail && (
        <Modal title={`${detail.biaya.kode} · ${detail.biaya.kategori_nama}`} onClose={() => { setUbah(false); router.push("/keuangan"); }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill t={LABEL[detail.biaya.status]} />
            {[detail.biaya.po_kode, detail.biaya.produksi_kode, detail.biaya.siklus_kode].filter((x): x is string => Boolean(x)).map((x) => <Pill key={x} t={x} />)}
          </div>
          {ubah && bolehTulis && (detail.biaya.status === "draf" || detail.biaya.status === "ditolak") ? (
            <FormBiaya kategori={kategori} siklus={siklus} rujukan={rujukan} hariIni={hariIni} awal={detail.biaya} onSelesai={() => setUbah(false)} />
          ) : (
            <Inner className="!p-3.5">
              <div className="flex justify-between text-[13px]"><span>{detail.biaya.uraian}</span><b>{rp(detail.biaya.jumlah)}</b></div>
              <p className="mt-1 text-[12px]" style={{ color: MUTED }}>{tanggal(detail.biaya.tanggal)}</p>
              {detail.biaya.alasan_tolak && <p className="mt-1.5 text-[12.5px]" style={{ color: "#A8322B" }}>Ditolak: {detail.biaya.alasan_tolak}</p>}
            </Inner>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between"><h4 className="text-[13px] font-semibold">Nota</h4>
              {bolehDokumen && detail.biaya.status !== "disetujui" && <Unggah refTabel="expenses" refId={detail.biaya.id} jenis="nota" label="Lampirkan nota" />}</div>
            <DaftarDokumen dokumen={detail.berkas} kosong="Belum ada nota." />
          </div>
          {bolehTulis && (detail.biaya.status === "draf" || detail.biaya.status === "ditolak") && (
            <div className="space-y-3">
              {!ubah && <Btn size="sm" v="light" onClick={() => setUbah(true)}>Ubah biaya</Btn>}
              {detail.biaya.status === "draf" && !ubah && <Ajukan b={detail.biaya} />}
            </div>
          )}
          {bolehSetuju && detail.biaya.status === "diajukan" && <Putusan b={detail.biaya} />}
        </Modal>
      )}
    </div>
  );
}
