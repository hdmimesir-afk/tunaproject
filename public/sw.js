/* Service worker KATALIS ERP. Sengaja ringan:
   - File statis berversi (/_next/static, ikon, logo) disimpan di HP, jadi buka berikutnya nggak download ulang.
   - Halaman yang isinya data NGGAK disimpan, biar data perusahaan nggak nyangkut di HP. Selalu ambil dari server;
     kalau sinyal putus, tampil halaman offline.
   Ganti VERSI tiap kali isi berkas ini berubah. */
const VERSI = "katalis-v1";
const STATIS = `${VERSI}-statis`;
const OFFLINE = "/offline.html";
const MAKS_STATIS = 250;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIS)
      .then((c) => c.addAll([OFFLINE, "/pwa/icon-192.png", "/brand/katalis-mark-white.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((nama) => Promise.all(nama.filter((n) => !n.startsWith(VERSI)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

const statis = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa/") || url.pathname.startsWith("/brand/");

async function rapikan(cache) {
  const kunci = await cache.keys();
  for (let i = 0; i < kunci.length - MAKS_STATIS; i++) await cache.delete(kunci[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Halaman: selalu dari server. Offline: halaman offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }

  // File statis berversi: ambil dari simpanan dulu, kalau belum ada baru download.
  if (statis(url)) {
    event.respondWith(
      caches.open(STATIS).then(async (cache) => {
        const ada = await cache.match(req);
        if (ada) return ada;
        const res = await fetch(req);
        if (res.ok && res.type === "basic") {
          cache.put(req, res.clone()).then(() => rapikan(cache));
        }
        return res;
      }),
    );
  }
});
