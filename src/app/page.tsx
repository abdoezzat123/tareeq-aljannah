"use client";

import { useState, useEffect } from "react";
import { Navigation, TabId } from "@/components/islamic/Navigation";
import { HomeDashboard } from "@/components/islamic/HomeDashboard";
import { TasbihCounter } from "@/components/islamic/TasbihCounter";
import { Adhkar } from "@/components/islamic/Adhkar";
import { PrayerTimes } from "@/components/islamic/PrayerTimes";
import { QuranReader } from "@/components/islamic/QuranReader";
import { TafsirView } from "@/components/islamic/TafsirView";
import { requestNotificationPermission, getSettings } from "@/lib/storage";

const getInitialTab = (): TabId => {
  if (typeof window === "undefined") return "home";
  // دعم للـ shortcuts من الـ manifest
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get("tab") as TabId | null;
  if (tabParam && ["home", "tasbih", "adhkar", "prayer", "quran", "tafsir"].includes(tabParam)) {
    return tabParam;
  }
  return (localStorage.getItem("tareeq-islam_lastTab") as TabId) || "home";
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  useEffect(() => {
    // طلب إذن الإشعارات تلقائياً عند الزيارة الأولى
    const settings = getSettings();
    if (settings.hourlyReminder && "Notification" in window && Notification.permission === "default") {
      const timer = setTimeout(() => requestNotificationPermission(), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("tareeq-islam_lastTab", tab);
    }
    // تمرير لأعلى
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen pb-24 sm:pb-8 sm:pr-64">
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="pt-4">
        {activeTab === "home" && <HomeDashboard onNavigate={handleTabChange} />}
        {activeTab === "tasbih" && <TasbihCounter />}
        {activeTab === "adhkar" && <Adhkar />}
        {activeTab === "prayer" && <PrayerTimes />}
        {activeTab === "quran" && <QuranReader />}
        {activeTab === "tafsir" && <TafsirView />}
      </main>

      <footer className="mt-8 p-6 text-center text-xs text-muted-foreground">
        <p className="mb-1">طريقك للجنة — صدقة جارية</p>
        <p className="text-gold/70">اللهم اجعله في ميزان حسناتنا</p>
      </footer>
    </div>
  );
}
