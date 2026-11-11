// Rekam video panduan KATALIS ERP dari aplikasi asli (data contoh di Supabase lokal), pakai Playwright.
// Tulisan penjelasan muncul di bawah layar, kursor kelihatan, dan klik bergerak pelan supaya bisa diikuti.
//
// Cara pakai (server dev di http://localhost:3100, database lokal berisi data contoh yang masih bersih):
//   node scripts/video/rekam.mjs --latihan     jalankan semua alur tanpa rekam, cek tombolnya ketemu semua
//   node scripts/video/rekam.mjs               rekam semua alur ke scripts/video/hasil/*.webm
//   node scripts/video/rekam.mjs 1 3           rekam alur tertentu saja (nomor alur)
// Alur saling lanjut (PO di alur 1 dipakai alur 2 dst.), jadi rekam berurutan di database yang baru di-reset.
// Ubah ke MP4: node scripts/video/jadi-mp4.mjs

import { chromium } from "@playwright/test";
import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const HASIL = join(DIR, "hasil");
const DASAR = process.env.DEMO_URL ?? "http://localhost:3100";
const SANDI = process.env.DEMO_SANDI ?? "contoh-tutorial-123";
const LATIHAN = process.argv.includes("--latihan");
const PILIH = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const KONTEKS = join(HASIL, "konteks.json"); // kode PO, lot, dan produksi yang dibuat alur sebelumnya
const UKURAN = { width: 1280, height: 720 };
const jeda = (page, ms) => page.waitForTimeout(LATIHAN ? Math.min(ms, 150) : ms);

const AKUN = {
  admin: { email: "super-admin@contoh.test", nama: "Super Admin" },
  owner: { email: "owner@contoh.test", nama: "Owner" },
  finance: { email: "finance@contoh.test", nama: "Finance" },
  qc: { email: "kepala-produksi@contoh.test", nama: "Kepala Produksi / QC" },
  petugas: { email: "petugas-lapangan@contoh.test", nama: "Petugas Lapangan" },
};

