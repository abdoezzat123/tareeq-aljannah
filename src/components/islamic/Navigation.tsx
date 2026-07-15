"use client";

import { useState, useEffect } from "react";
import { Home, Beaker, BookOpen, Clock, Sparkles, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "home" | "tasbih" | "adhkar" | "prayer" | "quran" | "tafsir";

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "الرئيسية", icon: Home },
  { id: "tasbih", label: "السبحة", icon: Beaker },
  { id: "adhkar", label: "الأذكار", icon: Sparkles },
  { id: "prayer", label: "مواقيت الصلاة", icon: Clock },
  { id: "quran", label: "القرآن الكريم", icon: BookOpen },
  { id: "tafsir", label: "التفسير", icon: Moon },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const s = date.getSeconds();
    const period = h >= 12 ? "م" : "ص";
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${period}`;
  };

  const formatHijri = (date: Date) => {
    try {
      const formatter = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return formatter.format(date);
    } catch {
      return "";
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-gold/15">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full glass-gold flex items-center justify-center gold-glow">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-2xl gold-gradient-text font-bold leading-tight">
                طريقك للجنة
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {formatHijri(time)} • {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="text-left">
            <div className="font-mono text-base sm:text-2xl font-bold text-gold tabular-nums" dir="ltr">
              {formatTime(time)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground sm:hidden">
              {new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
            </p>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-gold border-t border-gold/20 sm:hidden">
        <div className="flex items-center justify-around py-2 px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg transition-all min-w-[48px] min-h-[44px]",
                  isActive ? "text-gold" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(180,140,60,0.6)]")} />
                <span className="text-[9px] font-medium leading-none">{tab.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <nav className="hidden sm:flex fixed top-20 right-0 bottom-0 w-64 z-40 flex-col p-4 gap-2 glass border-l border-gold/15">
        <div className="text-xs text-muted-foreground px-3 mb-2 font-semibold">القائمة الرئيسية</div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right group",
                isActive
                  ? "glass-gold text-gold gold-glow"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", isActive && "drop-shadow-[0_0_8px_rgba(180,140,60,0.6)]")} />
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          );
        })}

        <div className="mt-auto p-4 rounded-xl glass-gold text-center">
          <p className="text-xs text-muted-foreground mb-1">صدقة جارية</p>
          <p className="font-display text-sm gold-gradient-text font-bold">الدعاء لمن صنع هذا التطبيق</p>
        </div>
      </nav>
    </>
  );
}
