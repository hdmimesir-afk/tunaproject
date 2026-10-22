import { expect, test, type Page } from "@playwright/test";
import { masuk, PETUGAS } from "./akun";

/* Uji grid loin: 300+ baris lewat keyboard, jaringan putus saat menyimpan, klik ganda simpan.
   Berat tiap baris deterministik supaya total yang benar bisa dihitung di sini dalam gram bulat. */

const JUMLAH = 305;
const kgBaris = (i: number) => `${1 + (i % 5)},${String((i * 37) % 1000).padStart(3, "0")}`;
const gramBaris = (i: number) => (1 + (i % 5)) * 1000 + ((i * 37) % 1000);
const totalGram = (n: number) => Array.from({ length: n }, (_, i) => gramBaris(i)).reduce((a, b) => a + b, 0);
const tampil = (gram: number) => `${(gram / 1000).toLocaleString("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;

async function mulaiProduksi(page: Page) {
  await masuk(page, PETUGAS);
  await page.goto("/produksi");
  await page.getByRole("button", { name: "Mulai produksi" }).click();
  await page.getByRole("checkbox", { name: /^Pakai LOT-/ }).last().check();
  await page.getByRole("button", { name: "Mulai produksi" }).last().click();
  await expect(page).toHaveURL(/p=/);
  await expect(page.getByText("Loin per potong")).toBeVisible();
}

/** Isi baris pertama lalu Enter untuk baris berikutnya: hanya keyboard. */
async function isiBaris(page: Page, dari: number, sampai: number) {
  for (let i = dari; i < sampai; i++) {
    const kolom = page.getByLabel(`Berat baris ${i + 1}`);
    await kolom.fill(kgBaris(i));
    await kolom.press("Enter");
  }
}

test.describe("grid loin", () => {
  test("300+ baris lewat keyboard, klik ganda simpan tidak menggandakan, total tetap setelah muat ulang", async ({ page }) => {
    test.setTimeout(180_000);
    await mulaiProduksi(page);
    await isiBaris(page, 0, JUMLAH);
    // Enter di baris terakhir menambah baris kosong; buang dari hitungan dengan tidak mengisinya.
    await expect(page.getByTestId("total-loin")).toHaveText(tampil(totalGram(JUMLAH)));

    const simpan = page.getByRole("button", { name: "Simpan loin" });
    await simpan.dblclick(); // klik ganda
    await expect(page.getByText(/Tersimpan di server/)).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(page.getByTestId("total-loin")).toHaveText(tampil(totalGram(JUMLAH)));
    await expect(page.getByText(`Total ${JUMLAH} potong`)).toBeVisible();
  });

  test("jaringan putus saat menyimpan: isian aman, terkirim sendiri saat sinyal kembali", async ({ page, context }) => {
    test.setTimeout(120_000);
    await mulaiProduksi(page);
    await isiBaris(page, 0, 40);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Simpan loin" }).click();
    await expect(page.getByText(/Tidak ada sinyal/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("total-loin")).toHaveText(tampil(totalGram(40)));

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online"))); // pastikan peristiwa "online" sampai ke halaman
    await expect(page.getByText(/Tersimpan di server/)).toBeVisible({ timeout: 30_000 });
    await page.reload();
    await expect(page.getByTestId("total-loin")).toHaveText(tampil(totalGram(40)));
  });

  test("nomor loin ganda ditandai sebelum dikirim", async ({ page }) => {
    await mulaiProduksi(page);
    await page.getByLabel("Berat baris 1").fill("5,5");
    await page.getByLabel("Berat baris 1").press("Enter");
    await page.getByLabel("Berat baris 2").fill("6,5");
    await page.getByLabel("No. loin baris 2").fill("1");
    await page.getByRole("button", { name: "Simpan loin" }).click();
    await expect(page.getByText("Nomor ganda").first()).toBeVisible();
  });
});
