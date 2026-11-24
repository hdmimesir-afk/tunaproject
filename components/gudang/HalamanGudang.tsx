import { z } from "zod";
import { GudangKelola } from "@/components/gudang/GudangKelola";
import { ProyekTitip } from "@/components/gudang/ProyekTitip";
import { TanpaIzin } from "@/components/shell/TanpaIzin";
import { requireSesi } from "@/lib/data/auth";
import { dokumenDari } from "@/lib/data/dokumen";
import { riwayatKoreksi } from "@/lib/data/koreksi";
import { petaPengguna } from "@/lib/data/pembelian";
import { daftarPT, proyekTerbuka } from "@/lib/data/produksi";
import { daftarBooking, daftarRuangan, daftarTagihan, daftarTarif, daftarUnit, gradeStok, isiGudang, mitraAktif, pelangganAktif, produkAktif } from "@/lib/data/stok";
import { hariIni } from "@/lib/format";
import { boleh } from "@/lib/izin";

type Sp = Promise<Record<string, string | string[] | undefined>>;

/** Data gudang dingin buat dua halaman: Gudang Dingin (ruangan, stok sendiri, tarif, jadwal) dan
    Produksi, Titip barang (proyek titip, titipan, tagihan jasa). */
export async function HalamanGudang({ bagian, searchParams }: { bagian: "gudang" | "titip"; searchParams: Sp }) {
  const sesi = await requireSesi();
  if (!boleh(sesi, "gudang.read")) return <TanpaIzin />;
  const bolehTulis = boleh(sesi, "gudang.write");
  const sp = await searchParams;
  // Dari proyek titip (atau form produksi lini Titip barang): form Terima titipan langsung kebuka dengan proyeknya.
  const titipAwal = z.uuid().safeParse(typeof sp.titip === "string" ? sp.titip : "");
  const titip = bagian === "titip";
  const [units, isi, ruangan, tagihan, tarif, booking, mitra, pelanggan, produk, grade, proyek, pt] = await Promise.all([
    daftarUnit(),
    isiGudang(),
    daftarRuangan(),
    titip ? daftarTagihan() : Promise.resolve([]),
    titip ? Promise.resolve([]) : daftarTarif(),
    titip ? Promise.resolve([]) : daftarBooking(),
    mitraAktif(),
    bolehTulis ? pelangganAktif() : Promise.resolve([]),
    bolehTulis ? produkAktif() : Promise.resolve([]),
    bolehTulis ? gradeStok() : Promise.resolve([]),
    titip && boleh(sesi, "siklus.read") ? proyekTerbuka() : Promise.resolve([]),
    titip ? daftarPT() : Promise.resolve([]),
  ]);
  const sendiri = units.filter((u) => u.buyer_id === null && u.status === "aktif" && !u.langsung_kirim);
  const titipan = units.filter((u) => u.buyer_id !== null);
  const bolehLampiran = boleh(sesi, "dokumen.read");
  const idAktif = titipan.filter((u) => u.status === "aktif").map((u) => u.id);
  const [dokumen, koreksi, pengguna] = await Promise.all([
    bolehLampiran && titip ? dokumenDari("storage_units", idAktif) : Promise.resolve([]),
    bolehTulis && titip ? riwayatKoreksi(["storage_units"], idAktif) : Promise.resolve([]),
    bolehTulis && titip ? petaPengguna() : Promise.resolve({}),
  ]);
  // Bikin proyek titip butuh izin mulai produksi (fungsinya sama: mulai_produksi lini titip).
  const bolehProyek = bolehTulis && boleh(sesi, "produksi.write");
  return (
    <GudangKelola key={titipAwal.data ?? "-"} bagian={bagian}
      atas={titip ? <ProyekTitip proyek={proyek} pt={pt} hariIni={hariIni()} bolehBuat={bolehProyek} /> : null}
      titipan={titipan} sendiri={sendiri} bolehStok={boleh(sesi, "stok.write")} isi={isi} ruangan={ruangan} tagihan={tagihan} tarif={tarif} booking={booking}
      pelanggan={pelanggan} produk={produk} grade={grade} mitra={mitra} bolehTulis={bolehTulis}
      proyekTitip={proyek.filter((x) => x.lini_bisnis === "titip")} titipAwal={titipAwal.success ? titipAwal.data : null} koreksi={koreksi} pengguna={pengguna} bolehTarif={boleh(sesi, "pengaturan.write")} hariIni={hariIni()}
      lampiran={bolehLampiran ? { dokumen, bolehTulis: boleh(sesi, "dokumen.write") } : null} />
  );
}
