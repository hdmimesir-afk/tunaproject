import { Card, Inner } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { modul } from "@/lib/modules";

/** Isi sementara halaman modul sampai fasenya dikerjakan. */
export function Placeholder({ slug }: { slug: string }) {
  const m = modul(slug);
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <div>
        <div className="text-[13px] font-medium" style={{ color: MUTED }}>Dikerjakan di Fase {m.fase}</div>
        <h1 className="mt-0.5 text-[28px] font-medium tracking-tight" style={{ color: INK }}>{m.label}</h1>
      </div>
      <Card title="Yang akan ada di sini">
        <Inner><p className="text-[14px]" style={{ color: INK }}>{m.isi}</p></Inner>
      </Card>
    </div>
  );
}
