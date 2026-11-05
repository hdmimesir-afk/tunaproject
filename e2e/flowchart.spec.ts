import { expect, test } from "@playwright/test";

/* Laporan penyesuaian flowchart terbuka tanpa masuk dan tidak meluber di lebar HP. */

test("laporan flowchart terbuka tanpa login", async ({ page }) => {
  await page.goto("/flowchart");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Apa yang perlu disesuaikan di sistem");
  await expect(page.getByRole("heading", { name: "Empat hal yang perlu diputuskan tim Katalis" })).toBeVisible();
});

test("laporan flowchart di lebar HP tidak meluber ke samping", async ({ browser }) => {
  const konteks = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const page = await konteks.newPage();
  try {
    await page.goto("/flowchart");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  } finally {
    await konteks.close();
  }
});
