import { expect, test } from "@playwright/test";
import { ADMIN, masuk } from "./akun";

/* Akun baru tanpa email: Super Admin membuat akun, tautan aktivasi muncul (dikirim lewat WhatsApp di dunia nyata),
   penerima membuka tautan di perangkatnya, membuat kata sandi, lalu bisa masuk dengan kata sandi itu. */

test("Super Admin membuat akun untuk peran yang kosong, penerima mengaktifkan lewat tautan lalu masuk", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const email = `e2e-baru-${Date.now()}@katalis.test`;
  const sandi = "Sandi-Baru-E2E-2026";

  await masuk(page, ADMIN);
  await page.goto("/akses");
  // Form "Buat akun" saja; daftar pengguna di bawahnya juga punya pilihan peran per baris.
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Buat akun" }) });
  await form.locator('input[name="nama"]').fill("QC Baru E2E");
  await form.locator('input[name="email"]').fill(email);
  // Satu akun aktif per peran: Petugas Lapangan sudah dipakai akun uji, jadi tidak ditawarkan.
  await expect(form.locator('select[name="roleId"] option', { hasText: "Petugas Lapangan" })).toHaveCount(0);
  await form.locator('select[name="roleId"]').selectOption({ label: "Kepala Produksi / QC" });
  await form.getByRole("button", { name: "Buat akun" }).click();
  const kolom = page.getByTestId("tautan-aktivasi").first();
  await expect(kolom).toHaveValue(/\/auth\/confirm\?token_hash=.+&type=invite$/, { timeout: 30_000 });
  const tautan = await kolom.inputValue();
  await expect(page.getByRole("link", { name: "Kirim lewat WhatsApp" }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\//);

  // Penerima membuka tautan di perangkat lain (tanpa sesi admin).
  const hp = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const p2 = await hp.newPage();
  try {
    await p2.goto(tautan);
    await expect(p2).toHaveURL(/\/login\/sandi-baru\?token_hash=.+&type=invite$/);

    // Membuka tautan tidak memakai token (pratinjau WhatsApp juga membukanya): dibuka ulang, form tetap tampil.
    await p2.reload();
    await p2.getByLabel("Kata sandi baru").fill(sandi);
    await p2.getByLabel("Ulangi kata sandi").fill(sandi);
    await p2.getByRole("button", { name: "Simpan dan masuk" }).click();
    await expect(p2).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    // Tautan sekali pakai: setelah dipakai, penyimpanan berikutnya ditolak dengan pesan jelas.
    await p2.context().clearCookies();
    await p2.goto(tautan);
    await p2.getByLabel("Kata sandi baru").fill(sandi);
    await p2.getByLabel("Ulangi kata sandi").fill(sandi);
    await p2.getByRole("button", { name: "Simpan dan masuk" }).click();
    await expect(p2.getByText(/Tautan sudah tidak berlaku/)).toBeVisible();

    // Masuk dengan kata sandi yang dibuat sendiri.
    await masuk(p2, { email, sandi });
    await expect(p2).toHaveURL(/\/dashboard/);
  } finally {
    await hp.close();
  }
});
