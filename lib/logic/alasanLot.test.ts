import { describe, expect, it } from "vitest";
import { alasanBelumSiap } from "./pembelian";

const lot = (x: Record<string, unknown>) => ({
  kg: 100, qc: "lulus" as const, grade_id: null, grades: null, lot_grades: [{ grade_id: "g", kg: 100, grades: { kode: "AB" } }],
  po_id: null, po_kode: null, purchase_orders: null, ...x,
}) as Parameters<typeof alasanBelumSiap>[0];

describe("alasan lot belum bisa diajukan", () => {
  it("lot yg udah digrading dan belum diajukan: siap", () => {
    expect(alasanBelumSiap(lot({}))).toBeNull();
  });
  it("udah diajukan, PO udah terbit", () => {
    expect(alasanBelumSiap(lot({ po_id: "p", po_kode: "PO-0002", purchase_orders: { kode: "PO-0002", status_persetujuan: "disetujui" } }))).toBe("Udah diajukan, PO-0002");
  });
  it("udah diajukan, belum disetujui", () => {
    expect(alasanBelumSiap(lot({ po_id: "p", purchase_orders: { kode: null, status_persetujuan: "diajukan" } }))).toBe("Udah diajukan, nunggu persetujuan");
  });
  it("belum digrading, ditahan, grade kosong", () => {
    expect(alasanBelumSiap(lot({ qc: "menunggu" }))).toBe("Belum digrading");
    expect(alasanBelumSiap(lot({ qc: "ditahan" }))).toBe("Ditahan (gugur atau bau)");
    expect(alasanBelumSiap(lot({ lot_grades: [] }))).toBe("Grade-nya belum diisi");
  });
});