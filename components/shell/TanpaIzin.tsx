import { Card, Inner } from "@/components/ui";
import { INK } from "@/components/ui/tokens";

/** Tampil bila pengguna membuka halaman yang tidak termasuk izin perannya (menunya sendiri sudah disembunyikan). */
export function TanpaIzin() {
  return (
    <Card>
      <Inner>
        <p className="text-[14px] leading-relaxed" style={{ color: INK }}>Peran ini nggak punya izin buat buka halaman ini. Kalau ternyata keliru, hubungi pengelola akses.</p>
      </Inner>
    </Card>
  );
}
