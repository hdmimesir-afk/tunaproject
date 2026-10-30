"use client";

import { useActionState, useMemo, useState } from "react";
import { KotakCari, useCari } from "@/components/ui/Cari";
import { Btn, Card, Field, Inner, Pill, TextIn } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { KonfirmasiDua } from "@/components/ui/KonfirmasiDua";
import { lepasPeran, tautanAturSandi, ubahEmail, ubahPengguna, undangPengguna } from "@/lib/actions/akses";
import type { HasilForm } from "@/lib/actions/auth";

export type Pengguna = { user_id: string; nama: string; email: string; role_id: string | null; aktif: boolean };
type Peran = { id: string; nama: string };

const selectCls = "h-9 rounded-xl border border-[#E2E4EA] bg-white px-2.5 text-[13px] outline-none focus:border-[#00171F]";

function Galat({ state }: { state: HasilForm }) {
  return state?.error ? <div role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{state.error}</div> : null;
}

/** Tautan aktivasi sekali pakai: salin, atau buka WhatsApp dengan pesan siap kirim. */
function KotakTautan({ state }: { state: HasilForm }) {
  const [disalin, setDisalin] = useState(false);
  if (!state?.tautan) return null;
  const tautan = state.tautan;
  const pesanWa = `Akun KATALIS ERP Anda sudah dibuat. Buka tautan ini untuk membuat kata sandi (sekali pakai, berlaku 24 jam):\n${tautan}`;
  const salin = () => { void navigator.clipboard.writeText(tautan).then(() => setDisalin(true)).catch(() => setDisalin(false)); };
  return (
    <div role="status" className="space-y-2.5 rounded-2xl px-3.5 py-3 text-[12.5px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>
      <p>{state.pesan}</p>
      <input readOnly value={tautan} aria-label="Tautan aktivasi" data-testid="tautan-aktivasi" onFocus={(e) => e.currentTarget.select()}
        className="h-9 w-full rounded-xl border border-[#B9E2CD] bg-white px-2.5 text-[12px]" style={{ color: INK }} />
      <div className="flex flex-wrap gap-2">
        <Btn size="sm" v="light" onClick={salin}>{disalin ? "Tersalin" : "Salin tautan"}</Btn>
        <a href={`https://wa.me/?text=${encodeURIComponent(pesanWa)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-10 items-center rounded-full px-4 text-[13px] font-medium text-white md:h-8 md:px-3.5 md:text-[12.5px]" style={{ background: "#0B6B4A" }}>Kirim lewat WhatsApp</a>
      </div>
    </div>
  );
}

function TombolTautanSandi({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(tautanAturSandi, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      {!state?.tautan && <Btn type="submit" size="sm" v="ghost" disabled={pending}>{pending ? "Membuat..." : "Tautan atur sandi"}</Btn>}
      <Galat state={state} />
      <KotakTautan state={state} />
    </form>
  );
}

/** Satu baris pengguna: ubah peran dan status. Akun sendiri dan akun Owner (bagi bukan Owner) dikunci. */
function Baris({ u, peran, saya, bolehOwner }: { u: Pengguna; peran: Peran[]; saya: string; bolehOwner: boolean }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(ubahPengguna, undefined);
  const terkunci = u.user_id === saya || (u.role_id === "owner" && !bolehOwner);
  const pilihan = peran.filter((p) => bolehOwner || p.id !== "owner");
  return (
    <form action={action} className="rounded-[20px] bg-white p-4">
      <input type="hidden" name="userId" value={u.user_id} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium" style={{ color: INK }}>{u.nama || "(tanpa nama)"}{u.user_id === saya && " · Anda"}</div>
          <div className="truncate text-[12.5px]" style={{ color: MUTED }}>{u.email}</div>
        </div>
        {terkunci ? (
          <div className="flex items-center gap-2">
            <Pill t={peran.find((p) => p.id === u.role_id)?.nama ?? "Tanpa peran"} />
            <Pill t={u.aktif ? "Aktif" : "Nonaktif"} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select name="roleId" defaultValue={u.role_id ?? ""} className={selectCls} aria-label={`Peran ${u.email}`} required>
              <option value="" disabled>Pilih peran</option>
              {pilihan.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
            <select name="aktif" defaultValue={String(u.aktif)} className={selectCls} aria-label={`Status ${u.email}`}>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
            <Btn type="submit" size="sm" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Btn>
          </div>
        )}
      </div>
      <div className="mt-2"><Galat state={state} /></div>
    </form>
  );
}

/** Ganti email masuk: tombol membuka isian kecil; setelah berhasil menampilkan pesan hasilnya. */
function UbahEmailForm({ u }: { u: Pengguna }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(ubahEmail, undefined);
  const [buka, setBuka] = useState(false);
  if (state?.pesan && !state.error) return <p role="status" className="max-w-[420px] rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>{state.pesan}</p>;
  if (!buka) return <Btn size="sm" v="ghost" onClick={() => setBuka(true)}>Ubah email</Btn>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={u.user_id} />
      <div className="flex flex-wrap items-center gap-2">
        <input name="email" type="email" required defaultValue={u.email} aria-label={`Email baru ${u.nama || u.email}`} className="h-9 w-[260px] max-w-full rounded-xl border border-[#E2E4EA] bg-white px-3 text-[13px] outline-none focus:border-[#00171F]" />
        <Btn type="submit" size="sm" disabled={pending}>{pending ? "Menyimpan..." : "Simpan email"}</Btn>
        <Btn size="sm" v="ghost" onClick={() => setBuka(false)}>Batal</Btn>
      </div>
      <Galat state={state} />
    </form>
  );
}

/** Lepas peran: dua langkah (konfirmasi dulu), lalu peran kosong dan akun nonaktif. Form sendiri, di luar form ubah peran. */
function TombolLepasPeran({ u, namaPeran }: { u: Pengguna; namaPeran: string }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(lepasPeran, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={u.user_id} />
      <KonfirmasiDua size="sm" v="danger" label="Lepas peran" labelYa="Ya, lepas peran dan nonaktifkan" pending={pending}
        pesan={`Peran ${namaPeran} dilepas dari ${u.nama || u.email} dan akunnya dinonaktifkan, jadi tidak bisa masuk. Peran bisa diberikan lagi kapan saja.`} />
      <Galat state={state} />
    </form>
  );
}

/** Baris pengguna beserta tombol tautan atur sandi dan lepas peran (di luar form ubah peran supaya form tidak bersarang). */
function BarisPengguna(p: { u: Pengguna; peran: Peran[]; saya: string; bolehOwner: boolean }) {
  const bolehTautan = p.u.user_id !== p.saya && (p.u.role_id !== "owner" || p.bolehOwner);
  const namaPeran = p.peran.find((x) => x.id === p.u.role_id)?.nama;
  // Email boleh diganti untuk semua akun, termasuk akun sendiri; akun Owner hanya oleh Owner.
  const bolehEmail = p.u.role_id !== "owner" || p.bolehOwner;
  return (
    <div className="space-y-1">
      <Baris {...p} />
      {(bolehTautan || bolehEmail) && (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 pb-1">
          {bolehEmail && <UbahEmailForm u={p.u} />}
          {bolehTautan && <TombolTautanSandi userId={p.u.user_id} />}
          {bolehTautan && p.u.role_id && namaPeran && <TombolLepasPeran u={p.u} namaPeran={namaPeran} />}
        </div>
      )}
    </div>
  );
}

function Undang({ peran, bolehOwner }: { peran: Peran[]; bolehOwner: boolean }) {
  const [state, action, pending] = useActionState<HasilForm, FormData>(undangPengguna, undefined);
  return (
    <Card title="Buat akun pengguna">
      <form action={action} className="grid gap-3 px-2.5 pb-2.5 md:grid-cols-[1fr_1fr_200px_auto] md:items-end">
        <Field label="Nama" error={state?.kolom?.nama?.[0]}><TextIn name="nama" required /></Field>
        <Field label="Email" error={state?.kolom?.email?.[0]}><TextIn name="email" type="email" required /></Field>
        <Field label="Peran" error={state?.kolom?.roleId?.[0]}>
          <select name="roleId" defaultValue="" className="h-11 w-full rounded-2xl border border-[#E2E4EA] bg-white px-3 text-[14px]" required>
            <option value="" disabled>Pilih peran</option>
            {peran.filter((p) => bolehOwner || p.id !== "owner").map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </Field>
        <Btn type="submit" disabled={pending}>{pending ? "Membuat..." : "Buat akun"}</Btn>
        <div className="space-y-2 md:col-span-4">
          <Galat state={state} />
          <KotakTautan state={state} />
          <p className="text-[12px]" style={{ color: MUTED }}>Email hanya dipakai sebagai nama masuk; tidak ada email yang dikirim. Kirim tautan yang muncul ke orangnya, lalu ia membuat kata sandi sendiri.</p>
        </div>
      </form>
    </Card>
  );
}

export function AksesKelola({ pengguna, peran, saya, bolehOwner }: { pengguna: Pengguna[]; peran: Peran[]; saya: string; bolehOwner: boolean }) {
  const namaPeran = new Map(peran.map((p) => [p.id, p.nama]));
  const teks = useMemo(() => (u: Pengguna) => `${u.nama} ${u.email} ${u.role_id ? namaPeran.get(u.role_id) ?? "" : "tanpa peran"} ${u.aktif ? "aktif" : "nonaktif"}`, [peran]); // eslint-disable-line react-hooks/exhaustive-deps
  const { q, setQ, hasil } = useCari(pengguna, teks);
  return (
    <div className="space-y-4">
      <Undang peran={peran} bolehOwner={bolehOwner} />
      <Card title={`${pengguna.length} pengguna`}>
        <div className="space-y-2">
          {pengguna.length > 3 && <KotakCari q={q} onUbah={setQ} placeholder="Cari nama, email, atau peran" tampil={hasil.length} total={pengguna.length} />}
          {pengguna.length === 0 && <Inner><p className="text-[13px]" style={{ color: MUTED }}>Belum ada pengguna.</p></Inner>}
          {pengguna.length > 0 && hasil.length === 0 && <Inner><p className="text-[13px]" style={{ color: MUTED }}>Tidak ada pengguna yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p></Inner>}
          {hasil.map((u) => <BarisPengguna key={u.user_id} u={u} peran={peran} saya={saya} bolehOwner={bolehOwner} />)}
        </div>
      </Card>
    </div>
  );
}
