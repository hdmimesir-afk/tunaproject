import { expect, test } from "@playwright/test";
import { masuk, PETUGAS } from "./akun";

test.describe("gudang dingin", () => {
  test("titipan masuk, diambil dengan konfirmasi kedua, tagihan jasa terbit dengan rincian", async ({ page }) => {
    await masuk(page, PETUGAS);
    await page.goto("/gudang");
    await page.getByRole("button", { name: "Terima titipan" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Pelanggan pemilik titipan").selectOption({ label: "Pelanggan E2E" });
    await dialog.getByLabel("Produk").selectOption({ label: "Loin tuna" });
    await dialog.getByLabel("Berat (kg)").fill("250");
    await dialog.getByLabel("Rak atau posisi").fill("E2E-1");
    await dialog.getByRole("button", { name: "Terima titipan" }).click();
    await expect(page.getByText("250,000 kg").first()).toBeVisible();

    // Ambil titipan sekarang di Gudang Dingin (21 Nov), halaman Stok cuma dashboard.
    await page.getByRole("row", { name: /Pelanggan E2E/ }).first().getByRole("button", { name: "Ambil" }).click();
    const ambil = page.getByRole("dialog");
    await ambil.getByLabel(/Berat keluar/).fill("250");
    await ambil.getByRole("button", { name: "Catat pengambilan" }).click();
    // Klik pertama hanya membuka konfirmasi; stok belum berubah.
    await expect(ambil.getByRole("alertdialog")).toBeVisible();
    await ambil.getByRole("button", { name: "Ya, ambil dari gudang" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/gudang");
    await page.getByRole("button", { name: "Rincian" }).first().click();
    // Nggak ada transit (jawaban tim 19 Nov 2026): langsung diambil pun tetap ditagih minimum 10 hari.
    await expect(page.getByRole("dialog").getByText(/minimum 10 hari/).first()).toBeVisible();
  });

  test("stok cuma dashboard: ikan utuh, lagi diproduksi, hasil siap jual, titipan, tanpa input", async ({ page }) => {
    await masuk(page, PETUGAS);
    await page.goto("/stok");
    for (const judul of ["1. Ikan utuh (bahan baku)", "2. Lagi diproduksi", "3. Hasil produksi siap jual", "4. Titipan pelanggan"]) {
      await expect(page.getByRole("heading", { name: judul })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Hasil produksi masuk" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ambil" })).toHaveCount(0);
    // Tombol produksi dari ikan utuh bawa lotnya ke form Mulai produksi.
    const tombol = page.getByRole("link", { name: "Produksi dari ikan ini" }).first();
    if (await tombol.count()) {
      await expect(tombol).toHaveAttribute("href", /\/produksi\?mulai=1.*lot=/);
    }
  });

  test("barang penunjang pindah ke Gudang Dingin", async ({ page }) => {
    await masuk(page, PETUGAS);
    await page.goto("/gudang?tab=kerja");
    await expect(page.getByRole("tab", { name: /Penunjang kerja/ })).toHaveAttribute("aria-selected", "true");
  });

  test("jadwal yang bentrok ditandai dan bisa dipindah ke jam kosong pertama", async ({ page }) => {
    // Tanggal acak jauh ke depan supaya ulangan tes (dan jalan lokal berulang) tidak bentrok dengan jadwal sisa.
    const hari = String(1 + Math.floor(Math.random() * 27)).padStart(2, "0");
    const bulan = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
    const tahun = 2031 + Math.floor(Math.random() * 5);
    const tgl = `${tahun}-${bulan}-${hari}`;
    await masuk(page, PETUGAS);
    await page.goto("/gudang");

    const tambah = async (mulai: string, selesai: string, label: string) => {
      await page.getByRole("button", { name: "Tambah jadwal" }).click();
      const d = page.getByRole("dialog");
      await d.getByLabel("Mulai (WIB)").fill(`${tgl}T${mulai}`);
      await d.getByLabel("Selesai (WIB)").fill(`${tgl}T${selesai}`);
      await d.getByLabel("Keterangan").fill(label);
      return d;
    };

    const a = await tambah("08:00", "10:00", `ABF A ${hari}`);
    await a.getByRole("button", { name: "Simpan jadwal" }).click();
    await expect(page.getByText(`ABF A ${hari}`).first()).toBeVisible();

    const b = await tambah("09:00", "11:00", `ABF B ${hari}`);
    await expect(b.getByRole("alert").getByText(/Bentrok dengan/)).toBeVisible();
    await expect(b.getByRole("button", { name: "Simpan jadwal" })).toBeDisabled();
    await b.getByRole("button", { name: "Pakai jam kosong pertama" }).click();
    await expect(b.getByLabel("Mulai (WIB)")).toHaveValue(`${tgl}T10:00`);
    await b.getByRole("button", { name: "Simpan jadwal" }).click();
    await expect(page.getByText(`ABF B ${hari}`).first()).toBeVisible();
  });
});