/* ------------------------------------------------------------------ lapisan tampilan */
// Dipasang di setiap halaman: kursor panah, bar tulisan di bawah, dan indikator dev Next.js disembunyikan.
// Tulisan terakhir disimpan di sessionStorage supaya tetap tampil setelah pindah halaman.
const LAPISAN = () => {
  const pasang = () => {
    if (document.getElementById("demo-gaya")) return;
    const gaya = document.createElement("style");
    gaya.id = "demo-gaya";
    gaya.textContent = `nextjs-portal{display:none!important}
#demo-kursor{position:fixed;z-index:2147483647;pointer-events:none;width:26px;height:26px;transition:left .08s linear,top .08s linear;filter:drop-shadow(1px 2px 2px rgba(0,0,0,.35))}
#demo-klik{position:fixed;z-index:2147483646;pointer-events:none;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(0,23,31,.25);transform:scale(0);opacity:0}
#demo-klik.on{animation:demoklik .45s ease-out}
@keyframes demoklik{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
#demo-teks{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483645;pointer-events:none;max-width:1000px;padding:14px 26px;border-radius:18px;background:rgba(0,23,31,.9);color:#fff;font:500 22px/1.4 "Segoe UI",system-ui,sans-serif;text-align:center;transition:opacity .3s;box-shadow:0 8px 30px rgba(0,0,0,.25)}
#demo-judul{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#00171F;color:#fff;font-family:"Segoe UI",system-ui,sans-serif;transition:opacity .5s}
#demo-judul b{font-size:46px;font-weight:600;letter-spacing:-.01em}
#demo-judul span{font-size:22px;color:rgba(255,255,255,.75);max-width:900px;text-align:center;line-height:1.45}`;
    document.head.appendChild(gaya);
    const kursor = document.createElement("div");
    kursor.id = "demo-kursor";
    kursor.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="#fff" stroke="#00171F" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const pos = JSON.parse(sessionStorage.getItem("demo-pos") ?? "[640,360]");
    kursor.style.left = `${pos[0]}px`;
    kursor.style.top = `${pos[1]}px`;
    const klik = document.createElement("div");
    klik.id = "demo-klik";
    const teks = document.createElement("div");
    teks.id = "demo-teks";
    const isi = sessionStorage.getItem("demo-teks") ?? "";
    teks.textContent = isi;
    teks.style.opacity = isi ? "1" : "0";
    document.body.append(kursor, klik, teks);
    document.addEventListener("mousemove", (e) => {
      kursor.style.left = `${e.clientX}px`;
      kursor.style.top = `${e.clientY}px`;
      sessionStorage.setItem("demo-pos", JSON.stringify([e.clientX, e.clientY]));
    }, true);
    document.addEventListener("mousedown", (e) => {
      klik.style.left = `${e.clientX}px`;
      klik.style.top = `${e.clientY}px`;
      klik.classList.remove("on");
      void klik.offsetWidth;
      klik.classList.add("on");
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang);
  else pasang();
};

async function tulis(page, teks, baca = 2600) {
  await page.evaluate((t) => {
    sessionStorage.setItem("demo-teks", t);
    const el = document.getElementById("demo-teks");
    if (!el) return;
    el.textContent = t;
    el.style.opacity = t ? "1" : "0";
  }, teks);
  // Waktu baca kira-kira: 2,6 detik + 45 ms per huruf.
  if (teks) await jeda(page, baca + teks.length * 45);
}

async function judul(page, besar, kecil) {
  await page.evaluate(([b, k]) => {
    document.getElementById("demo-judul")?.remove();
    const el = document.createElement("div");
    el.id = "demo-judul";
    el.innerHTML = `<b></b><span></span>`;
    el.querySelector("b").textContent = b;
    el.querySelector("span").textContent = k;
    document.body.appendChild(el);
  }, [besar, kecil]);
  await jeda(page, 3800);
  await page.evaluate(() => {
    const el = document.getElementById("demo-judul");
    if (el) { el.style.opacity = "0"; setTimeout(() => el.remove(), 600); }
  });
  await jeda(page, 700);
}

/* ------------------------------------------------------------------ gerakan */
function gagal(label, page) {
  return new Error(`Nggak ketemu: "${label}" di ${page.url()}`);
}

async function tunjuk(page, loc, label) {
  const el = loc.first();
  await el.waitFor({ state: "visible", timeout: 15_000 }).catch(() => { throw gagal(label, page); });
  await el.scrollIntoViewIfNeeded();
  await jeda(page, 250);
  const box = await el.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: LATIHAN ? 2 : 18 });
  await jeda(page, 450);
  return el;
}

async function klik(page, loc, label, sesudah = 1200) {
  const el = await tunjuk(page, loc, label);
  await el.click();
  await page.waitForTimeout(sesudah > 1500 ? 1500 : 300);
  // Pesan galat yang muncul di layar berarti alurnya gagal; jangan lanjut merekam diam-diam.
  // Hanya di halaman dan jendela isian; pengumuman pindah halaman dari Next.js juga ber-role alert.
  const galat = await page.locator('main [role="alert"]:visible, [role="dialog"] [role="alert"]:visible').allInnerTexts();
  const isi = galat.map((t) => t.trim()).filter(Boolean);
  if (isi.length) throw new Error(`Setelah "${label}" muncul galat: ${isi.join(" | ")}`);
  console.log(`  ok  ${label}`);
  await jeda(page, sesudah);
}

async function ketik(page, loc, teks, label) {
  const el = await tunjuk(page, loc, label);
  await el.click();
  await el.fill("");
  await el.pressSequentially(teks, { delay: LATIHAN ? 0 : 70 });
  console.log(`  ok  ${label}`);
  await jeda(page, 500);
}

