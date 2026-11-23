import Link from "next/link";
import { tanggal } from "@/lib/format";
import type { AbsenHarian, Izin, RekapHadir } from "@/lib/types/absensi";
import { INK, MUTED } from "@/components/ui/tokens";
import { AMBER, Angka, BarisBatang, BarisTautan, DeretAngka, GAYA, HIJAU, Kosong, Kotak, Lencana, persen, TautanLengkap } from "./Laporan";

/* Laporan absensi buat owner (23 Nov 2026): siapa yg udah masuk hari ini, yg telat, izin yg nunggu persetujuan,
   sama kehadiran tiap orang bulan ini. */

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const JENIS_IZIN = { izin: "Izin", sakit: "Sakit", libur: "Libur" } as const;
const jam = (w: string) => new Date(w).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });

function geserBulan(bulan: string, n: number) {
  const d = new Date(`${bulan}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

export function AbsensiOwner({ hari, bulan, rekap, harian, izin }: { hari: string; bulan: string; rekap: RekapHadir[]; harian: AbsenHarian[]; izin: Izin[] }) {
  const sukses = harian.filter((a) => a.hasil === "berhasil");
  const masuk = new Map<string, AbsenHarian>();
  for (const a of sukses.filter((x) => x.jenis === "masuk").sort((x, y) => x.waktu.localeCompare(y.waktu))) if (!masuk.has(a.user_id)) masuk.set(a.user_id, a);
  const pulang = new Set(sukses.filter((x) => x.jenis === "pulang").map((x) => x.user_id));
  const izinHariIni = new Map(izin.filter((i) => i.status === "disetujui" && i.dari <= hari && i.sampai >= hari).map((i) => [i.user_id, i] as const));
  const nunggu = izin.filter((i) => i.status === "diajukan");
  const telat = [...masuk.values()].filter((a) => a.terlambat_menit > 0);
  const totalKerja = rekap.reduce((a, r) => a + r.hari_kerja, 0);
  const totalHadir = rekap.reduce((a, r) => a + r.hadir, 0);
  const pctBulan = totalKerja > 0 ? (totalHadir / totalKerja) * 100 : null;
  const bulanIni = bulan === hari.slice(0, 7);
  const namaBulan = `${NAMA_BULAN[Number(bulan.slice(5, 7)) - 1]} ${bulan.slice(0, 4)}`;
  const orang = [...rekap].sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <div className="space-y-5" data-testid="absensi-owner">
      <DeretAngka>
        <Angka label="Masuk hari ini" nilai={`${masuk.size} dari ${rekap.length}`} ket={tanggal(hari)} tone={rekap.length > 0 && masuk.size >= rekap.length ? "ok" : undefined} />
        <Angka label="Telat hari ini" nilai={String(telat.length)} tone={telat.length > 0 ? "warn" : undefined} ket={telat.length > 0 ? "Orang yg masuknya telat" : masuk.size > 0 ? "Semua tepat waktu" : "Belum ada yg absen masuk"} />
        <Angka label="Izin nunggu" nilai={String(nunggu.length)} tone={nunggu.length > 0 ? "warn" : undefined} ket={nunggu.length > 0 ? "Perlu disetujui owner" : "Nggak ada yg nunggu"} />
        <Angka label={`Kehadiran ${bulanIni ? "bulan ini" : namaBulan}`} nilai={pctBulan !== null ? persen(pctBulan) : "-"} tone={pctBulan !== null && pctBulan < 85 ? "warn" : undefined}
          ket={`${totalHadir} hadir dari ${totalKerja} hari kerja`} />
      </DeretAngka>

      {nunggu.length > 0 && (
        <Kotak judul="Izin nunggu persetujuan" kanan={<Lencana warn>{nunggu.length} izin</Lencana>}>
          <ul className="space-y-2">
            {nunggu.map((i) => (
              <BarisTautan key={i.id} href="/absensi?lengkap=1" judul={`${i.nama} · ${JENIS_IZIN[i.jenis]}`}
                ket={`${i.dari === i.sampai ? tanggal(i.dari) : `${tanggal(i.dari)} sampai ${tanggal(i.sampai)}`}${i.alasan ? ` · ${i.alasan}` : ""}`} tombol="Periksa" />
            ))}
          </ul>
        </Kotak>
      )}

      <Kotak judul="Hari ini">
        {orang.length === 0
          ? <Kosong>Belum ada pegawai yg didaftarin.</Kosong>
          : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {orang.map((r) => {
                const m = masuk.get(r.user_id);
                const iz = izinHariIni.get(r.user_id);
                const status = m
                  ? m.terlambat_menit > 0 ? { teks: `Telat ${m.terlambat_menit} menit`, warna: AMBER } : { teks: "Tepat waktu", warna: HIJAU }
                  : iz ? { teks: JENIS_IZIN[iz.jenis], warna: MUTED } : { teks: "Belum absen", warna: AMBER };
                return (
                  <li key={r.user_id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold" style={{ color: INK }}>{r.nama}</span>
                      <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>
                        {r.role_nama}{m ? ` · masuk ${jam(m.waktu)}${pulang.has(r.user_id) ? ", udah pulang" : ""}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold" style={{ color: status.warna }}>{status.teks}</span>
                  </li>
                );
              })}
            </ul>
          )}
      </Kotak>

      <Kotak judul={`Kehadiran ${namaBulan}`} kanan={
        <span className="flex gap-1">
          <Link href={`/absensi?bulan=${geserBulan(bulan, -1)}`} scroll={false} className="flex h-8 items-center rounded-full bg-white px-3 text-[12.5px] font-medium" style={{ ...GAYA, color: INK }}>Bulan lalu</Link>
          {!bulanIni && <Link href="/absensi" scroll={false} className="flex h-8 items-center rounded-full bg-white px-3 text-[12.5px] font-medium" style={{ ...GAYA, color: INK }}>Bulan ini</Link>}
        </span>
      }>
        {orang.length === 0
          ? <Kosong>Belum ada data.</Kosong>
          : (
            <ul className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
              {orang.map((r) => {
                const pct = r.hari_kerja > 0 ? (r.hadir / r.hari_kerja) * 100 : 0;
                const tambahan = [r.terlambat > 0 && `${r.terlambat} telat`, r.izin + r.sakit + r.libur > 0 && `${r.izin + r.sakit + r.libur} izin`, r.tidak_hadir > 0 && `${r.tidak_hadir} nggak hadir`].filter(Boolean).join(" · ");
                return <BarisBatang key={r.user_id} nama={r.nama} teks={`${r.hadir}/${r.hari_kerja} hari${tambahan ? ` · ${tambahan}` : ""}`} pct={pct} warna={pct < 85 ? AMBER : HIJAU} />;
              })}
            </ul>
          )}
      </Kotak>

      <TautanLengkap path="/absensi" teks="Buka halaman lengkap (foto, lokasi, izin)" />
    </div>
  );
}
