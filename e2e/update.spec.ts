import { expect, test } from "@playwright/test";

/* Halaman laporan progres /update bisa dibuka tanpa masuk, dan layar contohnya (komponen asli dengan data contoh) termuat. */

test("laporan progres terbuka tanpa login dan memuat bingkai perangkat", async ({ page }) => {
  await page.goto("/update");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Sistem selesai dibangun/);
  await expect(page.getByRole("heading", { name: "Apa yang bisa dilakukan di tiap menu" })).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(8);
  await expect(page.getByRole("cell", { name: "Ya" }).first()).toBeVisible();
});

test("layar contoh dashboard menampilkan daftar perlu tindakan tanpa tombol yang bisa diketuk", async ({ page }) => {
  await page.goto("/update/layar/dashboard");
  await expect(page.getByText("Perlu tindakan Anda")).toBeAttached();
  await expect(page.locator("[inert]")).toHaveCount(1);
});

test("layar contoh dashboard di lebar HP tidak meluber ke samping", async ({ browser }) => {
  const konteks = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const page = await konteks.newPage();
  try {
    await page.goto("/update/layar/dashboard");
    await expect(page.getByText("Perlu tindakan Anda")).toBeAttached();
    const luber = await page.evaluate(() => {
      const lebar = document.documentElement.clientWidth;
      return [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > lebar + 1).length;
    });
    expect(luber).toBe(0);
  } finally {
    await konteks.close();
  }
});

