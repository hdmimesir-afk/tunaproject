import type { Page } from "@playwright/test";

export type Akun = { email: string; sandi: string };

export const ADMIN: Akun = { email: "e2e-admin@katalis.test", sandi: "e2e-Sandi-Uji-12345" };
export const PETUGAS: Akun = { email: "e2e-petugas@katalis.test", sandi: "e2e-Sandi-Uji-12345" };

/** Masuk lewat layar login sungguhan. Gagal dengan isi halaman bila tidak berpindah, supaya sebabnya terlihat di laporan CI. */
export async function masuk(page: Page, akun: Akun) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle"); // tunggu halaman siap (hydrate) sebelum mengisi
  await page.getByLabel("Email").fill(akun.email);
  await page.getByLabel("Kata sandi").fill(akun.sandi);
  await page.getByRole("button", { name: "Masuk" }).click();
  try {
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 });
  } catch {
    const isi = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400);
    throw new Error(`Masuk gagal. URL: ${page.url()} | Isi halaman: ${isi}`);
  }
}
