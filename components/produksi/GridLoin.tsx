"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Btn, Inner, Modal } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { batalkanLoin, simpanLoin } from "@/lib/actions/produksi";
import { barisKosong, buatCsv, gramKeTeks, hasilPerEkor, hitungTotal, keGram, nomorLoinBerikut, periksaBaris, tampilKg, type BarisLoin } from "@/lib/logic/grid";
import { bacaDraf, hapusDraf, simpanDraf } from "@/lib/offline/draft";
import type { Opsi } from "@/lib/types/pembelian";
import type { Ekor, ItemLoin } from "@/lib/types/produksi";

/* Grid loin per potong (FRM-PRD-01 rev 01): nomor ekor (opsional), nomor loin, grade, berat 3 desimal.
   Keyboard saja cukup: Enter pindah ke baris bawah (baris baru di akhir), panah atas/bawah pindah baris.
   Isian tersimpan otomatis di perangkat (Dexie) dan dikirim ulang saat sinyal kembali. */

const sel = "h-10 w-full rounded-xl border bg-white px-2.5 text-[14px] outline-none focus:border-[#00171F]";

const dariServer = (loin: ItemLoin[]): BarisLoin[] =>
  loin.filter((l) => !l.batal).sort((a, b) => a.no_loin - b.no_loin)
    .map((l) => ({ id: l.id, noEkor: l.no_ekor === null ? "" : String(l.no_ekor), noLoin: String(l.no_loin), gradeId: l.grade_id, kg: gramKeTeks(Math.round(l.kg * 1000)).replace(".", ","), versi: l.versi }));

const barisBaru = (daftar: BarisLoin[], gradeAwal: string): BarisLoin => {
  const akhir = [...daftar].reverse().find((b) => !barisKosong(b));
  return { id: crypto.randomUUID(), noEkor: akhir?.noEkor ?? "", noLoin: nomorLoinBerikut(daftar), gradeId: akhir?.gradeId || gradeAwal, kg: "" };
};

function useOnline() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("online", cb); window.addEventListener("offline", cb); return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); }; },
    () => navigator.onLine,
    () => true,
  );
}

type Status = { jenis: "bersih" | "kotor" | "menyimpan" | "gagal"; pesan?: string };

