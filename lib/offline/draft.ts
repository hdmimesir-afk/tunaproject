import Dexie, { type EntityTable } from "dexie";
import type { BarisLoin } from "@/lib/logic/grid";

/* Draf grid loin di perangkat (IndexedDB). Isian tersimpan setiap berubah, jadi sinyal putus atau tab tertutup
   tidak menghilangkan 300+ baris. Baru dihapus dari perangkat setelah server mengonfirmasi simpan. Hanya dipakai di browser. */

export type DrafLoin = { produksiId: string; baris: BarisLoin[]; diubah: number };

type DbDraf = Dexie & { drafLoin: EntityTable<DrafLoin, "produksiId"> };

let db: DbDraf | null = null;
function buka(): DbDraf | null {
  if (typeof indexedDB === "undefined") return null;
  if (!db) {
    db = new Dexie("katalis-draf") as DbDraf;
    db.version(1).stores({ drafLoin: "produksiId" });
  }
  return db;
}

/** Semua fungsi menelan galat (mode privat, penyimpanan penuh): draf hanya pengaman tambahan, bukan syarat. */
export async function bacaDraf(produksiId: string): Promise<DrafLoin | null> {
  try {
    return (await buka()?.drafLoin.get(produksiId)) ?? null;
  } catch {
    return null;
  }
}

export async function simpanDraf(produksiId: string, baris: BarisLoin[]): Promise<boolean> {
  try {
    const d = buka();
    if (!d) return false;
    await d.drafLoin.put({ produksiId, baris, diubah: Date.now() });
    return true;
  } catch {
    return false;
  }
}

export async function hapusDraf(produksiId: string): Promise<void> {
  try {
    await buka()?.drafLoin.delete(produksiId);
  } catch {
    /* abaikan */
  }
}
