"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          // تسجيل الـ SW الجديد
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });

          // فحص التحديثات
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // يوجد تحديث جديد - فعّله فوراً
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });

          // التحكم التلقائي في التحديثات
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            // تم تحديث الـ SW
            console.log("[PWA] Service Worker updated");
          });

          console.log("[PWA] Service Worker registered:", registration.scope);
        } catch (err) {
          console.error("[PWA] SW registration failed:", err);
        }
      };

      // تسجيل بعد تحميل الصفحة
      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  // قبل الخروج نوقف أي صوت شغال
  useEffect(() => {
    const handleBeforeUnload = () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return null;
}
