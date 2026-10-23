import { expect, test } from "@playwright/test";
import { ADMIN, masuk } from "./akun";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

test("biaya: draf, nota wajib, lalu diajukan dengan konfirmasi kedua", async ({ page }) => {
  await masuk(page, ADMIN);
  await page.goto("/keuangan");

  await page.getByRole("button", { name: "Catat biaya" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Kategori").selectOption({ label: "Pengemasan dan pengiriman" });
  await form.getByLabel("Uraian").fill("Ongkos kargo uji e2e");
  await form.getByLabel("Jumlah (Rp)").fill("250000");
  await form.getByRole("button", { name: "Simpan draf biaya" }).click();

  // Tanpa nota, tombol ajukan mati.
  const detail = page.getByRole("dialog");
  await expect(detail.getByText("Lampirkan nota dulu")).toBeVisible();
  await expect(detail.getByRole("button", { name: "Ajukan ke Owner" })).toBeDisabled();

  await detail.getByLabel("Lampirkan nota").setInputFiles({ name: "nota-biaya.png", mimeType: "image/png", buffer: PNG });
  await expect(detail.getByText("Nota · nota-biaya.png")).toBeVisible();

  await detail.getByRole("button", { name: "Ajukan ke Owner" }).click();
  await expect(detail.getByRole("alertdialog")).toBeVisible();
  await detail.getByRole("button", { name: "Ya, ajukan biaya" }).click();
  await expect(detail.getByText("Menunggu Owner", { exact: true })).toBeVisible();
});

test("halaman laporan, siklus, dan dashboard terbuka tanpa galat", async ({ page }) => {
  await masuk(page, ADMIN);
  for (const [url, judul] of [["/laporan", "Laporan"], ["/siklus", "Rincian Siklus"], ["/dashboard", "Dashboard"]] as const) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: judul, level: 1 })).toBeVisible();
    await expect(page.getByText(/Terjadi gangguan|Gagal memuat/)).toHaveCount(0);
  }
});

test("Keuangan menampilkan kartu tutup buku per bulan (tanpa tombol tutup untuk non-Owner)", async ({ page }) => {
  await masuk(page, ADMIN);
  await page.goto("/keuangan");
  await expect(page.getByText("Tutup buku per bulan")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tutup buku" })).toHaveCount(0);
});