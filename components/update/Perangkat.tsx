"use client";

import { useCallback, useRef, useState } from "react";
import { useResizeObserver } from "./useResizeObserver";

/* Bingkai laptop atau HP yang memuat layar contoh (/update/layar/...) dalam iframe. Iframe berukuran layar sungguhan
   (1280 x 800 atau 390 x 844) lalu diperkecil, jadi tata letak responsifnya persis seperti di perangkat itu. */

const UKURAN = { laptop: { w: 1280, h: 800 }, hp: { w: 390, h: 844 } } as const;

type Props = { jenis: "laptop" | "hp"; layar: string; judul: string; segera?: boolean };

export function Perangkat({ jenis, layar, judul, segera }: Props) {
  const { w, h } = UKURAN[jenis];
  const kotak = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(jenis === "laptop" ? 0.5 : 0.6);
  const ukur = useCallback((lebar: number) => { if (lebar > 0) setSkala(lebar / w); }, [w]);
  useResizeObserver(kotak, ukur);

  return (
    <div className={`u-perangkat u-${jenis}`} aria-hidden="true">
      <div className="u-bingkai">
        {jenis === "hp" && <span className="u-pulau" />}
        <div ref={kotak} className="u-layar" style={{ height: Math.round(h * skala) }}>
          <iframe src={layar} title={judul} width={w} height={h} loading={segera ? "eager" : "lazy"} tabIndex={-1}
            style={{ width: w, height: h, transform: `scale(${skala})` }} />
        </div>
      </div>
      {jenis === "laptop" ? <div className="u-dasar" /> : <span className="u-garis" />}
    </div>
  );
}
