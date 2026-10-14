"use client";

import { useEffect, useState } from "react";

/** Desktop and phone demos side by side. They share one store, so an action in one appears in the other. */
export default function LiveView() {
  const [size, setSize] = useState({ w: 1600, h: 900 });
  useEffect(() => {
    const f = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    f(); window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  const PW = 390, PH = 844, DW = 1360, DH = 840;
  const availH = size.h - 110;
  const pScale = Math.min(1, availH / PH);
  const phoneW = PW * pScale;
  const dScale = Math.min(1, (size.w - phoneW - 120) / DW, availH / DH);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 py-5" style={{ background: "#CFCFD1", fontFamily: "inherit" }}>
      <div className="text-center">
        <div className="text-[18px] font-semibold" style={{ color: "#111214" }}>Coba di desktop dan ponsel sekaligus</div>
        <div className="text-[13px]" style={{ color: "#5C626B" }}>Setujui sesuatu di satu sisi, lalu lihat sisi lainnya ikut berubah. Data contoh.</div>
      </div>
      <div className="flex items-start justify-center gap-8">
        <div style={{ width: DW * dScale, height: DH * dScale }} className="overflow-hidden rounded-[22px] shadow-[0_20px_60px_rgba(30,35,60,.2)]">
          <iframe title="Demo desktop" src="/demo/desktop" style={{ width: DW, height: DH, border: 0, transform: `scale(${dScale})`, transformOrigin: "top left" }} />
        </div>
        <div style={{ width: PW * pScale, height: PH * pScale }} className="overflow-hidden rounded-[44px] border-[8px] border-[#111214] shadow-[0_20px_60px_rgba(30,35,60,.2)]">
          <iframe title="Demo ponsel" src="/demo/phone" style={{ width: PW - 0, height: PH - 0, border: 0, transform: `scale(${pScale})`, transformOrigin: "top left" }} />
        </div>
      </div>
    </div>
  );
}
