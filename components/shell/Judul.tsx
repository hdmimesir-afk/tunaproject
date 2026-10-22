import { INK, MUTED } from "@/components/ui/tokens";

export function Judul({ kicker, judul }: { kicker: string; judul: string }) {
  return (
    <div>
      <div className="text-[13px] font-medium" style={{ color: MUTED }}>{kicker}</div>
      <h1 className="mt-0.5 text-[28px] font-medium tracking-tight" style={{ color: INK }}>{judul}</h1>
    </div>
  );
}
