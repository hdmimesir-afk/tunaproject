"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Btn, Card, DataList, Field, Inner, Pill, Stat, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { putuskanKoreksi } from "@/lib/actions/stok";
import type { LotDitahan } from "@/lib/data/stok";
import { tanggal, waktu } from "@/lib/format";
import { tampilKg } from "@/lib/logic/grid";
import { LABEL_STATUS_LOT, type StatusLot } from "@/lib/logic/stokLot";
import type { ProduksiBaris } from "@/lib/types/produksi";
import { LABEL_JENIS_PEMILIK, type GerakStok, type IkanUtuh, type IsiGudang, type Ruangan, type UnitStok } from "@/lib/types/stok";

type Koreksi = GerakStok & { unit_kode: string; sisa_kg: number };

type Props = {
  produksi: ProduksiBaris[];
  units: UnitStok[];
  isi: IsiGudang;
  ruangan: Ruangan[];
  koreksi: Koreksi[];
  ditahan: LotDitahan[];
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

/* Warna tiga keadaan berat ikan utuh, dipakai di bar dan angka. */
const WARNA_LOT = { tersedia: "#0B6B4A", sedang: "#C77D12", selesai: "#9AA2AB" } as const;
const GAYA_STATUS: Record<StatusLot, { bg: string; fg: string }> = {
  belum: { bg: "#DDF3E8", fg: "#0B6B4A" },
  sebagian: { bg: "#FBF0D5", fg: "#8A5A00" },
  diolah: { bg: "#FDEBD3", fg: "#9A5A0B" },
  habis: { bg: "#EEF0F4", fg: "#5B6475" },
};

/** Bar perbandingan tersedia, sedang diproduksi, selesai diproduksi (berat ikan utuh, bukan loin). */
function BarLot({ r }: { r: IkanUtuh["rincian"] }) {
  const total = r.tersediaKg + r.sedangKg + r.selesaiKg;
  if (total <= 0) return null;
  const lebar = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#EEF0F4]" aria-hidden>
      {r.tersediaKg > 0 && <span style={{ width: lebar(r.tersediaKg), background: WARNA_LOT.tersedia }} />}
      {r.sedangKg > 0 && <span style={{ width: lebar(r.sedangKg), background: WARNA_LOT.sedang }} />}
      {r.selesaiKg > 0 && <span style={{ width: lebar(r.selesaiKg), background: WARNA_LOT.selesai }} />}
    </div>
  );
}

function AngkaLot({ label, kg, warna, tebal }: { label: string; kg: number; warna: string; tebal?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-0.5">
      <span className="flex items-start gap-1.5 text-[11px] leading-tight" style={{ color: MUTED }}>
        <i className="mt-[3px] inline-block size-2 shrink-0 rounded-full" style={{ background: warna }} />{label}
      </span>
      <span className={`block truncate text-[14px] tabular-nums ${tebal ? "font-semibold" : "font-medium"}`} style={{ color: kg > 0 ? INK : "#B0B6BF" }}>{kgTeks(kg)}</span>
    </div>
  );
}

/** Satu lot ikan utuh: identitas, status, bar, dan tiga angka (tersedia, sedang diproduksi, selesai diproduksi). */
function BarisLot({ l, bolehProduksi }: { l: IkanUtuh; bolehProduksi: boolean }) {
  const r = l.rincian;
  const gaya = GAYA_STATUS[r.status];
  return (
    <li className="space-y-2 border-t border-[#EEF0F4] px-3.5 py-3 first:border-t-0" data-testid="baris-lot">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-[13px]">
          <span className="font-semibold" style={{ color: INK }}>{l.kode}</span>
          <span className="block text-[12px] leading-snug" style={{ color: MUTED }}>
            {l.pemasok} · terima {tanggal(l.tanggal_terima)}
            {" · "}<span style={{ color: l.sudah_grading ? MUTED : "#8A5A00" }}>{l.sudah_grading ? `grade ${l.grade}` : "belum digrading"}</span>
            {l.jumlah_ekor ? ` · ${l.jumlah_ekor} ekor` : ""}
          </span>
          {l.jenis && <span className="block text-[12px] leading-snug" style={{ color: MUTED }} data-testid="asal-lot">{l.jenis}</span>}
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none" style={{ background: gaya.bg, color: gaya.fg }}>{LABEL_STATUS_LOT[r.status]}</span>
      </div>
      <BarLot r={r} />
      <div className="grid grid-cols-3 gap-2">
        <AngkaLot label="Tersedia" kg={r.tersediaKg} warna={WARNA_LOT.tersedia} tebal />
        <AngkaLot label="Sedang diproduksi" kg={r.sedangKg} warna={WARNA_LOT.sedang} />
        <AngkaLot label="Selesai diproduksi" kg={r.selesaiKg} warna={WARNA_LOT.selesai} />
      </div>
      <p className="text-[11.5px] leading-snug tabular-nums" style={{ color: MUTED }}>
        Berat awal {kgTeks(r.awalKg)}{l.produksi_jalan.length > 0 ? ` · lagi diolah di ${[...new Set(l.produksi_jalan)].join(", ")}` : ""}
      </p>
      {bolehProduksi && r.tersediaKg > 0 && (
        <div className="flex justify-end">
          <Link href={`/produksi/jual?mulai=1&lot=${l.id}${l.cycle_id ? `&proyek=${l.cycle_id}` : ""}`} className={tombolCls} style={{ background: INK, color: "#fff" }}>Mulai Produksi</Link>
        </div>
      )}
      {r.selisihKg !== 0 && (
        <p role="alert" className="rounded-xl px-3 py-1.5 text-[11.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>
          Angkanya nggak pas {kgTeks(Math.abs(r.selisihKg))} dari berat awal. Cek lot ini di Tally atau jalanin cek sinkron.
        </p>
      )}
    </li>
  );
}

