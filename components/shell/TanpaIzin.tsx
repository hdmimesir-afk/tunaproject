import { Card, Inner } from "@/components/ui";
import { INK } from "@/components/ui/tokens";

/** Tampil bila pengguna membuka halaman yang tidak termasuk izin perannya (menunya sendiri sudah disembunyikan). */
export function TanpaIzin() {
  return (
    <Card>
      <Inner>
        <p className="text-[14px] leading-relaxed" style={{ color: INK }}>Peran Anda tidak punya izin untuk membuka halaman ini. Hubungi pengelola akses bila ini keliru.</p>
      </Inner>
    </Card>
  );
}
