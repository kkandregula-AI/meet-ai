// MeetOS service worker — v2
// HTML: network-first (updates always win; cache is offline fallback only).
// API/Firebase traffic: never cached.
var CACHE = "meetos-v2";

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(["./", "./index.html"]).catch(function () {});
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k); // evicts stale meetos-v1
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  if (url.indexOf("/api/") > -1 || url.indexOf("anthropic.com") > -1 ||
      url.indexOf("firebaseio.com") > -1 || url.indexOf("firebasedatabase.app") > -1 ||
      url.indexOf("gstatic.com/firebasejs") > -1) return;
  if (e.request.method !== "GET") return;

  var isHTML = e.request.mode === "navigate" ||
               (e.request.headers.get("accept") || "").indexOf("text/html") > -1;

  if (isHTML) {
    // NETWORK-FIRST for the app shell
    e.respondWith(
      fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
  } else {
    // cache-first for static assets (fonts etc.)
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (resp) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          return resp;
        });
      })
    );
  }
});
