// ponytail: minimal service worker — caches static assets on install.
// No runtime caching (trade data must be fresh). Upgrade to Workbox when
// offline UX requirements are defined.
const CACHE = "finsim-static-v1";
const STATIC = ["/", "/login", "/register", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)),
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((r) => r ?? fetch(e.request)),
  );
});
