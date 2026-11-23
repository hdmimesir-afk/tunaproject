/* Hitungan dashboard owner. Uang dihitung dalam sen bulat (nggak pakai float buat uang), hasil dibalikin dalam rupiah. */

const sen = (rp: number) => Math.round(Number(rp) * 100);
const rp = (s: number) => s / 100;

export type ProyekLaba = { pendapatan: number; biaya: number; laba: number; tanggal: string };

/** Margin profit dari proyek yg udah ada penjualannya. Proyek yg baru keluar biaya (ikannya belum kejual) nggak ikut,
    biar marginnya nggak keliatan minus padahal barangnya masih di gudang. */
export function hitungMargin(proyek: ProyekLaba[]) {
  const laku = proyek.filter((x) => sen(x.pendapatan) > 0);
  const p = laku.reduce((a, x) => a + sen(x.pendapatan), 0);
  const b = laku.reduce((a, x) => a + sen(x.biaya), 0);
  const l = laku.reduce((a, x) => a + sen(x.laba), 0);
  return { pendapatan: rp(p), biaya: rp(b), laba: rp(l), marginPct: p > 0 ? Math.round((l / p) * 1000) / 10 : null, jumlahProyek: laku.length, belumLaku: proyek.length - laku.length };
}

/** Geser tanggal 'YYYY-MM-DD' sekian hari (UTC, biar nggak kena zona waktu). */
function geserHari(tgl: string, hari: number) {
  const d = new Date(`${tgl}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

/** Balik modal (BEP) dari laba kotor semua proyek. Perkiraan bulan diambil dari rata rata laba 3 bulan (90 hari) terakhir. */
export function hitungBep(modal: number, proyek: ProyekLaba[], hariIni: string) {
  const m = sen(modal);
  const l = proyek.reduce((a, x) => a + sen(x.laba), 0);
  if (m <= 0) return { modal: 0, laba: rp(l), pct: null, sisa: 0, lunas: false, perBulan: null, bulanLagi: null };
  const batas = geserHari(hariIni, -90);
  const l90 = proyek.filter((x) => x.tanggal >= batas && x.tanggal <= hariIni).reduce((a, x) => a + sen(x.laba), 0);
  const perBulan = Math.round(l90 / 3);
  const sisa = Math.max(0, m - l);
  return {
    modal: rp(m),
    laba: rp(l),
    pct: Math.max(0, Math.min(100, Math.round((l / m) * 1000) / 10)),
    sisa: rp(sisa),
    lunas: sisa === 0,
    perBulan: perBulan > 0 ? rp(perBulan) : null,
    bulanLagi: sisa > 0 && perBulan > 0 ? Math.ceil(sisa / perBulan) : null,
  };
}

/** Saldo perusahaan = saldo awal (sebelum pakai sistem) + uang masuk - uang keluar di buku kas. */
export const hitungSaldo = (saldoAwal: number, saldoBuku: number) => rp(sen(saldoAwal) + sen(saldoBuku));

export type BarisAbsen = { user_id: string; nama: string; jenis: "masuk" | "pulang"; waktu: string; hasil: "berhasil" | "gagal"; terlambat_menit: number };
export type OrangHadir = { nama: string; masuk: string | null; pulang: string | null; terlambat: number };

/** Ringkas absen sehari per orang: jam masuk pertama dan jam pulang terakhir yg berhasil. */
export function ringkasAbsen(baris: BarisAbsen[]) {
  const per = new Map<string, OrangHadir>();
  for (const b of [...baris].sort((x, y) => x.waktu.localeCompare(y.waktu))) {
    if (b.hasil !== "berhasil") continue;
    const o = per.get(b.user_id) ?? { nama: b.nama, masuk: null, pulang: null, terlambat: 0 };
    if (b.jenis === "masuk" && !o.masuk) { o.masuk = b.waktu; o.terlambat = b.terlambat_menit; }
    if (b.jenis === "pulang") o.pulang = b.waktu;
    per.set(b.user_id, o);
  }
  const orang = [...per.values()].filter((o) => o.masuk).sort((a, b) => (a.masuk ?? "").localeCompare(b.masuk ?? ""));
  return { hadir: orang.length, terlambat: orang.filter((o) => o.terlambat > 0).length, udahPulang: orang.filter((o) => o.pulang).length, orang };
}
