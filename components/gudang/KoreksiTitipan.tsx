"use client";

import { useActionState, useEffect } from "react";
import { Btn, Field, Modal, TextIn } from "@/components/ui";
import { HapusItem } from "@/components/ui/HapusItem";
import { PesanForm, pilihCls } from "@/components/ui/PesanForm";
import { RiwayatKoreksi } from "@/components/ui/RiwayatKoreksi";
import { MUTED } from "@/components/ui/tokens";
import type { HasilForm } from "@/lib/actions/auth";
import { hapusTitipan, koreksiTitipan } from "@/lib/actions/stok";
import type { Koreksi } from "@/lib/data/koreksi";
import { gramKeTeks, tampilKg } from "@/lib/logic/grid";
import type { Opsi } from "@/lib/types/pembelian";
import type { UnitStok } from "@/lib/types/stok";

/* Koreksi titipan (23 Nov 2026): pemilik, produk, grade, kondisi, berat masuk, proyek, catatan. Wajib alasan, kecatat.
   Titipan dobel yg masih utuh bisa dihapus dari sini juga. */

const kgTeks = (n: number) => `${tampilKg(Math.round(n * 1000))} kg`;

export function KoreksiTitipan({ unit, pelanggan, produk, grade, proyek, koreksi, pengguna, onTutup }: {
  unit: UnitStok; pelanggan: Opsi[]; produk: Opsi[]; grade: Opsi[]; proyek: Opsi[];
  koreksi: Koreksi[]; pengguna: Record<string, { nama: string }>; onTutup: () => void;
}) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(koreksiTitipan, undefined);
  useEffect(() => { if (state?.pesan && !state.error) onTutup(); }, [state, onTutup]);
  const keluar = Math.max(0, unit.kg_masuk - unit.sisa_kg);
  // Pastikan pilihan yg sekarang tetap ada walau pelanggan/produknya udah nonaktif.
  const ada = (daftar: Opsi[], id: string | null | undefined, label: string) => (id && !daftar.some((x) => x.id === id) ? [{ id, label }, ...daftar] : daftar);
  return (
    <Modal title={`Koreksi ${unit.kode}`} onClose={onTutup}>
      <form action={action} className="space-y-3" data-testid="form-koreksi-titipan">
        <input type="hidden" name="unitId" value={unit.id} />
        <PesanForm state={state?.error ? state : undefined} />
        <p className="text-[12.5px]" style={{ color: MUTED }}>
          Masuk {kgTeks(unit.kg_masuk)}{keluar > 0 ? `, udah keluar ${kgTeks(keluar)} (berat masuk nggak bisa kurang dari ini)` : ""}. Pemilik cuma bisa diganti selama belum ada tagihan simpan.
        </p>
        <Field label="Pelanggan pemilik titipan" error={state?.kolom?.buyerId?.[0]}>
          <select name="buyerId" className={pilihCls} defaultValue={unit.buyer_id ?? ""} required>
            {ada(pelanggan, unit.buyer_id, unit.pemilik_nama).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Produk" error={state?.kolom?.productId?.[0]}>
            <select name="productId" className={pilihCls} defaultValue={unit.product_id} required>
              {ada(produk, unit.product_id, unit.product_nama).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </Field>
          <Field label="Grade">
            <select name="gradeId" className={pilihCls} defaultValue={unit.grade_id ?? ""}>
              <option value="">Tanpa grade</option>
              {ada(grade, unit.grade_id, unit.grade_kode ?? "Grade lama").map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </Field>
          <Field label="Kondisi">
            <select name="kondisi" className={pilihCls} defaultValue={unit.kondisi}><option value="fresh">Fresh</option><option value="beku">Beku</option></select>
          </Field>
          <Field label="Berat masuk (kg)" error={state?.kolom?.kg?.[0]}>
            <TextIn name="kg" inputMode="decimal" defaultValue={gramKeTeks(Math.round(unit.kg_masuk * 1000)).replace(".", ",")} required />
          </Field>
        </div>
        {proyek.length > 0 && (
          <Field label="Proyek" hint="Proyek Titip saja. Boleh kosong.">
            <select name="siklusId" className={pilihCls} defaultValue={unit.cycle_id ?? ""}>
              <option value="">Tanpa proyek</option>
              {ada(proyek, unit.cycle_id, unit.cycles?.kode ?? "Proyek lama").map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </Field>
        )}
        {proyek.length === 0 && unit.cycle_id && <input type="hidden" name="siklusId" value={unit.cycle_id} />}
        <Field label="Spesies" hint="Boleh kosong."><TextIn name="spesies" maxLength={60} defaultValue={unit.spesies ?? ""} /></Field>
        <Field label="Catatan"><TextIn name="catatan" maxLength={300} defaultValue={unit.catatan} /></Field>
        <Field label="Alasan koreksi" hint="Wajib. Misalnya salah pemilik atau salah timbang." error={state?.kolom?.alasan?.[0]}>
          <TextIn name="alasan" maxLength={500} required />
        </Field>
        <Btn type="submit" full disabled={pending}>{pending ? "Menyimpan..." : "Simpan koreksi"}</Btn>
      </form>
      <RiwayatKoreksi daftar={koreksi.filter((k) => k.ref_id === unit.id)} pengguna={pengguna} />
      {keluar === 0 && (
        <HapusItem aksi={hapusTitipan} isian={{ unitId: unit.id }} tombol="Hapus titipan" testId="form-hapus-titipan" onSelesai={onTutup}
          keterangan={`${unit.kode} (${unit.pemilik_nama}, ${kgTeks(unit.kg_masuk)}) bakal dihapus permanen dari gudang, kecatat di log hapus.`}
          konfirmasi={`Yakin hapus ${unit.kode}? Cuma buat titipan yg kecatat dobel atau salah input.`} />
      )}
    </Modal>
  );
}
