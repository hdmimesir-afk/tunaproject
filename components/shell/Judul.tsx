import { INK, MUTED } from "@/components/ui/tokens";

export function Judul({ kicker, judul }: { kicker: string; judul: string }) {
  return (
    <div>
      <div className="text-[12.5px] font-medium md:text-[13px]" style={{ color: MUTED }}>{kicker}</div>
      <h1 className="mt-0.5 text-[24px] font-medium tracking-tight md:text-[28px]" style={{ color: INK }}>{judul}</h1>
    </div>
  );
}
