// Then & Now service worker: lets the installed app open and play offline after the first visit.
//   pages        network first, fall back to the cached copy (so a new release shows up when online)
//   /_next/static, icons, fonts   cache first (file names change whenever the content does)
//   price data   stale while revalidate
//   other origins (Supabase: multiplayer, the bazaar)   never touched
const CACHE = "tnm-v1";
const SHELL = ["/", "/play/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/data/series.json", "/data/series_delhi.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(SHELL.map((url) => c.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const putInCache = async (request, response) => {
  if (response && response.ok && response.type === "basic") {
    const c = await caches.open(CACHE);
    await c.put(request, response.clone());
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => putInCache(req, res))
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || (await caches.match("/play/")) || Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|png|webp|svg)$/.test(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => putInCache(req, res))));
    return;
  }

  // everything else from this site (price data, the manifest): answer from cache, refresh in the background
  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => putInCache(req, res))
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});