/** Pilih opsi select yang teksnya memuat potongan tertentu. */
async function pilih(page, loc, potongan, label) {
  const el = await tunjuk(page, loc, label);
  const nilai = await el.evaluate((s, p) => {
    const o = [...s.options].find((x) => !x.disabled && x.value && x.text.includes(p));
    return o ? o.value : null;
  }, potongan);
  if (nilai === null) {
    const ada = await el.evaluate((s) => [...s.options].map((o) => o.text).join(" | "));
    throw new Error(`Opsi "${potongan}" nggak ada di ${label}. Pilihan: ${ada}`);
  }
  await el.selectOption(nilai);
  console.log(`  ok  ${label}: ${potongan}`);
  await jeda(page, 700);
}

async function sapu(page, loc, maks = 5) {
  const semua = await loc.all();
  for (const el of semua.slice(0, maks)) {
    const box = await el.boundingBox().catch(() => null);
    if (box && box.y > 0 && box.y < UKURAN.height - 120) {
      await page.mouse.move(box.x + Math.min(box.width / 2, 200), box.y + box.height / 2, { steps: LATIHAN ? 2 : 14 });
      await jeda(page, 550);
    }
  }
}

async function buka(page, jalur) {
  await page.goto(`${DASAR}${jalur}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.locator("main h1").first().waitFor({ timeout: 20_000 });
  await jeda(page, 1200);
}

async function masuk(page, siapa) {
  const akun = AKUN[siapa];
  await page.context().clearCookies();
  await page.goto(`${DASAR}/login`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await tulis(page, `Masuk sebagai ${akun.nama}.`, 600);
  await ketik(page, page.getByLabel("Email"), akun.email, "Email");
  await ketik(page, page.getByLabel("Kata sandi"), SANDI, "Kata sandi");
  await klik(page, page.getByRole("button", { name: "Masuk", exact: true }), "Masuk", 600);
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await jeda(page, 1000);
}

/* ------------------------------------------------------------------ konteks antaralur */
const muatKonteks = () => (existsSync(KONTEKS) ? JSON.parse(readFileSync(KONTEKS, "utf8")) : {});
const simpanKonteks = (k) => writeFileSync(KONTEKS, JSON.stringify(k, null, 2));

/* ------------------------------------------------------------------ alur */
const ALUR = [
  {
    no: 1, berkas: "01-pembelian", judul: "Bikin PO pembelian ikan", sub: "Dari pilih pemasok sampai PO diajukan, termasuk kalau notanya belum ada.",
    async jalan(page, k) {
      await masuk(page, "admin");
      await buka(page, "/pembelian");
      await tulis(page, "Semua PO ke pemasok ada di menu Pembelian.");
      await sapu(page, page.locator("main li, main tr"), 4);
      await klik(page, page.getByRole("button", { name: "Buat PO", exact: true }), "Buat PO");
      const form = page.getByRole("dialog");
      await tulis(page, "Pilih pemasoknya. Kalau belum ada di daftar, bisa langsung ditambah dari sini.");
      await pilih(page, form.getByLabel("Pemasok"), "CV Mina Laut Jaya", "Pemasok");
      await tulis(page, "Isi berat dan harga per kilo. Totalnya kehitung sendiri.", 1200);
      await ketik(page, form.getByLabel("Berat (kg)"), "600", "Berat");
      await ketik(page, form.getByLabel("Harga per kg (Rp)"), "42000", "Harga per kg");
      await tulis(page, "Pilih proyeknya. Satu proyek itu satu batch atau satu bongkaran.");
      await pilih(page, form.getByLabel(/^Proyek/), "Proyek baru", "Proyek");
      await klik(page, form.getByRole("button", { name: "Buat PO (draf)" }), "Buat PO (draf)", 2500);
      await page.waitForURL(/po=/, { timeout: 20_000 });
      const detail = page.getByRole("dialog");
      k.po = ((await detail.locator("h2, h3").first().innerText()).match(/PO-\d+/) ?? [])[0];
      if (!k.po) throw new Error("Kode PO baru nggak kebaca");
      k.proyek = ((await detail.innerText()).match(/SIK-\d+/) ?? [])[0];
      await tulis(page, `PO-nya udah jadi (${k.po}), statusnya masih draf.`);
      await tunjuk(page, detail.getByRole("button", { name: "Lampirkan nota" }), "Lampirkan nota");
      await tulis(page, "Kalau notanya udah ada, tekan Lampirkan nota terus pilih fotonya.");
      await tulis(page, "Kalau belum ada, misalnya pas bongkar malam, centang Nota menyusul.");
      await klik(page, detail.getByLabel(/Nota menyusul/), "Nota menyusul");
      await tulis(page, "Terus tekan Ajukan untuk disetujui. Ada konfirmasi dulu biar nggak salah pencet.", 1500);
      await klik(page, detail.getByRole("button", { name: "Ajukan untuk disetujui" }), "Ajukan untuk disetujui");
      await klik(page, detail.getByRole("button", { name: "Ya, ajukan sekarang" }), "Ya, ajukan sekarang", 2500);
      await tulis(page, "Beres. PO-nya tinggal nunggu disetujui, dan ikannya udah bisa diterima.", 3500);
      await tulis(page, "");
    },
  },
  {
    no: 2, berkas: "02-persetujuan", judul: "Menyetujui PO", sub: "Buat yang dipilih admin jadi penyetuju, misalnya Owner.",
    async jalan(page, k) {
      if (!k.po) throw new Error("Rekam alur 1 dulu (butuh kode PO)");
      await masuk(page, "owner");
      await buka(page, "/persetujuan");
      await tulis(page, "Semua yang nunggu keputusan ada di menu Persetujuan.");
      await tulis(page, "Di atas ada nama siapa aja yang boleh menyetujui. Itu diatur admin di menu Akses.");
      const kartu = page.locator('[id^="apv-"]').filter({ hasText: k.po });
      await tunjuk(page, kartu, `Kartu ${k.po}`);
      await tulis(page, "Tiap kartu nampilin berat, harga, nota, dan peringatan kalau harganya naik.");
      await tunjuk(page, kartu.getByText(/Nota menyusul/), "Tanda nota menyusul");
      await tulis(page, "PO ini notanya nyusul. Tetap boleh diputusin sekarang.");
      await tulis(page, "Tekan Setujui. Kalau ada yang salah, bisa Minta revisi atau Tolak, pakai alasan.", 1500);
      await klik(page, kartu.getByRole("button", { name: "Setujui", exact: true }), "Setujui");
      await tulis(page, "Sebelum disetujui, total nilainya ditampilin dulu.");
      await klik(page, page.getByRole("button", { name: /^Ya, setujui/ }), "Ya, setujui", 2500);
      await tulis(page, "Udah disetujui. Pembayarannya nanti dicatat Finance di menu Pembelian.", 3500);
      await tulis(page, "");
    },
  },
  {
    no: 3, berkas: "03-terima-dan-cek-mutu", judul: "Terima ikan dan cek mutu", sub: "Petugas lapangan nyatet ikan yang datang, terus QC ngecek mutunya.",
    async jalan(page, k) {
      if (!k.po) throw new Error("Rekam alur 1 dulu (butuh kode PO)");
      await masuk(page, "petugas");
      await buka(page, "/mutu");
      await tulis(page, "Ikan datang? Buka menu Mutu dan Penerimaan.");
      await tulis(page, "Pilih PO-nya. Beratnya otomatis diambil dari PO, nggak perlu diketik ulang.", 1200);
      await pilih(page, page.locator('select[name="poId"]'), k.po, "PO");
      await tunjuk(page, page.getByTestId("berat-dari-po"), "Berat dari PO");
      await tulis(page, "Kalau kiriman aslinya beda, centang Kiriman nyata berbeda dari PO terus isi berat aslinya.");
      await klik(page, page.getByRole("button", { name: "Catat penerimaan" }), "Catat penerimaan", 2500);
      await tulis(page, "Ikannya udah kecatat jadi lot baru, statusnya nunggu cek mutu.");
      const lot = page.locator("main ul > li").filter({ hasText: k.po }).first();
      k.lot = ((await lot.innerText()).match(/LOT-\d+/) ?? [])[0];
      if (!k.lot) throw new Error("Kode lot baru nggak kebaca");
      await tunjuk(page, lot, k.lot);
      await jeda(page, 1500);

      await masuk(page, "qc");
      await buka(page, "/mutu");
      const baris = page.locator("main ul > li").filter({ hasText: k.lot }).first();
      await tulis(page, `Sekarang QC ngecek mutu ${k.lot}.`);
      await klik(page, baris.getByRole("button", { name: "Cek mutu" }), "Cek mutu");
      const modal = page.getByRole("dialog");
      await tunjuk(page, modal.getByTestId("arti-mutu"), "Arti mutu");
      await tulis(page, "Lulus artinya ikannya layak diolah. Tahan artinya belum boleh diolah dulu.");
      await tulis(page, "Satu lot boleh beberapa grade. Isi grade sama beratnya.", 1200);
      await pilih(page, modal.getByLabel("Grade baris 1"), "B-SO", "Grade baris 1");
      await ketik(page, modal.getByLabel("Berat grade baris 1 (kg)"), "400", "Berat baris 1");
      await klik(page, modal.getByRole("button", { name: "+ Tambah grade" }), "Tambah grade");
      await pilih(page, modal.getByLabel("Grade baris 2"), "A-SO", "Grade baris 2");
      await ketik(page, modal.getByLabel("Berat grade baris 2 (kg)"), "200", "Berat baris 2");
      await tunjuk(page, modal.getByTestId("jumlah-grade"), "Jumlah grade");
      await tulis(page, "Jumlahnya dicek otomatis. Nggak boleh lebih dari berat lot.");
      await klik(page, modal.getByRole("button", { name: "Simpan hasil" }), "Simpan hasil", 2500);
      await tunjuk(page, page.locator("main ul > li").filter({ hasText: k.lot }).first(), "Lot sesudah dicek");
      await tulis(page, "Lot-nya udah lulus dengan dua grade, dan udah bisa dipakai produksi.", 3500);
      await tulis(page, "");
    },
  },
  {
    no: 4, berkas: "04-produksi", judul: "Produksi loin", sub: "Mulai produksi dari lot, isi berat loin per grade, terus selesaikan.",
    async jalan(page, k) {
      if (!k.lot) throw new Error("Rekam alur 3 dulu (butuh kode lot)");
      await masuk(page, "petugas");
      await buka(page, "/produksi");
      await tulis(page, "Mulai produksi dari menu Produksi.", 1200);
      await klik(page, page.getByRole("button", { name: "Mulai produksi" }).first(), "Mulai produksi");
      const form = page.getByRole("dialog");
      await tulis(page, "Pilih lot yang mau diolah. Satu produksi boleh pakai beberapa lot.", 1200);
      await klik(page, form.getByLabel(`Pakai ${k.lot}`), `Pakai ${k.lot}`);
      await klik(page, form.getByRole("button", { name: "Mulai produksi" }), "Mulai produksi (form)", 2500);
      await page.waitForURL(/p=/, { timeout: 20_000 });
      const detail = page.getByRole("dialog");
      k.produksi = ((await detail.locator("h2, h3").first().innerText()).match(/PRD-\d+/) ?? [])[0];
      await tulis(page, "Isi berat loin total per grade. Kalau mau, bisa juga timbang per potong.", 1200);
      await ketik(page, detail.getByLabel(/^A-SO.*\(kg\)$/), "120", "Loin A-SO");
      await ketik(page, detail.getByLabel(/^B-SO.*\(kg\)$/), "230", "Loin B-SO");
      await klik(page, detail.getByRole("button", { name: "Simpan total loin" }), "Simpan total loin", 2000);
      await tulis(page, "Terus isi hasil samping, limbah, sama susut.", 1200);
      const samping = detail.locator('input[placeholder="belum ditimbang"]');
      await ketik(page, samping.first(), "150", "Hasil samping pertama");
      await ketik(page, detail.getByLabel("Limbah, total (kg)"), "70", "Limbah");
      await ketik(page, detail.getByLabel("Susut, total (kg)"), "30", "Susut");
      await klik(page, detail.getByRole("button", { name: "Simpan komponen" }), "Simpan komponen", 2200);
      await tulis(page, "Neraca beratnya kelihatan: ikan masuk harus sama dengan semua hasil yang ditimbang.");
      await tulis(page, "Kalau udah selesai nimbang, tekan Selesaikan produksi.", 1200);
      await klik(page, detail.getByRole("button", { name: "Selesaikan produksi" }), "Selesaikan produksi");
      await klik(page, detail.getByRole("button", { name: "Ya, selesaikan" }), "Ya, selesaikan", 2500);
      await tulis(page, "Produksinya sekarang nunggu diperiksa QC, terus disetujui Owner.", 3500);
      await tulis(page, "");
    },
  },
  {
    no: 5, berkas: "05-periksa-dan-stok", judul: "Periksa produksi dan masuk stok", sub: "QC meriksa, Owner menyetujui, terus hasilnya masuk stok.",
    async jalan(page, k) {
      if (!k.produksi) throw new Error("Rekam alur 4 dulu (butuh kode produksi)");
      await masuk(page, "qc");
      await buka(page, "/produksi");
      await tulis(page, `QC buka produksi ${k.produksi} buat diperiksa.`, 1200);
      await klik(page, page.locator("main li, main tr").filter({ hasText: k.produksi }).getByRole("button", { name: "Buka" }), `Buka ${k.produksi}`);
      const detail = page.getByRole("dialog");
      await tulis(page, "Cek timbangan dan neracanya. Kalau ada yang salah, tekan Minta perbaikan.");
      await klik(page, detail.getByRole("button", { name: "Tandai sudah diperiksa (QC)" }), "Tandai sudah diperiksa");
      await klik(page, detail.getByRole("button", { name: "Ya, sudah saya periksa" }), "Ya, sudah saya periksa", 2500);

      await masuk(page, "owner");
      await buka(page, "/produksi");
      await tulis(page, "Habis itu Owner yang menyetujui.", 1200);
      await klik(page, page.locator("main li, main tr").filter({ hasText: k.produksi }).getByRole("button", { name: "Buka" }), `Buka ${k.produksi}`);
      const d2 = page.getByRole("dialog");
      await klik(page, d2.getByRole("button", { name: "Setujui produksi (Owner)" }), "Setujui produksi");
      await klik(page, d2.getByRole("button", { name: "Ya, setujui" }), "Ya, setujui", 2500);

      await buka(page, "/stok");
      await tulis(page, "Produksi yang udah disetujui bisa dimasukin ke stok dari menu Stok.", 1200);
      await klik(page, page.getByRole("button", { name: "Hasil produksi masuk" }), "Hasil produksi masuk");
      const form = page.getByRole("dialog");
      await tulis(page, "Pilih produksinya, produk, grade, kondisi, sama beratnya.", 1200);
      await pilih(page, form.locator('select[name="produksiId"]'), k.produksi, "Produksi");
      await pilih(page, form.locator('select[name="productId"]'), "Loin", "Produk");
      await pilih(page, form.locator('select[name="gradeId"]'), "B-SO", "Grade");
      await pilih(page, form.locator('select[name="kondisi"]'), "eku", "Kondisi");
      await ketik(page, form.getByLabel("Berat (kg)"), "230", "Berat");
      const ruang = form.locator('select[name="ruanganId"]');
      if (await ruang.count()) await pilih(page, ruang, "Cold Storage", "Ruangan");
      await klik(page, form.locator('button[type="submit"]').last(), "Simpan stok", 2500);
      const kartu = page.locator("main li, main tr").filter({ hasText: "Proyek" }).first();
      await tunjuk(page, kartu, "Stok baru");
      await tulis(page, "Stoknya udah masuk, lengkap sama asal produksi dan proyeknya.", 3500);
      await tulis(page, "");
    },
  },
  {
    no: 6, berkas: "06-penjualan", judul: "Jual, kirim, dan tagih", sub: "Bikin pesanan dari stok, kirim, terus terbitkan invoice.",
    async jalan(page, k) {
      await masuk(page, "admin");
      await buka(page, "/penjualan");
      await tulis(page, "Pesanan pembeli dibikin di menu Penjualan.", 1200);
      await klik(page, page.getByRole("button", { name: "Buat pesanan" }), "Buat pesanan");
      const form = page.getByRole("dialog");
      await pilih(page, form.getByLabel("Pembeli"), "(Demo)", "Pembeli");
      if (k.proyek) {
        await tulis(page, "Pilih proyeknya, biar penjualan ini masuk ke laba rugi proyek yang sama.", 1200);
        await pilih(page, form.getByLabel("Proyek"), k.proyek, "Proyek");
      }
      await tulis(page, "Pilih stoknya. Di pilihan kelihatan proyek dan produksi asalnya.", 1200);
      await pilih(page, form.getByLabel("Stok baris 1"), k.produksi ?? "Loin", "Stok baris 1");
      await ketik(page, form.getByLabel("Berat baris 1 (kg)"), "100", "Berat");
      await ketik(page, form.getByLabel("Harga per kg baris 1"), "95000", "Harga per kg");
      await tulis(page, "Perkiraan totalnya langsung kehitung.");
      await klik(page, form.getByRole("button", { name: "Simpan pesanan (draf)" }), "Simpan pesanan", 2500);
      const detail = page.getByRole("dialog");
      await tulis(page, "Pas barangnya dikirim, isi berat kirim dari hasil timbang, terus tekan Kirim pesanan.", 1200);
      await klik(page, detail.getByRole("button", { name: "Kirim pesanan" }), "Kirim pesanan");
      await klik(page, detail.getByRole("button", { name: "Ya, kirim dan kurangi stok" }), "Ya, kirim", 2500);
      await tulis(page, "Stoknya otomatis berkurang. Sekarang tinggal terbitkan invoice.", 1200);
      await klik(page, detail.getByRole("button", { name: "Terbitkan invoice" }), "Terbitkan invoice");
      await klik(page, detail.getByRole("button", { name: "Ya, terbitkan invoice" }), "Ya, terbitkan invoice", 2500);
      await tulis(page, "Invoice-nya udah terbit. Jatuh temponya ngikutin tempo bayar pembeli. Uang masuknya nanti dicatat di sini juga.", 3500);
      await tulis(page, "");
    },
  },
];

/* ------------------------------------------------------------------ jalankan */
mkdirSync(HASIL, { recursive: true });
const browser = await chromium.launch({ headless: true });
const k = PILIH.length && !PILIH.includes(1) ? muatKonteks() : {};
let ada = false;
for (const a of ALUR) {
  if (PILIH.length && !PILIH.includes(a.no)) continue;
  console.log(`\n== ${a.no}. ${a.judul}${LATIHAN ? " (latihan)" : ""}`);
  const konteks = await browser.newContext({ viewport: UKURAN, locale: "id-ID", ...(LATIHAN ? {} : { recordVideo: { dir: HASIL, size: UKURAN } }) });
  await konteks.addInitScript(LAPISAN);
  const page = await konteks.newPage();
  try {
    await page.goto(`${DASAR}/login`);
    await judul(page, `${a.no}. ${a.judul}`, a.sub);
    await a.jalan(page, k);
    await judul(page, "Selesai", `Video berikutnya: ${ALUR.find((x) => x.no === a.no + 1)?.judul ?? "cek halaman Panduan buat menu lainnya"}`);
    simpanKonteks(k);
  } catch (e) {
    ada = true;
    console.error(`GAGAL di alur ${a.no}: ${e.message}`);
    await page.screenshot({ path: join(HASIL, `gagal-${a.berkas}.png`) }).catch(() => {});
  } finally {
    await konteks.close();
    if (!LATIHAN) {
      const asal = await page.video()?.path();
      if (asal) {
        copyFileSync(asal, join(HASIL, `${a.berkas}.webm`));
        console.log(`  video: ${join(HASIL, `${a.berkas}.webm`)}`);
      }
    }
  }
  if (ada) break;
}
await browser.close();
process.exit(ada ? 1 : 0);
