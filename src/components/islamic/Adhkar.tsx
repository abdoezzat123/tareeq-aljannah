"use client";

import { useState, useMemo } from "react";
import { Sun, Moon, RotateCcw, Check } from "lucide-react";
import { morningAdhkar, eveningAdhkar, hourlyAdhkar, Dhikr } from "@/lib/adhkar-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AdhkarType = "morning" | "evening" | "hourly";

export function Adhkar() {
  const [type, setType] = useState<AdhkarType>("morning");
  const [counts, setCounts] = useState<Record<number, number>>({});

  const adhkar = useMemo(() => {
    if (type === "morning") return morningAdhkar;
    if (type === "evening") return eveningAdhkar;
    return hourlyAdhkar;
  }, [type]);

  // إعادة تعيين العدادات عند تغيير النوع
  const changeType = (newType: AdhkarType) => {
    setType(newType);
    setCounts({});
  };

  const handleClick = (dhikr: Dhikr) => {
    const currentCount = counts[dhikr.id] || 0;
    if (currentCount >= dhikr.count) {
      toast.info("أكملت هذا الذكر 🌟");
      return;
    }
    const newCount = currentCount + 1;
    setCounts({ ...counts, [dhikr.id]: newCount });

    if (newCount === dhikr.count) {
      toast.success("✅ تم إكمال الذكر");
      if ("vibrate" in navigator) navigator.vibrate(50);
    }
  };

  const resetAll = () => {
    setCounts({});
    toast.info("تم إعادة العدّادات");
  };

  const totalCompleted = adhkar.filter((d) => (counts[d.id] || 0) >= d.count).length;
  const progress = (totalCompleted / adhkar.length) * 100;

  const config = {
    morning: { title: "أذكار الصباح", subtitle: "تُقال بعد صلاة الفجر إلى طلوع الشمس", icon: Sun, color: "from-amber-500/20 to-orange-500/10" },
    evening: { title: "أذكار المساء", subtitle: "تُقال بعد صلاة العصر إلى غروب الشمس", icon: Moon, color: "from-indigo-500/20 to-blue-500/10" },
    hourly: { title: "أذكار كل ساعة", subtitle: "تذكير بذكر الله كل بداية ساعة", icon: Sun, color: "from-emerald-500/20 to-teal-500/10" },
  };

  const current = config[type];
  const Icon = current.icon;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
      <div className="text-center">
        <h2 className="font-display text-3xl sm:text-4xl gold-gradient-text font-bold mb-2">
          الأذكار
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          وَلَذِكْرُ اللَّهِ أَكْبَرُ
        </p>
      </div>

      {/* اختيار النوع */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(Object.keys(config) as AdhkarType[]).map((key) => {
          const item = config[key];
          const ItemIcon = item.icon;
          return (
            <button
              key={key}
              onClick={() => changeType(key)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl transition-all",
                type === key
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

      {/* ترويسة القسم */}
      <div className={cn("rounded-2xl p-5 sm:p-6 bg-gradient-to-br", current.color, "border border-gold/15")}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-5 h-5 text-gold" />
              <h3 className="font-display text-xl sm:text-2xl font-bold gold-gradient-text">
                {current.title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{current.subtitle}</p>
          </div>
          <button
            onClick={resetAll}
            className="p-2 rounded-lg glass hover:glass-gold transition-all"
            title="إعادة"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* شريط التقدم */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground">التقدم</span>
            <span className="text-xs font-bold text-gold">{totalCompleted} / {adhkar.length}</span>
          </div>
          <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-dark to-gold transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* قائمة الأذكار */}
      <div className="space-y-3">
        {adhkar.map((dhikr, idx) => {
          const currentCount = counts[dhikr.id] || 0;
          const isComplete = currentCount >= dhikr.count;
          const progress = Math.min((currentCount / dhikr.count) * 100, 100);
          return (
            <div
              key={dhikr.id}
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
                    {isComplete ? <Check className="w-5 h-5" /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-xs",
                    isComplete ? "text-emerald-400 font-bold" : "text-muted-foreground"
                  )}>
                    {isComplete ? "تم بإذن الله" : `التكرار: ${dhikr.count}`}
                  </span>
                </div>
                <div className={cn(
                  "text-xs font-bold px-2 py-1 rounded-full",
                  isComplete
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gold/10 text-gold"
                )}>
                  {currentCount} / {dhikr.count}
                </div>
              </div>

              <p className={cn(
                "font-amiri text-xl sm:text-2xl leading-loose mb-3 text-right transition-colors",
                isComplete ? "text-emerald-100" : "text-foreground"
              )}>
                {dhikr.text}
              </p>

              {dhikr.reference && (
                <p className="text-xs text-muted-foreground mb-1">📖 {dhikr.reference}</p>
              )}
              {dhikr.virtue && (
                <p className={cn(
                  "text-xs italic mb-3",
                  isComplete ? "text-emerald-400/80" : "text-gold/70"
                )}>
                  {isComplete ? "🌟 تقبل الله منك" : `✨ ${dhikr.virtue}`}
                </p>
              )}

              {/* شريط التقدم */}
              {!isComplete && (
                <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-gold-dark to-gold transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <button
                onClick={() => handleClick(dhikr)}
                disabled={isComplete}
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
                    تم بإذن الله
                  </>
                ) : (
                  `اضغط للذكر (${currentCount})`
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
