"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });

          if (registration.waiting) {
            // يوجد تحديث جديد
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          navigator.serviceWorker.addEventListener("controllerchange", () => {
            // تم تحديث الـ SW، نعمل reload
            window.location.reload();
          });

          console.log("[PWA] Service Worker registered successfully");
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

    // طلب إذن الإشعارات تلقائياً
    if ("Notification" in window && Notification.permission === "default") {
      // نطلب الإذن بعد تفاعل المستخدم (مش تلقائي عشان ما نزعجوش)
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
