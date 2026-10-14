"use client";

import { useEffect, useMemo, useState } from "react";
import { ROLES, resetDemo, useDemoState, type Role } from "@/lib/demo/store";
import { DemoCtx, GREEN, INK, Icon, MUTED, Btn, Card, Inner, Stat, type IconName } from "@/components/demo/ui";
import { MODULES, VIEWS } from "@/components/demo/modules";

/** Native-style mobile demo. Shares one store with the desktop demo, so actions sync between them. */
const TABS: { id: string; icon: IconName; label: string }[] = [
  { id: "dashboard", icon: "grid", label: "Beranda" },
  { id: "menu", icon: "box", label: "Modul" },
  { id: "setuju", icon: "check", label: "Setuju" },
  { id: "laporan", icon: "chart", label: "Laporan" },
  { id: "akses", icon: "user", label: "Profil" },
];

function Logo({ size = 40 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/katalis-mark-dark.png" width={size} height={size} alt="Katalis" style={{ objectFit: "contain" }} />;
}

export default function DemoApp({ embedded = false }: { embedded?: boolean }) {
  const s = useDemoState();
  const [splash, setSplash] = useState(!embedded);
  const [screen, setScreen] = useState("dashboard");
  const [role, setRoleState] = useState<Role>("Owner");
  const [toast, setToast] = useState<{ m: string; ok: boolean } | null>(null);

  useEffect(() => { const t = setTimeout(() => setSplash(false), 1300); return () => clearTimeout(t); }, []);
  useEffect(() => { try { const r = localStorage.getItem("katalis-role-m") as Role | null; if (r && ROLES.includes(r)) setRoleState(r); } catch { /* ignore */ } }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const setRole = (r: Role) => { setRoleState(r); try { localStorage.setItem("katalis-role-m", r); } catch { /* ignore */ } setToast({ m: `Masuk sebagai ${r}`, ok: true }); };
  const ctx = useMemo(() => ({ compact: true, role, setRole, notify: (m: string, ok = true) => setToast({ m, ok }), go: (m: string) => setScreen(m) }), [role]);

  const pending = s.approvals.filter((a) => a.status === "pending").length;
  const tabOf = screen === "dashboard" ? "dashboard" : ["setuju", "laporan", "akses"].includes(screen) ? screen : "menu";
  const isModule = tabOf === "menu" && screen !== "menu";
  const mod = MODULES.find((m) => m.id === screen);
  const View = VIEWS[screen];

  const title = screen === "setuju" ? "Persetujuan" : screen === "laporan" ? "Laporan" : screen === "akses" ? "Profil & Akses" : mod?.label ?? "Modul";
  const sub = screen === "menu" ? "Semua fitur" : mod?.hint ?? (screen === "setuju" ? `${pending} menunggu keputusan` : "Katalis ERP");

  return (
    <DemoCtx.Provider value={ctx}>
      <div className={`flex ${embedded ? "h-dvh" : "min-h-dvh md:p-8"} flex-col items-center justify-center md:gap-5`} style={{ background: embedded ? "transparent" : "#CFCFD1" }}>
        <style>{`
          @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
          @keyframes sheetUp{from{transform:translateY(100%)}to{transform:none}}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          .no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}
        `}</style>

        <div className={`relative h-dvh w-full overflow-hidden ${embedded ? "" : "md:h-[860px] md:w-[400px] md:rounded-[48px] md:shadow-[0_20px_60px_rgba(30,35,60,.18)]"}`} style={{ background: "linear-gradient(180deg,#EFF1F6 0%,#E9EDF5 55%,#DFE6F2 100%)" }}>
          {/* status bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 items-start justify-between px-8 pt-4 text-[13px] font-semibold" style={{ color: INK, background: "linear-gradient(180deg,#EFF1F6 55%,rgba(239,241,246,0))" }}>
            <span>9:41</span>
            <span className="flex items-center gap-1.5"><svg width="18" height="12" viewBox="0 0 18 12" fill={INK}><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg><svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3.5" fill="none" stroke={INK} opacity=".4" /><rect x="2" y="2" width="18" height="8" rx="2.2" fill={INK} /></svg></span>
          </div>

          <div key={screen} className="no-scrollbar h-full overflow-y-auto pb-32" style={{ animation: "fadeIn .25s ease" }}>
            {/* header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-14">
              <div className="flex items-center gap-3">
                {isModule ? (
                  <button type="button" aria-label="Kembali" onClick={() => setScreen("menu")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm active:scale-95"><Icon n="back" s={20} /></button>
                ) : <Logo />}
                <div>
                  <div className="text-[12px]" style={{ color: MUTED }}>{screen === "dashboard" ? `Katalis ERP · ${role}` : sub}</div>
                  <div className="text-[17px] font-semibold leading-tight" style={{ color: INK }}>{screen === "dashboard" ? "Halo, Owner" : title}</div>
                </div>
              </div>
              <button type="button" aria-label="Cari modul" onClick={() => setScreen("menu")} className="active:scale-90"><Icon n="search" s={24} /></button>
            </div>

            <div className="space-y-3.5 px-3.5">
              {screen === "menu" && (
                <>
                  <Card title="Semua Modul">
                    <div className="grid grid-cols-2 gap-2.5">
                      {MODULES.filter((m) => !["dashboard", "laporan", "akses"].includes(m.id)).map((m) => (
                        <button key={m.id} type="button" onClick={() => setScreen(m.id)} className="flex flex-col items-start justify-start rounded-[20px] p-4 text-left transition active:scale-[0.96]" style={{ background: "#F4F5F9" }}>
                          <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-white"><Icon n={m.icon} s={20} /></span>
                          <div className="text-[14px] font-medium" style={{ color: INK }}>{m.label}</div>
                          <div className="text-[11.5px] leading-snug" style={{ color: MUTED }}>{m.hint}</div>
                        </button>
                      ))}
                    </div>
                  </Card>
                </>
              )}
              {View && <View />}
              {screen === "akses" && (
                <Card title="Demo">
                  <Inner>
                    <div className="mb-3 text-[12.5px]" style={{ color: MUTED }}>Mode demo dengan data contoh. Perubahan tersimpan di perangkat ini dan ikut tampil di demo desktop.</div>
                    <Btn full onClick={() => { resetDemo(); setScreen("dashboard"); setToast({ m: "Demo diulang dari awal", ok: true }); }}>Ulangi demo dari awal</Btn>
                  </Inner>
                </Card>
              )}
            </div>
          </div>

          {/* floating glass tab bar */}
          <nav className="absolute inset-x-3.5 bottom-4 z-30 flex items-center justify-between rounded-full px-3 py-2.5" style={{ background: "rgba(255,255,255,.74)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,.95)", boxShadow: "0 10px 34px rgba(40,50,80,.14)" }}>
            {TABS.map((t) => {
              const on = tabOf === t.id;
              return (
                <button key={t.id} type="button" aria-label={t.label} onClick={() => setScreen(t.id)} className="relative flex h-[46px] w-[46px] items-center justify-center rounded-full transition active:scale-90" style={{ background: on ? INK : "transparent" }}>
                  <Icon n={t.icon} c={on ? "#fff" : INK} />
                  {t.id === "setuju" && pending > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#E0524A] px-1 text-[10px] font-semibold text-white">{pending}</span>}
                </button>
              );
            })}
          </nav>

          {toast && <div className="absolute inset-x-5 top-12 z-[60] rounded-2xl px-4 py-3 text-[13px] font-medium text-white shadow-lg" style={{ background: toast.ok ? INK : "#A8322B", animation: "rise .25s" }} role="status">{toast.m}</div>}

          <div className="pointer-events-none absolute inset-0 z-[70] flex flex-col items-center justify-center transition-opacity duration-500" style={{ background: "#EFF1F6", opacity: splash ? 1 : 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/katalis-logo-dark.png" alt="Katalis Lintas Global" style={{ width: 220, height: "auto" }} />
            <div className="mt-4 text-[20px] font-semibold" style={{ color: INK }}>Katalis ERP</div>
            <div className="text-[12px]" style={{ color: MUTED }}>dari Dar Dev</div>
          </div>
        </div>

        {!embedded && (
          <div className="hidden items-center gap-3 rounded-full px-3 py-2 md:flex" style={{ background: "rgba(255,255,255,.7)", boxShadow: "0 4px 16px rgba(30,35,60,.1)" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-semibold text-white" style={{ background: INK }}>{role[0]}</span>
            <span className="pr-3 text-[15px] font-semibold" style={{ color: INK }}>{role} · Demo ponsel</span>
          </div>
        )}
      </div>
    </DemoCtx.Provider>
  );
}

void Stat;
