// Service Worker - طريقك للجنة
// يدعم الاشتغال بدون إنترنت (offline mode)

const CACHE_NAME = "tareeq-islam-v1";
const STATIC_CACHE = "tareeq-static-v1";
const AUDIO_CACHE = "tareeq-audio-v1";

// الملفات الأساسية للتخزين (تشتغل بدون إنترنت)
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-72.png",
  "/icon-96.png",
  "/icon-144.png",
];

// تثبيت Service Worker
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log("[SW] Cache error:", err);
        // نتجاهل الأخطاء ونكمل
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== AUDIO_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// استراتيجية الكاش:
// - الملفات الثابتة: Cache First (الكاش أولاً، ثم الشبكة)
// - API: Network First (الشبكة أولاً، ثم الكاش)
// - الصوت: Cache First (لأنه كبير وثابت)
// - الصفحات: Network First مع fallback للكاش

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // تجاهل الطلبات غير GET
  if (request.method !== "GET") return;

  // تجاهل طلبات Next.js Dev
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // ملفات الصوت من CDN الإسلامي (cache first)
  if (url.hostname === "cdn.islamic.network" && url.pathname.includes("/audio/")) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // ملفات الصوت من كاش التطبيق (audio-cache)
  if (url.pathname.startsWith("/audio-cache/")) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // API للنص القرآني والتفسير (network first مع fallback للكاش)
  if (url.hostname === "api.alquran.cloud") {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // API لمواقيت الصلاة (network first)
  if (url.hostname === "api.aladhan.com") {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // API الخاص بنا (TTS) - لا نكاشه الطلبات POST
  if (url.pathname.startsWith("/api/tts") && request.method === "GET") {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // الصفحات والملفات الثابتة
  if (url.origin === self.location.origin) {
    // ملفات Next.js static (cache first)
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }

    // الصفحات (network first مع fallback للكاش)
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // أي طلب آخر (try network, fallback to cache)
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// استراتيجية: Cache First
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // لو مفيش كاش ومفيش نت
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

// استراتيجية: Network First
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // لو مفيش نت، نرجع للكاش
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // لو مفيش كاش بردو
    return new Response("Offline - No cache available", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

// استقبال رسائل من الصفحة
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then((names) => {
      Promise.all(names.map((n) => caches.delete(n))).then(() => {
        event.ports[0].postMessage({ status: "done" });
      });
    });
  }
});

// إشعارات Push (للتذكيرات المستقبلية)
self.addEventListener("push", (event) => {
  let data = { title: "طريقك للجنة", body: "تذكير بذكر الله" };
  try {
    if (event.data) data = JSON.parse(event.data.text());
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-96.png",
      dir: "rtl",
      lang: "ar",
      vibrate: [100, 50, 100],
      tag: "islamic-reminder",
    })
  );
});

// النقر على الإشعار
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
