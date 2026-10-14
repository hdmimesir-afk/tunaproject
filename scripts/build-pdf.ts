/**
 * Exports output/KATALIS-ERP-Proposal.pdf (28 pages, 1920x1080 px each) from the /print route
 * of a production build, using the locally installed Edge/Chrome. Text stays selectable.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { launch } from "./browser";

const PORT = 3199;
const base = `http://localhost:${PORT}`;

async function waitFor(url: string, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Server tidak siap: " + url);
}

async function main() {
  if (!existsSync(".next/BUILD_ID")) {
    console.log("Menjalankan next build ...");
    execSync("npx next build", { stdio: "inherit" });
  }
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { stdio: "ignore" });
  try {
    await waitFor(`${base}/print`);
    const browser = await launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${base}/print`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: "output/KATALIS-ERP-Proposal.pdf",
      width: "1920px",
      height: "1080px",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await browser.close();
    console.log("PDF written: output/KATALIS-ERP-Proposal.pdf");
  } finally {
    server.kill();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
