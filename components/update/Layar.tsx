import { Absensi } from "@/components/absensi/Absensi";
import { DashboardOwner } from "@/components/dashboard/DashboardOwner";
import { Antrean } from "@/components/persetujuan/Antrean";
import { GridLoin } from "@/components/produksi/GridLoin";
import { SiklusKelola } from "@/components/siklus/SiklusKelola";
import { Btn, Card, Pill } from "@/components/ui";
import { MUTED } from "@/components/ui/tokens";
import { Kerangka } from "./Kerangka";
import * as c from "./contoh";

/* Layar contoh yang dimuat di dalam bingkai perangkat pada /update. Isinya komponen asli sistem dengan data contoh.
   Seluruh isi dibuat `inert`: tidak bisa diketuk atau diubah, dan tidak ada permintaan ke database. */

const Mati = ({ children }: { children: React.ReactNode }) => <div inert aria-hidden="true">{children}</div>;

export function LayarDashboard() {
  return (
    <Kerangka aktif="dashboard" kicker="Ringkasan dulu, rincian saat diketuk" judul="Dashboard">
      <Mati><DashboardOwner d={c.dashboard} izin={c.izinOwner} nama={c.SALAM.nama} salam={c.SALAM.salam} tanggal={c.SALAM.tanggal} buku={c.buku} siklus={c.siklusTerbaru} tindakan={c.tindakan} /></Mati>
    </Kerangka>
  );
}

export function LayarPersetujuan() {
  return (
    <Kerangka aktif="persetujuan" kicker="Diperiksa Finance, disetujui Owner" judul="Persetujuan">
      <Mati><Antrean data={c.persetujuan} pengguna={c.penggunaPersetujuan} bolehPeriksa bolehSetuju sorot={c.IDSOROT} /></Mati>
    </Kerangka>
  );
}

export function LayarGrid() {
  return (
    <Kerangka aktif="produksi" kicker="Timbang per potong, selisih terlihat" judul="Produksi">
      <Mati>
        <Card title="PRD-004 · Loin per potong" right={<Pill t="Berjalan" />}>
          <div className="space-y-3 px-1.5 pb-1">
            <p className="text-[12.5px]" style={{ color: MUTED }}>Ketik berat lalu Enter untuk baris berikutnya. Nomor loin dan grade terisi dari baris sebelumnya.</p>
            <GridLoin produksiId="contoh" kode="PRD-004" loin={c.loinContoh} grade={c.gradeContoh} ekor={c.ekorContoh} bolehEdit />
          </div>
          <div className="mt-2.5 flex gap-2 px-1"><Btn v="light" size="sm">Selesaikan produksi</Btn></div>
        </Card>
      </Mati>
    </Kerangka>
  );
}

export function LayarAbsensi() {
  return (
    <Kerangka aktif="absensi" kicker="Lokasi dan foto langsung, waktu dari server" judul="Absensi">
      <Mati><Absensi userId="u-petugas" hari="2026-10-26" bulan="2026-10" tanggalHarian="2026-10-26" lokasi={c.lokasi} saya={c.saya} izin={c.izinSaya} harian={null} rekap={null} bolehKelola={false} bolehSetuju={false} /></Mati>
    </Kerangka>
  );
}

export function LayarSiklus() {
  return (
    <Kerangka aktif="siklus" kicker="Satu siklus dari beli ikan sampai uang masuk" judul="Rincian Siklus">
      <Mati><SiklusKelola daftar={c.daftarSiklus} detail={c.rantai} bolehTutup /></Mati>
    </Kerangka>
  );
}
