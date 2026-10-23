import { expect, test } from "@playwright/test";
import { ADMIN, masuk } from "./akun";

/* Akun baru tanpa email: Super Admin membuat akun, tautan aktivasi muncul (dikirim lewat WhatsApp di dunia nyata),
   penerima membuka tautan di perangkatnya, membuat kata sandi, lalu bisa masuk dengan kata sandi itu. */

test("Super Admin membuat akun petugas, petugas mengaktifkan lewat tautan lalu masuk", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const email = `e2e-baru-${Date.now()}@katalis.test`;
  const sandi = "Sandi-Baru-E2E-2026";

  await masuk(page, ADMIN);
  await page.goto("/akses");
  await page.getByLabel("Nama", { exact: true }).fill("Petugas Baru E2E");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Peran", { exact: true }).selectOption({ label: "Petugas Lapangan" });
  await page.getByRole("button", { name: "Buat akun" }).click();
  const kolom = page.getByTestId("tautan-aktivasi").first();
  await expect(kolom).toHaveValue(/\/auth\/confirm\?token_hash=.+&type=invite$/, { timeout: 30_000 });
  const tautan = await kolom.inputValue();
  await expect(page.getByRole("link", { name: "Kirim lewat WhatsApp" }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\//);

  // Penerima membuka tautan di perangkat lain (tanpa sesi admin).
  const hp = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const p2 = await hp.newPage();
  try {
    await p2.goto(tautan);
    await expect(p2).toHaveURL(/\/login\/sandi-baru$/);
    await expect(p2.getByText(email)).toBeVisible();
    await p2.getByLabel("Kata sandi baru").fill(sandi);
    await p2.getByLabel("Ulangi kata sandi").fill(sandi);
    await p2.getByRole("button", { name: "Simpan dan masuk" }).click();
    await expect(p2).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    // Tautan sekali pakai: dibuka lagi ditolak dengan pesan jelas.
    await p2.context().clearCookies();
    await p2.goto(tautan);
    await expect(p2).toHaveURL(/\/login\?status=tautan/);
    await expect(p2.getByText(/Tautan sudah tidak berlaku/)).toBeVisible();

    // Masuk dengan kata sandi yang dibuat sendiri.
    await masuk(p2, { email, sandi });
    await expect(p2).toHaveURL(/\/dashboard/);
  } finally {
    await hp.close();
  }
});
