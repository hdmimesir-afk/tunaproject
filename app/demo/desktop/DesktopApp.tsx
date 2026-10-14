"use client";

import { useEffect, useMemo, useState } from "react";
import { ROLES, resetDemo, useDemoState, type Role } from "@/lib/demo/store";
import { DemoCtx, GREEN, INK, Icon, MUTED } from "@/components/demo/ui";
import { MODULES, VIEWS } from "@/components/demo/modules";

/** Desktop demo. Same store as the mobile demo: approve here and it shows up on the phone, and vice versa. */
export default function DesktopApp() {
  const s = useDemoState();
  const [page, setPage] = useState("dashboard");
  const [role, setRoleState] = useState<Role>("Owner");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ m: string; ok: boolean } | null>(null);

  useEffect(() => { try { const r = localStorage.getItem("katalis-role-d") as Role | null; if (r && ROLES.includes(r)) setRoleState(r); } catch { /* ignore */ } }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2800); return () => clearTimeout(t); }, [toast]);

  const setRole = (r: Role) => { setRoleState(r); try { localStorage.setItem("katalis-role-d", r); } catch { /* ignore */ } setToast({ m: `Masuk sebagai ${r}`, ok: true }); };
  const ctx = useMemo(() => ({ compact: false, role, setRole, notify: (m: string, ok = true) => setToast({ m, ok }), go: (m: string) => setPage(m) }), [role]);

  const pending = s.approvals.filter((a) => a.status === "pending").length;
  const View = VIEWS[page];
  const nav = [...MODULES.slice(0, 1), { id: "setuju", label: "Persetujuan", icon: "check" as const, hint: "" }, ...MODULES.slice(1)];

  const search = (v: string) => {
    setQ(v);
    const m = nav.find((n) => n.label.toLowerCase().includes(v.toLowerCase().trim()));
    if (v.trim() && m) setPage(m.id);
  };

  return (
    <DemoCtx.Provider value={ctx}>
      <style>{`
        @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}
      `}</style>
      <div className="relative flex h-dvh min-h-[640px] w-full overflow-hidden" style={{ background: "#111214" }}>
        {/* sidebar */}
        <aside className="flex w-[232px] shrink-0 flex-col px-3 pb-4 pt-5 text-white">
          <div className="mb-5 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/katalis-logo-white.png" alt="Katalis Lintas Global" style={{ width: 190, height: "auto" }} />
            <div className="mt-1 px-1 text-[11.5px] text-[#8A9199]">Katalis ERP · dari Dar Dev</div>
          </div>
          <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto">
            {nav.map((n) => {
              const on = page === n.id;
              return (
                <button key={n.id} type="button" onClick={() => setPage(n.id)} className="flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-left text-[14px] transition" style={{ background: on ? "#EEF0F5" : "transparent", color: on ? INK : "#C6CCD3", fontWeight: on ? 600 : 400 }}>
                  <Icon n={n.icon} s={20} c={on ? INK : "#9AA2AB"} />
                  <span className="flex-1">{n.label}</span>
                  {n.id === "setuju" && pending > 0 && <span className="rounded-full bg-[#E0524A] px-1.5 py-0.5 text-[11px] font-semibold text-white">{pending}</span>}
                </button>
              );
            })}
          </nav>
          <div className="mt-3 rounded-2xl p-3 text-[12px] text-[#8A9199]" style={{ background: "#1B1D21" }}>
            Mode demo. Data contoh kecuali yang berlabel Siklus 1.
            <button type="button" onClick={() => { resetDemo(); setPage("dashboard"); setToast({ m: "Demo diulang dari awal", ok: true }); }} className="mt-2 block w-full rounded-full bg-white py-2 text-[12.5px] font-medium text-[#111214] transition active:scale-95">Ulangi demo</button>
          </div>
        </aside>

        {/* main */}
        <main className="flex min-w-0 flex-1 flex-col rounded-l-[32px]" style={{ background: "linear-gradient(180deg,#EFF1F6 0%,#E9EDF5 60%,#DFE6F2 100%)" }}>
          <header className="flex items-center justify-between gap-4 px-8 pb-2 pt-5">
            <label className="flex w-[360px] items-center gap-2.5 rounded-full bg-white px-4 py-2.5 shadow-sm">
              <Icon n="search" s={18} c={MUTED} />
              <input value={q} onChange={(e) => search(e.target.value)} placeholder="Cari modul, mis. Pembelian" className="w-full bg-transparent text-[14px] outline-none" aria-label="Cari modul" />
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-sm">
                <span className="text-[12.5px]" style={{ color: MUTED }}>Masuk sebagai</span>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-full bg-[#F4F5F9] px-3 py-1.5 text-[13px] font-medium outline-none" aria-label="Peran">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
              </div>
              <button type="button" aria-label="Persetujuan" onClick={() => setPage("setuju")} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition active:scale-90">
                <Icon n="check" s={20} />
                {pending > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#E0524A] px-1 text-[10px] font-semibold text-white">{pending}</span>}
              </button>
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold text-white" style={{ background: INK }}>{role[0]}</span>
            </div>
          </header>
          <div key={page} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pb-10 pt-4" style={{ animation: "fadeIn .25s ease" }}>
            <div className="mx-auto max-w-[1180px]">{View && <View />}</div>
          </div>
        </main>

        {toast && <div className="absolute right-8 top-20 z-[60] max-w-[420px] rounded-2xl px-5 py-3.5 text-[14px] font-medium text-white shadow-xl" style={{ background: toast.ok ? INK : "#A8322B", animation: "rise .25s" }} role="status">{toast.m}</div>}
      </div>
    </DemoCtx.Provider>
  );
}
