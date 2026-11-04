import { expect, test } from "@playwright/test";

/* Halaman panduan /tutorial terbuka tanpa masuk, gambarnya termuat, dan saringan jabatan bekerja. */

test("panduan terbuka tanpa login dan gambarnya termuat", async ({ page }) => {
  await page.goto("/tutorial");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Panduan memakai KATALIS ERP");
  await expect(page.getByRole("heading", { name: "Pembelian", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contoh satu putaran kerja" })).toBeVisible();
  const respon = await page.request.get("/tutorial/02-pembelian.webp");
  expect(respon.ok()).toBe(true);
});

test("saringan jabatan menyembunyikan menu yang tidak dilihat Petugas Lapangan", async ({ page }) => {
  await page.goto("/tutorial");
  await page.getByRole("button", { name: "Petugas Lapangan" }).click();
  await expect(page.getByRole("heading", { name: "Produksi", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Keuangan", level: 2 })).toHaveCount(0);
});

test("panduan di lebar HP tidak meluber ke samping", async ({ browser }) => {
  const konteks = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const page = await konteks.newPage();
  try {
    await page.goto("/tutorial");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  } finally {
    await konteks.close();
  }
});
