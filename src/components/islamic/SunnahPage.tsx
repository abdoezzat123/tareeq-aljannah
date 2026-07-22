"use client";

import { useState, useEffect } from "react";
import { BookOpen, Check, RotateCcw, Sun, Moon, Clock } from "lucide-react";
import { afterPrayerSunnahs, dailySunnahs, obligatoryPrayers, Sunnah } from "@/lib/sunnah-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SunnahPageProps {
  onNavigate: (tab: "home") => void;
}

export function SunnahPage({ onNavigate }: SunnahPageProps) {
  const [section, setSection] = useState<"afterPrayer" | "daily">("afterPrayer");
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // تحميل المكتمل من localStorage
  useEffect(() => {
    try {
      const saved: number[] = JSON.parse(localStorage.getItem("tareeq-islam_sunnah-completed") || "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompleted(new Set(saved));
    } catch {}
  }, []);

  const sunnahs = section === "afterPrayer" ? afterPrayerSunnahs : dailySunnahs;

  const toggleComplete = (id: number) => {
    const newSet = new Set(completed);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      toast.success("✅ تمت السنة - تقبل الله");
    }
    setCompleted(newSet);
    localStorage.setItem("tareeq-islam_sunnah-completed", JSON.stringify([...newSet]));
  };

  const resetAll = () => {
    setCompleted(new Set());
    localStorage.setItem("tareeq-islam_sunnah-completed", "[]");
    toast.info("تم إعادة التعيين");
  };

  const sectionConfig = {
    afterPrayer: {
      title: "سنن بعد الصلوات",
      subtitle: "السنن المؤكدة بعد كل صلاة مفروضة",
      icon: Clock,
      color: "from-purple-500/20 to-violet-500/10",
    },
    daily: {
      title: "السنن اليومية",
      subtitle: "سنن مؤكدة في اليوم والليلة",
      icon: Sun,
      color: "from-amber-500/20 to-orange-500/10",
    },
  };

  const current = sectionConfig[section];
  const Icon = current.icon;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
      {/* رأس الصفحة */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-gold gold-glow mb-3">
          <BookOpen className="w-8 h-8 text-gold" />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl gold-gradient-text font-bold mb-2">
          السنن
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          "مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا"
        </p>
      </div>

      {/* اختيار القسم */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {(Object.keys(sectionConfig) as ("afterPrayer" | "daily")[]).map((key) => {
          const item = sectionConfig[key];
          const ItemIcon = item.icon;
          return (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl transition-all",
                section === key
                  ? "glass-gold text-gold gold-glow"
                  : "glass text-muted-foreground hover:text-foreground"
              )}
            >
              <ItemIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm font-bold">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* الصلوات المفروضة (لو في قسم afterPrayer) */}
      {section === "afterPrayer" && (
        <div className="glass-gold rounded-2xl p-4">
          <h3 className="font-bold text-gold text-sm mb-3 text-center">الصلوات المفروضة (للذكر)</h3>
          <div className="grid grid-cols-5 gap-2">
            {obligatoryPrayers.map((prayer) => (
              <div key={prayer.id} className="text-center p-2 rounded-lg bg-secondary/30">
                <div className="text-xs text-muted-foreground mb-0.5">{prayer.name}</div>
                <div className="text-sm font-bold text-gold">{prayer.count}</div>
                <div className="text-[10px] text-muted-foreground">ركعات</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ترويسة القسم */}
      <div className={cn("rounded-2xl p-5 bg-gradient-to-br border border-gold/15", current.color)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gold" />
            <h3 className="font-display text-xl sm:text-2xl font-bold gold-gradient-text">
              {current.title}
            </h3>
          </div>
          <button
            onClick={resetAll}
            className="p-2 rounded-lg glass hover:glass-gold transition-all"
            title="إعادة"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{current.subtitle}</p>

        {/* شريط التقدم */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground">التقدم</span>
            <span className="text-xs font-bold text-gold">
              {sunnahs.filter((s) => completed.has(s.id)).length} / {sunnahs.length}
            </span>
          </div>
          <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-dark to-gold transition-all duration-500"
              style={{
                width: `${(sunnahs.filter((s) => completed.has(s.id)).length / sunnahs.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* قائمة السنن */}
      <div className="space-y-3">
        {sunnahs.map((sunnah) => {
          const isComplete = completed.has(sunnah.id);
          return (
            <div
              key={sunnah.id}
              className={cn(
                "rounded-2xl p-4 sm:p-5 transition-all border-2",
                isComplete
                  ? "bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                  : "glass border-gold/10"
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isComplete
                      ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                      : "bg-secondary text-muted-foreground"
                  )}>
                    {isComplete ? <Check className="w-5 h-5" /> : sunnah.id}
                  </div>
                  <span className={cn(
                    "text-xs",
                    isComplete ? "text-emerald-400 font-bold" : "text-muted-foreground"
                  )}>
                    {isComplete ? "تمت" : `العدد: ${sunnah.count} ركعات`}
                  </span>
                </div>
                <div className={cn(
                  "text-xs font-bold px-2 py-1 rounded-full",
                  isComplete
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gold/10 text-gold"
                )}>
                  {sunnah.count} ركعة
                </div>
              </div>

              <p className={cn(
                "font-amiri text-xl sm:text-2xl leading-loose mb-3 text-right transition-colors",
                isComplete ? "text-emerald-100" : "text-foreground"
              )}>
                {sunnah.text}
              </p>

              {sunnah.reference && (
                <p className="text-xs text-muted-foreground mb-1">📖 {sunnah.reference}</p>
              )}
              {sunnah.virtue && (
                <p className={cn(
                  "text-xs italic mb-3",
                  isComplete ? "text-emerald-400/80" : "text-gold/70"
                )}>
                  {isComplete ? "🌟 تقبل الله منك" : `✨ ${sunnah.virtue}`}
                </p>
              )}

              <button
                onClick={() => toggleComplete(sunnah.id)}
                className={cn(
                  "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                  isComplete
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : "glass-gold text-gold hover:gold-glow active:scale-95"
                )}
              >
                {isComplete ? (
                  <>
                    <Check className="w-5 h-5" />
                    تمت السنة - تقبل الله
                  </>
                ) : (
                  "اضغط للتعليم كمكتملة"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* زر العودة */}
      <button
        onClick={() => onNavigate("home")}
        className="w-full py-3 rounded-xl glass hover:glass-gold transition-all text-sm font-medium"
      >
        العودة للرئيسية
      </button>
    </div>
  );
}