/** Satu kelompok ikan utuh (satu proyek, atau yang belum masuk proyek) plus tombol buat langsung produksi. */
function KelompokIkan({ judul, lots, href, bolehProduksi }: { judul: string; lots: IkanUtuh[]; href: string | null; bolehProduksi: boolean }) {
  const tersedia = jumlahKg(lots.map((l) => l.rincian.tersediaKg));
  const sedang = jumlahKg(lots.map((l) => l.rincian.sedangKg));
  return (
    <div className="overflow-hidden rounded-2xl bg-white" data-testid="kelompok-ikan">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F4] px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium" style={{ color: INK }}>{judul}</p>
          <p className="text-[12px] tabular-nums" style={{ color: MUTED }}>
            {lots.length} lot · tersedia <b className="font-semibold" style={{ color: WARNA_LOT.tersedia }}>{kgTeks(tersedia)}</b>{sedang > 0 ? <> · sedang diproduksi <b className="font-semibold" style={{ color: WARNA_LOT.sedang }}>{kgTeks(sedang)}</b></> : ""}
          </p>
        </div>
        {bolehProduksi && href && lots.filter((l) => l.rincian.tersediaKg > 0).length > 1 && (
          <Link href={href} className={tombolCls} style={{ background: "#fff", color: INK, border: "1px solid #E2E4EA" }}>Mulai Produksi semua lot</Link>
        )}
      </div>
      <ul>{lots.map((l) => <BarisLot key={l.id} l={l} bolehProduksi={bolehProduksi} />)}</ul>
    </div>
  );
}

/** Ikan utuh (bahan baku) per proyek: tersedia, lagi diolah, udah selesai. Tampil di Ringkasan Penerimaan
    (permintaan tim 24 Nov 2026: ikan utuh masuknya ke dashboard penerimaan). */
export function PanelIkanUtuh({ ikan, bolehProduksi }: { ikan: IkanUtuh[]; bolehProduksi: boolean }) {
  // Ikan utuh dikelompokin per proyek; yang belum dipakai produksi masuk "Belum masuk proyek".
  const kelompok = [...ikan.reduce((m, l) => {
    const k = l.cycle_id ?? "";
    const x = m.get(k) ?? { judul: l.proyek ?? "Belum masuk proyek", lots: [] as IkanUtuh[] };
    x.lots.push(l);
    return m.set(k, x);
  }, new Map<string, { judul: string; lots: IkanUtuh[] }>()).entries()]
    .sort((a, b) => (a[0] === "" ? -1 : b[0] === "" ? 1 : 0));
  // Tombol produksi cuma bawa lot yang masih ada sisanya; kalau semuanya lagi diolah, tombolnya nggak muncul.
  const hrefProduksi = (proyek: string, lots: IkanUtuh[]) => {
    const bisa = lots.filter((l) => l.rincian.tersediaKg > 0);
    return bisa.length === 0 ? null : `/produksi/jual?mulai=1${proyek ? `&proyek=${proyek}` : ""}&lot=${bisa.map((l) => l.id).join(",")}`;
  };
  return (
    <Card title="Ikan utuh belum diolah" right={<Link href="/mutu" className="px-1 text-[12.5px] underline" style={{ color: MUTED }}>Tally</Link>}>
      <div className="space-y-2.5 px-1 pb-1" data-testid="panel-ikan-utuh">
        <p className="px-1.5 text-[12.5px]" style={{ color: MUTED }}>Ikan dari bongkaran per lot. <b className="font-medium" style={{ color: WARNA_LOT.tersedia }}>Tersedia</b> belum dipakai produksi, <b className="font-medium" style={{ color: WARNA_LOT.sedang }}>sedang diproduksi</b> belum disetujui Owner, <b className="font-medium" style={{ color: "#5B6475" }}>selesai diproduksi</b> udah disetujui. Semua berat ikan utuh, bukan berat loin.</p>
        {kelompok.length === 0
          ? <Inner><div className="py-3 text-center text-[13px]" style={{ color: MUTED }}>Nggak ada ikan utuh yg tersedia atau lagi diolah.</div></Inner>
          : kelompok.map(([k, g]) => <KelompokIkan key={k || "tanpa"} judul={g.judul} lots={g.lots} href={hrefProduksi(k, g.lots)} bolehProduksi={bolehProduksi} />)}
      </div>
    </Card>
  );
}

