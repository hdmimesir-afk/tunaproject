import { expect, test } from "@playwright/test";
import { ADMIN, masuk } from "./akun";

test("pesanan dari stok, kirim dengan konfirmasi kedua, lalu invoice terbit", async ({ page }) => {
  await masuk(page, ADMIN);
  await page.goto("/penjualan");

  await page.getByRole("button", { name: "Buat pesanan" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Pembeli").selectOption({ label: "Pelanggan E2E" });
  const stok = form.getByLabel("Stok baris 1");
  const pilihan = await stok.locator("option:not([disabled])").evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value).filter(Boolean));
  expect(pilihan.length).toBeGreaterThan(0);
  await stok.selectOption(pilihan[pilihan.length - 1]);
  await form.getByLabel("Berat baris 1 (kg)").fill("10");
  await form.getByLabel("Harga per kg baris 1").fill("100000");
  await form.getByRole("button", { name: "Simpan pesanan (draf)" }).click();

  // Detail pesanan terbuka; kirim butuh konfirmasi kedua.
  const detail = page.getByRole("dialog");
  await expect(detail.getByText("Draf", { exact: true })).toBeVisible();
  await expect(detail.getByText("Rp1.000.000").first()).toBeVisible();
  await detail.getByRole("button", { name: "Kirim pesanan" }).click();
  await expect(detail.getByRole("alertdialog")).toBeVisible();
  await detail.getByRole("button", { name: "Ya, kirim dan kurangi stok" }).click();
  await expect(detail.getByText("Terkirim", { exact: true })).toBeVisible();

  await detail.getByRole("button", { name: "Terbitkan invoice" }).click();
  await detail.getByRole("button", { name: "Ya, terbitkan invoice" }).click();
  await expect(detail.getByRole("button", { name: /Lihat invoice INV-/ })).toBeVisible();
});
