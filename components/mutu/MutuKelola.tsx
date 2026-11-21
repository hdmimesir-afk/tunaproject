"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Btn, Card, Field, Inner, Modal, Stat, TextIn } from "@/components/ui";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { PilihGrade } from "@/components/ui/PilihGrade";
import { RiwayatKoreksi } from "@/components/ui/RiwayatKoreksi";
import { INK, MUTED } from "@/components/ui/tokens";
import { PemasokBaru } from "@/components/pembelian/PemasokBaru";
import type { HasilForm } from "@/lib/actions/auth";
import { ajukanPembelian, cekMutuLot, koreksiLot, terimaIkan } from "@/lib/actions/mutu";
import type { Koreksi } from "@/lib/data/koreksi";
import { rp } from "@/lib/format";
import { keGram } from "@/lib/logic/grid";
import { formatKg } from "@/lib/logic/neraca";
import { gradeLot, lampiranWajib, rincianAjukan } from "@/lib/logic/pembelian";
import { ringkasEkor } from "@/lib/logic/ekor";
import { DaftarLot, type LampiranLot } from "./DaftarLot";
import { dariLot, ekorBaru, IsianEkor } from "./IsianEkor";
import type { LotBaris, Opsi, Pengguna } from "@/lib/types/pembelian";

const selectCls = "h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]";

function Pesan({ state }: { state: HasilForm }) {
  if (state?.error) return <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div>;
  if (state?.pesan) return <div role="status" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>{state.pesan}</div>;
  return null;
}

