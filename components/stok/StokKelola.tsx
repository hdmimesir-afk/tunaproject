"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Btn, Card, DataList, Field, Inner, Pill, Stat, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { putuskanKoreksi } from "@/lib/actions/stok";
import { tanggal, waktu } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import type { ProduksiBaris } from "@/lib/types/produksi";
import type { GerakStok, IkanUtuh, IsiGudang, Ruangan, UnitStok } from "@/lib/types/stok";

type Koreksi = GerakStok & { unit_kode: string; sisa_kg: number };

type Props = {
  ikan: IkanUtuh[];
  produksi: ProduksiBaris[];
  units: UnitStok[];
  isi: IsiGudang;
  ruangan: Ruangan[];
  koreksi: Koreksi[];
  bolehProduksi: boolean;
  bolehSetuju: boolean;
};

const kgTeks = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;
const jumlahKg = (xs: number[]) => xs.reduce((a, n) => a + Math.round(n * 1000), 0) / 1000;
const tombolCls = "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full px-4 text-[13px] font-medium md:h-8 md:px-3.5 md:text-[12.5px]";

const STATUS_PRODUKSI: Record<string, { label: string; aksi: string }> = {
  berjalan: { label: "Lagi diolah", aksi: "Isi hasil produksi" },
  selesai: { label: "Nunggu dicek", aksi: "Buka" },
  diperiksa_qc: { label: "Nunggu Owner", aksi: "Buka" },
};

/** Koreksi stok cara lama yang masih nunggu Owner. Koreksi baru lewat halaman Produksi. */
function PutusanKoreksi({ k }: { k: Koreksi }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(putuskanKoreksi, undefined);
  const [tolak, setTolak] = useState(false);
  return (
    <Inner className="!p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span><b>{k.unit_kode}</b> · {k.kg > 0 ? "+" : ""}{tampilKg(Math.round(k.kg * 1000))} kg · sisa sekarang {kgTeks(k.sisa_kg)}</span>
        <span style={{ color: MUTED }}>{waktu(k.waktu)}</span>
      </div>
      <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>Alasan: {k.alasan}</p>
      <form action={action} className="mt-2.5 space-y-2.5">
        <input type="hidden" name="gerakId" value={k.id} />
        <PesanForm state={state} />
        {!tolak ? (
          <>
            <input type="hidden" name="setuju" value="ya" /><input type="hidden" name="catatan" value="" />
            <KonfirmasiDua full size="sm" label="Setujui koreksi" labelYa="Ya, setujui koreksi" pending={pending} pesan="Stok langsung berubah sesuai selisih ini. Lanjut?" />
            <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={() => setTolak(true)}>Tolak koreksi...</Btn></div>
          </>
        ) : (
          <>
            <input type="hidden" name="setuju" value="tidak" />
            <Field label="Alasan menolak"><TextIn name="catatan" maxLength={300} required /></Field>
            <Btn type="submit" full v="danger" disabled={pending}>{pending ? "Menolak..." : "Tolak koreksi"}</Btn>
            <div className="flex justify-center"><Btn size="sm" v="ghost" onClick={() => setTolak(false)}>Kembali</Btn></div>
          </>
        )}
      </form>
    </Inner>
  );
}

