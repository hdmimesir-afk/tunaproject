"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlideCanvas } from "./SlideCanvas";
import { slides } from "@/data/slides";
import MobileDeck from "./MobileDeck";
import { W, H } from "@/lib/scene";

const CONTROLS_H = 64;

export default function Deck() {
  const [idx, setIdx] = useState(0);
  const hydrated = useRef(false);
  const [scale, setScale] = useState(0.5);
  const [vw, setVw] = useState(1280);
  const [portraitPhone, setPortraitPhone] = useState(false);
  const [startIdx] = useState(() => { if (typeof window === "undefined") return 0; const n = parseInt(window.location.hash.replace("#", ""), 10); return Number.isNaN(n) ? 0 : n - 1; });
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [overview, setOverview] = useState(false);
  const [full, setFull] = useState(false);
  const [idle, setIdle] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = slides.length;

  const go = useCallback((n: number) => setIdx(Math.max(0, Math.min(total - 1, n))), [total]);

  // hash <-> index
  useEffect(() => {
    const read = () => {
      const n = parseInt(location.hash.replace("#", ""), 10);
      if (!Number.isNaN(n)) setIdx(Math.max(0, Math.min(total - 1, n - 1)));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [total]);
  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    history.replaceState(null, "", `#${idx + 1}`);
  }, [idx]);

  // fit to viewport
  useEffect(() => {
    const fit = () => {
      const ch = document.fullscreenElement ? 0 : CONTROLS_H;
      setScale(Math.min(window.innerWidth / W, (window.innerHeight - ch) / H));
      setVw(window.innerWidth);
      setPortraitPhone(window.innerWidth < 700 && window.innerHeight > window.innerWidth * 1.05);
    };
    fit();
    window.addEventListener("resize", fit);
    document.addEventListener("fullscreenchange", () => {
      setFull(!!document.fullscreenElement);
      fit();
    });
    return () => window.removeEventListener("resize", fit);
  }, []);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key) && !overview) { e.preventDefault(); go(idx + 1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key) && !overview) { e.preventDefault(); go(idx - 1); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
      else if (e.key === "f" || e.key === "F") toggleFull();
      else if (e.key === "g" || e.key === "G" || e.key === "o" || e.key === "O") setOverview((v) => !v);
      else if (e.key === "Escape") setOverview(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, go, overview, toggleFull, total]);

  // auto-hide controls while presenting
  useEffect(() => {
    const wake = () => {
      setIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdle(true), 2500);
    };
    window.addEventListener("mousemove", wake);
    wake();
    return () => window.removeEventListener("mousemove", wake);
  }, []);

  const [demoOpen, setDemoOpen] = useState(false);
  const DEMOS = [
    { href: "/demo", label: "Demo ponsel", hint: "Aplikasi ponsel interaktif" },
    { href: "/demo/desktop", label: "Demo desktop", hint: "Semua modul dan laporan" },
    { href: "/demo/live", label: "Demo berdampingan", hint: "Desktop dan ponsel sinkron" },
  ];
  // buttons shown on the slide that features the mockup
  const slideDemos = idx === 8 ? [DEMOS[1], DEMOS[2]] : idx === 9 ? [DEMOS[0], DEMOS[2]] : idx === 10 ? [DEMOS[1]] : idx === total - 1 ? DEMOS : [];
  const hideControls = full && idle;
  const slide = slides[idx];
  const cols = vw >= 1280 ? 4 : vw >= 768 ? 3 : 2;
  const thumbW = (Math.min(1500, vw - 64) - 20 * (cols - 1)) / cols;
  const thumbScale = thumbW / W;

  if (portraitPhone) return <MobileDeck idx={startIdx} go={go} />;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0d0d0d] select-none">
      {/* progress */}
      <div className="absolute left-0 top-0 z-20 h-[3px] w-full bg-white/10">
        <div className="h-full bg-[#12A676] transition-[width] duration-300" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      <div ref={stageRef} className="relative flex flex-1 items-center justify-center overflow-hidden" onTouchStart={(e) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={(e) => { const s0 = swipe.current; swipe.current = null; if (!s0) return; const dx = e.changedTouches[0].clientX - s0.x, dy = e.changedTouches[0].clientY - s0.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(idx + (dx < 0 ? 1 : -1)); }} onClick={(e) => { if (!overview && e.clientX > window.innerWidth / 2) go(idx + 1); else if (!overview) go(idx - 1); }}>
        <div style={{ width: W * scale, height: H * scale, position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,.45)" }}>
          <div key={slide.id} className="deck-fade" style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", left: 0, top: 0 }}>
            <SlideCanvas slide={slide} />
          </div>
          {slideDemos.length > 0 && (
            <div className="absolute z-10 flex gap-2" style={{ right: Math.max(8, 24 * scale), bottom: Math.max(8, 24 * scale) }} onClick={(e) => e.stopPropagation()}>
              {slideDemos.map((d) => (
                <a key={d.href} href={d.href} target="_blank" rel="noreferrer" className="rounded-full bg-[#12A676] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0E5C46]" style={{ fontSize: Math.max(12, 15 * scale) }}>
                  ▶ {d.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* controls */}
      <div
        className={`deck-controls z-20 flex items-center justify-between gap-4 bg-[#0d0d0d] px-5 text-sm text-slate-300 transition-opacity duration-300 ${hideControls ? "pointer-events-none opacity-0" : "opacity-100"}`}
        style={{ height: CONTROLS_H, position: full ? "absolute" : "relative", bottom: 0, left: 0, right: 0 }}
      >
        <div className="flex items-center gap-2">
          <button className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20 disabled:opacity-30" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Slide sebelumnya">←</button>
          <button className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20 disabled:opacity-30" onClick={() => go(idx + 1)} disabled={idx === total - 1} aria-label="Slide berikutnya">→</button>
          <span className="ml-2 tabular-nums">{String(idx + 1).padStart(2, "0")} / {total}</span>
        </div>
        <div className="hidden truncate md:block text-slate-400">{slide.title}</div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button className="rounded-md bg-[#12A676] px-3 py-1.5 font-semibold text-white hover:bg-[#0E5C46]" onClick={() => setDemoOpen((v) => !v)} aria-expanded={demoOpen}>Buka demo ▾</button>
            {demoOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-64 overflow-hidden rounded-xl bg-[#1b1b1b] shadow-2xl ring-1 ring-white/10">
                {DEMOS.map((d) => (
                  <a key={d.href} href={d.href} target="_blank" rel="noreferrer" onClick={() => setDemoOpen(false)} className="block px-4 py-3 hover:bg-white/10">
                    <div className="font-semibold text-white">{d.label}</div>
                    <div className="text-xs text-slate-400">{d.hint}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
          <button className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20" onClick={() => setOverview(true)}>Ringkasan<span className="shortcut"> (G)</span></button>
          <button className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20" onClick={toggleFull}>Layar penuh<span className="shortcut"> (F)</span></button>
          <a className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20" href="/print" target="_blank">Cetak / PDF</a>
        </div>
      </div>

      {overview && (
        <div className="absolute inset-0 z-30 overflow-auto bg-[#0d0d0d]/95 p-8" onClick={() => setOverview(false)}>
          <div className="mx-auto grid max-w-[1500px] gap-5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {slides.map((s, i) => (
              <button key={s.id} onClick={(e) => { e.stopPropagation(); go(i); setOverview(false); }} className={`text-left ${i === idx ? "ring-2 ring-[#178C87]" : ""} rounded-sm`}>
                <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", overflow: "hidden", background: "#fff" }}>
                  <div style={{ width: W, height: H, transform: `scale(${thumbScale})`, transformOrigin: "top left", position: "absolute" }}>
                    <SlideCanvas slide={s} />
                  </div>
                </div>
                <div className="mt-1 truncate text-xs text-slate-400">{String(s.id).padStart(2, "0")} · {s.title}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <style>{`
        .deck-fade { animation: none; }
        @media (prefers-reduced-motion: reduce) { .deck-fade { animation: none; } }
        @keyframes deckfade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
