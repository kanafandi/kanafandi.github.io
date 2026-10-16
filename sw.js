/* كنفندي — Service Worker
   الهدف: بعد أول فتح، الصفحة تفتح فورًا (وممكن تفتح من غير إنترنت كمان).
   الخريطة والخطوط من الإنترنت، فبتسيبها للشبكة. */
var CACHE = "kanafandi-v1";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var u;
  try { u = new URL(req.url); } catch (err) { return; }
  if (u.origin !== self.location.origin) return;   // الخطوط والخرائط: من الشبكة عادي

  var isPage = req.mode === "navigate" || /(\/|index\.html)$/.test(u.pathname);
  if (isPage) {
    /* الصفحة: الشبكة الأول (عشان أي تحديث يبان فورًا) والكاش احتياطي */
    e.respondWith(
      fetch(req).then(function (resp) {
        var cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", cp); });
        return resp;
      }).catch(function () {
        return caches.match("./index.html").then(function (r) { return r || caches.match("./"); });
      })
    );
    return;
  }

  /* باقي الملفات (أيقونات/مانيفست): الكاش الأول */
  e.respondWith(
    caches.match(req).then(function (r) {
      return r || fetch(req).then(function (resp) {
        var cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return resp;
      });
    })
  );
});
