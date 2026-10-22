import { expect, test } from "@playwright/test";
import { ADMIN, masuk as masukAs } from "./akun";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const masuk = (page: import("@playwright/test").Page) => masukAs(page, ADMIN);

test("tamu yang membuka Pembelian dialihkan ke halaman masuk", async ({ page }) => {
  await page.goto("/pembelian");
  await expect(page).toHaveURL(/\/login/);
});

test("kata sandi salah ditolak dengan pesan", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Kata sandi").fill("salah-total");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("buat PO, lampirkan nota, lalu ajukan dengan konfirmasi kedua", async ({ page }) => {
  await masuk(page);
  await page.goto("/pembelian");

  await page.getByRole("button", { name: "Buat PO" }).click();
  await page.getByLabel("Pemasok").selectOption({ label: "Pemasok E2E" });
  await page.getByLabel("Berat (kg)").fill("100");
  await page.getByLabel("Harga per kg (Rp)").fill("45000");
  await page.getByRole("button", { name: "Buat PO (draf)" }).click();

  // PO baru terbuka sebagai detail; tanpa nota tombol ajukan mati.
  await expect(page).toHaveURL(/po=/);
  await expect(page.getByText("Lampirkan nota dulu")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajukan untuk diperiksa" })).toBeDisabled();

  await page.getByLabel("Lampirkan nota").setInputFiles({ name: "nota.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Nota · nota.png")).toBeVisible();

  // Klik pertama hanya membuka konfirmasi; belum ada yang diajukan.
  await page.getByRole("button", { name: "Ajukan untuk diperiksa" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Diajukan", { exact: true })).toHaveCount(0);

  // Batal mengembalikan ke tombol awal.
  await dialog.getByRole("button", { name: "Batal, kembali" }).click();
  await expect(dialog).toBeHidden();

  // Klik kedua yang menjalankan.
  await page.getByRole("button", { name: "Ajukan untuk diperiksa" }).click();
  await page.getByRole("button", { name: "Ya, ajukan sekarang" }).click();
  await expect(page.getByText("Diajukan", { exact: true }).first()).toBeVisible();
});

test("unggah berkas yang bukan foto atau PDF ditolak", async ({ page }) => {
  await masuk(page);
  await page.goto("/pembelian");
  await page.getByRole("button", { name: "Buka" }).first().click();
  await page.getByLabel("Lampirkan nota").setInputFiles({ name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("halo") });
  await expect(page.getByRole("alert").filter({ hasText: "Pilih foto" })).toBeVisible();
});
