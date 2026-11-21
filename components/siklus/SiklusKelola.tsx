"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Btn, Card, DataList, Field, Inner, Modal, Pill, Stat, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { bukaKembaliSiklus, buatProyek, tutupSiklus } from "@/lib/actions/siklus";
import { LABEL_QC } from "@/lib/logic/pembelian";
import type { Opsi } from "@/lib/types/pembelian";
import { LABEL_LINI, type LiniBisnis } from "@/lib/types/produksi";
import type { RantaiSiklus } from "@/lib/data/laporan";
import { rp, tanggal } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import { LABEL_TAGIHAN, type StatusTagihan } from "@/lib/logic/penjualan";
import type { RingkasSiklus } from "@/lib/types/keuangan";

const kgT = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;

function Tahap({ judul, ringkas, children, kosong }: { judul: string; ringkas: string; children: React.ReactNode; kosong?: boolean }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold" style={{ color: INK }}>{judul}</h4>
        <span className="text-[12px]" style={{ color: MUTED }}>{ringkas}</span>
      </div>
      {kosong ? <p className="text-[13px]" style={{ color: MUTED }}>Belum ada.</p> : <div className="space-y-1.5">{children}</div>}
    </section>
  );
}

const Baris = ({ href, kiri, kanan }: { href: string; kiri: React.ReactNode; kanan?: React.ReactNode }) => (
  <Link href={href} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }}>
    <span className="min-w-0">{kiri}</span>{kanan && <span className="shrink-0 text-right font-medium">{kanan}</span>}
  </Link>
);

