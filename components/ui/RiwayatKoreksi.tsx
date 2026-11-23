import { INK, MUTED } from "@/components/ui/tokens";
import { waktu } from "@/lib/format";
import type { Koreksi } from "@/lib/data/koreksi";

/* Riwayat koreksi satu catatan: alasan, siapa, kapan, dan apa yang berubah. Dipakai di lot, pembelian, dan produksi. */

const LABEL: Record<string, string> = {
  kg: "Berat", tanggal: "Tanggal", supplier_id: "Pemasok", cycle_id: "Proyek", catatan: "Catatan", harga: "Harga per kg",
  total: "Total", batal: "Dibatalkan", jumlah: "Jumlah", kg_masuk_pt: "Berat ikan dari PT", status: "Status", lot: "Lot",
  qc: "Status mutu", grade: "Grading", nama: "Nama proyek", lini_bisnis: "Lini bisnis", pt_id: "PT",
  kategori: "Kategori", uraian: "Uraian", po_id: "PO", production_id: "Produksi",
  baris: "Isi pesanan", pemilik: "Pemilik", produk: "Produk", kondisi: "Kondisi", kg_kirim: "kirim", kg_diterima: "diterima", unit: "",
};

function teks(v: unknown, nama: Record<string, string>): string {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "ya" : "nggak";
  if (typeof v === "number") return v.toLocaleString("id-ID");
  if (typeof v === "string") return nama[v] ?? (/^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v);
  // Daftar (misalnya isi pesanan): tiap baris dipisah titik koma.
  if (Array.isArray(v)) return v.map((x) => teks(x, nama)).join("; ") || "-";
  if (typeof v === "object") return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${LABEL[k] ?? k} ${teks(x, nama)}`.trim()).join(", ") || "-";
  return String(v);
}

/** Baris yang berubah saja. `nama` memetakan id (pemasok, proyek, PT) ke nama yang dibaca orang. */
export function perubahan(k: Pick<Koreksi, "sebelum" | "sesudah">, nama: Record<string, string> = {}) {
  const kunci = [...new Set([...Object.keys(k.sebelum ?? {}), ...Object.keys(k.sesudah ?? {})])];
  return kunci
    .filter((x) => JSON.stringify(k.sebelum?.[x]) !== JSON.stringify(k.sesudah?.[x]))
    .map((x) => ({ label: LABEL[x] ?? x, dari: teks(k.sebelum?.[x], nama), jadi: teks(k.sesudah?.[x], nama) }));
}

export function RiwayatKoreksi({ daftar, pengguna, nama = {} }: { daftar: Koreksi[]; pengguna: Record<string, { nama: string }>; nama?: Record<string, string> }) {
  if (daftar.length === 0) return null;
  return (
    <section>
      <h4 className="mb-2 text-[13px] font-semibold" style={{ color: INK }}>Riwayat koreksi</h4>
      <ul className="space-y-2" data-testid="riwayat-koreksi">
        {daftar.map((k) => (
          <li key={k.id} className="rounded-2xl bg-white px-3.5 py-2.5 text-[12.5px]">
            <div className="flex flex-wrap justify-between gap-x-3" style={{ color: MUTED }}>
              <span>{k.kode && <b className="font-medium" style={{ color: INK }}>{k.kode} · </b>}{(k.oleh && pengguna[k.oleh]?.nama) || "pengguna lain"}</span>
              <span>{waktu(k.pada)}</span>
            </div>
            <p className="mt-1" style={{ color: INK }}>{k.alasan}</p>
            <ul className="mt-1 space-y-0.5" style={{ color: MUTED }}>
              {perubahan(k, nama).map((p) => <li key={p.label}>{p.label}: {p.dari} → <span style={{ color: INK }}>{p.jadi}</span></li>)}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
