"use client";

import { useEffect, type RefObject } from "react";

/** Memanggil `saat` dengan lebar elemen setiap kali ukurannya berubah (termasuk saat pertama dipasang). */
export function useResizeObserver(ref: RefObject<HTMLElement | null>, saat: (lebar: number) => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pengamat = new ResizeObserver(([e]) => saat(e.contentRect.width));
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [ref, saat]);
}
