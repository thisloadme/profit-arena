// ponytail: minimal service worker — caches static assets on install.
// HTML pages are NOT cached (prevents reload loops with HMR).
const CACHE = "finsim-static-v2";
const STATIC = ["/manifest.json", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)));
});

self.addEventListener("fetch", (e) => {
  // ponytail: skip navigation — only cache static assets (js, css, fonts, images)
  if (e.request.mode === "navigate") return;
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((r) => r ?? fetch(e.request)),
  );
});
