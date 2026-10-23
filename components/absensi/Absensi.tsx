"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Btn, Card, DataList, Field, Inner, Modal, Pill, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { INK, MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { ajukanIzin, batalkanIzin, putuskanIzin, simpanLokasiKerja, urlFotoAbsen } from "@/lib/actions/absensi";
import { tanggal, waktu } from "@/lib/format";
import { absenHari, tampilJam, tampilJarak } from "@/lib/logic/absensi";
import type { Absen, AbsenHarian, Izin, LokasiKerja, RekapHadir } from "@/lib/types/absensi";
import { DialogAbsen } from "./DialogAbsen";

type Props = {
  userId: string;
  hari: string;
  bulan: string;
  tanggalHarian: string;
  lokasi: LokasiKerja[];
  saya: Absen[];
  izin: Izin[];
  harian: AbsenHarian[] | null;
  rekap: RekapHadir[] | null;
  bolehKelola: boolean;
  bolehSetuju: boolean;
};

const LABEL_IZIN = { izin: "Izin", sakit: "Sakit", libur: "Libur" } as const;
const LABEL_STATUS = { diajukan: "Diajukan", disetujui: "Disetujui", ditolak: "Ditolak", dibatalkan: "Dibatalkan" } as const;
const jam = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const Tanda = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => <span className="font-medium" style={{ color: ok ? "#0B6B4A" : "#A8322B" }}>{children}</span>;

/* ------------------------------------------------------------ absen hari ini */
function KartuHariIni({ p }: { p: Props }) {
  const [dialog, setDialog] = useState<"masuk" | "pulang" | null>(null);
  const h = absenHari(p.saya, p.hari);
  const adaLokasi = p.lokasi.some((l) => l.aktif);
  return (
    <Card title="Absen hari ini">
      <Inner className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-2xl bg-white px-3.5 py-3">
            <div style={{ color: MUTED }}>Masuk</div>
            <div className="mt-0.5 text-[20px] tabular-nums" style={{ color: INK }} data-testid="jam-masuk">{h.masuk ? jam(h.masuk.waktu) : "-"}</div>
            {h.masuk && h.masuk.terlambat_menit > 0 && <div className="text-[12px]" style={{ color: "#A8322B" }}>Terlambat {h.masuk.terlambat_menit} menit</div>}
          </div>
          <div className="rounded-2xl bg-white px-3.5 py-3">
            <div style={{ color: MUTED }}>Pulang</div>
            <div className="mt-0.5 text-[20px] tabular-nums" style={{ color: INK }} data-testid="jam-pulang">{h.pulang ? jam(h.pulang.waktu) : "-"}</div>
          </div>
        </div>
        {!adaLokasi && <p className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Belum ada lokasi kerja. Minta Super Admin menambahkannya di bawah.</p>}
        <div className="flex flex-wrap gap-2.5">
          <Btn disabled={!adaLokasi || h.masuk !== null} onClick={() => setDialog("masuk")}>Absen masuk</Btn>
          <Btn v="light" disabled={!adaLokasi || h.masuk === null || h.pulang !== null} onClick={() => setDialog("pulang")}>Absen pulang</Btn>
        </div>
        <p className="text-[12px]" style={{ color: MUTED }}>Butuh GPS dan kamera. Anda harus berada di dalam radius lokasi kerja, dan fotonya diambil langsung (bukan dari galeri). Waktu dicatat oleh server.</p>
      </Inner>
      {dialog && <DialogAbsen jenis={dialog} userId={p.userId} onTutup={() => setDialog(null)} />}
    </Card>
  );
}

