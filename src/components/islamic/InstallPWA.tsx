"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // التحقق إذا التطبيق مثبت بالفعل
    const checkInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true);
      }
      // iOS
      const nav = window.navigator as Navigator & { standalone?: boolean };
      if (nav.standalone === true) {
        setIsInstalled(true);
      }
    };

    checkInstalled();

    // الاستماع لحدث beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);

      // إظهار الـ banner لو المستخدم مش مثبت التطبيق ولم يرفض التثبيت قبل كده
      const dismissed = localStorage.getItem("tareeq-islam_install-dismissed");
      if (dismissed !== "true") {
        setTimeout(() => setShowBanner(true), 5000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    // الاستماع لحدث appinstalled
    const installedHandler = () => {
      setIsInstalled(true);
      setShowButton(false);
      setShowBanner(false);
      toast.success("تم تثبيت التطبيق بنجاح! 🎉");
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // لو مش مدعوم (زي iOS)، نوضح للمستخدم إزاي يثبت
      toast.info("لتثبيت التطبيق", {
        description: "اضغط على زر المشاركة في المتصفح، ثم اختر 'إضافة إلى الشاشة الرئيسية'",
        duration: 10000,
      });
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("تم تثبيت التطبيق! 🎉");
    }
    setDeferredPrompt(null);
    setShowButton(false);
    setShowBanner(false);
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("tareeq-islam_install-dismissed", "true");
  };

  // لو التطبيق مثبت، ما نظهرش الزر
  if (isInstalled) return null;

  return (
    <>
      {/* زر التثبيت في الـ navigation */}
      {showButton && (
        <button
          onClick={handleInstall}
          className="fixed bottom-20 sm:bottom-6 left-4 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-gold-dark to-gold text-background font-bold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2 animate-fade-in-up"
          title="تثبيت التطبيق"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">تثبيت التطبيق</span>
        </button>
      )}

      {/* بانر التثبيت */}
      {showBanner && (
        <div className="fixed bottom-24 sm:bottom-20 left-4 right-4 sm:left-4 sm:right-auto sm:w-96 z-40 animate-fade-in-up">
          <div className="glass-gold rounded-2xl p-4 shadow-2xl gold-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-gold text-sm">ثبّت التطبيق على جهازك</h3>
                  <p className="text-xs text-muted-foreground">وصول سريع بدون فتح المتصفح</p>
                </div>
              </div>
              <button
                onClick={dismissBanner}
                className="p-1 rounded-lg hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-gold">✓</span>
                <span>وصول سريع بضغطة واحدة</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-gold">✓</span>
                <span>يعمل بدون إنترنت للمحتوى المحفوظ</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-gold">✓</span>
                <span>إشعارات وتنبيهات للصلوات</span>
              </div>
            </div>

            <button
              onClick={handleInstall}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold-dark to-gold text-background font-bold text-sm hover:gold-glow transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              تثبيت الآن
            </button>
          </div>
        </div>
      )}
    </>
  );
}
