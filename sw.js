/* 우리 신혼여행: 오프라인용 서비스 워커
   - 앱 화면 파일은 먼저 저장본으로 빠르게 열고, 뒤에서 새 버전을 받아 둔다.
   - 글꼴과 Supabase 라이브러리는 한 번 받으면 저장해 둔다.
   - 데이터(Supabase API)는 저장하지 않는다. 데이터 저장본은 앱이 따로 관리한다. */
var VERSION = 'hm-v2';
var SHELL = ['./', './index.html', './app.js', './store.js', './config.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
var LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.97.0/dist/umd/supabase.js';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(SHELL).then(function () {
      return fetch(LIB, { mode: 'cors' }).then(function (r) { if (r.ok) return c.put(LIB, r); }).catch(function () {});
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k.indexOf('hm-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function staleWhileRevalidate(req, key) {
  return caches.open(VERSION).then(function (c) {
    return c.match(key || req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (r) {
        if (r && (r.ok || r.type === 'opaque')) c.put(key || req, r.clone());
        return r;
      }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (/supabase\.(co|in)$/.test(url.hostname)) return; /* 데이터는 항상 네트워크 */
  if (req.mode === 'navigate' && url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(req, './index.html'));
    return;
  }
  if (url.origin === location.origin ||
      url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' ||
      url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(staleWhileRevalidate(req));
  }
});
