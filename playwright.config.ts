import { defineConfig, devices } from "@playwright/test";

/* Tes klik-klik otomatis. Berjalan terhadap Supabase lokal (`supabase start`) di CI, bukan proyek cloud.
   Variabel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY.
   Dua proyek: desktop (semua alur) dan mobile (layar HP, berkas mobile.spec.ts: tata letak dan navigasi). */
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./e2e/setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", locale: "id-ID" },
  projects: [
    { name: "desktop", testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", testMatch: /mobile\.spec\.ts/, use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3100/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
