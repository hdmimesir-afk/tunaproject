import { expect, test } from "@playwright/test";
import { ADMIN, masuk, PETUGAS } from "./akun";

/* Absensi dengan GPS dan kamera palsu dari Chromium (tanpa peta pihak ketiga): Super Admin menandai lokasi kerja dari posisi
   perangkatnya, petugas absen di titik itu, lalu mencoba absen pulang dari tempat yang jauh. */

const TITIK = { latitude: -0.9492, longitude: 100.3543, accuracy: 10 };
const JAUH = { latitude: -0.9482, longitude: 100.3543, accuracy: 10 }; // sekitar 111 m, di luar radius 50 m

test.use({
  permissions: ["geolocation", "camera"],
  geolocation: TITIK,
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
});

test.describe.serial("absensi", () => {
  test("Super Admin menandai lokasi kerja dari posisi perangkat dan melihat rekap", async ({ page }) => {
    await masuk(page, ADMIN);
    await page.goto("/absensi");
    await expect(page.getByText("Rekap kehadiran")).toBeVisible();
    await page.getByRole("button", { name: "Tambah" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nama lokasi").fill("Lokasi E2E");
    await dialog.getByRole("button", { name: "Pakai lokasi saya sekarang" }).click();
    await expect(dialog.getByTestId("info-lokasi")).toContainText("Lokasi terisi");
    await expect(dialog.getByLabel("Garis lintang")).toHaveValue("-0.949200");
    await dialog.getByRole("button", { name: "Simpan lokasi" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("cell", { name: "Lokasi E2E" }).first()).toBeVisible();
  });

  test("petugas absen masuk dengan foto kamera, ditolak di luar radius, lalu absen pulang", async ({ page, context }) => {
    test.setTimeout(120_000);
    await masuk(page, PETUGAS);
    await page.goto("/absensi");

    await page.getByRole("button", { name: "Absen masuk" }).click();
    await expect(page.getByTestId("status-gps")).toContainText("Lokasi didapat");
    await page.getByRole("button", { name: "Ambil foto dan absen masuk" }).click();
    await expect(page.getByText(/Absen masuk tercatat pukul/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Selesai" }).click();
    await expect(page.getByTestId("jam-masuk")).not.toHaveText("-");
    await expect(page.getByRole("button", { name: "Absen masuk" })).toBeDisabled();

    // Dari tempat yang jauh: ditolak dengan alasan jelas dan percobaannya tersimpan di riwayat.
    await context.setGeolocation(JAUH);
    await page.getByRole("button", { name: "Absen pulang" }).click();
    await expect(page.getByTestId("status-gps")).toContainText("Lokasi didapat");
    await page.getByRole("button", { name: "Ambil foto dan absen pulang" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /di luar radius/ })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Tutup" }).click();
    await expect(page.getByTestId("jam-pulang")).toHaveText("-");

    // Kembali ke titik kerja: berhasil.
    await context.setGeolocation(TITIK);
    await page.getByRole("button", { name: "Absen pulang" }).click();
    await expect(page.getByTestId("status-gps")).toContainText("Lokasi didapat");
    await page.getByRole("button", { name: "Ambil foto dan absen pulang" }).click();
    await expect(page.getByText(/Absen pulang tercatat pukul/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Selesai" }).click();
    await expect(page.getByTestId("jam-pulang")).not.toHaveText("-");
  });

  test("petugas mengajukan izin dan membatalkannya", async ({ page }) => {
    await masuk(page, PETUGAS);
    await page.goto("/absensi");
    await page.getByRole("button", { name: "Ajukan" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Alasan").fill("Urusan keluarga E2E");
    await dialog.getByRole("button", { name: "Kirim pengajuan" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Urusan keluarga E2E").first()).toBeVisible();
    await page.getByRole("button", { name: "Batalkan" }).first().click();
    await expect(page.getByText("Dibatalkan").first()).toBeVisible();
  });
});
