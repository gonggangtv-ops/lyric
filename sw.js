/* LyricVerse service worker — ให้ติดตั้งเป็นแอปได้ และเปิดออฟไลน์ได้ (ตัวแอปเอง) */
const VER = 'lv-v1';
const SHELL = ['./Lyric.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VER).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // ฟอนต์/Analytics ฯลฯ ปล่อยผ่านเครือข่ายตามปกติ
  // ได้หน้าเวอร์ชันใหม่ก่อนเสมอ ถ้าออฟไลน์ค่อยใช้ที่เก็บไว้
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VER).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./Lyric.html') : undefined)))
  );
});