/** Jumlahin unit stok per kunci (misalnya produk + grade + kondisi), dihitung dalam gram biar nggak meleset. */
function kelompokkan(units: UnitStok[], kunci: (u: UnitStok) => string) {
  const m = new Map<string, { nama: string; gram: number; unit: number; contoh: UnitStok }>();
  for (const u of units) {
    const k = kunci(u);
    const x = m.get(k) ?? { nama: k, gram: 0, unit: 0, contoh: u };
    m.set(k, { ...x, gram: x.gram + Math.round(u.sisa_kg * 1000), unit: x.unit + 1 });
  }
  return [...m.values()].sort((a, b) => b.gram - a.gram);
}

/** Ringkasan Produksi (permintaan tim 24 Nov 2026): stok yang udah diproduksi, yang lagi dititip, sama yang masih ditahan.
    Semuanya kebaca sendiri dari data produksi, gudang, dan penerimaan. Nggak ada input di sini. */
export function StokKelola({ produksi, units, isi, ruangan, koreksi, ditahan, bolehSetuju }: Props) {
  const namaRuangan = new Map(ruangan.map((r) => [r.id, r.nama]));
  const aktif = units.filter((u) => u.status === "aktif" && u.sisa_kg > 0);
  const hasil = aktif.filter((u) => !u.buyer_id);
  const titipan = aktif.filter((u) => u.buyer_id);
  const jalan = produksi.filter((p) => p.status !== "diperiksa");
  const kondisi = (u: UnitStok) => (u.langsung_kirim ? "langsung kirim" : u.kondisi === "beku" ? "beku" : "fresh");
  // Komponen ikan: loin per grade (skin on/skinless kebaca dari kode grade), kepala dan rahang, toro, dll.
  const komponen = kelompokkan(hasil, (u) => `${u.product_nama}${u.grade_kode ? ` ${u.grade_kode}` : ""} · ${kondisi(u)}`);
  const perPemilik = kelompokkan(titipan, (u) => u.pemilik_nama);
  const barangTitip = kelompokkan(titipan, (u) => `${u.pemilik_nama}|${u.product_nama}${u.grade_kode ? ` ${u.grade_kode}` : ""}|${kondisi(u)}|${u.spesies || "-"}`);
  const ruang = (u: UnitStok) => (u.langsung_kirim ? "-" : (u.room_id ? namaRuangan.get(u.room_id) ?? "-" : "Belum ditempatkan") + (u.lokasi ? ` · ${u.lokasi}` : ""));
  const hrefProduksi = (p: Pick<ProduksiBaris, "id" | "lini_bisnis">) => `/produksi/${p.lini_bisnis === "jasa" ? "jasa" : "jual"}?p=${p.id}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Stat value={kgTeks(jumlahKg(hasil.map((u) => u.sisa_kg)))} label={`Hasil produksi (${hasil.length} unit)`} tone="ok" />
        <Stat value={kgTeks(isi.isi_titipan_kg)} label={`Barang titipan (${perPemilik.length} pemilik)`} />
        <Stat value={kgTeks(jumlahKg(ditahan.map((l) => l.sisa_kg)))} label={`Ditahan (${ditahan.length} lot)`} tone={ditahan.length > 0 ? "warn" : undefined} />
        <Stat value={String(jalan.length)} label={`Produksi lagi jalan, ${kgTeks(jumlahKg(jalan.map((p) => p.masuk_kg)))} masuk`} tone={jalan.some((p) => p.status === "berjalan") ? "warn" : undefined} />
      </div>

      {bolehSetuju && koreksi.length > 0 && (
        <Card title="Koreksi stok lama nunggu Owner">
          <div className="space-y-2">{koreksi.map((k) => <PutusanKoreksi key={k.id} k={k} />)}</div>
        </Card>
      )}

      <Card title="1. Komponen ikan hasil produksi" right={<span className="px-1 text-[12px]" style={{ color: MUTED }}>milik sendiri, siap jual</span>}>
        <DataList
          rows={komponen}
          empty="Belum ada hasil produksi di stok. Hasilnya masuk sendiri begitu produksinya disetujui Owner."
          cols={[
            { h: "Komponen", r: (k) => <span className="font-medium">{k.nama}</span> },
            { h: "Unit", r: (k) => String(k.unit), right: true },
            { h: "Berat", r: (k) => kgTeks(k.gram / 1000), right: true },
          ]}
        />
        <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>Kode grade loin: SO artinya skin on, SL skinless. Rincian per unit ada di bagian 3.</p>
      </Card>

      <Card title="2. Lagi diproduksi" right={<Link href="/produksi/jual" className="px-1 text-[12.5px] underline" style={{ color: MUTED }}>Jual loin</Link>}>
        <DataList
          rows={jalan}
          empty="Nggak ada produksi yg lagi jalan."
          cols={[
            { h: "Produksi", r: (p: ProduksiBaris) => <><span className="font-medium">{p.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{tanggal(p.tanggal)}{p.lini_bisnis === "jasa" ? " · jasa" : ""}{p.siklus_kode ? ` · ${[p.siklus_kode, p.proyek_nama].filter(Boolean).join(" · ")}` : ""}</span></> },
            { h: "Status", r: (p) => <Pill t={STATUS_PRODUKSI[p.status]?.label ?? p.status} /> },
            { h: "Ikan masuk", r: (p) => kgTeks(p.masuk_kg), right: true },
            { h: "Loin", r: (p) => (p.loin_kg > 0 ? kgTeks(p.loin_kg) : "-"), right: true },
          ]}
          actions={(p) => (
            <Link href={hrefProduksi(p)} className={tombolCls} style={p.status === "berjalan" ? { background: INK, color: "#fff" } : { background: "#fff", color: INK }}>
              {STATUS_PRODUKSI[p.status]?.aksi ?? "Buka"}
            </Link>
          )}
        />
      </Card>

      <Card title="3. Rincian hasil produksi per unit">
        <DataList
          rows={hasil}
          empty="Belum ada hasil produksi di stok."
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
        <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>Kalau beratnya nggak sesuai, benerin di produksinya (tombol Koreksi). Stok di sini ikut berubah sendiri.</p>
      </Card>

      <Card title="4. Barang titipan" right={<Link href="/produksi/titip" className="px-1 text-[12.5px] underline" style={{ color: MUTED }}>Titip barang</Link>}>
        <DataList
          rows={barangTitip}
          empty="Nggak ada titipan di gudang."
          cari={(k) => k.nama.replaceAll("|", " ")}
          cols={[
            { h: "Pemilik", r: (k) => <><span className="font-medium">{k.contoh.pemilik_nama}</span>{k.contoh.buyers && <span className="block text-[12px]" style={{ color: MUTED }}>{LABEL_JENIS_PEMILIK[k.contoh.buyers.jenis_pemilik]}</span>}</> },
            { h: "Barang", r: (k) => k.nama.split("|")[1] },
            { h: "Spesies", r: (k) => k.nama.split("|")[3] },
            { h: "Kondisi", r: (k) => <Pill t={k.nama.split("|")[2]} /> },
            { h: "Unit", r: (k) => String(k.unit), right: true },
            { h: "Berat", r: (k) => kgTeks(k.gram / 1000), right: true },
          ]}
        />
        <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>Terima, ambil, sama koreksi titipan ada di Produksi, Titip barang.</p>
      </Card>

      <Card title="5. Ditahan" right={<Link href="/mutu" className="px-1 text-[12.5px] underline" style={{ color: MUTED }}>Tally</Link>}>
        <DataList
          rows={ditahan}
          empty="Nggak ada ikan yang ditahan."
          cols={[
            { h: "Lot", r: (l: LotDitahan) => <><span className="font-medium">{l.kode}</span><span className="block text-[12px]" style={{ color: MUTED }}>{l.pemasok} · terima {tanggal(l.tanggal_terima)}</span></> },
            { h: "Jenis", r: (l) => l.jenis ?? "-" },
            { h: "Catatan", r: (l) => l.catatan || "-" },
            { h: "Berat", r: (l) => kgTeks(l.sisa_kg), right: true },
          ]}
        />
        <p className="px-2.5 pb-2 pt-2 text-[12px]" style={{ color: MUTED }}>Ikan gugur atau bau yang ditahan pas grading. Nggak bisa dipakai produksi.</p>
      </Card>
    </div>
  );
}
