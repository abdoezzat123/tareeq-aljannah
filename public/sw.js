// Service Worker - طريقك للجنة
// يدعم الاشتغال بدون إنترنت (offline mode) - لكن لا يتدخل في الصفحات HTML

const CACHE_NAME = "tareeq-islam-v2";
const STATIC_CACHE = "tareeq-static-v2";
const AUDIO_CACHE = "tareeq-audio-v2";

// الملفات الثابتة للتخزين (تشتغل بدون إنترنت)
const STATIC_ASSETS = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-72.png",
  "/icon-96.png",
  "/icon-144.png",
  "/sw.js",
];

// تثبيت Service Worker
self.addEventListener("install", (event) => {
  console.log("[SW] Installing v2...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => Promise.resolve());
    })
  );
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating v2...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.endsWith("-v2"))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// استراتيجية الكاش:
// - HTML pages: Network only (NO caching) - عشان localStorage يشتغل صح
// - Static assets: Cache first
// - Audio: Cache first

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // تجاهل الطلبات غير GET
  if (request.method !== "GET") return;

  // تجاهل طلبات Next.js Dev/HMR
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;
  if (url.pathname.includes("hot-update")) return;

  // ملفات الصوت من CDN الإسلامي (cache first)
  if (url.hostname === "cdn.islamic.network" && url.pathname.includes("/audio/")) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // ملفات الصوت من كاش التطبيق
  if (url.pathname.startsWith("/audio-cache/")) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // API للقرآن والتفسير (network first مع fallback)
  if (url.hostname === "api.alquran.cloud") {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // API لمواقيت الصلاة
  if (url.hostname === "api.aladhan.com") {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // ملفات Next.js static (cache first) - هذه الـ JS/CSS chunks
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // الصور والأيقونات (cache first)
  if (url.origin === self.location.origin && /\.(png|jpg|jpeg|svg|ico|webp)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // manifest.json (cache first)
  if (url.pathname === "/manifest.json") {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages و API routes: Network ONLY (لا نكاشها)
  // هذا مهم جداً عشان localStorage يشتغل بشكل صحيح
  // والصفحة تكون دائماً محدثة
  event.respondWith(
    fetch(request).catch(() => {
      // fallback: محاولة من الكاش لو مفيش نت
      return caches.match(request).then((cached) => {
        return cached || new Response("Offline", { status: 503 });
      });
    })
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
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
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
        if (event.ports[0]) {
          event.ports[0].postMessage({ status: "done" });
        }
      });
    });
  }
});

// إشعارات Push
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
