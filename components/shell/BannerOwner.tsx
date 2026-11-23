import { getSesi } from "@/lib/data/auth";
import { PERAN_OWNER } from "@/lib/izin";
import { BannerLihat } from "./BannerLihat";

/** Keterangan "Mode lihat" buat owner di halaman kerja tim. Baca sesi, jadi dirender di dalam <Suspense>. */
export async function BannerOwner() {
  const sesi = await getSesi();
  if (sesi?.roleId !== PERAN_OWNER) return null;
  return <BannerLihat />;
}