/* ----------------------------------------------------------------------- izin */
function FormIzin({ hari, onTutup }: { hari: string; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(ajukanIzin, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  return (
    <Modal title="Ajukan izin atau sakit" onClose={onTutup}>
      <form action={action} className="space-y-3">
        <PesanForm state={state?.error ? state : undefined} />
        <Field label="Jenis" error={state?.kolom?.jenis?.[0]}>
          <select name="jenis" className={pilihCls} defaultValue="izin"><option value="izin">Izin</option><option value="sakit">Sakit</option><option value="libur">Libur</option></select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dari" error={state?.kolom?.dari?.[0]}><TextIn name="dari" type="date" defaultValue={hari} required /></Field>
          <Field label="Sampai" error={state?.kolom?.sampai?.[0]}><TextIn name="sampai" type="date" defaultValue={hari} required /></Field>
        </div>
        <Field label="Alasan" error={state?.kolom?.alasan?.[0]}>
          <textarea name="alasan" rows={3} maxLength={300} required className="w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-[#00171F]" />
        </Field>
        <Btn type="submit" full disabled={pending}>{pending ? "Mengirim..." : "Kirim pengajuan"}</Btn>
      </form>
    </Modal>
  );
}

function TombolBatal({ id }: { id: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(batalkanIzin, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Btn type="submit" size="sm" v="light" disabled={pending}>{pending ? "..." : "Batalkan"}</Btn>
      {state?.error && <span role="alert" className="ml-2 text-[12px]" style={{ color: "#A8322B" }}>{state.error}</span>}
    </form>
  );
}

function Putusan({ i }: { i: Izin }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(putuskanIzin, undefined);
  // Setelah diputuskan, baris tidak lagi berstatus "diajukan" sehingga komponen ini hilang bersama dialognya.
  const [tolak, setTolak] = useState(false);
  return (
    <>
      <form action={action}>
        <input type="hidden" name="id" value={i.id} />
        <input type="hidden" name="setuju" value="ya" />
        <input type="hidden" name="catatan" value="" />
        <KonfirmasiDua size="sm" label="Setujui" labelYa={`Ya, setujui ${LABEL_IZIN[i.jenis].toLowerCase()} ${i.nama}`} pending={pending}
          pesan={`${i.nama} · ${LABEL_IZIN[i.jenis]} · ${tanggal(i.dari)}${i.sampai !== i.dari ? ` s.d. ${tanggal(i.sampai)}` : ""}`} />
      </form>
      <Btn size="sm" v="danger" onClick={() => setTolak(true)}>Tolak</Btn>
      {tolak && (
        <Modal title={`Tolak pengajuan ${i.nama}`} onClose={() => setTolak(false)}>
          <form action={action} className="space-y-3">
            <PesanForm state={state?.error ? state : undefined} />
            <input type="hidden" name="id" value={i.id} />
            <input type="hidden" name="setuju" value="tidak" />
            <Field label="Alasan menolak">
              <textarea name="catatan" rows={3} maxLength={300} required className="w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-[#00171F]" />
            </Field>
            <Btn type="submit" v="danger" full disabled={pending}>{pending ? "Menyimpan..." : "Tolak pengajuan"}</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

function KartuIzin({ p }: { p: Props }) {
  const [form, setForm] = useState(false);
  return (
    <Card title="Izin dan sakit" right={<Btn size="sm" v="light" onClick={() => setForm(true)}>Ajukan</Btn>}>
      <DataList
        rows={p.izin}
        empty="Belum ada pengajuan."
        cols={[
          { h: "Pemohon", r: (i) => i.milik_saya ? "Saya" : i.nama },
          { h: "Jenis", r: (i) => LABEL_IZIN[i.jenis] },
          { h: "Tanggal", r: (i) => i.sampai === i.dari ? tanggal(i.dari) : `${tanggal(i.dari)} s.d. ${tanggal(i.sampai)}` },
          { h: "Alasan", r: (i) => i.alasan },
          { h: "Status", r: (i) => <Pill t={LABEL_STATUS[i.status]} /> },
          { h: "Catatan Owner", r: (i) => i.catatan_keputusan || "-" },
        ]}
        actions={(i) => i.status !== "diajukan" ? null : (
          <>
            {i.milik_saya && <TombolBatal id={i.id} />}
            {p.bolehSetuju && <Putusan i={i} />}
          </>
        )}
      />
      {form && <FormIzin hari={p.hari} onTutup={() => setForm(false)} />}
    </Card>
  );
}

/* ------------------------------------------------------------ rekap (Super Admin, Owner) */
function TombolFoto({ id }: { id: string }) {
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, mulai] = useTransition();
  const buka = () => {
    setGalat(null);
    const w = window.open("", "_blank");
    mulai(async () => {
      const r = await urlFotoAbsen(id);
      if (r.url && w) w.location.href = r.url;
      else { w?.close(); setGalat(r.error ?? "Foto tidak bisa dibuka."); }
    });
  };
  return <><Btn size="sm" v="light" disabled={sibuk} onClick={buka}>Foto</Btn>{galat && <span role="alert" className="ml-2 text-[12px]" style={{ color: "#A8322B" }}>{galat}</span>}</>;
}

function KartuRekap({ p }: { p: Props }) {
  return (
    <>
      <Card title="Rekap kehadiran">
        <form method="get" action="/absensi" className="mb-3 flex flex-wrap items-end gap-3 px-1">
          <Field label="Bulan"><TextIn name="bulan" type="month" defaultValue={p.bulan} /></Field>
          <Field label="Tanggal rincian"><TextIn name="tanggal" type="date" defaultValue={p.tanggalHarian} /></Field>
          <Btn type="submit" size="sm">Tampilkan</Btn>
        </form>
        <DataList
          rows={p.rekap ?? []}
          empty="Tidak ada data bulan ini."
          cols={[
            { h: "Nama", r: (r) => `${r.nama} · ${r.role_nama}` },
            { h: "Hari kerja", r: (r) => r.hari_kerja, right: true },
            { h: "Hadir", r: (r) => r.hadir, right: true },
            { h: "Terlambat", r: (r) => r.terlambat, right: true },
            { h: "Izin", r: (r) => r.izin, right: true },
            { h: "Sakit", r: (r) => r.sakit, right: true },
            { h: "Libur", r: (r) => r.libur, right: true },
            { h: "Tidak hadir", r: (r) => r.tidak_hadir > 0 ? <Tanda ok={false}>{r.tidak_hadir}</Tanda> : 0, right: true },
          ]}
        />
        <p className="px-2 pt-2 text-[12px]" style={{ color: MUTED }}>Hari kerja Senin sampai Sabtu. Hari ini belum dihitung tidak hadir.</p>
      </Card>
      <Card title={`Absen pada ${tanggal(p.tanggalHarian)}`}>
        <DataList
          rows={p.harian ?? []}
          empty="Belum ada absen pada tanggal ini."
          cols={[
            { h: "Nama", r: (a) => a.nama },
            { h: "Jenis", r: (a) => a.jenis === "masuk" ? "Masuk" : "Pulang" },
            { h: "Jam", r: (a) => jam(a.waktu) },
            { h: "Lokasi", r: (a) => a.jarak_m != null ? `${a.lokasi} · ${tampilJarak(a.jarak_m)}` : a.lokasi },
            { h: "Hasil", r: (a) => a.hasil === "berhasil" ? <Tanda ok>{a.terlambat_menit > 0 ? `Terlambat ${a.terlambat_menit} mnt` : "Berhasil"}</Tanda> : <Tanda ok={false}>{a.alasan_gagal}</Tanda> },
          ]}
          actions={(a) => <TombolFoto id={a.id} />}
        />
      </Card>
    </>
  );
}

/* --------------------------------------------------------------- lokasi kerja */
function FormLokasi({ lokasi, onTutup }: { lokasi: LokasiKerja | null; onTutup: () => void }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(simpanLokasiKerja, undefined);
  const [lat, setLat] = useState(lokasi ? String(lokasi.lat) : "");
  const [lng, setLng] = useState(lokasi ? String(lokasi.lng) : "");
  const [info, setInfo] = useState<string | null>(null);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  const pakaiLokasiSaya = () => {
    setInfo("Mencari lokasi...");
    navigator.geolocation.getCurrentPosition(
      (x) => { setLat(x.coords.latitude.toFixed(6)); setLng(x.coords.longitude.toFixed(6)); setInfo(`Lokasi terisi, akurasi ±${Math.round(x.coords.accuracy)} m. Berdirilah di titik tengah tempat kerja saat menekan tombol ini.`); },
      () => setInfo("Lokasi tidak terbaca. Izinkan lokasi, atau isi garis lintang dan bujur sendiri."),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };
  return (
    <Modal title={lokasi ? "Ubah lokasi kerja" : "Tambah lokasi kerja"} onClose={onTutup}>
      <form action={action} className="space-y-3">
        <PesanForm state={state?.error ? state : undefined} />
        {lokasi && <input type="hidden" name="id" value={lokasi.id} />}
        <Field label="Nama lokasi" error={state?.kolom?.nama?.[0]}><TextIn name="nama" defaultValue={lokasi?.nama ?? ""} maxLength={80} required /></Field>
        <Btn v="light" full onClick={pakaiLokasiSaya}>Pakai lokasi saya sekarang</Btn>
        {info && <p className="text-[12.5px]" style={{ color: MUTED }} data-testid="info-lokasi">{info}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Garis lintang" error={state?.kolom?.lat?.[0]}><TextIn name="lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} required /></Field>
          <Field label="Garis bujur" error={state?.kolom?.lng?.[0]}><TextIn name="lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Radius (meter)" hint="Jarak terjauh dari titik." error={state?.kolom?.radius?.[0]}><TextIn name="radius" type="number" inputMode="numeric" defaultValue={lokasi?.radius_m ?? 50} required /></Field>
          <Field label="Batas akurasi GPS (m)" hint="Lebih buruk dari ini ditolak." error={state?.kolom?.akurasiMaks?.[0]}><TextIn name="akurasiMaks" type="number" inputMode="numeric" defaultValue={lokasi?.akurasi_maks_m ?? 30} required /></Field>
          <Field label="Jam masuk" error={state?.kolom?.jamMasuk?.[0]}><TextIn name="jamMasuk" type="time" defaultValue={lokasi ? lokasi.jam_masuk.slice(0, 5) : "08:00"} required /></Field>
          <Field label="Toleransi terlambat (menit)" error={state?.kolom?.toleransi?.[0]}><TextIn name="toleransi" type="number" inputMode="numeric" defaultValue={lokasi?.toleransi_menit ?? 15} required /></Field>
        </div>
        <label className="flex items-center gap-2.5 text-[13px]"><input type="checkbox" name="aktif" className="h-4 w-4 accent-[#00171F]" defaultChecked={lokasi?.aktif ?? true} />Lokasi aktif</label>
        <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan lokasi"}</Btn>
      </form>
    </Modal>
  );
}

function KartuLokasi({ lokasi }: { lokasi: LokasiKerja[] }) {
  const [edit, setEdit] = useState<LokasiKerja | "baru" | null>(null);
  return (
    <Card title="Lokasi kerja" right={<Btn size="sm" v="light" onClick={() => setEdit("baru")}>Tambah</Btn>}>
      <DataList
        rows={lokasi}
        empty="Belum ada lokasi kerja. Tambahkan dari tempat kerja, lalu tekan Pakai lokasi saya sekarang."
        cols={[
          { h: "Nama", r: (l) => l.nama },
          { h: "Titik", r: (l) => `${l.lat}, ${l.lng}` },
          { h: "Radius", r: (l) => `${l.radius_m} m` },
          { h: "Batas akurasi", r: (l) => `${l.akurasi_maks_m} m` },
          { h: "Jam masuk", r: (l) => `${tampilJam(l.jam_masuk)} (+${l.toleransi_menit} mnt)` },
          { h: "Status", r: (l) => <Pill t={l.aktif ? "Aktif" : "Nonaktif"} /> },
        ]}
        actions={(l) => (
          <>
            <Btn size="sm" v="light" onClick={() => setEdit(l)}>Ubah</Btn>
            <a href={`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=18/${l.lat}/${l.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-full px-3 text-[12.5px] underline md:h-8" style={{ color: MUTED }}>Lihat titik</a>
          </>
        )}
      />
      {edit && <FormLokasi lokasi={edit === "baru" ? null : edit} onTutup={() => setEdit(null)} />}
    </Card>
  );
}

/* -------------------------------------------------------------------- halaman */
export function Absensi(p: Props) {
  return (
    <div className="space-y-4">
      <KartuHariIni p={p} />
      <KartuIzin p={p} />
      {p.rekap !== null && <KartuRekap p={p} />}
      {p.bolehKelola && <KartuLokasi lokasi={p.lokasi} />}
      <Card title="Riwayat absen saya">
        <DataList
          rows={p.saya}
          empty="Belum ada absen."
          cols={[
            { h: "Waktu", r: (a) => waktu(a.waktu) },
            { h: "Jenis", r: (a) => a.jenis === "masuk" ? "Masuk" : "Pulang" },
            { h: "Hasil", r: (a) => a.hasil === "berhasil" ? <Tanda ok>{a.terlambat_menit > 0 ? `Terlambat ${a.terlambat_menit} mnt` : "Berhasil"}</Tanda> : <Tanda ok={false}>Ditolak: {a.alasan_gagal}</Tanda> },
            { h: "Jarak", r: (a) => a.jarak_m != null ? tampilJarak(a.jarak_m) : "-" },
          ]}
        />
      </Card>
    </div>
  );
}