export function GridLoin({ produksiId, kode, loin, grade, ekor, bolehEdit }: { produksiId: string; kode: string; loin: ItemLoin[]; grade: Opsi[]; ekor: Ekor[]; bolehEdit: boolean }) {
  const [baris, setBaris] = useState<BarisLoin[]>(() => {
    const awal = dariServer(loin);
    return awal.length > 0 || !bolehEdit ? awal : [barisBaru([], grade[0]?.id ?? "")];
  });
  const [kotor, setKotor] = useState(false);
  const [status, setStatus] = useState<Status>({ jenis: "bersih" });
  const [dicoba, setDicoba] = useState(false);
  const [konflik, setKonflik] = useState<string[]>([]);
  const [draf, setDraf] = useState<BarisLoin[] | null>(null);
  const [batal, setBatal] = useState<BarisLoin | null>(null);
  const [sibuk, mulai] = useTransition();
  const online = useOnline();
  const wadah = useRef<HTMLDivElement>(null);
  const fokus = useRef<{ r: number; c: number } | null>(null);

  const namaGrade = useMemo(() => new Map(grade.map((g) => [g.id, g.label])), [grade]);
  const galat = useMemo(() => periksaBaris(baris), [baris]);
  const total = useMemo(() => hitungTotal(baris), [baris]);
  const berat = useMemo(() => new Map(ekor.map((e) => [String(e.no_ekor), e.berat_utuh_kg])), [ekor]);

  // Draf dari perangkat: ditawarkan bila ada isi yang belum sampai ke server (mis. tab tertutup saat sinyal putus).
  useEffect(() => {
    if (!bolehEdit) return;
    let batalkan = false;
    bacaDraf(produksiId).then((d) => {
      if (batalkan || !d || d.baris.length === 0) return;
      if (JSON.stringify(d.baris) !== JSON.stringify(dariServer(loin))) setDraf(d.baris);
    });
    return () => { batalkan = true; };
    // Hanya saat grid dibuka; perubahan data server sesudahnya tidak boleh memunculkan tawaran lagi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produksiId, bolehEdit]);

  // Simpan draf ke perangkat setiap isian berubah (tunda sebentar supaya tidak menulis tiap ketikan).
  useEffect(() => {
    if (!kotor) return;
    const t = setTimeout(() => { void simpanDraf(produksiId, baris); }, 350);
    return () => clearTimeout(t);
  }, [baris, kotor, produksiId]);

  // Pindahkan fokus setelah baris baru tampil.
  useEffect(() => {
    if (!fokus.current) return;
    const { r, c } = fokus.current;
    fokus.current = null;
    wadah.current?.querySelector<HTMLElement>(`[data-sel="${r}-${c}"]`)?.focus();
  }, [baris]);

  const ubah = (id: string, k: keyof BarisLoin, nilai: string) => {
    setBaris((b) => b.map((x) => (x.id === id ? { ...x, [k]: nilai } : x)));
    setKotor(true);
    setStatus({ jenis: "kotor" });
  };

  const tambah = () => {
    fokus.current = { r: baris.length, c: 3 };
    setBaris([...baris, barisBaru(baris, grade[0]?.id ?? "")]);
    setKotor(true);
  };

  const geser = (e: React.KeyboardEvent, r: number, c: number) => {
    const turun = e.key === "Enter" || e.key === "ArrowDown";
    const naik = e.key === "ArrowUp";
    if (!turun && !naik) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (e.currentTarget.tagName === "SELECT") return; // panah dipakai memilih grade
    }
    e.preventDefault();
    const tujuan = r + (turun ? 1 : -1);
    if (tujuan < 0) return;
    if (tujuan >= baris.length) {
      if (e.key === "Enter" && bolehEdit && !barisKosong(baris[r])) tambah();
      return;
    }
    wadah.current?.querySelector<HTMLElement>(`[data-sel="${tujuan}-${c}"]`)?.focus();
  };

  const hapusLokal = (id: string) => {
    setBaris((b) => (b.length > 1 ? b.filter((x) => x.id !== id) : b));
    setKotor(true);
    setStatus({ jenis: "kotor" });
  };

  const kirim = () => {
    const isi = baris.filter((b) => !barisKosong(b));
    setDicoba(true);
    if (isi.length === 0) return setStatus({ jenis: "gagal", pesan: "Belum ada loin yang diisi." });
    if (periksaBaris(isi).size > 0) return setStatus({ jenis: "gagal", pesan: "Ada baris yang belum benar. Lihat tanda merah." });
    setStatus({ jenis: "menyimpan" });
    mulai(async () => {
      try {
        const r = await simpanLoin({ produksiId, baris: isi.map((b) => ({ ...b })) });
        if (r.error) return setStatus({ jenis: "gagal", pesan: r.error });
        setBaris((b) => b.map((x) => (r.versi?.[x.id] !== undefined ? { ...x, versi: r.versi[x.id] } : x)));
        setKonflik(r.konflik ?? []);
        if ((r.konflik ?? []).length === 0) {
          setKotor(false);
          setDicoba(false);
          await hapusDraf(produksiId);
          setStatus({ jenis: "bersih", pesan: `Tersimpan di server (${isi.length} baris).` });
        } else {
          setStatus({ jenis: "gagal", pesan: `${r.konflik?.length} baris diubah orang lain dan tidak ditimpa.` });
        }
      } catch {
        // Jaringan putus: isian tetap ada di layar dan di perangkat; dikirim otomatis saat sinyal kembali.
        void simpanDraf(produksiId, baris);
        setStatus({ jenis: "gagal", pesan: "Tidak ada sinyal. Isian aman di perangkat dan akan dikirim saat sinyal kembali." });
      }
    });
  };

  // Kirim otomatis saat sinyal kembali dan ada isian yang belum terkirim.
  const sinkron = useEffectEvent(() => { if (kotor && !sibuk) kirim(); });
  useEffect(() => {
    const saatOnline = () => sinkron();
    window.addEventListener("online", saatOnline);
    return () => window.removeEventListener("online", saatOnline);
  }, []);

  const pakaiDraf = () => { if (draf) { setBaris(draf); setKotor(true); setStatus({ jenis: "kotor" }); } setDraf(null); };
  const buangDraf = () => { void hapusDraf(produksiId); setDraf(null); };
  const ambilServer = () => { setBaris(dariServer(loin)); setKonflik([]); setKotor(false); setDicoba(false); void hapusDraf(produksiId); setStatus({ jenis: "bersih", pesan: "Memakai data terbaru dari server." }); };

  const unduhCsv = () => {
    const isi = baris.filter((b) => !barisKosong(b) && keGram(b.kg) !== null)
      .map((b) => [b.noEkor, b.noLoin, namaGrade.get(b.gradeId) ?? "", gramKeTeks(keGram(b.kg) ?? 0).replace(".", ",")]);
    const csv = buatCsv(["No. ekor", "No. loin", "Grade", "Berat (kg)"], [...isi, ["", "", "TOTAL", gramKeTeks(total.gram).replace(".", ",")]]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kode}-loin.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const warna = status.jenis === "gagal" ? "#A8322B" : status.jenis === "kotor" ? "#8A5A00" : status.jenis === "menyimpan" ? MUTED : "#0B6B4A";
  const label = status.pesan ?? (status.jenis === "kotor" ? "Belum disimpan ke server. Draf tersimpan di perangkat." : status.jenis === "menyimpan" ? "Menyimpan..." : "Semua tersimpan di server.");

  return (
    <div ref={wadah} className="space-y-3">
      {draf && bolehEdit && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBF0D5", color: "#8A5A00" }}>
          <span>Ada draf di perangkat ini ({draf.length} baris) yang belum sampai ke server.</span>
          <span className="flex gap-2"><Btn size="sm" onClick={pakaiDraf}>Pakai draf</Btn><Btn size="sm" v="light" onClick={buangDraf}>Buang draf</Btn></span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="status" aria-live="polite" data-testid="status-simpan" className="text-[12.5px] font-medium" style={{ color: warna }}>
          {!online && <span className="mr-2 rounded-full bg-[#FBE5E3] px-2 py-0.5 text-[11.5px] text-[#A8322B]">Tanpa sinyal</span>}
          {label}
        </div>
        <div className="flex gap-2">
          <Btn size="sm" v="light" onClick={unduhCsv} disabled={total.jumlah === 0}>Unduh CSV</Btn>
          {bolehEdit && <Btn size="sm" onClick={kirim} disabled={sibuk || (!kotor && konflik.length === 0)}>{sibuk ? "Menyimpan..." : "Simpan loin"}</Btn>}
        </div>
      </div>

      {konflik.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>
          <span>{konflik.length} baris (bertanda merah) sudah diubah orang lain dan tidak ditimpa.</span>
          <Btn size="sm" v="light" onClick={ambilServer}>Ambil data terbaru</Btn>
        </div>
      )}

      <div className="overflow-x-auto rounded-[20px] bg-white">
        <table className="w-full min-w-[480px] text-[13.5px]">
          <thead>
            <tr className="text-left text-[12px]" style={{ color: MUTED }}>
              <th className="w-16 px-2 py-2.5 font-medium md:w-20 md:px-3">Ekor</th>
              <th className="w-16 px-2 py-2.5 font-medium md:w-24 md:px-3">Loin</th>
              <th className="w-28 px-2 py-2.5 font-medium md:w-36 md:px-3">Grade</th>
              <th className="px-3 py-2.5 font-medium">Berat (kg)</th>
              <th className="w-24 px-2 py-2.5 text-right font-medium md:w-28 md:px-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b, r) => {
              const g = dicoba || konflik.includes(b.id) ? galat.get(b.id) : undefined;
              const bentrok = konflik.includes(b.id);
              const batas = (salah?: string) => (salah || bentrok ? "#E4A7A2" : "#E2E4EA");
              return (
                <tr key={b.id} className="border-t border-[#EEF0F4]" style={bentrok ? { background: "#FDF3F2" } : undefined}>
                  <td className="px-3 py-1.5">
                    <input data-sel={`${r}-0`} className={sel} style={{ borderColor: batas(g?.noEkor) }} inputMode="numeric" aria-label={`No. ekor baris ${r + 1}`} disabled={!bolehEdit}
                      value={b.noEkor} onChange={(e) => ubah(b.id, "noEkor", e.target.value)} onKeyDown={(e) => geser(e, r, 0)} />
                  </td>
                  <td className="px-3 py-1.5">
                    <input data-sel={`${r}-1`} className={sel} style={{ borderColor: batas(g?.noLoin) }} inputMode="numeric" aria-label={`No. loin baris ${r + 1}`} disabled={!bolehEdit}
                      value={b.noLoin} onChange={(e) => ubah(b.id, "noLoin", e.target.value)} onKeyDown={(e) => geser(e, r, 1)} />
                    {g?.noLoin && <span className="block text-[11px]" style={{ color: "#A8322B" }}>{g.noLoin}</span>}
                  </td>
                  <td className="px-3 py-1.5">
                    <select data-sel={`${r}-2`} className={sel} style={{ borderColor: batas(g?.gradeId) }} aria-label={`Grade baris ${r + 1}`} disabled={!bolehEdit}
                      value={b.gradeId} onChange={(e) => ubah(b.id, "gradeId", e.target.value)} onKeyDown={(e) => geser(e, r, 2)}>
                      <option value="" disabled>Pilih</option>
                      {grade.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <input data-sel={`${r}-3`} className={`${sel} text-right tabular-nums`} style={{ borderColor: batas(g?.kg) }} inputMode="decimal" placeholder="0,000" aria-label={`Berat baris ${r + 1}`} disabled={!bolehEdit}
                      value={b.kg} onChange={(e) => ubah(b.id, "kg", e.target.value)} onKeyDown={(e) => geser(e, r, 3)} />
                    {g?.kg && <span className="block text-[11px]" style={{ color: "#A8322B" }}>{g.kg}</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {bolehEdit && (b.versi === undefined
                      ? <Btn size="sm" v="ghost" onClick={() => hapusLokal(b.id)} disabled={baris.length <= 1}>Hapus baris</Btn>
                      : <Btn size="sm" v="ghost" onClick={() => setBatal(b)}>Batalkan</Btn>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#EEF0F4] font-medium" style={{ color: INK }}>
              <td colSpan={3} className="px-3 py-3">Total {total.jumlah} potong</td>
              <td className="px-3 py-3 text-right tabular-nums" data-testid="total-loin">{tampilKg(total.gram)} kg</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {bolehEdit && <Btn size="sm" v="light" onClick={() => tambah()}>+ Tambah baris</Btn>}

      {total.jumlah > 0 && (
        <div className="grid gap-2.5 md:grid-cols-2">
          <Inner className="!p-3.5">
            <h5 className="mb-1.5 text-[12.5px] font-semibold" style={{ color: INK }}>Total per grade</h5>
            {[...total.perGrade.entries()].map(([id, t]) => (
              <div key={id} className="flex justify-between py-0.5 text-[13px]"><span style={{ color: MUTED }}>{namaGrade.get(id) ?? "?"} · {t.jumlah} potong</span><b className="tabular-nums" style={{ color: INK }}>{tampilKg(t.gram)} kg</b></div>
            ))}
          </Inner>
          {total.perEkor.size > 0 && (
            <Inner className="!p-3.5">
              <h5 className="mb-1.5 text-[12.5px] font-semibold" style={{ color: INK }}>Hasil per ekor</h5>
              {[...total.perEkor.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([no, t]) => {
                const utuh = berat.get(no) ?? null;
                const h = hasilPerEkor(t.gram, utuh);
                return (
                  <div key={no} className="flex justify-between py-0.5 text-[13px]">
                    <span style={{ color: MUTED }}>Ekor {no} · {t.jumlah} potong{utuh !== null ? ` · utuh ${tampilKg(Math.round(utuh * 1000))} kg` : ""}</span>
                    <b className="tabular-nums" style={{ color: INK }}>{tampilKg(t.gram)} kg{h !== null ? ` · ${h.toLocaleString("id-ID", { minimumFractionDigits: 1 })}%` : ""}</b>
                  </div>
                );
              })}
            </Inner>
          )}
        </div>
      )}

      {batal && <FormBatal baris={batal} onTutup={() => setBatal(null)} />}
    </div>
  );
}

function FormBatal({ baris, onTutup }: { baris: BarisLoin; onTutup: () => void }) {
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, mulai] = useTransition();
  const kirim = () => mulai(async () => {
    const r = await batalkanLoin(baris.id, alasan);
    if (r.error) setGalat(r.error);
    else onTutup();
  });
  return (
    <Modal title={`Batalkan loin nomor ${baris.noLoin}`} onClose={onTutup}>
      <p className="text-[13px]" style={{ color: MUTED }}>Loin {baris.kg} kg ini tidak dihitung lagi, tetapi tetap tercatat di riwayat. Tulis alasannya.</p>
      {galat && <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{galat}</div>}
      <input className="h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3.5 text-[14px] outline-none focus:border-[#00171F]" aria-label="Alasan" placeholder="Misalnya salah timbang" maxLength={300}
        value={alasan} onChange={(e) => setAlasan(e.target.value)} />
      <div className="flex flex-col gap-3">
        <Btn full v="danger" onClick={kirim} disabled={sibuk || alasan.trim() === ""}>{sibuk ? "Membatalkan..." : "Ya, batalkan loin ini"}</Btn>
        <Btn full v="ghost" onClick={onTutup}>Kembali</Btn>
      </div>
    </Modal>
  );
}