/* Tutup siklus (Owner): database menolak bila masih ada PO, produksi, pesanan, tagihan, atau biaya yang belum beres. */
function TutupSiklus({ id, kode }: { id: string; kode: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(tutupSiklus, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <PesanForm state={state} />
      <KonfirmasiDua full label="Tutup proyek" labelYa={`Ya, tutup ${kode}`} pending={pending}
        pesan="Kalau udah ditutup, PO, pesanan, sama biaya baru nggak bisa masuk ke proyek ini lagi. Kalau masih ada yang belum beres, sistem bakal nolak." />
    </form>
  );
}

function BukaSiklus({ id }: { id: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(bukaKembaliSiklus, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <PesanForm state={state?.error ? state : undefined} />
      <Field label="Alasan membuka kembali" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={300} required placeholder="Misalnya biaya kargo nyusul" /></Field>
      <Btn type="submit" v="light" full disabled={pending}>{pending ? "Membuka..." : "Buka kembali proyek"}</Btn>
    </form>
  );
}

function Rantai({ d, onTutup, bolehTutup, bolehIsi }: { d: RantaiSiklus; onTutup: () => void; bolehTutup: boolean; bolehIsi: boolean }) {
  const r = d.ringkas;
  const stok = d.stok ?? [];
  return (
    <Modal title={[r.kode, r.nama || r.ref_po_pembeli].filter(Boolean).join(" · ")} onClose={onTutup} lebar>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill t={r.status === "terbuka" ? "Terbuka" : "Ditutup"} />
        <Pill t={LABEL_LINI[r.lini_bisnis ?? "jual"]} />
        <span className="text-[12px]" style={{ color: MUTED }}>PT: {r.pt_nama ?? "PT Katalis"}</span>
        {r.no_bongkar && <Pill t={`Bongkar ${r.no_bongkar}`} />}
        {r.tanggal_bongkar && <span className="text-[12px]" style={{ color: MUTED }}>{tanggal(r.tanggal_bongkar)}</span>}
      </div>
      {bolehIsi && r.status === "terbuka" && <LanjutIsi r={r} />}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Stat value={rp(r.nilai_beli)} label={`Beli ikan · ${r.jumlah_po} PO`} />
        <Stat value={kgT(r.loin_kg)} label="Loin dihasilkan" />
        <Stat value={rp(r.nilai_invoice)} label="Ditagihkan" />
        <Stat value={rp(r.uang_masuk)} label="Uang masuk" tone="ok" />
      </div>
      <Tahap judul="1. Beli ikan" ringkas={`${d.po.length} PO`} kosong={d.po.length === 0}>
        {d.po.map((p) => <Baris key={p.id} href={`/pembelian?po=${p.id}`} kiri={<>{p.kode} · {p.supplier_nama} · {kgT(p.kg)}</>} kanan={<>{rp(p.total)} · dibayar {rp(p.total_bayar)}</>} />)}
      </Tahap>
      <Tahap judul="2. Terima dan cek mutu" ringkas={`${d.lot.length} lot`} kosong={d.lot.length === 0}>
        {d.lot.map((l) => <Baris key={l.id} href="/mutu" kiri={<>{l.kode}{l.po_kode ? ` · ${l.po_kode}` : " · belum ada PO"}</>} kanan={<>{kgT(l.kg)} · {LABEL_QC[l.qc as keyof typeof LABEL_QC] ?? l.qc}</>} />)}
      </Tahap>
      <Tahap judul="3. Produksi" ringkas={`${d.produksi.length} produksi`} kosong={d.produksi.length === 0}>
        {d.produksi.map((p) => <Baris key={p.id} href={`/produksi?p=${p.id}`} kiri={<>{p.kode} · {p.status.replace("_", " ")}</>} kanan={<>masuk {kgT(p.masuk_kg)} → loin {kgT(p.loin_kg)}</>} />)}
      </Tahap>
      <Tahap judul="4. Stok" ringkas={`${stok.length} unit · sisa ${kgT(stok.reduce((a, s) => a + Math.round(s.sisa_kg * 1000), 0) / 1000)}`} kosong={stok.length === 0}>
        {stok.map((s) => <Baris key={s.id} href="/stok" kiri={<>{s.kode} · {s.product_nama}{s.grade_kode && ` ${s.grade_kode}`} · {s.kondisi}</>} kanan={<>masuk {kgT(s.kg_masuk)} · sisa {kgT(s.sisa_kg)}</>} />)}
      </Tahap>
      <Tahap judul="5. Jual dan kirim" ringkas={`${d.pesanan.length} pesanan`} kosong={d.pesanan.length === 0}>
        {d.pesanan.map((p) => <Baris key={p.id} href={`/penjualan?p=${p.id}`} kiri={<>{p.kode} · {p.buyer_nama} · {p.status}</>} kanan={rp(p.status === "terkirim" ? p.total_final : p.total_pesan)} />)}
      </Tahap>
      <Tahap judul="6. Tagihan dan uang masuk" ringkas={`${d.invoice.length} invoice`} kosong={d.invoice.length === 0}>
        {d.invoice.map((i) => <Baris key={i.id} href={`/penjualan?inv=${i.id}`} kiri={<>{i.kode} · {LABEL_TAGIHAN[i.status_tagihan as StatusTagihan] ?? i.status_tagihan}</>} kanan={<>{rp(i.total)} · sisa {rp(i.sisa)}</>} />)}
      </Tahap>
      <Tahap judul="7. Biaya lain" ringkas={`${d.biaya.length} biaya`} kosong={d.biaya.length === 0}>
        {d.biaya.map((b) => <Baris key={b.id} href={`/keuangan?b=${b.id}`} kiri={<>{b.kode} · {b.kategori_nama} · {b.status}</>} kanan={rp(b.jumlah)} />)}
      </Tahap>
      <Inner className="!p-3.5"><p className="text-[12.5px]" style={{ color: MUTED }}>Semua baris di atas diambil dari catatan yang sama, jadi nggak perlu diketik ulang. Ketuk satu baris buat buka transaksinya, lengkap sama notanya.</p></Inner>
      {bolehTutup && (r.status === "terbuka" ? <TutupSiklus id={r.cycle_id} kode={r.kode} /> : <BukaSiklus id={r.cycle_id} />)}
    </Modal>
  );
}

/* ------------------------------------------------------------ proyek baru */
/** Satu proyek = satu batch atau bongkaran. Lini bisnis nentuin isinya: jual (ikan kita), jasa (ikan dari PT), atau titip saja. */
function FormProyek({ pt, hariIni, onSelesai }: { pt: Opsi[]; hariIni: string; onSelesai: (id: string) => void }) {
  const [lini, setLini] = useState<LiniBisnis>("jual");
  const [state, action, pending] = useActionState<HasilForm, FormData>(async (prev: HasilForm, fd: FormData) => {
    const r = await buatProyek(prev, fd);
    if (r?.id) onSelesai(r.id);
    return r;
  }, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lini" value={lini} />
      <PesanForm state={state?.error ? state : undefined} />
      <Field label="Nama proyek" hint="Misalnya nama kapal, pembeli, atau tanggal bongkar." error={state?.kolom?.nama?.[0]}>
        <TextIn name="nama" maxLength={120} required />
      </Field>
      <fieldset className="space-y-1.5">
        <legend className="mb-1 text-[13px] font-medium" style={{ color: INK }}>Lini bisnis</legend>
        {(["jual", "jasa", "titip"] as LiniBisnis[]).map((l) => (
          <label key={l} className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13.5px]"
            style={lini === l ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>
            <input type="radio" name="liniPilih" value={l} checked={lini === l} onChange={() => setLini(l)} className="sr-only" />
            {LABEL_LINI[l]}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        {lini === "jual" ? (
          <p className="self-end rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }}>PT: <b className="font-medium">PT Katalis</b></p>
        ) : (
          <Field label="PT pemilik ikan" error={state?.kolom?.ptId?.[0]}>
            <select name="ptId" defaultValue="" required className="h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]">
              <option value="" disabled>Pilih PT</option>
              {pt.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </Field>
        )}
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}><TextIn name="tanggal" type="date" defaultValue={hariIni} required /></Field>
      </div>
      <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Bikin proyek"}</Btn>
      <p className="text-[12px]" style={{ color: MUTED }}>Abis dibikin, isi datanya langsung dari dalam proyek: terima ikan, mulai produksi, atau terima titipan.</p>
    </form>
  );
}

/** Tombol lanjut isi data sesuai lini bisnis proyek, proyeknya udah kepilih di form tujuan. */
function LanjutIsi({ r }: { r: RingkasSiklus }) {
  const id = r.cycle_id;
  const tombol: { href: string; label: string }[] =
    r.lini_bisnis === "titip" ? [{ href: `/gudang?titip=${id}`, label: "Terima titipan" }]
      : r.lini_bisnis === "jasa" ? [{ href: `/produksi?mulai=1&proyek=${id}`, label: "Mulai produksi" }]
        : [{ href: `/mutu?proyek=${id}`, label: "Terima ikan" }, { href: `/produksi?mulai=1&proyek=${id}`, label: "Mulai produksi" }];
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="lanjut-isi">
      <span className="text-[12.5px]" style={{ color: MUTED }}>Isi data proyek ini:</span>
      {tombol.map((t) => <Link key={t.href} href={t.href} className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-white" style={{ background: INK }}>{t.label}</Link>)}
    </div>
  );
}

export function SiklusKelola({ daftar, detail, bolehTutup, bolehProyek, pt, hariIni }: {
  daftar: RingkasSiklus[]; detail: RantaiSiklus | null; bolehTutup: boolean; bolehProyek: boolean; pt: Opsi[]; hariIni: string;
}) {
  const router = useRouter();
  const [baru, setBaru] = useState(false);
  return (
    <div className="space-y-4">
      <Card title="Daftar proyek" right={bolehProyek && <Btn size="sm" onClick={() => setBaru(true)}>Proyek baru</Btn>}>
        <DataList
          rows={daftar}
          empty={bolehProyek ? "Belum ada proyek. Ketuk Proyek baru, isi nama, lini bisnis, sama PT nya." : "Belum ada proyek."}
          cari={(s) => `${s.kode} ${s.nama ?? ""} ${s.pt_nama ?? ""} ${LABEL_LINI[s.lini_bisnis ?? "jual"]} ${s.ref_po_pembeli} ${s.no_bongkar} ${s.status}`}
          cols={[
            { h: "Proyek", r: (s: RingkasSiklus) => <><span className="font-medium">{[s.kode, s.nama].filter(Boolean).join(" · ")}</span><span className="block text-[12px]" style={{ color: MUTED }}>{LABEL_LINI[s.lini_bisnis ?? "jual"]}{s.pt_nama ? ` · ${s.pt_nama}` : ""}</span></> },
            { h: "Beli ikan", r: (s) => rp(s.nilai_beli), right: true },
            { h: "Loin", r: (s) => kgT(s.loin_kg), right: true },
            { h: "Ditagihkan", r: (s) => rp(s.nilai_invoice), right: true },
            { h: "Uang masuk", r: (s) => rp(s.uang_masuk), right: true },
            { h: "Status", r: (s) => <Pill t={s.status === "terbuka" ? "Terbuka" : "Ditutup"} /> },
          ]}
          actions={(s) => <Btn size="sm" v="light" onClick={() => router.push(`/siklus?c=${s.cycle_id}`)}>Telusuri</Btn>}
        />
      </Card>
      {detail && <Rantai d={detail} bolehTutup={bolehTutup} bolehIsi={bolehProyek} onTutup={() => router.push("/siklus")} />}
      {baru && (
        <Modal title="Proyek baru" onClose={() => setBaru(false)}>
          <FormProyek pt={pt} hariIni={hariIni} onSelesai={(id) => { setBaru(false); router.push(`/siklus?c=${id}`); }} />
        </Modal>
      )}
    </div>
  );
}