/** Satu kelompok ikan utuh (satu proyek, atau yang belum masuk proyek) plus tombol buat langsung produksi. */
function KelompokIkan({ judul, lots, href, bolehProduksi }: { judul: string; lots: IkanUtuh[]; href: string; bolehProduksi: boolean }) {
  const ekor = lots.reduce((a, l) => a + (l.jumlah_ekor ?? 0), 0);
  return (
    <div className="overflow-hidden rounded-2xl bg-white" data-testid="kelompok-ikan">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F4] px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium" style={{ color: INK }}>{judul}</p>
          <p className="text-[12px] tabular-nums" style={{ color: MUTED }}>{lots.length} lot · {kgTeks(jumlahKg(lots.map((l) => l.sisa_kg)))}{ekor > 0 ? ` · ${ekor} ekor` : ""}</p>
        </div>
        {bolehProduksi && <Link href={href} className={tombolCls} style={{ background: INK, color: "#fff" }}>Produksi dari ikan ini</Link>}
      </div>
      <ul>
        {lots.map((l) => (
          <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-[#EEF0F4] px-3.5 py-2 text-[13px] first:border-t-0">
            <div className="min-w-0">
              <span className="font-medium" style={{ color: INK }}>{l.kode}</span>
              <span style={{ color: MUTED }}> · {l.pemasok} · terima {tanggal(l.tanggal_terima)}</span>
              <span className="block text-[12px]" style={{ color: l.sudah_grading ? MUTED : "#8A5A00" }}>
                {l.sudah_grading ? `Grade ${l.grade}` : "Belum digrading"}{l.jumlah_ekor ? ` · ${l.jumlah_ekor} ekor` : ""}{l.sisa_kg < l.kg ? ` · udah diolah ${kgTeks(l.kg - l.sisa_kg)}` : ""}
              </span>
            </div>
            <b className="self-center font-semibold tabular-nums" style={{ color: INK }}>{kgTeks(l.sisa_kg)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Dashboard Stok buat orang produksi: semuanya kebaca dari data penerimaan, produksi, dan gudang. Nggak ada input di sini.
    Urutannya ngikut alur: ikan utuh (bongkaran semalam), lagi diproduksi, hasil siap jual, terus titipan. */
export function StokKelola({ ikan, produksi, units, isi, ruangan, koreksi, bolehProduksi, bolehSetuju }: Props) {
  const namaRuangan = new Map(ruangan.map((r) => [r.id, r.nama]));
  const aktif = units.filter((u) => u.status === "aktif");
  const hasil = aktif.filter((u) => !u.buyer_id);
  const titipan = aktif.filter((u) => u.buyer_id);
  const jalan = produksi.filter((p) => p.status !== "diperiksa");

  // Ikan utuh dikelompokin per proyek; yang belum dipakai produksi masuk "Belum masuk proyek".
  const kelompok = [...ikan.reduce((m, l) => {
    const k = l.cycle_id ?? "";
    const x = m.get(k) ?? { judul: l.proyek ?? "Belum masuk proyek", lots: [] as IkanUtuh[] };
    x.lots.push(l);
    return m.set(k, x);
  }, new Map<string, { judul: string; lots: IkanUtuh[] }>()).entries()]
    .sort((a, b) => (a[0] === "" ? -1 : b[0] === "" ? 1 : 0));
  const hrefProduksi = (proyek: string, lots: IkanUtuh[]) =>
    `/produksi?mulai=1${proyek ? `&proyek=${proyek}` : ""}&lot=${lots.map((l) => l.id).join(",")}`;

  const ruang = (u: UnitStok) => (u.langsung_kirim ? "-" : (u.room_id ? namaRuangan.get(u.room_id) ?? "-" : "Belum ditempatkan") + (u.lokasi ? ` · ${u.lokasi}` : ""));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Stat value={kgTeks(jumlahKg(ikan.map((l) => l.sisa_kg)))} label={`Ikan utuh belum diolah (${ikan.length} lot)`} />
        <Stat value={String(jalan.length)} label={`Produksi lagi jalan, ${kgTeks(jumlahKg(jalan.map((p) => p.masuk_kg)))} masuk`} tone={jalan.some((p) => p.status === "berjalan") ? "warn" : undefined} />
        <Stat value={kgTeks(jumlahKg(hasil.map((u) => u.sisa_kg)))} label="Hasil produksi siap jual" tone="ok" />
        <Stat value={kgTeks(isi.isi_titipan_kg)} label="Titipan pelanggan" />
      </div>

      {bolehSetuju && koreksi.length > 0 && (
        <Card title="Koreksi stok lama nunggu Owner">
          <div className="space-y-2">{koreksi.map((k) => <PutusanKoreksi key={k.id} k={k} />)}</div>
        </Card>
      )}

      <Card title="1. Ikan utuh (bahan baku)" right={<Link href="/mutu" className="px-1 text-[12.5px] underline" style={{ color: MUTED }}>Mutu dan Penerimaan</Link>}>
        <div className="space-y-2.5 px-1 pb-1">
          <p className="px-1.5 text-[12.5px]" style={{ color: MUTED }}>Ikan dari bongkaran yg udah diterima tapi belum diolah. Tekan Produksi dari ikan ini, lotnya langsung kecentang di form produksi.</p>
          {kelompok.length === 0
            ? <Inner><div className="py-3 text-center text-[13px]" style={{ color: MUTED }}>Nggak ada ikan utuh yg nunggu diolah.</div></Inner>
            : kelompok.map(([k, g]) => <KelompokIkan key={k || "tanpa"} judul={g.judul} lots={g.lots} href={hrefProduksi(k, g.lots)} bolehProduksi={bolehProduksi} />)}
        </div>
      </Card>

      <Card title="2. Lagi diproduksi" right={<Link href="/produksi" className="px-1 text-[12.5px] underline" style={{ color: MUTED }}>Produksi</Link>}>
        <DataList
          rows={jalan}
          empty="Nggak ada produksi yg lagi jalan."
          cols={[
            { h: "Produksi", r: (p: ProduksiBaris) => <><span className="font-medium">{p.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{tanggal(p.tanggal)}{p.siklus_kode ? ` · ${[p.siklus_kode, p.proyek_nama].filter(Boolean).join(" · ")}` : ""}</span></> },
            { h: "Status", r: (p) => <Pill t={STATUS_PRODUKSI[p.status]?.label ?? p.status} /> },
            { h: "Ikan masuk", r: (p) => kgTeks(p.masuk_kg), right: true },
            { h: "Loin", r: (p) => (p.loin_kg > 0 ? kgTeks(p.loin_kg) : "-"), right: true },
          ]}
          actions={(p) => (
            <Link href={`/produksi?p=${p.id}`} className={tombolCls} style={p.status === "berjalan" ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>
              {STATUS_PRODUKSI[p.status]?.aksi ?? "Buka"}
            </Link>
          )}
        />
      </Card>

      <Card title="3. Hasil produksi siap jual">
        <DataList
          rows={hasil}
          empty="Belum ada hasil produksi di stok. Hasilnya masuk sendiri begitu produksinya disetujui Owner."
          cari={(u) => `${u.kode} ${u.product_nama} ${u.grade_kode ?? ""} ${u.kondisi} ${u.production_kode ?? ""} ${u.cycles?.kode ?? ""} ${ruang(u)}`}
          cols={[
            { h: "Produk", r: (u: UnitStok) => <><span className="font-medium">{u.product_nama}{u.grade_kode ? ` · ${u.grade_kode}` : ""}</span><span className="block text-[12px]" style={{ color: MUTED }}>{u.kode}{u.production_kode ? ` · ${u.production_kode}` : ""}{u.cycles?.kode ? ` · Proyek ${u.cycles.kode}` : ""}</span></> },
            { h: "Kondisi", r: (u) => <Pill t={u.langsung_kirim ? "Langsung kirim" : u.kondisi === "beku" ? "Beku" : "Fresh"} /> },
            { h: "Ruangan", r: ruang },
            { h: "Masuk", r: (u) => kgTeks(u.kg_masuk), right: true },
            { h: "Sisa", r: (u) => kgTeks(u.sisa_kg), right: true },
          ]}
          actions={(u) => (u.production_id ? <Link href={`/produksi?p=${u.production_id}`} className={tombolCls} style={{ color: MUTED }}>Produksinya</Link> : null)}
        />
        <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>Kalau beratnya nggak sesuai, benerin di halaman Produksi (tombol Koreksi di produksinya). Stok di sini ikut berubah sendiri.</p>
      </Card>

      <Card title="4. Titipan pelanggan" right={<Link href="/gudang" className="px-1 text-[12.5px] underline" style={{ color: MUTED }}>Gudang Dingin</Link>}>
        <DataList
          rows={titipan}
          empty="Nggak ada titipan di gudang."
          cari={(u) => `${u.pemilik_nama} ${u.kode} ${u.product_nama} ${u.grade_kode ?? ""} ${ruang(u)}`}
          cols={[
            { h: "Pelanggan", r: (u: UnitStok) => <><span className="font-medium">{u.pemilik_nama}</span><span className="block text-[12px]" style={{ color: MUTED }}>{u.kode} · masuk {tanggal(u.masuk_pada)}</span></> },
            { h: "Produk", r: (u) => `${u.product_nama}${u.grade_kode ? ` · ${u.grade_kode}` : ""}` },
            { h: "Ruangan", r: ruang },
            { h: "Sisa", r: (u) => kgTeks(u.sisa_kg), right: true },
          ]}
        />
        <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>Terima, ambil, sama pindah ruangan titipan ada di menu Gudang Dingin.</p>
      </Card>
    </div>
  );
}
