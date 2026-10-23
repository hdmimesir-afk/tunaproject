import { expect, test } from "@playwright/test";
import { ADMIN, masuk } from "./akun";

test("Asisten: pertanyaan cepat menampilkan data dari sistem, pertanyaan bebas mati tanpa kunci model", async ({ page }) => {
  await masuk(page, ADMIN);
  await page.goto("/asisten");
  await expect(page.getByRole("heading", { name: "Asisten AI", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Saldo kas" }).click();
  await expect(page.getByText(/Saldo kas tercatat/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Buku kas" })).toBeVisible();

  // CI tidak punya OPENROUTER_API_KEY: pertanyaan bebas dimatikan, bukan gagal diam-diam.
  await expect(page.getByLabel("Pertanyaan untuk Asisten")).toBeDisabled();
});

test("laporan: tab Simulasi terbuka dengan penjelasan asumsi", async ({ page }) => {
  await masuk(page, ADMIN);
  await page.goto("/laporan");
  await page.getByRole("tab", { name: "Simulasi harga" }).click();
  await expect(page.getByRole("tab", { name: "Simulasi harga" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/Simulasi butuh siklus|Asumsi: berat ikan masuk tetap/)).toBeVisible();
});
