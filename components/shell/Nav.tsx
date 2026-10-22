"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { INK } from "@/components/ui/tokens";
import { MODULES } from "@/lib/modules";

/** Menu samping di desktop, baris geser di HP. Hanya modul yang boleh dilihat peran ini (disaring di server). */
export function Nav({ slugs }: { slugs: string[] }) {
  const path = usePathname();
  const on = (slug: string) => path === `/${slug}` || path.startsWith(`/${slug}/`);
  const items = MODULES.filter((m) => slugs.includes(m.slug));
  return (
    <>
      <nav className="hidden flex-1 space-y-0.5 overflow-y-auto md:block" aria-label="Modul">
        {items.map((m) => (
          <Link key={m.slug} href={`/${m.slug}`} className="flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] transition"
            style={{ background: on(m.slug) ? "#EEF0F5" : "transparent", color: on(m.slug) ? INK : "#C6CCD3", fontWeight: on(m.slug) ? 600 : 400 }}>
            <Icon n={m.icon} s={19} c={on(m.slug) ? INK : "#9AA2AB"} />
            {m.label}
          </Link>
        ))}
      </nav>
      <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:hidden" aria-label="Modul">
        {items.map((m) => (
          <Link key={m.slug} href={`/${m.slug}`} className="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px]"
            style={on(m.slug) ? { background: "#EEF0F5", color: INK, fontWeight: 600 } : { background: "#1B1D21", color: "#C6CCD3" }}>{m.label}</Link>
        ))}
      </nav>
    </>
  );
}
