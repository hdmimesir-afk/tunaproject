import { chromium, type Browser } from "playwright-core";

/** Launch the locally installed Microsoft Edge (or Chrome) so no browser download is needed. */
export async function launch(): Promise<Browser> {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      /* try next */
    }
  }
  throw new Error("Tidak menemukan Microsoft Edge atau Google Chrome. Install salah satunya untuk ekspor PDF/gambar.");
}
