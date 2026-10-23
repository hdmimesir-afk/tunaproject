import { expect, test, type Page } from "@playwright/test";
import { ADMIN, masuk } from "./akun";

/* Tata letak di layar HP (Pixel 7, 412 px): tidak ada geser samping di halaman, navigasi bawah bisa dijangkau,
   lembar Menu memuat Keluar, dan jendela isian muat di layar. */

const HALAMAN = ["dashboard", "pembelian", "mutu", "produksi", "stok", "gudang", "penjualan", "keuangan", "laporan", "siklus", "asisten", "akses", "pengaturan", "persetujuan"];

async function geserSamping(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test.describe("tampilan HP", () => {
  test("semua halaman muat selebar layar, tanpa geser samping", async ({ page }) => {
    test.setTimeout(180_000);
    await masuk(page, ADMIN);
    const lewat: string[] = [];
    for (const slug of HALAMAN) {
      await page.goto(`/${slug}`);
      await page.waitForLoadState("networkidle");
      if (page.url().includes("/login")) continue; // peran ini tidak punya izin halaman itu
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const lebih = await geserSamping(page);
      if (lebih > 1) lewat.push(`${slug} (+${lebih}px)`);
    }
    expect(lewat, `Halaman yang melebihi lebar layar: ${lewat.join(", ")}`).toEqual([]);
  });

  test("tab bawah dan lembar Menu: pindah halaman dan keluar dari HP", async ({ page }) => {
    await masuk(page, ADMIN);
    await page.goto("/dashboard");
    const bawah = page.locator("nav.fixed");
    await expect(bawah).toBeVisible();

    // Sasaran sentuh cukup besar.
    const kotak = await bawah.getByRole("link").first().boundingBox();
    expect(kotak?.height ?? 0).toBeGreaterThanOrEqual(44);

    await bawah.getByRole("button", { name: "Menu" }).click();
    const lembar = page.getByRole("dialog", { name: "Menu" });
    await expect(lembar).toBeVisible();
    await lembar.getByRole("link", { name: "Gudang Dingin" }).click();
    await expect(page).toHaveURL(/\/gudang/);
    await expect(lembar).toBeHidden();

    await bawah.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("jendela isian (Buat PO) muat di layar dan bisa ditutup", async ({ page }) => {
    await masuk(page, ADMIN);
    await page.goto("/pembelian");
    await page.getByRole("button", { name: "Buat PO" }).click();
    const jendela = page.getByRole("dialog");
    await expect(jendela).toBeVisible();
    const kotak = await jendela.boundingBox();
    const lebarLayar = page.viewportSize()?.width ?? 0;
    expect(kotak?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((kotak?.x ?? 0) + (kotak?.width ?? 0)).toBeLessThanOrEqual(lebarLayar + 1);
    expect(await geserSamping(page)).toBeLessThanOrEqual(1);
    await jendela.getByRole("button", { name: "Tutup" }).click();
    await expect(jendela).toBeHidden();
  });

  test("halaman masuk muat di HP", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
    expect(await geserSamping(page)).toBeLessThanOrEqual(1);
  });
});
