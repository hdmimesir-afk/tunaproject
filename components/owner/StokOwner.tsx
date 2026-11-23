import { tanggal } from "@/lib/format";
import { jumlahPer, kgOwner, totalBulat } from "@/lib/logic/laporanOwner";
import type { IkanUtuh, IsiGudang, Ruangan, UnitStok } from "@/lib/types/stok";
import { INK, MUTED } from "@/components/ui/tokens";
import { AMBER, Angka, BarisBatang, BIRU, DeretAngka, HIJAU, Kosong, Kotak, Lencana, persen, TautanLengkap } from "./Laporan";

/* Laporan stok buat owner (23 Nov 2026): isinya keadaan sekarang, bukan per periode. Ikan utuh yg belum diolah,
   hasil siap jual, titipan, isi tiap ruangan gudang, sama stok yg udah lama nginep. */

const LAMA_HARI = 30;

function umurHari(masuk: string, hariIni: string) {
  return Math.floor((Date.parse(`${hariIni}T00:00:00Z`) - Date.parse(`${masuk.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

export function StokOwner({ units, ruangan, isi, ikan, hariIni }: { units: UnitStok[]; ruangan: Ruangan[]; isi: IsiGudang; ikan: IkanUtuh[]; hariIni: string }) {
  const aktif = units.filter((u) => u.status === "aktif" && u.sisa_kg > 0);
  const sendiri = aktif.filter((u) => u.buyer_id === null);
  const titipan = aktif.filter((u) => u.buyer_id !== null);
  const ikanSisa = ikan.filter((l) => l.rincian.tersediaKg > 0);
  const kgSendiri = totalBulat(sendiri, (u) => u.sisa_kg);
  const kgTitipan = totalBulat(titipan, (u) => u.sisa_kg);
  const kgIkan = totalBulat(ikanSisa, (l) => l.rincian.tersediaKg);
  const terisi = isi.isi_sendiri_kg + isi.isi_titipan_kg;
  const pctGudang = isi.kapasitas_kg > 0 ? (terisi / isi.kapasitas_kg) * 100 : null;
  const lama = sendiri.filter((u) => umurHari(u.masuk_pada, hariIni) >= LAMA_HARI).sort((a, b) => a.masuk_pada.localeCompare(b.masuk_pada));
  const perProduk = jumlahPer(sendiri, (u) => [u.product_nama, u.grade_kode].filter(Boolean).join(" "), (u) => u.sisa_kg);
  const perPemilik = jumlahPer(titipan, (u) => u.pemilik_nama, (u) => u.sisa_kg, 1000, 5);
  const ruang = ruangan.filter((r) => r.aktif).sort((a, b) => a.urutan - b.urutan);

  return (
    <div className="space-y-5" data-testid="stok-owner">
      <p className="px-1 text-[12.5px]" style={{ color: MUTED }}>Keadaan stok per hari ini, {tanggal(hariIni)}</p>

      <DeretAngka>
        <Angka label="Siap jual" nilai={kgOwner(kgSendiri)} ket={`${sendiri.length} unit hasil produksi`} />
        <Angka label="Ikan utuh belum diolah" nilai={kgOwner(kgIkan)} ket={`${ikanSisa.length} lot nunggu diproduksi`} />
        <Angka label="Titipan" nilai={kgOwner(kgTitipan)} ket={`${titipan.length} unit punya PT lain`} />
        <Angka label="Gudang terisi" nilai={pctGudang !== null ? persen(pctGudang) : "-"} tone={pctGudang !== null && pctGudang >= 90 ? "warn" : undefined}
          ket={isi.kapasitas_kg > 0 ? `Sisa ${kgOwner(Math.max(0, isi.kapasitas_kg - terisi))}` : "Kapasitas belum diisi"} />
      </DeretAngka>

      <Kotak judul="Isi tiap ruangan">
        {ruang.length === 0
          ? <Kosong>Ruangan gudang belum diatur.</Kosong>
          : (
            <ul className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
              {ruang.map((r) => {
                const pct = r.kapasitas_kg > 0 ? (r.isi_kg / r.kapasitas_kg) * 100 : 0;
                return <BarisBatang key={r.id} nama={`${r.nama} (${r.jenis.toUpperCase()})`} teks={`${kgOwner(r.isi_kg)} dari ${kgOwner(r.kapasitas_kg)}`} pct={pct} warna={pct >= 90 ? AMBER : HIJAU} />;
              })}
            </ul>
          )}
      </Kotak>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Kotak judul="Siap jual per produk">
          {perProduk.length === 0
            ? <Kosong>Belum ada hasil produksi di gudang.</Kosong>
            : <ul className="space-y-3">{perProduk.map((p) => <BarisBatang key={p.nama} nama={p.nama} teks={`${kgOwner(p.nilai)} · ${persen(p.pct)}`} pct={p.pct} />)}</ul>}
        </Kotak>
        <Kotak judul="Titipan per pemilik">
          {perPemilik.length === 0
            ? <Kosong>Lagi nggak ada titipan.</Kosong>
            : <ul className="space-y-3">{perPemilik.map((p) => <BarisBatang key={p.nama} nama={p.nama} teks={`${kgOwner(p.nilai)} · ${persen(p.pct)}`} pct={p.pct} warna={BIRU} />)}</ul>}
        </Kotak>
      </div>

      {lama.length > 0 && (
        <Kotak judul={`Udah ${LAMA_HARI} hari lebih di gudang`} kanan={<Lencana warn>{lama.length} unit</Lencana>}>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {lama.slice(0, 12).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold" style={{ color: INK }}>{u.product_nama}{u.grade_kode ? ` ${u.grade_kode}` : ""} · {kgOwner(u.sisa_kg)}</span>
                  <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>{u.kode} · masuk {tanggal(u.masuk_pada.slice(0, 10))}</span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: AMBER }}>{umurHari(u.masuk_pada, hariIni)} hari</span>
              </li>
            ))}
          </ul>
        </Kotak>
      )}

      <Kotak judul="Ikan utuh nunggu diolah" kanan={<span className="text-[12px]" style={{ color: MUTED }}>{ikanSisa.length} lot</span>}>
        {ikanSisa.length === 0
          ? <Kosong>Semua ikan utuh udah diolah.</Kosong>
          : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {ikanSisa.slice(0, 20).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold" style={{ color: INK }}>{l.kode} · {kgOwner(l.rincian.tersediaKg)}</span>
                    <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>{tanggal(l.tanggal_terima)} · {l.pemasok || "Tanpa pemasok"}</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold" style={{ color: l.sudah_grading ? HIJAU : AMBER }}>{l.sudah_grading ? (l.grade || "Digrade") : "Belum digrade"}</span>
                </li>
              ))}
            </ul>
          )}
      </Kotak>

      <TautanLengkap path="/stok" />
    </div>
  );
}