/** Pilihan pemasok plus tombol tambah pemasok baru (kalau boleh). */
function PilihPemasok({ pemasok, nilai, onUbah, bolehBaru, error }: { pemasok: Opsi[]; nilai: string; onUbah: (id: string) => void; bolehBaru: boolean; error?: string }) {
  const [baru, setBaru] = useState<Opsi[]>([]);
  const [isi, setIsi] = useState(false);
  const daftar = [...pemasok, ...baru.filter((b) => !pemasok.some((p) => p.id === b.id))];
  return (
    <>
      <Field label="Pemasok atau nelayan" error={error}>
        <select name="supplierId" value={nilai} onChange={(e) => onUbah(e.target.value)} className={selectCls} required>
          <option value="" disabled>Pilih pemasok</option>
          {daftar.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </Field>
      {bolehBaru && (isi
        ? <PemasokBaru onBatal={() => setIsi(false)} onDibuat={(p) => { setBaru((b) => [...b, p]); onUbah(p.id); setIsi(false); }} />
        : <div className="-mt-2"><Btn size="sm" v="ghost" onClick={() => setIsi(true)}>+ Pemasok belum ada di daftar</Btn></div>)}
    </>
  );
}

/* ------------------------------------------------------------ terima ikan */
type PropsTerima = { pemasok: Opsi[]; siklus: Opsi[]; bolehPemasokBaru: boolean; hariIni: string; grade: Opsi[]; bolehMutu: boolean; potonganKg: number; proyekAwal?: string };

function TerimaIkan(props: PropsTerima) {
  // Setelah sukses, form dipasang ulang (key berganti) supaya isiannya kosong, dan pesan sukses tetap tampil.
  const [kunci, setKunci] = useState(0);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  return (
    <Card title="Terima ikan">
      {berhasil && <div className="px-2.5 pb-2"><Pesan state={{ pesan: berhasil }} /></div>}
      <FormTerima key={kunci} {...props} onSukses={(m) => { setBerhasil(m); setKunci((k) => k + 1); }} />
    </Card>
  );
}

function FormTerima({ pemasok, siklus, bolehPemasokBaru, hariIni, grade, bolehMutu, potonganKg, proyekAwal, onSukses }: PropsTerima & { onSukses: (pesan: string) => void }) {
  const [supplierId, setSupplierId] = useState("");
  const [proyek, setProyek] = useState(() => (proyekAwal && siklus.some((s) => s.id === proyekAwal) ? proyekAwal : ""));
  const [cara, setCara] = useState<"total" | "ekor">("ekor");
  const [ekor, setEkor] = useState(() => [ekorBaru()]);
  const [kg, setKg] = useState("");
  const [langsungGrade, setLangsungGrade] = useState(false);
  const [state, action, pending] = useActionState<HasilForm, FormData>(async (prev, fd) => {
    const r = await terimaIkan(prev, fd);
    if (r?.pesan) onSukses(r.pesan);
    return r;
  }, undefined);
  const r = ringkasEkor(ekor, potonganKg);
  const kgAngka = Number(kg.replace(",", "."));
  const bisaKirim = cara === "total" || (r.jumlah > 0 && r.salah.size === 0 && (!r.adaGrade || r.semuaGrade));
  return (
    <form action={action} className="space-y-3 px-2.5 pb-2.5">
      <Pesan state={state?.error ? state : undefined} />
      <input type="hidden" name="cara" value={cara} />
      <p className="text-[13px]" style={{ color: MUTED }}>
        Ikan yang datang langsung dicatat di sini, nggak perlu nunggu PO.{bolehMutu ? " Grade-nya bisa sekalian diisi." : " Grade-nya nanti diisi QC."} PO terbit setelah pembeliannya disetujui.
      </p>
      <PilihPemasok pemasok={pemasok} nilai={supplierId} onUbah={setSupplierId} bolehBaru={bolehPemasokBaru} error={state?.kolom?.supplierId?.[0]} />
      <div role="radiogroup" aria-label="Cara catat" className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1">
        {([["ekor", "Per ekor"], ["total", "Berat total"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={cara === id} onClick={() => setCara(id)}
            className="h-10 rounded-xl text-[13.5px] font-medium" style={cara === id ? { background: INK, color: "#fff" } : { color: MUTED }}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cara === "total" ? (
          <Field label="Berat timbang (kg)" error={state?.kolom?.kg?.[0]}>
            <TextIn name="kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} required />
          </Field>
        ) : <div className="hidden" />}
        <Field label="Tanggal" error={state?.kolom?.tanggal?.[0]}>
          <TextIn name="tanggal" type="date" defaultValue={hariIni} required />
        </Field>
        {cara === "total" && (
          <Field label="Jumlah ekor" hint="Boleh kosong." error={state?.kolom?.jumlahEkor?.[0]}>
            <TextIn name="jumlahEkor" inputMode="numeric" />
          </Field>
        )}
      </div>
      {cara === "ekor" && <IsianEkor baris={ekor} onUbah={setEkor} grade={grade} bolehGrade={bolehMutu} potonganKg={potonganKg} error={state?.kolom?.ekor?.[0]} />}
      {cara === "total" && bolehMutu && (
        <label className="flex items-center gap-2.5 text-[13px]" style={{ color: INK }}>
          <input type="checkbox" checked={langsungGrade} onChange={(e) => setLangsungGrade(e.target.checked)} className="h-4 w-4 accent-[#00171F]" />
          <span>Sekalian grading</span>
        </label>
      )}
      {cara === "total" && langsungGrade && (
        Number.isFinite(kgAngka) && kgAngka > 0
          ? <IsianGrade kgLot={kgAngka} grade={grade} error={state?.kolom?.baris?.[0]} />
          : <p className="text-[12.5px]" style={{ color: MUTED }}>Isi berat timbangnya dulu.</p>
      )}
      <Field label="Proyek (batch atau bongkaran)" error={state?.kolom?.siklusId?.[0]}>
        <select name="siklusId" value={proyek} onChange={(e) => setProyek(e.target.value)} className={selectCls} required>
          <option value="" disabled>Pilih proyek</option>
          <option value="baru">Proyek baru</option>
          {siklus.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </Field>
      {proyek === "baru" && (
        <Field label="Nama proyek" hint="Misalnya nama kapal atau tanggal bongkar." error={state?.kolom?.namaProyek?.[0]}>
          <TextIn name="namaProyek" maxLength={120} required />
        </Field>
      )}
      <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} /></Field>
      <Btn type="submit" disabled={pending || !bisaKirim}>{pending ? "Menyimpan..." : "Catat penerimaan"}</Btn>
      <p className="text-[12px]" style={{ color: MUTED }}>Foto timbangan dilampirin dari daftar lot di bawah, tombol Lampiran.</p>
    </form>
  );
}

/* ----------------------------------------------------------------- grading */
type BarisIsian = { k: number; gradeId: string; kg: string };
const teksKg = (kg: number) => String(kg).replace(".", ",");

/** Satu lot bisa berisi beberapa grade. Baris pertama terisi berat lot penuh, jadi lot satu grade cukup pilih grade-nya. */
function IsianGrade({ lot, kgLot, grade, error }: { lot?: LotBaris; kgLot: number; grade: Opsi[]; error?: string }) {
  const [baris, setBaris] = useState<BarisIsian[]>(() => {
    const ada = lot ? gradeLot(lot) : [];
    return ada.length > 0
      ? ada.map((g, i) => ({ k: i, gradeId: g.grade_id, kg: teksKg(g.kg) }))
      : [{ k: 0, gradeId: "", kg: kgLot > 0 ? teksKg(kgLot) : "" }];
  });
  const ubah = (k: number, isi: Partial<BarisIsian>) => setBaris((b) => b.map((x) => (x.k === k ? { ...x, ...isi } : x)));
  const tambah = () => setBaris((b) => [...b, { k: Math.max(...b.map((x) => x.k)) + 1, gradeId: "", kg: "" }]);
  const hapus = (k: number) => setBaris((b) => b.filter((x) => x.k !== k));

  const gramLot = Math.round(kgLot * 1000);
  const gramIsi = baris.reduce((a, b) => a + (keGram(b.kg) ?? 0), 0);
  const lebih = gramIsi > gramLot;
  const sisa = gramLot - gramIsi;
  const dipakai = new Set(baris.map((b) => b.gradeId).filter(Boolean));

  return (
    <div className="space-y-2" data-testid="isian-grade">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium" style={{ color: INK }}>Grade dan beratnya</span>
        <span className="text-[12px]" style={{ color: MUTED }}>Satu lot boleh beberapa grade</span>
      </div>
      <input type="hidden" name="baris" value={JSON.stringify(baris.map((b) => ({ grade_id: b.gradeId, kg: b.kg })))} />
      <ul className="space-y-2">
        {baris.map((b, i) => (
          <li key={b.k} className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.25rem] items-start gap-1.5 sm:grid-cols-[minmax(0,1fr)_7.5rem_2.25rem] sm:gap-2">
            <PilihGrade label={`Grade baris ${i + 1}`} grade={grade} nilai={b.gradeId} onPilih={(id) => ubah(b.k, { gradeId: id })} nonaktif={dipakai} kecil />
            <div className="relative min-w-0">
              <input aria-label={`Berat grade baris ${i + 1} (kg)`} value={b.kg} onChange={(e) => ubah(b.k, { kg: e.target.value })} inputMode="decimal" placeholder="0"
                className="h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white pl-3 pr-9 text-right text-[14px] tabular-nums outline-none focus:border-[#00171F]" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: MUTED }}>kg</span>
            </div>
            {baris.length > 1
              ? <button type="button" onClick={() => hapus(b.k)} aria-label={`Hapus baris ${i + 1}`} title="Hapus baris ini"
                  className="flex h-11 w-9 items-center justify-center rounded-full text-[20px] leading-none hover:bg-white" style={{ color: MUTED }}>×</button>
              : <span aria-hidden />}
          </li>
        ))}
      </ul>
      {baris.length < grade.length && (
        <Btn type="button" size="sm" v="light" onClick={tambah}>+ Tambah grade</Btn>
      )}
      <p className="rounded-2xl px-3.5 py-2.5 text-[13px] tabular-nums" data-testid="jumlah-grade"
        style={lebih ? { background: "#FBE5E3", color: "#A8322B" } : sisa > 0 ? { background: "#FBF0D5", color: "#8A5A00" } : { background: "#fff", color: INK }}>
        Jumlah {formatKg(gramIsi / 1000)} kg dari {formatKg(kgLot)} kg.{" "}
        {lebih ? `Kelebihan ${formatKg(-sisa / 1000)} kg, kurangin beratnya.` : sisa > 0 ? `${formatKg(sisa / 1000)} kg belum digrading, jadi nggak ikut dibayar.` : "Semua berat udah digrading."}
      </p>
      {error && <p role="alert" className="text-[12.5px]" style={{ color: "#A8322B" }}>{error}</p>}
    </div>
  );
}

function Grading({ lot, grade, onTutup }: { lot: LotBaris; grade: Opsi[]; onTutup: () => void }) {
  const [tahan, setTahan] = useState(lot.qc === "ditahan");
  const [state, action, pending] = useActionState<HasilForm, FormData>(cekMutuLot, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  const bisaTahan = lot.sisa_kg === lot.kg && !lot.po_id;
  const ekor = lot.lot_ekor ?? [];
  const perEkor = ekor.length > 0;
  const kodeGrade = new Map(grade.map((g) => [g.id, g.label.split(" · ")[0]]));
  const ringkas = [...ekor.reduce((m, e) => {
    const k = e.grade_id ?? "";
    const x = m.get(k) ?? { n: 0, kg: 0 };
    return m.set(k, { n: x.n + 1, kg: Math.round((x.kg + e.kg_bayar) * 1000) / 1000 });
  }, new Map<string, { n: number; kg: number }>()).entries()];
  const kurangGrade = ekor.filter((e) => !e.grade_id).length;
  return (
    <Modal title={`Grading ${lot.kode}`} onClose={onTutup}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="lotId" value={lot.id} />
        <input type="hidden" name="hasil" value={tahan ? "ditahan" : "lulus"} />
        {perEkor && <input type="hidden" name="perEkor" value="1" />}
        <Pesan state={state} />
        <p className="text-[13px]" style={{ color: MUTED }}>{lot.suppliers?.nama ?? "-"} · {formatKg(lot.kg)} kg{lot.jumlah_ekor ? ` · ${lot.jumlah_ekor} ekor` : ""}</p>
        <p className="rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }} data-testid="arti-mutu">
          {tahan
            ? "Ditahan: ikannya gugur atau bau, jadi nggak diolah dan nggak diajukan pembeliannya."
            : "Grading tuna utuh. Hasilnya dipakai buat ngitung harga yang dibayar ke nelayan. Ikannya tetap bisa langsung diolah."}
        </p>
        {!tahan && !perEkor && <IsianGrade lot={lot} kgLot={lot.kg} grade={grade} error={state?.kolom?.baris?.[0]} />}
        {!tahan && perEkor && (
          <div className="space-y-2" data-testid="grade-dari-ekor">
            <p className="text-[13px]" style={{ color: INK }}>Lot ini dicatat per ekor, jadi grading-nya ngikut grade tiap ekor (berat dibayar, udah dipotong gancu).</p>
            <ul className="overflow-hidden rounded-2xl bg-white">
              {ringkas.map(([id, x]) => (
                <li key={id || "kosong"} className="flex justify-between border-t border-[#EEF0F4] px-3.5 py-2 text-[13px] tabular-nums first:border-t-0" style={{ color: id ? INK : "#8A5A00" }}>
                  <span>{id ? kodeGrade.get(id) ?? "?" : "Belum ada grade"} · {x.n} ekor</span><b className="font-semibold">{formatKg(x.kg)} kg</b>
                </li>
              ))}
            </ul>
            {kurangGrade > 0 && <p className="text-[12.5px]" style={{ color: "#8A5A00" }}>{kurangGrade} ekor belum ada grade-nya. Isi lewat tombol Koreksi di lot ini.</p>}
          </div>
        )}
        {(bisaTahan || lot.qc === "ditahan") && (
          <label className="flex items-start gap-2.5 text-[13px]" style={{ color: INK }}>
            <input type="checkbox" checked={tahan} onChange={(e) => setTahan(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#A8322B]" />
            <span>Tahan, ikannya gugur atau bau</span>
          </label>
        )}
        <Field label="Catatan" hint={tahan ? "Tulis kenapa ditahan." : "Boleh kosong."}><TextIn name="catatan" maxLength={300} defaultValue={lot.qc_catatan} /></Field>
        <Btn type="submit" full disabled={pending || (!tahan && perEkor && kurangGrade > 0)}>{pending ? "Menyimpan..." : tahan ? "Tahan lot ini" : "Simpan grading"}</Btn>
      </form>
    </Modal>
  );
}

/* ----------------------------------------------------------------- koreksi */
function KoreksiLot({ lot, pemasok, siklus, koreksi, pengguna, grade, bolehMutu, potonganKg, onTutup }: {
  lot: LotBaris; pemasok: Opsi[]; siklus: Opsi[]; koreksi: Koreksi[]; pengguna: Record<string, Pengguna>;
  grade: Opsi[]; bolehMutu: boolean; potonganKg: number; onTutup: () => void;
}) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(koreksiLot, undefined);
  useEffect(() => { if (state?.pesan) onTutup(); }, [state, onTutup]);
  const perEkor = (lot.lot_ekor ?? []).length > 0;
  const [ekor, setEkor] = useState(() => dariLot(lot.lot_ekor ?? []));
  const r = ringkasEkor(ekor, potonganKg);
  const terpakai = Math.max(0, lot.kg - lot.sisa_kg);
  const proyekAda = lot.cycle_id && !siklus.some((s) => s.id === lot.cycle_id) ? [{ id: lot.cycle_id, label: lot.cycles?.kode ?? "Proyek lama" }] : [];
  const nama = Object.fromEntries([...pemasok, ...siklus, ...proyekAda].map((o) => [o.id, o.label]));
  return (
    <Modal title={`Koreksi ${lot.kode}`} onClose={onTutup} lebar={perEkor}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="lotId" value={lot.id} />
        <Pesan state={state} />
        {perEkor ? (
          <>
            <input type="hidden" name="kg" value={lot.kg} />
            <Field label="Tanggal terima" error={state?.kolom?.tanggal?.[0]}>
              <TextIn name="tanggal" type="date" defaultValue={lot.tanggal_terima} required />
            </Field>
            <IsianEkor baris={ekor} onUbah={setEkor} grade={grade} bolehGrade={bolehMutu} potonganKg={potonganKg} error={state?.kolom?.ekor?.[0]} />
            {terpakai > 0 && <p className="text-[12px]" style={{ color: MUTED }}>Udah dipakai produksi {formatKg(terpakai)} kg, jadi total beratnya minimal segitu.</p>}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Berat (kg)" hint={terpakai > 0 ? `Minimal ${formatKg(terpakai)} kg, udah dipakai produksi.` : undefined} error={state?.kolom?.kg?.[0]}>
              <TextIn name="kg" type="number" inputMode="decimal" step="0.001" min="0" defaultValue={lot.kg} required />
            </Field>
            <Field label="Tanggal terima" error={state?.kolom?.tanggal?.[0]}>
              <TextIn name="tanggal" type="date" defaultValue={lot.tanggal_terima} required />
            </Field>
            <Field label="Jumlah ekor" hint="Boleh kosong." error={state?.kolom?.jumlahEkor?.[0]}>
              <TextIn name="jumlahEkor" inputMode="numeric" defaultValue={lot.jumlah_ekor ?? ""} />
            </Field>
          </div>
        )}
        {lot.po_id ? (
          <>
            <input type="hidden" name="supplierId" value={lot.supplier_id} />
            <p className="text-[12.5px]" style={{ color: MUTED }}>Pemasok: {lot.suppliers?.nama ?? "-"}. Udah masuk pembelian, jadi pemasoknya diganti lewat koreksi di menu Pembelian.</p>
          </>
        ) : (
          <Field label="Pemasok atau nelayan" error={state?.kolom?.supplierId?.[0]}>
            <select name="supplierId" defaultValue={lot.supplier_id} className={selectCls} required>
              {pemasok.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>
        )}
        <Field label="Proyek" error={state?.kolom?.siklusId?.[0]}>
          <select name="siklusId" defaultValue={lot.cycle_id ?? ""} className={selectCls} required>
            <option value="" disabled>Pilih proyek</option>
            {[...proyekAda, ...siklus].map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Catatan" hint="Boleh kosong."><TextIn name="catatan" maxLength={300} defaultValue={lot.catatan} /></Field>
        <Field label="Alasan koreksi" error={state?.kolom?.alasan?.[0]}><TextIn name="alasan" maxLength={500} required placeholder="Misalnya salah ketik berat" /></Field>
        {lot.po_id && <p className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>Lot ini udah masuk pembelian. Kalau berat yang digrading berubah, harganya dihitung ulang dan pembeliannya balik ke persetujuan.</p>}
        <Btn type="submit" full disabled={pending || (perEkor && (r.jumlah === 0 || r.salah.size > 0))}>{pending ? "Menyimpan..." : "Simpan koreksi"}</Btn>
        <RiwayatKoreksi daftar={koreksi} pengguna={pengguna} nama={nama} />
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- ajukan pembelian */
function AjukanPembelian({ lots, lampiran, onTutup }: { lots: LotBaris[]; lampiran: LampiranLot | null; onTutup: () => void }) {
  // Satu pengajuan = satu pemasok dan satu proyek. Lot tanpa proyek harus dipilihin proyeknya dulu lewat Koreksi.
  const bisaDiajukan = lots.filter((l) => !l.po_id && l.qc === "lulus" && gradeLot(l).length > 0);
  const tanpaProyek = bisaDiajukan.filter((l) => !l.cycle_id);
  const siap = bisaDiajukan.filter((l) => l.cycle_id);
  const kunci = (l: LotBaris) => `${l.supplier_id}|${l.cycle_id}`;
  const pemasokSiap = [...new Map(siap.map((l) => [kunci(l),
    `${l.suppliers?.nama ?? "-"} · ${[l.cycles?.kode, l.cycles?.nama].filter(Boolean).join(" ")}`])).entries()];
  const [supplierId, setSupplierId] = useState(pemasokSiap[0]?.[0] ?? "");
  const lotPemasok = siap.filter((l) => kunci(l) === supplierId);
  const [pilih, setPilih] = useState<string[]>(() => lotPemasok.map((l) => l.id));
  const [harga, setHarga] = useState<Record<string, string>>({});
  // Cong (jawaban tim 19 Nov 2026): satu harga per kg buat semua ikan di nota ini, nggak lihat grade.
  const [caraHarga, setCaraHarga] = useState<"grade" | "cong">("grade");
  const [hargaCong, setHargaCong] = useState("");
  const [menyusul, setMenyusul] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [state, setState] = useState<HasilForm>(undefined);
  const [pending, mulai] = useTransition();

  const dipilih = lotPemasok.filter((l) => pilih.includes(l.id));
  const keAngka = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const angka = useMemo(() => Object.fromEntries(Object.entries(harga).map(([k, v]) => [k, keAngka(v)])), [harga]);
  const r0 = rincianAjukan(dipilih, {});
  const r = caraHarga === "cong"
    ? rincianAjukan(dipilih, Object.fromEntries(r0.baris.map((b) => [b.grade_id, keAngka(hargaCong)])))
    : rincianAjukan(dipilih, angka);
  const notaWajib = lampiran ? lampiranWajib(lampiran.aturan, "purchase_orders", "nota") : true;
  const adaNota = lampiran ? lampiran.dokumen.some((d) => d.jenis === "nota" && pilih.includes(d.ref_id)) : false;
  const perluTanda = notaWajib && !adaNota;
  const bisa = dipilih.length > 0 && r.lengkap && (!perluTanda || menyusul);

  const gantiPemasok = (id: string) => {
    setSupplierId(id);
    setPilih(siap.filter((l) => kunci(l) === id).map((l) => l.id));
  };
  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    mulai(async () => {
      const hasil = await ajukanPembelian({
        lot: dipilih.map((l) => l.id),
        harga: r.baris.map((b) => ({ grade_id: b.grade_id, harga_per_kg: b.harga ?? 0 })),
        notaMenyusul: perluTanda && menyusul,
        catatan: caraHarga === "cong" ? [`Harga cong ${rp(keAngka(hargaCong) ?? 0)}/kg`, catatan.trim()].filter(Boolean).join(". ") : catatan,
      });
      setState(hasil);
      if (hasil?.pesan) onTutup();
    });
  };

  return (
    <Modal title="Ajukan pembelian" onClose={onTutup}>
      {tanpaProyek.length > 0 && (
        <p className="rounded-2xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#FBF0D5", color: "#8A5A00" }} data-testid="lot-tanpa-proyek">
          {tanpaProyek.map((l) => l.kode).join(", ")} belum ada proyeknya, jadi belum bisa diajukan. Pilih proyeknya dulu lewat tombol Koreksi di lotnya.
        </p>
      )}
      {siap.length === 0 ? (
        <p className="text-[13px]" style={{ color: MUTED }}>Belum ada lot yang siap diajukan. Lot harus udah digrading, nggak ditahan, punya proyek, dan belum masuk pembelian lain.</p>
      ) : (
        <form onSubmit={kirim} className="space-y-4">
          <Pesan state={state} />
          <Field label="Pemasok dan proyek" hint="Satu pengajuan buat satu pemasok di satu proyek.">
            <select value={supplierId} onChange={(e) => gantiPemasok(e.target.value)} className={selectCls}>
              {pemasokSiap.map(([id, nama]) => <option key={id} value={id}>{nama}</option>)}
            </select>
          </Field>
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-[13px] font-medium" style={{ color: INK }}>Lot yang diajukan</legend>
            {lotPemasok.map((l) => (
              <label key={l.id} className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[13px]" style={{ color: INK }}>
                <input type="checkbox" aria-label={`Ajukan ${l.kode}`} checked={pilih.includes(l.id)}
                  onChange={(e) => setPilih((p) => (e.target.checked ? [...p, l.id] : p.filter((x) => x !== l.id)))} className="h-4 w-4 accent-[#00171F]" />
                <span className="font-medium">{l.kode}</span>
                <span style={{ color: MUTED }}>{formatKg(l.kg)} kg · {gradeLot(l).map((g) => `${g.kode} ${formatKg(g.kg)}`).join(", ")}</span>
              </label>
            ))}
          </fieldset>
          {r.baris.length > 0 && (
            <div className="space-y-2">
              <div role="radiogroup" aria-label="Cara harga" className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1">
                {([["grade", "Per grade"], ["cong", "Cong (satu harga)"]] as const).map(([id, label]) => (
                  <button key={id} type="button" role="radio" aria-checked={caraHarga === id} onClick={() => setCaraHarga(id)}
                    className="h-10 rounded-xl text-[13.5px] font-medium" style={caraHarga === id ? { background: INK, color: "#fff" } : { color: MUTED }}>{label}</button>
                ))}
              </div>
              {caraHarga === "cong" && (
                <Field label="Harga cong per kg" hint="Satu harga per kg buat semua grade di pengajuan ini.">
                  <TextIn inputMode="decimal" placeholder="Rp" value={hargaCong} onChange={(e) => setHargaCong(e.target.value)} aria-label="Harga cong per kg" />
                </Field>
              )}
            </div>
          )}
          {r.baris.length > 0 && (
            <div className="overflow-hidden rounded-2xl bg-white">
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_7.5rem_minmax(0,1fr)] gap-2 border-b border-[#EEF0F4] px-3.5 py-2 text-[12px] font-medium" style={{ color: MUTED }}>
                <span>Grade</span><span className="text-right">Berat</span><span className="text-right">Harga/kg</span><span className="text-right">Jumlah</span>
              </div>
              {r.baris.map((b) => (
                <div key={b.grade_id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_7.5rem_minmax(0,1fr)] items-center gap-2 px-3.5 py-2 text-[13px] tabular-nums" style={{ color: INK }}>
                  <b className="font-semibold">{b.kode}</b>
                  <span className="text-right">{formatKg(b.kg)} kg</span>
                  <input aria-label={`Harga per kg ${b.kode}`} inputMode="decimal" placeholder="Rp" readOnly={caraHarga === "cong"}
                    value={caraHarga === "cong" ? hargaCong : harga[b.grade_id] ?? ""}
                    onChange={(e) => setHarga((h) => ({ ...h, [b.grade_id]: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[#E2E4EA] px-2.5 text-right outline-none focus:border-[#00171F] read-only:bg-[#F4F5F8]" />
                  <span className="text-right">{b.jumlah === null ? "-" : rp(b.jumlah)}</span>
                </div>
              ))}
              <div className="flex items-end justify-between gap-2 border-t border-[#EEF0F4] px-3.5 py-3 tabular-nums" style={{ color: INK }}>
                <span className="text-[12.5px]" style={{ color: MUTED }}>{dipilih.length} lot · {formatKg(r.kg)} kg · {r.baris.map((b) => `${b.kode} ${formatKg(b.kg)}`).join(", ")}</span>
                <span className="shrink-0 text-[22px] font-semibold leading-none" data-testid="total-ajukan">{rp(r.total)}</span>
              </div>
            </div>
          )}
          {perluTanda && (
            <label className="flex items-start gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-[13px]" style={{ color: INK }}>
              <input type="checkbox" checked={menyusul} onChange={(e) => setMenyusul(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#00171F]" />
              <span><b className="font-medium">Nota menyusul.</b> Nota nelayan belum dilampirin di lotnya. Pembelian tetap bisa diajukan, notanya dilampirin belakangan.</span>
            </label>
          )}
          <Field label="Catatan" hint="Boleh kosong."><TextIn value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={500} /></Field>
          <KonfirmasiDua full label="Ajukan untuk disetujui" labelYa="Ya, ajukan sekarang" pending={pending} disabled={!bisa}
            pesan={`Ajukan pembelian ${formatKg(r.kg)} kg senilai ${rp(r.total)}? PO-nya terbit begitu disetujui.`} />
          {!r.lengkap && dipilih.length > 0 && <p className="text-[12px]" style={{ color: "#8A5A00" }}>Isi harga per kg buat semua grade dulu.</p>}
        </form>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------ penerimaan hari ini */
/** Ringkasan ikan yang masuk hari ini per nelayan, biar petugas nggak perlu scroll daftar lot. */
function TerimaHariIni({ lots, hariIni }: { lots: LotBaris[]; hariIni: string }) {
  const hariIniSaja = lots.filter((l) => l.tanggal_terima === hariIni);
  const perPemasok = [...hariIniSaja.reduce((m, l) => {
    const k = l.supplier_id;
    const a = m.get(k) ?? { nama: l.suppliers?.nama ?? "-", lot: [] as string[], gram: 0, belum: 0, ekor: 0 };
    a.lot.push(l.kode);
    a.gram += Math.round(l.kg * 1000);
    a.ekor += l.jumlah_ekor ?? 0;
    if (l.qc === "menunggu") a.belum += 1;
    m.set(k, a);
    return m;
  }, new Map<string, { nama: string; lot: string[]; gram: number; belum: number; ekor: number }>()).values()];
  const totalGram = perPemasok.reduce((a, p) => a + p.gram, 0);
  const totalEkor = perPemasok.reduce((a, p) => a + p.ekor, 0);
  return (
    <Card title="Penerimaan hari ini" right={<span className="text-[12px]" style={{ color: MUTED }}>{hariIniSaja.length} lot</span>}>
      <div className="px-2.5 pb-2.5" data-testid="terima-hari-ini">
        {perPemasok.length === 0 ? (
          <p className="text-[13px]" style={{ color: MUTED }}>Belum ada ikan masuk hari ini.</p>
        ) : (
          <ul className="divide-y divide-[#EEF0F4] overflow-hidden rounded-2xl bg-white">
            {perPemasok.map((p) => (
              <li key={p.nama + p.lot[0]} className="px-3.5 py-2.5">
                <div className="flex items-baseline justify-between gap-2 text-[13.5px] font-medium" style={{ color: INK }}>
                  <span className="min-w-0 truncate">{p.nama}</span>
                  <span className="shrink-0 tabular-nums">{p.ekor > 0 ? `${p.ekor} ekor · ` : ""}{formatKg(p.gram / 1000)} kg</span>
                </div>
                <div className="flex justify-between gap-2 text-[12px]" style={{ color: MUTED }}>
                  {/* Daftar lot dibatasi biar nelayan yang setor banyak lot nggak bikin kotaknya melebar. */}
                  <span className="min-w-0 break-words">{p.lot.length > 3 ? `${p.lot.slice(0, 3).join(", ")} +${p.lot.length - 3} lot lagi` : p.lot.join(", ")}</span>
                  {p.belum > 0 && <span className="shrink-0" style={{ color: "#8A5A00" }}>{p.belum} belum digrading</span>}
                </div>
              </li>
            ))}
            <li className="flex justify-between px-3.5 py-2.5 text-[13px] font-semibold tabular-nums" style={{ color: INK }}>
              <span>Total</span><span>{totalEkor > 0 ? `${totalEkor} ekor · ` : ""}{formatKg(totalGram / 1000)} kg</span>
            </li>
          </ul>
        )}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- halaman */
export function MutuKelola({ lots, grade, pemasok, siklus, pengguna, koreksi, hariIni, bolehTerima, bolehMutu, bolehAjukan, bolehPemasokBaru, lampiran, potonganKg, proyekAwal }: {
  lots: LotBaris[]; grade: Opsi[]; pemasok: Opsi[]; siklus: Opsi[]; pengguna: Record<string, Pengguna>; koreksi: Koreksi[]; hariIni: string;
  bolehTerima: boolean; bolehMutu: boolean; bolehAjukan: boolean; bolehPemasokBaru: boolean; lampiran: LampiranLot | null; potonganKg: number; proyekAwal?: string;
}) {
  const [grading, setGrading] = useState<LotBaris | null>(null);
  const [koreksiLot, setKoreksiLot] = useState<LotBaris | null>(null);
  const [ajukan, setAjukan] = useState(false);
  const menunggu = lots.filter((l) => l.qc === "menunggu").length;
  const ditahan = lots.filter((l) => l.qc === "ditahan").length;
  const siapAjukan = lots.filter((l) => !l.po_id && l.qc === "lulus").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={String(lots.length)} label="Lot tercatat" />
        <Stat value={String(menunggu)} label="Belum digrading" tone={menunggu > 0 ? "warn" : undefined} />
        <Stat value={String(ditahan)} label="Ditahan (gugur/bau)" tone={ditahan > 0 ? "warn" : undefined} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        {bolehTerima && <TerimaIkan pemasok={pemasok} siklus={siklus} bolehPemasokBaru={bolehPemasokBaru} hariIni={hariIni} grade={grade} bolehMutu={bolehMutu} potonganKg={potonganKg} proyekAwal={proyekAwal} />}
        <TerimaHariIni lots={lots} hariIni={hariIni} />
      </div>

      <DaftarLot lots={lots} bolehMutu={bolehMutu} bolehKoreksi={bolehTerima} onGrading={setGrading} onKoreksi={setKoreksiLot} lampiran={lampiran}
        kanan={bolehAjukan && <Btn size="sm" onClick={() => setAjukan(true)}>Ajukan pembelian{siapAjukan > 0 ? ` (${siapAjukan})` : ""}</Btn>} />
      {grading && <Grading key={grading.id} lot={grading} grade={grade} onTutup={() => setGrading(null)} />}
      {koreksiLot && <KoreksiLot key={koreksiLot.id} lot={koreksiLot} pemasok={pemasok} siklus={siklus} pengguna={pengguna} grade={grade} bolehMutu={bolehMutu} potonganKg={potonganKg}
        koreksi={koreksi.filter((k) => k.ref_id === koreksiLot.id)} onTutup={() => setKoreksiLot(null)} />}
      {ajukan && <AjukanPembelian lots={lots} lampiran={lampiran} onTutup={() => setAjukan(false)} />}
      <Inner className="!p-3.5"><p className="text-[12.5px]" style={{ color: MUTED }}>Alurnya: terima ikan (per ekor atau berat total), grading tuna utuh buat harga ke nelayan (bisa sekalian waktu terima), ajukan pembelian, disetujui (PO terbit), baru dibayar. Lot yang belum digrading tetap boleh langsung diolah. Yang ditahan cuma ikan gugur atau bau.</p></Inner>
    </div>
  );
}
