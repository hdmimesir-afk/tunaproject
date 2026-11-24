import Link from "next/link";
import { tanggal, waktu } from "@/lib/format";
import { kgOwner, totalBulat } from "@/lib/logic/laporanOwner";
import type { Barang, Booking, GerakBarang, IsiGudang, Ruangan, UnitStok } from "@/lib/types/stok";
import { INK, MUTED } from "@/components/ui/tokens";
import { AMBER, Angka, BarisBatang, DeretAngka, HIJAU, Kosong, Kotak, Lencana, persen } from "./Laporan";

/* Ringkasan Warehouse (permintaan tim 24 Nov 2026): isi gudang dingin per ruangan, stok yang udah lama nginep,
   jadwal ABF, sama barang penunjang (kerja dan pekerja). Semua kebaca dari input di Gudang Dingin dan Barang Penunjang. */

const LAMA_HARI = 30;

function umurHari(masuk: string, hariIni: string) {
  return Math.floor((Date.parse(`${hariIni}T00:00:00Z`) - Date.parse(`${masuk.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

const angka = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 3 });

export function RingkasanWarehouse({ units, ruangan, isi, barang, gerak, booking, hariIni }: {
  units: UnitStok[]; ruangan: Ruangan[]; isi: IsiGudang; barang: Barang[]; gerak: GerakBarang[]; booking: Booking[]; hariIni: string;
}) {
  const aktif = units.filter((u) => u.status === "aktif" && u.sisa_kg > 0);
  const sendiri = aktif.filter((u) => u.buyer_id === null);
  const titipan = aktif.filter((u) => u.buyer_id !== null);
  const terisi = isi.isi_sendiri_kg + isi.isi_titipan_kg;
  const pctGudang = isi.kapasitas_kg > 0 ? (terisi / isi.kapasitas_kg) * 100 : null;
  const lama = aktif.filter((u) => umurHari(u.masuk_pada, hariIni) >= LAMA_HARI).sort((a, b) => a.masuk_pada.localeCompare(b.masuk_pada));
  const ruang = ruangan.filter((r) => r.aktif).sort((a, b) => a.urutan - b.urutan);
  const barangAktif = barang.filter((b) => b.aktif);
  const perluBeli = barangAktif.filter((b) => b.status_stok !== "aman");
  const namaBarang = new Map(barang.map((b) => [b.id, b]));
  const jadwal = booking.filter((b) => b.status === "aktif" && b.selesai.slice(0, 10) >= hariIni).sort((a, b) => a.mulai.localeCompare(b.mulai));

  return (
    <div className="space-y-5" data-testid="ringkasan-warehouse">
      <p className="px-1 text-[12.5px]" style={{ color: MUTED }}>Keadaan per hari ini, {tanggal(hariIni)}</p>

      <DeretAngka>
        <Angka label="Gudang terisi" nilai={pctGudang !== null ? persen(pctGudang) : "-"} tone={pctGudang !== null && pctGudang >= 90 ? "warn" : undefined}
          ket={isi.kapasitas_kg > 0 ? `Sisa ${kgOwner(Math.max(0, isi.kapasitas_kg - terisi))}` : "Kapasitas belum diisi"} />
        <Angka label="Stok sendiri" nilai={kgOwner(totalBulat(sendiri, (u) => u.sisa_kg))} ket={`${sendiri.length} unit hasil produksi`} />
        <Angka label="Titipan" nilai={kgOwner(totalBulat(titipan, (u) => u.sisa_kg))} ket={`${titipan.length} unit punya pelanggan`} />
        <Angka label="Penunjang perlu dibeli" nilai={String(perluBeli.length)} tone={perluBeli.length > 0 ? "warn" : undefined} ket={`dari ${barangAktif.length} barang`} />
      </DeretAngka>

      <Kotak judul="Isi tiap ruangan" kanan={<Link href="/gudang" className="text-[12.5px] underline" style={{ color: MUTED }}>Gudang Dingin</Link>}>
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
        <Kotak judul="Jadwal mesin ke depan" kanan={<span className="text-[12px]" style={{ color: MUTED }}>{jadwal.length} jadwal</span>}>
          {jadwal.length === 0
            ? <Kosong>Belum ada jadwal ABF atau produksi.</Kosong>
            : (
              <ul className="space-y-2">
                {jadwal.slice(0, 8).map((b) => (
                  <li key={b.id} className="rounded-2xl bg-white px-3.5 py-2.5">
                    <span className="block truncate text-[13.5px] font-semibold" style={{ color: INK }}>{b.label} · {b.jenis === "abf" ? "ABF" : "Produksi"}</span>
                    <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>{waktu(b.mulai)} sampai {waktu(b.selesai)}</span>
                  </li>
                ))}
              </ul>
            )}
        </Kotak>
        <Kotak judul="Barang penunjang perlu dibeli" kanan={<Link href="/penunjang" className="text-[12.5px] underline" style={{ color: MUTED }}>Barang Penunjang</Link>}>
          {perluBeli.length === 0
            ? <Kosong>Semua barang penunjang aman.</Kosong>
            : (
              <ul className="space-y-2">
                {perluBeli.slice(0, 10).map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold" style={{ color: INK }}>{b.nama}</span>
                      <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>{b.kategori === "pekerja" ? "Kebutuhan pekerja" : "Barang kerja"} · minimum {angka(b.stok_minimum)} {b.satuan}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: AMBER }}>{angka(b.stok)} {b.satuan}</span>
                  </li>
                ))}
              </ul>
            )}
        </Kotak>
      </div>

      <Kotak judul="Keluar masuk barang penunjang terakhir">
        {gerak.length === 0
          ? <Kosong>Belum ada catatan barang penunjang.</Kosong>
          : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {gerak.slice(-10).reverse().map((g) => {
                const b = namaBarang.get(g.item_id);
                return (
                  <li key={g.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold" style={{ color: INK }}>{b?.nama ?? "Barang"}</span>
                      <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>{tanggal(g.tanggal)}{g.penerima ? ` · ${g.penerima}` : ""}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: g.jenis === "masuk" ? HIJAU : INK }}>
                      {g.jenis === "masuk" ? "+" : g.jenis === "keluar" ? "−" : "koreksi "}{angka(Math.abs(g.jumlah))} {b?.satuan ?? ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
      </Kotak>

      {lama.length > 0 && (
        <Kotak judul={`Udah ${LAMA_HARI} hari lebih di gudang`} kanan={<Lencana warn>{lama.length} unit</Lencana>}>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {lama.slice(0, 12).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold" style={{ color: INK }}>{u.product_nama}{u.grade_kode ? ` ${u.grade_kode}` : ""} · {kgOwner(u.sisa_kg)}</span>
                  <span className="block truncate text-[12.5px]" style={{ color: MUTED }}>{u.buyer_id ? u.pemilik_nama : "Milik sendiri"} · {u.kode} · masuk {tanggal(u.masuk_pada.slice(0, 10))}</span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: AMBER }}>{umurHari(u.masuk_pada, hariIni)} hari</span>
              </li>
            ))}
          </ul>
        </Kotak>
      )}
    </div>
  );
}
