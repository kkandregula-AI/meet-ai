// MeetOS service worker — app-shell cache only.
// API calls and Firebase traffic are never cached.
var CACHE = "meetos-v1";
var SHELL = ["./", "./index.html"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  // Never cache AI or realtime traffic
  if (url.indexOf("/api/") > -1 || url.indexOf("anthropic.com") > -1 ||
      url.indexOf("firebaseio.com") > -1 || url.indexOf("gstatic.com/firebasejs") > -1) return;
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request);
    })
  );
});
