/* Mesin tarif gudang dingin. Murni tanpa I/O; rumus yang sama ada di fungsi database hitung_biaya_simpan
   dan keduanya diuji dengan kasus batas yang sama. Hitungan memakai detik dan gram bulat supaya tidak bergeser.

     lama <= masa transit  -> tarif transit x berat
     selain itu            -> hari = lama dibulatkan ke atas per 24 jam; sampai 1 hari ditagih 1 hari,
                              lebih dari itu ditagih paling sedikit minimum hari; tarif x berat x hari ditagih */

export type AturanSimpan = {
  tarifPerKg: number;
  tarifTransitPerKg: number;
  masaTransitJam: number;
  minimumHari: number;
};

export type Biaya = {
  transit: boolean;
  detik: number;
  hariBulat: number;
  hariDitagih: number;
  tarifPerKg: number;
  kgDasar: number;
  jumlah: number;
  minimumHari: number;
  masaTransitJam: number;
};

export function hitungBiayaSimpan(kgDasar: number, masuk: Date, keluar: Date, a: AturanSimpan): Biaya {
  const detik = Math.ceil((keluar.getTime() - masuk.getTime()) / 1000);
  if (detik < 0) throw new Error("Waktu keluar lebih awal dari waktu masuk.");
  const gram = Math.round(kgDasar * 1000);
  const transit = detik <= a.masaTransitJam * 3600;
  const hariBulat = transit ? 0 : Math.ceil(detik / 86400);
  const hariDitagih = transit ? 0 : hariBulat <= 1 ? 1 : Math.max(hariBulat, a.minimumHari);
  const tarif = transit ? a.tarifTransitPerKg : a.tarifPerKg;
  // sen = gram x tarif(sen/kg) x hari / 1000, dibulatkan setengah ke atas seperti round() numeric di database.
  const sen = Math.round((gram * Math.round(tarif * 100) * (transit ? 1 : hariDitagih)) / 1000);
  return { transit, detik, hariBulat, hariDitagih, tarifPerKg: tarif, kgDasar: gram / 1000, jumlah: sen / 100, minimumHari: a.minimumHari, masaTransitJam: a.masaTransitJam };
}

/** Rincian cara menghitung, dalam kalimat sederhana, untuk ditampilkan di tagihan. */
export function uraikanBiaya(b: Pick<Biaya, "transit" | "detik" | "hariBulat" | "hariDitagih" | "tarifPerKg" | "kgDasar" | "jumlah" | "minimumHari" | "masaTransitJam">): string[] {
  const rp = (n: number) => `Rp${n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const kg = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
  const lama = lamaTeks(b.detik);
  if (b.transit) {
    return [`Lama simpan ${lama}, masih dalam masa transit (${b.masaTransitJam} jam).`, `${kg(b.kgDasar)} kg × ${rp(b.tarifPerKg)} = ${rp(b.jumlah)}`];
  }
  const baris = [`Lama simpan ${lama}, dibulatkan ke atas per 24 jam menjadi ${b.hariBulat} hari.`];
  if (b.hariBulat > 1 && b.hariDitagih > b.hariBulat) baris.push(`Kurang dari minimum ${b.minimumHari} hari, jadi ditagih ${b.hariDitagih} hari.`);
  else if (b.hariBulat > 1) baris.push(`Ditagih ${b.hariDitagih} hari (minimum ${b.minimumHari} hari terpenuhi).`);
  else baris.push("Sampai 24 jam ditagih 1 hari.");
  baris.push(`${kg(b.kgDasar)} kg × ${rp(b.tarifPerKg)} × ${b.hariDitagih} hari = ${rp(b.jumlah)}`);
  return baris;
}

export function lamaTeks(detik: number) {
  const hari = Math.floor(detik / 86400);
  const jam = Math.floor((detik % 86400) / 3600);
  const menit = Math.floor((detik % 3600) / 60);
  const bagian = [hari ? `${hari} hari` : "", jam ? `${jam} jam` : "", menit ? `${menit} menit` : ""].filter(Boolean);
  return bagian.length ? bagian.join(" ") : `${detik} detik`;
}

/** Sisa kapasitas gudang. Titipan baru ditolak bila stok sendiri + titipan + yang masuk melebihi kapasitas. */
export function cekKapasitas(kapasitasKg: number, isiKg: number, masukKg: number) {
  const kapG = Math.round(kapasitasKg * 1000);
  const isiG = Math.round(isiKg * 1000);
  const masukG = Math.round(masukKg * 1000);
  return { cukup: isiG + masukG <= kapG, sisaKg: (kapG - isiG) / 1000, setelahKg: (isiG + masukG) / 1000 };
}
