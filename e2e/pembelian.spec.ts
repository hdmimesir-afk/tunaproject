import { expect, test } from "@playwright/test";
import { ADMIN, PETUGAS, masuk as masukAs } from "./akun";

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

test("pembelian diajukan dari lot yang udah digrading, harga per grade, konfirmasi kedua, PO belum terbit", async ({ page }) => {
  await masuk(page);
  await page.goto("/mutu");

  await page.getByRole("button", { name: /^Ajukan pembelian/ }).click();
  const jendela = page.getByRole("dialog", { name: "Ajukan pembelian" });
  await jendela.getByLabel("Pemasok atau nelayan").selectOption({ label: "Pemasok E2E" });

  // Tanpa harga dan tanpa tanda "Nota menyusul", tombol ajukan mati.
  await expect(jendela.getByRole("button", { name: "Ajukan untuk disetujui" })).toBeDisabled();
  await jendela.getByLabel("Harga per kg AB").fill("45000");
  await expect(jendela.getByTestId("total-ajukan")).not.toHaveText("Rp0");
  await expect(jendela.getByRole("button", { name: "Ajukan untuk disetujui" })).toBeDisabled();
  await jendela.getByText("Nota menyusul.", { exact: false }).click();

  // Klik pertama cuma buka konfirmasi; Batal balik ke tombol awal.
  await jendela.getByRole("button", { name: "Ajukan untuk disetujui" }).click();
  const konfirmasi = jendela.getByRole("alertdialog");
  await expect(konfirmasi).toBeVisible();
  await konfirmasi.getByRole("button", { name: "Batal, kembali" }).click();
  await expect(konfirmasi).toBeHidden();

  // Klik kedua yang menjalankan.
  await jendela.getByRole("button", { name: "Ajukan untuk disetujui" }).click();
  await jendela.getByRole("button", { name: "Ya, ajukan sekarang" }).click();
  await expect(jendela).toBeHidden();

  // Di Pembelian: kodenya belum terbit sampai disetujui.
  await page.goto("/pembelian");
  await expect(page.getByText("Belum terbit").first()).toBeVisible();
  await expect(page.getByText("Diajukan", { exact: true }).first()).toBeVisible();
});

test("petugas nerima ikan tanpa PO", async ({ page }) => {
  await masukAs(page, PETUGAS);
  await page.goto("/mutu");
  // Per ekor (bawaan): petugas nggak punya izin grading, jadi grade-nya nanti diisi QC.
  await page.getByLabel("Pemasok atau nelayan").selectOption({ label: "Pemasok E2E" });
  await page.getByLabel("No. tag ekor 1").fill("E2E-01");
  await page.getByLabel("Berat ekor 1 (kg)").fill("42");
  await page.getByLabel("Berat ekor 1 (kg)").press("Enter");
  await expect(page.getByLabel("No. tag ekor 2")).toHaveValue("E2E-02");
  await page.getByLabel("Berat ekor 2 (kg)").fill("38");
  await page.getByLabel("Tusukan gancu ekor 2").getByRole("button", { name: "Tambah gancu" }).click();
  await expect(page.getByTestId("ringkasan-ekor")).toContainText("2 ekor · 80 kg");
  await expect(page.getByTestId("ringkasan-ekor")).toContainText("79 kg dibayar");
  await page.getByRole("button", { name: "Catat penerimaan" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ikan udah diterima" })).toBeVisible();

  // Berat total, cara lama, tetap bisa.
  await page.getByLabel("Pemasok atau nelayan").selectOption({ label: "Pemasok E2E" });
  await page.getByRole("radio", { name: "Berat total" }).click();
  await page.getByLabel("Berat timbang (kg)").fill("150");
  await page.getByRole("button", { name: "Catat penerimaan" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ikan udah diterima" })).toBeVisible();
});

test("unggah berkas yang bukan foto atau PDF ditolak", async ({ page }) => {
  await masuk(page);
  await page.goto("/pembelian");
  await page.getByRole("button", { name: "Buka" }).first().click();
  await page.getByLabel("Lampirkan nota").setInputFiles({ name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("halo") });
  await expect(page.getByRole("alert").filter({ hasText: "Pilih foto" })).toBeVisible();
});
