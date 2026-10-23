/* Waktu lokal Indonesia (WIB, UTC+7) untuk isian datetime-local. Server dan database menyimpan UTC. */

const WIB_MS = 7 * 3600 * 1000;

/** "2026-03-01T08:30" (WIB) menjadi ISO UTC. null bila bukan tanggal-jam yang sah. */
export function dariInputWib(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO UTC menjadi nilai datetime-local dalam WIB. */
export function keInputWib(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Date(d.getTime() + WIB_MS).toISOString().slice(0, 16);
}

export const sekarangInputWib = () => keInputWib(new Date());

const fmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", hourCycle: "h23" });
export const jamWib = (iso: string | Date) => fmt.format(typeof iso === "string" ? new Date(iso) : iso);
