import { describe, expect, it } from "vitest";
import { isKelompok, jatuhTempo, KELOMPOK_BIAYA, labelKelompok, totalPos, type PosRingkas } from "./biayaTetap";

const pos = (x: Partial<PosRingkas>): PosRingkas => ({ kelompok: "kantor", cara_bayar: "bulanan", bulan_bayar: null, jumlah: 0, aktif: true, ...x });

describe("pos biaya tetap", () => {
  it("lima kelompok sesuai format tim finance", () => {
    expect(KELOMPOK_BIAYA.map((k) => k.label)).toEqual(["Tenaga kerja", "Overhead pabrik", "Sertifikasi dan izin", "Kantor", "Keuangan"]);
    expect(isKelompok("tenaga_kerja")).toBe(true);
    expect(isKelompok("marketing")).toBe(false);
    expect(labelKelompok("sertifikasi_izin")).toBe("Sertifikasi dan izin");
  });
  it("bulanan jatuh tempo tiap bulan, tahunan cuma di bulan bayarnya, nonaktif nggak pernah", () => {
    expect(jatuhTempo(pos({}), 7)).toBe(true);
    expect(jatuhTempo(pos({ cara_bayar: "tahunan", bulan_bayar: 3 }), 3)).toBe(true);
    expect(jatuhTempo(pos({ cara_bayar: "tahunan", bulan_bayar: 3 }), 4)).toBe(false);
    expect(jatuhTempo(pos({ aktif: false }), 7)).toBe(false);
  });
  it("total per bulan dan per tahun", () => {
    const t = totalPos([
      pos({ jumlah: 30_000_000 }), pos({ jumlah: 0.1 }), pos({ jumlah: 0.2 }),
      pos({ cara_bayar: "tahunan", bulan_bayar: 3, jumlah: 12_000_000 }),
      pos({ jumlah: 999, aktif: false }),
    ]);
    expect(t.perBulan).toBe(30_000_000.3);
    expect(t.perTahun).toBe(30_000_000.3 * 12 + 12_000_000);
  });
});
