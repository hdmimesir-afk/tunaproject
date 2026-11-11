import { Card, Inner } from "@/components/ui";
import { INK } from "@/components/ui/tokens";

/** Pesan saat database belum disambungkan (.env.local kosong). */
export function Belum() {
  return (
    <Card>
      <Inner>
        <p className="text-[14px] leading-relaxed" style={{ color: INK }}>
          Database belum nyambung. Halaman ini butuh Supabase. Jalankan <code>supabase start</code> (perlu Docker) atau isi proyek Supabase di <code>.env.local</code>.
        </p>
      </Inner>
    </Card>
  );
}
