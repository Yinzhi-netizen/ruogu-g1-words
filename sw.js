const cachePrefix = "ruogu-word-lab-home-";
const cacheName = `${cachePrefix}v4`;
const legacyCacheName = "ruogu-g1-words-v1";
const assets = [
  "./",
  "./index.html",
  "./wordlab.css?v=4",
  "./manifest.webmanifest",
  "./G1-words/index.html",
  "./G1-words/g1-word-data.js?v=4",
  "./G1-words/g1-stories.js?v=4",
  "./G1-words/g1-stars.js",
  "./G1-words/g1-review-app.js?v=4",
  "./G1-words/manifest.webmanifest",
  "./G1-words/icons/icon-180.png",
  "./G1-words/icons/icon-192.png",
  "./G1-words/icons/icon-512.png",
  "./G2-words/index.html",
  "./G2-words/g2-word-data.js?v=4",
  "./G2-words/g2-stories.js?v=4",
  "./G2-words/g2-stars.js",
  "./G2-words/g2-prep-app.js?v=4",
  "./G2-words/manifest.webmanifest",
  "./G2-words/icons/icon-180.png",
  "./G2-words/icons/icon-192.png",
  "./G2-words/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(
        keys
          .filter((key) => (key.startsWith(cachePrefix) && key !== cacheName) || key === legacyCacheName)
          .map((key) => caches.delete(key))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isCode = /\.(js|css|html|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith("/");
  if (isCode) {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
