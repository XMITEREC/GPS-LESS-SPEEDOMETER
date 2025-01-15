/*
service-worker.js
Caches essential files for offline usage, so the site still loads 
and has basic fallback functionality if the user goes offline.
*/

const CACHE_NAME = "speedometer-cache-v3";
const CACHE_URLS = [
  "/",
  "/index.html",
  "/script.js",
  "/manifest.json",
  "/assets/front.png",
  "/assets/footer.png",
  "/assets/neural-bg.js"
  // Add more if needed (CSS, icons, etc.)
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
